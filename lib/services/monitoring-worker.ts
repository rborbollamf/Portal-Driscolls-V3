import { recoverStalledMonitoringJobs, transitionMonitoringJobFailure, claimMonitoringJobs, renewMonitoringJobLease } from "@/lib/db";
import { IntegrationError } from "@/lib/adapters/http";
import { MonitoringLeaseLostError, ValidationService } from "./validation";

function retryAt(attempt: number) {
  const seconds = Math.min(60 * 60, 30 * 2 ** Math.max(0, attempt - 1));
  return new Date(Date.now() + seconds * 1000);
}

export async function processMonitoringJobs(workerId: string, limit = 5) {
  await recoverStalledMonitoringJobs();
  const jobs = await claimMonitoringJobs(workerId, limit);
  const results = await Promise.all(jobs.map(async (job) => {
    try {
      const validation = await ValidationService.runDiagnostic(job.legalEntityId, job.tipo, job.modo, {
        taskId: job.validationTaskId, jobId: job.id, attempt: job.attempts, workerId,
        claimToken: job.claimToken, deferFailure: true, deferCompletion: true,
        beforeProviderRequest: async () => {
          if (!(await renewMonitoringJobLease(job.id, workerId, job.claimToken))) {
            throw new MonitoringLeaseLostError();
          }
        },
      });
      return { jobId: job.id, status: validation.status === "FAIL" ? "COMPLETED_WITH_RISK" : "COMPLETED" };
    } catch (error) {
      if (error instanceof MonitoringLeaseLostError) {
        return { jobId: job.id, status: "LEASE_LOST" };
      }
      const integrationError = error instanceof IntegrationError ? error : undefined;
      const retryable = integrationError?.retryable ?? false;
      const message = (error as Error).message;
      const updated = await transitionMonitoringJobFailure(
        job.id, workerId, job.claimToken, message, retryable, retryAt(job.attempts),
        integrationError?.provider ?? job.tipo,
      );
      if (!updated) return { jobId: job.id, status: "LEASE_LOST" };
      return { jobId: job.id, status: updated?.status ?? "FAILED" };
    }
  }));
  return { claimed: jobs.length, results };
}