import type { ValidationTaskType, ValidationTaskMode } from "@/types";
import { generateId } from "@/lib/utils";
import {
  getLegalEntity,
  getLatestFinancialSnapshot,
  createValidationTask,
  updateValidationTask,
  getRules,
  createAlert,
  updateLegalEntity,
  getProducer,
  updateProducer,
} from "@/lib/db";
import { SatAdapter } from "@/lib/adapters/sat";
import { ImssAdapter } from "@/lib/adapters/imss";
import { FinancialAdapter } from "@/lib/adapters/financial";
import { RuleEngine } from "@/lib/rules/engine";

export interface ValidationResult {
  taskId: string;
  status: "OK" | "RISK" | "FAIL";
  alerts: any[];
  details: any;
}

export class ValidationService {
  static async runDiagnostic(
    legalEntityId: string,
    tipo: ValidationTaskType,
    modo: ValidationTaskMode
  ): Promise<ValidationResult> {
    const legalEntity = getLegalEntity(legalEntityId);
    
    if (!legalEntity) {
      throw new Error("Legal entity not found");
    }

    const taskId = generateId();
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

    createValidationTask(task);

    try {
      let payloadOut: any = {};
      let context: any = { legalEntity };

      if (tipo === "SAT") {
        const satStatus = await SatAdapter.getStatus(legalEntity);
        payloadOut.satStatus = satStatus;
        context.satStatus = satStatus;
      } else if (tipo === "IMSS") {
        const imssStatus = await ImssAdapter.getStatus(legalEntity);
        payloadOut.imssStatus = imssStatus;
        context.imssStatus = imssStatus;
      } else if (tipo === "FINANCIERA") {
        const financialSnapshot = await FinancialAdapter.getSnapshot(legalEntity);
        payloadOut.financialSnapshot = financialSnapshot;
        context.financialSnapshot = financialSnapshot;
      }

      const existingSnapshot = getLatestFinancialSnapshot(legalEntityId);
      if (existingSnapshot) {
        context.financialSnapshot = existingSnapshot;
      }

      const rules = getRules(true);
      const filteredRules = rules.filter((rule) => {
        if (tipo === "SAT" && rule.code === "SAT_OPINION_NEGATIVA") return true;
        if (tipo === "IMSS" && rule.code === "IMSS_SUSPENSION") return true;
        if (tipo === "FINANCIERA" && ["ENDEUDAMIENTO_ALTO", "LIQUIDEZ_BAJA"].includes(rule.code)) return true;
        if (tipo === "LEGAL" && rule.code === "PODERES_VENCIDOS") return true;
        return false;
      });

      const { alerts: newAlerts } = RuleEngine.evaluateAll(filteredRules, context);

      newAlerts.forEach((alert) => {
        createAlert(alert);
      });

      const status = newAlerts.some((a) => a.severity === "HIGH")
        ? "FAIL"
        : newAlerts.some((a) => a.severity === "MEDIUM")
        ? "RISK"
        : "OK";

      updateValidationTask(taskId, {
        estado: status,
        payloadOut,
      });

      updateLegalEntity(legalEntityId, { status });

      const producer = getProducer(legalEntity.producerId);
      if (producer) {
        updateProducer(producer.id, { status });
      }

      return {
        taskId,
        status,
        alerts: newAlerts,
        details: payloadOut,
      };
    } catch (error) {
      updateValidationTask(taskId, {
        estado: "FAIL",
        payloadOut: { error: (error as Error).message },
      });

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
