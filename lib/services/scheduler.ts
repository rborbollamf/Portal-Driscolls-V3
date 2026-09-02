import { createAuditLog, getIntegrationEvents, getLegalEntities, getMonitoringJobs, getMonitoringJobSummary, getProducer } from "@/lib/db";
import { ValidationService } from "./validation";
import { generateId } from "@/lib/utils";

export interface SchedulerConfig {
  cohort: string | string[];
}

class Scheduler {
  async enqueueMonitoring(cohort: string | string[], source: string, idempotencyKey: string) {
    let legalEntityIds: string[] = [];
    if (Array.isArray(cohort)) {
      legalEntityIds = cohort;
    } else if (cohort.startsWith("zona:")) {
      const zona = cohort.substring(5);
      const entities = await getLegalEntities();
      const paired = await Promise.all(entities.map(async (entity) => ({ entity, producer: await getProducer(entity.producerId) })));
      legalEntityIds = paired.filter(({ producer }) => producer?.zona === zona).map(({ entity }) => entity.id);
    } else {
      legalEntityIds = (await getLegalEntities()).map((entity) => entity.id);
    }

    const batchId = idempotencyKey;
    const jobs = await Promise.all(legalEntityIds.map(async (legalEntityId) => {
      const enqueued = await ValidationService.enqueueCompleteDiagnostic(
        legalEntityId,
        "RECURRENTE",
        `${source}:${batchId}:${legalEntityId}`,
      );
      await createAuditLog({
        id: generateId(), actorUserId: "system", action: "monitoring_enqueued",
        targetType: "LegalEntity", targetId: legalEntityId, at: new Date().toISOString(),
        metadata: { cohort, batchId, jobs: enqueued.map((item) => item.job.id), created: enqueued.map((item) => item.created) },
      });
      return enqueued.map((item) => item.job);
    }));
    return { batchId, legalEntityCount: legalEntityIds.length, jobs: jobs.flat() };
  }

  async getStatus() {
    const jobs = await getMonitoringJobs({ limit: 100 });
    const integrationEvents = await getIntegrationEvents({ limit: 20 });
    const counts = await getMonitoringJobSummary();
    return {
      queue: counts,
      recentJobs: jobs.slice(0, 20),
      integrationEvents: integrationEvents.filter((event) => event.status !== "SUCCESS"),
    };
  }
}

export const scheduler = new Scheduler();