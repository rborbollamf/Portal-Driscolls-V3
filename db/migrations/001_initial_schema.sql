CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'ANALYST', 'PRODUCER')),
  hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS producers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  rfc TEXT NOT NULL,
  zona TEXT NOT NULL,
  contacto TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT CHECK (status IN ('PENDIENTE', 'OK', 'RISK', 'FAIL')),
  profile JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS producers_zona_status_idx ON producers (zona, status);

CREATE TABLE IF NOT EXISTS legal_entities (
  id TEXT PRIMARY KEY,
  producer_id TEXT NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
  rfc TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('MORAL', 'FISICA')),
  poderes_vigentes_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDIENTE', 'OK', 'RISK', 'FAIL'))
);

CREATE INDEX IF NOT EXISTS legal_entities_producer_id_idx ON legal_entities (producer_id);

CREATE TABLE IF NOT EXISTS ranches (
  id TEXT PRIMARY KEY,
  producer_id TEXT NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  zona TEXT NOT NULL,
  hectareas DOUBLE PRECISION NOT NULL,
  empleados INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ranches_producer_id_idx ON ranches (producer_id);

CREATE TABLE IF NOT EXISTS crops (
  id TEXT PRIMARY KEY,
  ranch_id TEXT NOT NULL REFERENCES ranches(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('FRESA', 'FRAMBUESA', 'ARANDANO', 'MORA')),
  temporada TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS crops_ranch_id_idx ON crops (ranch_id);

CREATE TABLE IF NOT EXISTS financial_snapshots (
  id TEXT PRIMARY KEY,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  periodo TEXT NOT NULL,
  liquidez DOUBLE PRECISION NOT NULL,
  endeudamiento_pct DOUBLE PRECISION NOT NULL,
  ingresos_anuales DOUBLE PRECISION NOT NULL,
  egresos_anuales DOUBLE PRECISION NOT NULL,
  notas TEXT
);

CREATE INDEX IF NOT EXISTS financial_snapshots_entity_periodo_idx ON financial_snapshots (legal_entity_id, periodo DESC);

CREATE TABLE IF NOT EXISTS validation_tasks (
  id TEXT PRIMARY KEY,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('SAT', 'IMSS', 'FINANCIERA', 'LEGAL')),
  modo TEXT NOT NULL CHECK (modo IN ('ONE_SHOT', 'RECURRENTE')),
  estado TEXT NOT NULL CHECK (estado IN ('PENDIENTE', 'OK', 'RISK', 'FAIL')),
  executed_at TIMESTAMPTZ NOT NULL,
  payload_in JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_out JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS validation_tasks_entity_executed_idx ON validation_tasks (legal_entity_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  severity_default TEXT NOT NULL CHECK (severity_default IN ('LOW', 'MEDIUM', 'HIGH')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  evaluator_type TEXT NOT NULL CHECK (evaluator_type IN ('THRESHOLD', 'BOOLEAN', 'CUSTOM')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  rule_code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS alerts_entity_resolved_created_idx ON alerts (legal_entity_id, resolved_at, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_severity_resolved_created_idx ON alerts (severity, resolved_at, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs (target_type, target_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_user_id, at DESC);