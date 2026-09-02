-- Older demo executions may have left more than one unresolved copy of a rule.
-- Keep the newest active record and close the historical duplicates before
-- enforcing the active-alert uniqueness invariant.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY legal_entity_id, rule_code
    ORDER BY created_at DESC, id DESC
  ) AS row_number
  FROM alerts
  WHERE resolved_at IS NULL
)
UPDATE alerts
SET resolved_at = created_at
WHERE id IN (SELECT id FROM ranked WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS alerts_one_open_rule_per_entity_idx
  ON alerts (legal_entity_id, rule_code)
  WHERE resolved_at IS NULL;

ALTER TABLE monitoring_jobs
  ADD COLUMN IF NOT EXISTS claim_token INTEGER NOT NULL DEFAULT 0;

ALTER TABLE financial_snapshots
  ADD COLUMN IF NOT EXISTS source_job_id TEXT REFERENCES monitoring_jobs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS financial_snapshots_source_job_idx
  ON financial_snapshots (source_job_id)
  WHERE source_job_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS provider_rate_limits (
  provider TEXT PRIMARY KEY,
  next_available_at TIMESTAMPTZ NOT NULL
);