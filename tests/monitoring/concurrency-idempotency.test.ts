import assert from "node:assert/strict";
import test from "node:test";
import {
  claimMonitoringJobs,
  getPool,
  recoverStalledMonitoringJobs,
} from "../../lib/db";
import { MonitoringLeaseLostError, ValidationService } from "../../lib/services/validation";

test("duplicate delivery and an expired worker cannot duplicate jobs or persist stale alerts", { timeout: 30_000 }, async () => {
  const pool = getPool();
  const suffix = `${process.pid}-${Date.now()}`;
  const producerId = `test-producer-${suffix}`;
  const entityId = `test-entity-${suffix}`;
  const workerA = `test-worker-a-${suffix}`;
  const workerB = `test-worker-b-${suffix}`;
  const idempotencyKey = `test-idempotency-${suffix}`;
  const previousUrl = process.env.SAT_VALIDATION_URL;
  const previousToken = process.env.SAT_API_TOKEN;
  let insertedRule = false;
  let previousRule: Record<string, unknown> | undefined;

  process.env.SAT_VALIDATION_URL = "https://certified-double.invalid";
  process.env.SAT_API_TOKEN = "test-token";

  try {
    await pool.query(`INSERT INTO producers
      (id, display_name, rfc, zona, contacto, email, phone, status, profile)
      VALUES ($1, 'Test Producer', 'AAA010101AAA', 'Test', 'Test', 'test@example.invalid', '0', 'OK', '{}')`, [producerId]);
    await pool.query(`INSERT INTO legal_entities
      (id, producer_id, rfc, tipo, poderes_vigentes_at, status)
      VALUES ($1, $2, 'AAA010101AAA', 'MORAL', '2027-01-01T00:00:00.000Z', 'OK')`, [entityId, producerId]);
    const existingRule = await pool.query("SELECT * FROM rules WHERE code = 'SAT_OPINION_NEGATIVA'");
    previousRule = existingRule.rows[0];
    const ruleInsert = await pool.query(`INSERT INTO rules
      (id, code, name, description, severity_default, is_active, evaluator_type, config)
      VALUES ($1, 'SAT_OPINION_NEGATIVA', 'SAT test', 'SAT test', 'HIGH', TRUE, 'BOOLEAN',
        '{"checkField":"status","expectedValue":"negativa"}')
      ON CONFLICT (code) DO NOTHING RETURNING id`, [`test-rule-${suffix}`]);
    insertedRule = ruleInsert.rowCount === 1;
    if (!insertedRule) {
      await pool.query(`UPDATE rules SET severity_default = 'HIGH', is_active = TRUE,
        evaluator_type = 'BOOLEAN', config = '{"checkField":"status","expectedValue":"negativa"}'
        WHERE code = 'SAT_OPINION_NEGATIVA'`);
    }

    const deliveries = await Promise.all([
      ValidationService.enqueueDiagnostic(entityId, "SAT", "RECURRENTE", idempotencyKey),
      ValidationService.enqueueDiagnostic(entityId, "SAT", "RECURRENTE", idempotencyKey),
    ]);
    assert.equal(deliveries.filter((delivery) => delivery.created).length, 1);
    assert.equal(new Set(deliveries.map((delivery) => delivery.job.id)).size, 1);

    const jobId = deliveries[0].job.id;
    await pool.query("UPDATE monitoring_jobs SET available_at = '2000-01-01T00:00:00.000Z' WHERE id = $1", [jobId]);
    const [firstClaim] = await claimMonitoringJobs(workerA, 1);
    assert.equal(firstClaim.id, jobId);

    await pool.query("UPDATE monitoring_jobs SET locked_at = NOW() - INTERVAL '11 minutes' WHERE id = $1", [jobId]);
    const recovered = await recoverStalledMonitoringJobs();
    assert.ok(recovered.some((job) => job.id === jobId));
    const [secondClaim] = await claimMonitoringJobs(workerB, 1);
    assert.equal(secondClaim.id, jobId);
    assert.ok(secondClaim.claimToken > firstClaim.claimToken);

    const dependencies = {
      acquireRateLimit: async () => 0,
      fetch: async () => Response.json({
        status: "negativa",
        vigencia: "2027-01-01T00:00:00.000Z",
        reference: "certified-double",
      }),
    };

    await assert.rejects(
      () => ValidationService.runDiagnostic(entityId, "SAT", "RECURRENTE", {
        taskId: firstClaim.validationTaskId,
        jobId,
        attempt: firstClaim.attempts,
        workerId: workerA,
        claimToken: firstClaim.claimToken,
        deferFailure: true,
        deferCompletion: true,
        providerRequestDependencies: dependencies,
      }),
      MonitoringLeaseLostError,
    );
    const beforeCurrentOwner = await pool.query(
      "SELECT COUNT(*)::int AS count FROM alerts WHERE legal_entity_id = $1",
      [entityId],
    );
    assert.equal(beforeCurrentOwner.rows[0].count, 0);

    await ValidationService.runDiagnostic(entityId, "SAT", "RECURRENTE", {
      taskId: secondClaim.validationTaskId,
      jobId,
      attempt: secondClaim.attempts,
      workerId: workerB,
      claimToken: secondClaim.claimToken,
      deferFailure: true,
      deferCompletion: true,
      providerRequestDependencies: dependencies,
    });

    const persisted = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM monitoring_jobs WHERE idempotency_key = $1) AS jobs,
        (SELECT COUNT(*)::int FROM validation_tasks WHERE id = $2) AS tasks,
        (SELECT COUNT(*)::int FROM alerts WHERE legal_entity_id = $3 AND rule_code = 'SAT_OPINION_NEGATIVA') AS alerts,
        (SELECT COUNT(*)::int FROM integration_events WHERE job_id = $4 AND status = 'SUCCESS') AS successes
    `, [idempotencyKey, secondClaim.validationTaskId, entityId, jobId]);
    assert.deepEqual(persisted.rows[0], { jobs: 1, tasks: 1, alerts: 1, successes: 1 });
  } finally {
    await pool.query("DELETE FROM integration_events WHERE job_id IN (SELECT id FROM monitoring_jobs WHERE legal_entity_id = $1)", [entityId]);
    await pool.query("DELETE FROM alert_history WHERE alert_id IN (SELECT id FROM alerts WHERE legal_entity_id = $1)", [entityId]);
    await pool.query("DELETE FROM alerts WHERE legal_entity_id = $1", [entityId]);
    await pool.query("DELETE FROM monitoring_jobs WHERE legal_entity_id = $1", [entityId]);
    await pool.query("DELETE FROM validation_tasks WHERE legal_entity_id = $1", [entityId]);
    await pool.query("DELETE FROM legal_entities WHERE id = $1", [entityId]);
    await pool.query("DELETE FROM producers WHERE id = $1", [producerId]);
    if (insertedRule) await pool.query("DELETE FROM rules WHERE id = $1", [`test-rule-${suffix}`]);
    else if (previousRule) {
      await pool.query(`UPDATE rules SET name = $2, description = $3, severity_default = $4,
        is_active = $5, evaluator_type = $6, config = $7
        WHERE id = $1`, [
        previousRule.id, previousRule.name, previousRule.description, previousRule.severity_default,
        previousRule.is_active, previousRule.evaluator_type, previousRule.config,
      ]);
    }
    if (previousUrl === undefined) delete process.env.SAT_VALIDATION_URL;
    else process.env.SAT_VALIDATION_URL = previousUrl;
    if (previousToken === undefined) delete process.env.SAT_API_TOKEN;
    else process.env.SAT_API_TOKEN = previousToken;
    await pool.end();
  }
});