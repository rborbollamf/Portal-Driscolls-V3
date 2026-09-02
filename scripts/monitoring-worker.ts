import { processMonitoringJobs } from "../lib/services/monitoring-worker";
import { getPool } from "../lib/db";

const workerId = process.env.MONITORING_WORKER_ID ?? `worker-${process.pid}`;
const pollMs = Math.max(1_000, Number(process.env.MONITORING_WORKER_POLL_MS ?? "5000"));
let stopping = false;

async function loop() {
  while (!stopping) {
    try {
      const result = await processMonitoringJobs(workerId);
      if (result.claimed) console.log(JSON.stringify({ workerId, ...result }));
    } catch (error) {
      console.error("Monitoring worker pass failed:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  await getPool().end();
}

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
loop().catch((error) => {
  console.error("Monitoring worker stopped unexpectedly:", error);
  process.exitCode = 1;
});