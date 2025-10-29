import cron from "node-cron";
import { getLegalEntities, createAuditLog } from "@/lib/db";
import { ValidationService } from "./validation";
import { generateId } from "@/lib/utils";

export interface SchedulerConfig {
  cohort: string | string[];
  enabled: boolean;
  cronExpression: string;
}

class Scheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  start(config: SchedulerConfig) {
    if (this.jobs.has("recurrent-monitoring")) {
      this.jobs.get("recurrent-monitoring")?.stop();
    }

    const task = cron.schedule(
      config.cronExpression,
      async () => {
        console.log("🔄 Running recurrent monitoring...");
        await this.runMonitoring(config.cohort);
      },
      {
        scheduled: config.enabled,
      }
    );

    this.jobs.set("recurrent-monitoring", task);
    
    console.log(`✅ Scheduler started with cron: ${config.cronExpression}`);
  }

  stop() {
    this.jobs.forEach((job) => job.stop());
    this.jobs.clear();
    console.log("⏸️  Scheduler stopped");
  }

  async runMonitoring(cohort: string | string[]) {
    try {
      let legalEntityIds: string[] = [];

      if (Array.isArray(cohort)) {
        legalEntityIds = cohort;
      } else if (cohort.startsWith("zona:")) {
        const zona = cohort.substring(5);
        const allEntities = getLegalEntities();
        legalEntityIds = allEntities
          .filter((le) => {
            const producer = require("@/lib/db").getProducer(le.producerId);
            return producer?.zona === zona;
          })
          .map((le) => le.id);
      } else {
        const allEntities = getLegalEntities();
        legalEntityIds = allEntities.map((le) => le.id);
      }

      console.log(`📊 Monitoring ${legalEntityIds.length} legal entities...`);

      for (const legalEntityId of legalEntityIds) {
        try {
          await ValidationService.runCompleteDiagnostic(legalEntityId, "RECURRENTE");
          
          createAuditLog({
            id: generateId(),
            actorUserId: "system",
            action: "recurrent_validation",
            targetType: "LegalEntity",
            targetId: legalEntityId,
            at: new Date().toISOString(),
            metadata: { cohort },
          });
        } catch (error) {
          console.error(`Error validating ${legalEntityId}:`, error);
        }
      }

      console.log("✅ Recurrent monitoring completed");
    } catch (error) {
      console.error("Error in runMonitoring:", error);
    }
  }

  getStatus() {
    return {
      active: this.jobs.size > 0,
      jobs: Array.from(this.jobs.keys()),
    };
  }
}

export const scheduler = new Scheduler();
