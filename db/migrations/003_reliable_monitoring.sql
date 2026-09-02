CREATE TABLE IF NOT EXISTS monitoring_jobs (
  id TEXT PRIMARY KEY,
  validation_task_id TEXT NOT NULL UNIQUE REFERENCES validation_tasks(id) ON DELETE RESTRICT,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('SAT', 'IMSS', 'FINANCIERA', 'LEGAL')),
  modo TEXT NOT NULL CHECK (modo IN ('ONE_SHOT', 'RECURRENTE')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'RETRY', 'COMPLETED', 'FAILED')),
  idempotency_key TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 4 CHECK (max_attempts > 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS monitoring_jobs_ready_idx
  ON monitoring_jobs (status, available_at)
  WHERE status IN ('PENDING', 'RETRY');
CREATE INDEX IF NOT EXISTS monitoring_jobs_entity_created_idx
  ON monitoring_jobs (legal_entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS integration_events (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES monitoring_jobs(id) ON DELETE SET NULL,
  validation_task_id TEXT REFERENCES validation_tasks(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'RETRYING', 'FAILED')),
  correlation_id TEXT NOT NULL,
  attempt INTEGER NOT NULL CHECK (attempt >= 0),
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS integration_events_status_occurred_idx
  ON integration_events (status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS integration_events_job_occurred_idx
  ON integration_events (job_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS alert_history (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES alerts(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('OPENED', 'UPDATED', 'RESOLVED', 'AUTO_RESOLVED')),
  at TIMESTAMPTZ NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS alert_history_alert_at_idx ON alert_history (alert_id, at DESC);