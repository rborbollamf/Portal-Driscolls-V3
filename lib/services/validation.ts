import type { ValidationTaskType, ValidationTaskMode } from "@/types";
import { generateId } from "@/lib/utils";
import {
  getLegalEntity,
  getLatestFinancialSnapshot,
  createValidationTask,
  updateValidationTask,
  getRules,
  updateLegalEntity,
  getProducer,
  updateProducer,
  createFinancialSnapshot,
  createIntegrationEvent,
  createMonitoringJob,
  autoResolveRuleAlerts,
  upsertRuleAlert,
  completeMonitoringJob,
  withTransaction,
} from "@/lib/db";
import { SatAdapter } from "@/lib/adapters/sat";
import { ImssAdapter } from "@/lib/adapters/imss";
import { FinancialAdapter } from "@/lib/adapters/financial";
import { LegalAdapter } from "@/lib/adapters/legal";
import { RuleEngine } from "@/lib/rules/engine";

export interface ValidationResult {
  taskId: string;
  status: "OK" | "RISK" | "FAIL";
  alerts: any[];
  details: any;
}

export class MonitoringLeaseLostError extends Error {
  constructor() {
    super("Monitoring job lease is no longer current");
    this.name = "MonitoringLeaseLostError";
  }
}

export class ValidationService {
  static async enqueueDiagnostic(
    legalEntityId: string,
    tipo: ValidationTaskType,
    modo: ValidationTaskMode,
    idempotencyKey: string,
  ) {
    const legalEntity = await getLegalEntity(legalEntityId);
    if (!legalEntity) throw new Error("Legal entity not found");
    const taskId = generateId();
    return createMonitoringJob({
      id: generateId(),
      idempotencyKey,
      validationTask: {
        id: taskId, legalEntityId, tipo, modo, estado: "PENDIENTE",
        executedAt: new Date().toISOString(),
        payloadIn: { tipo, modo, idempotencyKey },
        payloadOut: {},
      },
    });
  }

  static async enqueueCompleteDiagnostic(
    legalEntityId: string,
    modo: ValidationTaskMode,
    idempotencyPrefix: string,
  ) {
    const types: ValidationTaskType[] = ["SAT", "IMSS", "FINANCIERA", "LEGAL"];
    return Promise.all(types.map((tipo) =>
      this.enqueueDiagnostic(legalEntityId, tipo, modo, `${idempotencyPrefix}:${tipo}`),
    ));
  }

  static async runDiagnostic(
    legalEntityId: string,
    tipo: ValidationTaskType,
    modo: ValidationTaskMode,
    options: {
      taskId?: string; jobId?: string; attempt?: number; workerId?: string;
      claimToken?: number; deferFailure?: boolean; deferCompletion?: boolean;
      beforeProviderRequest?: () => Promise<void>;
    } = {},
  ): Promise<ValidationResult> {
    const legalEntity = await getLegalEntity(legalEntityId);
    
    if (!legalEntity) {
      throw new Error("Legal entity not found");
    }

    const taskId = options.taskId ?? generateId();
    const task = {
      id: taskId,
      legalEntityId,
      tipo,
      modo,
      estado: "PENDIENTE" as const,
      executedAt: new Date().toISOString(),
      payloadIn: { tipo, modo },
      payloadOut: {},
    };

    if (!options.taskId) await createValidationTask(task);

    try {
      let payloadOut: any = {};
      let context: any = { legalEntity };
      let newSnapshot: any;
      let legalPowersUpdate: string | undefined;
      const correlationId = options.jobId ?? taskId;
      let integrationSuccess: { provider: string; metadata: Record<string, unknown> } | undefined;

      try {
        if (tipo === "SAT") {
          const satStatus = await SatAdapter.getStatus(legalEntity, correlationId, options.beforeProviderRequest);
          payloadOut.satStatus = satStatus;
          context.satStatus = satStatus;
          integrationSuccess = { provider: "SAT", metadata: { reference: satStatus.reference, observedAt: satStatus.observedAt } };
        } else if (tipo === "IMSS") {
          const imssStatus = await ImssAdapter.getStatus(legalEntity, correlationId, options.beforeProviderRequest);
          payloadOut.imssStatus = imssStatus;
          context.imssStatus = imssStatus;
          integrationSuccess = { provider: "IMSS", metadata: { reference: imssStatus.reference, observedAt: imssStatus.observedAt } };
        } else if (tipo === "FINANCIERA") {
          const financialSnapshot = await FinancialAdapter.getSnapshot(legalEntity, correlationId, options.beforeProviderRequest);
          payloadOut.financialSnapshot = financialSnapshot;
          newSnapshot = {
            id: generateId(), legalEntityId, periodo: new Date().toISOString().substring(0, 7),
            liquidez: financialSnapshot.liquidez, endeudamientoPct: financialSnapshot.endeudamientoPct,
            ingresosAnuales: financialSnapshot.ingresosAnuales, egresosAnuales: financialSnapshot.egresosAnuales,
            notas: `Authorized financial source (${financialSnapshot.reference ?? "no-reference"})`,
            sourceJobId: options.jobId,
          };
          context.financialSnapshot = newSnapshot;
          integrationSuccess = { provider: "FINANCIAL", metadata: { reference: financialSnapshot.reference, observedAt: financialSnapshot.observedAt } };
        } else {
          const legalStatus = await LegalAdapter.getStatus(legalEntity, correlationId, options.beforeProviderRequest);
          legalPowersUpdate = legalStatus.poderesVigentesAt;
          context.legalEntity = { ...legalEntity, poderesVigentesAt: legalStatus.poderesVigentesAt };
          payloadOut.legalStatus = legalStatus;
          integrationSuccess = { provider: "LEGAL", metadata: { reference: legalStatus.reference, observedAt: legalStatus.observedAt } };
        }
      } catch (error) {
        throw error;
      }

      if (!context.financialSnapshot) {
        const existingSnapshot = await getLatestFinancialSnapshot(legalEntityId);
        if (existingSnapshot) {
          context.financialSnapshot = existingSnapshot;
        }
      }

      const rules = await getRules(true);
      const filteredRules = rules.filter((rule) => {
        if (tipo === "SAT" && rule.code === "SAT_OPINION_NEGATIVA") return true;
        if (tipo === "IMSS" && rule.code === "IMSS_SUSPENSION") return true;
        if (tipo === "FINANCIERA" && ["ENDEUDAMIENTO_ALTO", "LIQUIDEZ_BAJA"].includes(rule.code)) return true;
        if (tipo === "LEGAL" && rule.code === "PODERES_VENCIDOS") return true;
        return false;
      });

      const { alerts: evaluatedAlerts, results } = RuleEngine.evaluateAll(filteredRules, context);
      const triggeredRules = new Set(
        filteredRules.filter((_, index) => results[index]?.triggered).map((rule) => rule.code),
      );

      const status = evaluatedAlerts.some((a) => a.severity === "HIGH")
        ? "FAIL"
        : evaluatedAlerts.some((a) => a.severity === "MEDIUM")
        ? "RISK"
        : "OK";

      const producer = await getProducer(legalEntity.producerId);
      const persistedAlerts: any[] = [];
      await withTransaction(async (client) => {
        if (options.deferCompletion) {
          const ownership = await client.query(`SELECT 1 FROM monitoring_jobs
            WHERE id = $1 AND status = 'RUNNING' AND locked_by = $2 AND claim_token = $3
            FOR UPDATE`, [options.jobId, options.workerId, options.claimToken]);
          if (!ownership.rowCount) throw new MonitoringLeaseLostError();
        }
        if (integrationSuccess) {
          await createIntegrationEvent({
            id: generateId(), jobId: options.jobId, validationTaskId: taskId,
            provider: integrationSuccess.provider, operation: tipo, status: "SUCCESS",
            correlationId, attempt: options.attempt ?? 1,
            metadata: integrationSuccess.metadata, occurredAt: new Date().toISOString(),
          }, client);
        }
        if (newSnapshot) await createFinancialSnapshot(newSnapshot, client);
        if (legalPowersUpdate) await updateLegalEntity(legalEntityId, { poderesVigentesAt: legalPowersUpdate }, client);
        for (const alert of evaluatedAlerts) {
          const persisted = await upsertRuleAlert(alert, client);
          persistedAlerts.push(persisted.alert);
        }
        await autoResolveRuleAlerts(
          legalEntityId,
          filteredRules.filter((rule) => !triggeredRules.has(rule.code)).map((rule) => rule.code),
          client,
        );
        if (options.deferCompletion) {
          const completed = await completeMonitoringJob(
            options.jobId!, options.workerId!, options.claimToken!,
            { estado: status, payloadOut },
            client,
          );
          if (!completed) throw new MonitoringLeaseLostError();
        } else {
          await updateValidationTask(taskId, { estado: status, payloadOut }, client);
          await updateLegalEntity(legalEntityId, { status }, client);
          if (producer) await updateProducer(producer.id, { status }, client);
        }
      });

      return {
        taskId,
        status,
        alerts: persistedAlerts,
        details: payloadOut,
      };
    } catch (error) {
      if (!options.deferFailure) {
        await updateValidationTask(taskId, {
          estado: "FAIL",
          payloadOut: { error: (error as Error).message },
        });
      }

      throw error;
    }
  }

  static async runCompleteDiagnostic(legalEntityId: string, modo: ValidationTaskMode = "ONE_SHOT") {
    const types: ValidationTaskType[] = ["SAT", "IMSS", "FINANCIERA", "LEGAL"];
    const results = [];

    for (const tipo of types) {
      const result = await this.runDiagnostic(legalEntityId, tipo, modo);
      results.push(result);
    }

    return results;
  }
}
