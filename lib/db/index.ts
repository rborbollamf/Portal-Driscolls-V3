import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type {
  Alert,
  AuditLog,
  Crop,
  Database,
  FinancialSnapshot,
  LegalEntity,
  Producer,
  Ranch,
  Rule,
  User,
  ValidationTask,
} from "@/types";

type Queryable = Pick<Pool, "query"> | PoolClient;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const producerFields = new Set([
  "id", "displayName", "rfc", "zona", "contacto", "email", "phone", "status",
]);

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function json(value: unknown): Record<string, unknown> {
  if (!value) return {};
  return typeof value === "string" ? JSON.parse(value) : value as Record<string, unknown>;
}

function mapUser(row: QueryResultRow): User {
  return {
    id: row.id, name: row.name, email: row.email, role: row.role, hash: row.hash,
    isActive: row.is_active, createdAt: toIso(row.created_at),
  };
}

function mapProducer(row: QueryResultRow): Producer {
  return {
    id: row.id, displayName: row.display_name, rfc: row.rfc, zona: row.zona,
    contacto: row.contacto, email: row.email, phone: row.phone, status: row.status,
    ...json(row.profile),
  } as Producer;
}

function mapLegalEntity(row: QueryResultRow): LegalEntity {
  return {
    id: row.id, producerId: row.producer_id, rfc: row.rfc, tipo: row.tipo,
    poderesVigentesAt: toIso(row.poderes_vigentes_at), status: row.status,
  };
}

function mapRanch(row: QueryResultRow): Ranch {
  return {
    id: row.id, producerId: row.producer_id, nombre: row.nombre, zona: row.zona,
    hectareas: Number(row.hectareas), empleados: Number(row.empleados),
  };
}

function mapCrop(row: QueryResultRow): Crop {
  return { id: row.id, ranchId: row.ranch_id, tipo: row.tipo, temporada: row.temporada };
}

function mapFinancialSnapshot(row: QueryResultRow): FinancialSnapshot {
  return {
    id: row.id, legalEntityId: row.legal_entity_id, periodo: row.periodo,
    liquidez: Number(row.liquidez), endeudamientoPct: Number(row.endeudamiento_pct),
    ingresosAnuales: Number(row.ingresos_anuales), egresosAnuales: Number(row.egresos_anuales),
    notas: row.notas ?? undefined,
  };
}

function mapValidationTask(row: QueryResultRow): ValidationTask {
  return {
    id: row.id, legalEntityId: row.legal_entity_id, tipo: row.tipo, modo: row.modo,
    estado: row.estado, executedAt: toIso(row.executed_at),
    payloadIn: json(row.payload_in), payloadOut: json(row.payload_out),
  } as ValidationTask;
}

function mapAlert(row: QueryResultRow): Alert {
  return {
    id: row.id, legalEntityId: row.legal_entity_id, ruleCode: row.rule_code,
    severity: row.severity, message: row.message, createdAt: toIso(row.created_at),
    resolvedAt: row.resolved_at ? toIso(row.resolved_at) : undefined,
  } as Alert;
}

function mapRule(row: QueryResultRow): Rule {
  return {
    id: row.id, code: row.code, name: row.name, description: row.description,
    severityDefault: row.severity_default, isActive: row.is_active,
    evaluatorType: row.evaluator_type, config: json(row.config),
  } as Rule;
}

function mapAuditLog(row: QueryResultRow): AuditLog {
  return {
    id: row.id, actorUserId: row.actor_user_id, action: row.action,
    targetType: row.target_type, targetId: row.target_id, at: toIso(row.at),
    metadata: json(row.metadata),
  };
}

async function one<T>(db: Queryable, sql: string, values: unknown[], map: (row: QueryResultRow) => T) {
  const result = await db.query(sql, values);
  return result.rows[0] ? map(result.rows[0]) : null;
}

function producerProfile(producer: Partial<Producer>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(producer).filter(([key]) => !producerFields.has(key)));
}

export function getPool() {
  return pool;
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function withConsistentRead<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getUsers() {
  const result = await pool.query("SELECT * FROM app_users ORDER BY created_at ASC");
  return result.rows.map(mapUser);
}

export async function getUser(id: string) {
  return one(pool, "SELECT * FROM app_users WHERE id = $1", [id], mapUser);
}

export async function getUserByEmail(email: string) {
  return one(pool, "SELECT * FROM app_users WHERE LOWER(email) = LOWER($1)", [email], mapUser);
}

export async function createUser(user: User, db: Queryable = pool) {
  return one(db, `INSERT INTO app_users (id, name, email, role, hash, is_active, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [user.id, user.name, user.email, user.role, user.hash, user.isActive, user.createdAt], mapUser);
}

export async function updateUser(id: string, updates: Partial<User>) {
  const fields: [string, unknown][] = [
    ["name", updates.name], ["email", updates.email], ["role", updates.role],
    ["hash", updates.hash], ["is_active", updates.isActive],
  ].filter(([, value]) => value !== undefined) as [string, unknown][];
  if (!fields.length) return getUser(id);
  const set = fields.map(([column], index) => `${column} = $${index + 2}`).join(", ");
  return one(pool, `UPDATE app_users SET ${set} WHERE id = $1 RETURNING *`, [id, ...fields.map(([, value]) => value)], mapUser);
}

export async function getProducers(filters?: { zona?: string; status?: string; limit?: number; offset?: number }) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters?.zona) { values.push(filters.zona); conditions.push(`zona = $${values.length}`); }
  if (filters?.status) { values.push(filters.status); conditions.push(`status = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM producers ${where}`, values);
  const pageValues = [...values];
  let paging = "";
  if (filters?.limit !== undefined) { pageValues.push(filters.limit); paging += ` LIMIT $${pageValues.length}`; }
  if (filters?.offset !== undefined) { pageValues.push(filters.offset); paging += ` OFFSET $${pageValues.length}`; }
  const result = await pool.query(`SELECT * FROM producers ${where} ORDER BY display_name ASC${paging}`, pageValues);
  return { producers: result.rows.map(mapProducer), total: count.rows[0].total as number };
}

export async function getProducer(id: string) {
  return one(pool, "SELECT * FROM producers WHERE id = $1", [id], mapProducer);
}

export async function createProducer(producer: Producer, db: Queryable = pool) {
  return one(db, `INSERT INTO producers
    (id, display_name, rfc, zona, contacto, email, phone, status, profile)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb) RETURNING *`,
    [producer.id, producer.displayName, producer.rfc, producer.zona, producer.contacto, producer.email,
      producer.phone, producer.status ?? null, JSON.stringify(producerProfile(producer))], mapProducer);
}

export async function updateProducer(id: string, updates: Partial<Producer>, db: Queryable = pool) {
  const fields: [string, unknown][] = [
    ["display_name", updates.displayName], ["rfc", updates.rfc], ["zona", updates.zona],
    ["contacto", updates.contacto], ["email", updates.email], ["phone", updates.phone], ["status", updates.status],
  ].filter(([, value]) => value !== undefined) as [string, unknown][];
  const profile = producerProfile(updates);
  if (Object.keys(profile).length) fields.push(["profile = profile ||", JSON.stringify(profile)]);
  if (!fields.length) return one(db, "SELECT * FROM producers WHERE id = $1", [id], mapProducer);
  const set = fields.map(([column], index) =>
    column === "profile = profile ||" ? `${column} $${index + 2}::jsonb` : `${column} = $${index + 2}`
  ).join(", ");
  return one(db, `UPDATE producers SET ${set} WHERE id = $1 RETURNING *`, [id, ...fields.map(([, value]) => value)], mapProducer);
}

export async function getLegalEntities(producerId?: string) {
  const result = producerId
    ? await pool.query("SELECT * FROM legal_entities WHERE producer_id = $1 ORDER BY rfc", [producerId])
    : await pool.query("SELECT * FROM legal_entities ORDER BY rfc");
  return result.rows.map(mapLegalEntity);
}

export async function getLegalEntity(id: string) {
  return one(pool, "SELECT * FROM legal_entities WHERE id = $1", [id], mapLegalEntity);
}

export async function createLegalEntity(entity: LegalEntity, db: Queryable = pool) {
  return one(db, `INSERT INTO legal_entities (id, producer_id, rfc, tipo, poderes_vigentes_at, status)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [entity.id, entity.producerId, entity.rfc, entity.tipo, entity.poderesVigentesAt, entity.status], mapLegalEntity);
}

export async function updateLegalEntity(id: string, updates: Partial<LegalEntity>, db: Queryable = pool) {
  const fields: [string, unknown][] = [
    ["rfc", updates.rfc], ["tipo", updates.tipo], ["poderes_vigentes_at", updates.poderesVigentesAt], ["status", updates.status],
  ].filter(([, value]) => value !== undefined) as [string, unknown][];
  if (!fields.length) return one(db, "SELECT * FROM legal_entities WHERE id = $1", [id], mapLegalEntity);
  const set = fields.map(([column], index) => `${column} = $${index + 2}`).join(", ");
  return one(db, `UPDATE legal_entities SET ${set} WHERE id = $1 RETURNING *`, [id, ...fields.map(([, value]) => value)], mapLegalEntity);
}

export async function getRanches(producerId?: string) {
  const result = producerId
    ? await pool.query("SELECT * FROM ranches WHERE producer_id = $1 ORDER BY nombre", [producerId])
    : await pool.query("SELECT * FROM ranches ORDER BY nombre");
  return result.rows.map(mapRanch);
}

export async function createRanch(ranch: Ranch, db: Queryable = pool) {
  return one(db, `INSERT INTO ranches (id, producer_id, nombre, zona, hectareas, empleados)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [ranch.id, ranch.producerId, ranch.nombre, ranch.zona, ranch.hectareas, ranch.empleados], mapRanch);
}

export async function getCrops(ranchId?: string) {
  const result = ranchId
    ? await pool.query("SELECT * FROM crops WHERE ranch_id = $1 ORDER BY temporada DESC", [ranchId])
    : await pool.query("SELECT * FROM crops ORDER BY temporada DESC");
  return result.rows.map(mapCrop);
}

export async function createCrop(crop: Crop, db: Queryable = pool) {
  return one(db, "INSERT INTO crops (id, ranch_id, tipo, temporada) VALUES ($1, $2, $3, $4) RETURNING *",
    [crop.id, crop.ranchId, crop.tipo, crop.temporada], mapCrop);
}

export async function getFinancialSnapshots(legalEntityId?: string) {
  const result = legalEntityId
    ? await pool.query("SELECT * FROM financial_snapshots WHERE legal_entity_id = $1 ORDER BY periodo DESC", [legalEntityId])
    : await pool.query("SELECT * FROM financial_snapshots ORDER BY periodo DESC");
  return result.rows.map(mapFinancialSnapshot);
}

export async function getLatestFinancialSnapshot(legalEntityId: string) {
  return one(pool, "SELECT * FROM financial_snapshots WHERE legal_entity_id = $1 ORDER BY periodo DESC LIMIT 1", [legalEntityId], mapFinancialSnapshot);
}

export async function createFinancialSnapshot(snapshot: FinancialSnapshot, db: Queryable = pool) {
  return one(db, `INSERT INTO financial_snapshots
    (id, legal_entity_id, periodo, liquidez, endeudamiento_pct, ingresos_anuales, egresos_anuales, notas)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [snapshot.id, snapshot.legalEntityId, snapshot.periodo, snapshot.liquidez, snapshot.endeudamientoPct,
      snapshot.ingresosAnuales, snapshot.egresosAnuales, snapshot.notas ?? null], mapFinancialSnapshot);
}

export async function getValidationTasks(legalEntityId?: string) {
  const result = legalEntityId
    ? await pool.query("SELECT * FROM validation_tasks WHERE legal_entity_id = $1 ORDER BY executed_at DESC", [legalEntityId])
    : await pool.query("SELECT * FROM validation_tasks ORDER BY executed_at DESC");
  return result.rows.map(mapValidationTask);
}

export async function createValidationTask(task: ValidationTask, db: Queryable = pool) {
  return one(db, `INSERT INTO validation_tasks
    (id, legal_entity_id, tipo, modo, estado, executed_at, payload_in, payload_out)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb) RETURNING *`,
    [task.id, task.legalEntityId, task.tipo, task.modo, task.estado, task.executedAt,
      JSON.stringify(task.payloadIn), JSON.stringify(task.payloadOut)], mapValidationTask);
}

export async function updateValidationTask(id: string, updates: Partial<ValidationTask>, db: Queryable = pool) {
  const fields: [string, unknown, boolean?][] = [
    ["tipo", updates.tipo], ["modo", updates.modo], ["estado", updates.estado], ["executed_at", updates.executedAt],
    ["payload_in", updates.payloadIn, true], ["payload_out", updates.payloadOut, true],
  ].filter(([, value]) => value !== undefined) as [string, unknown, boolean?][];
  if (!fields.length) return one(db, "SELECT * FROM validation_tasks WHERE id = $1", [id], mapValidationTask);
  const set = fields.map(([column, , isJson], index) => `${column} = $${index + 2}${isJson ? "::jsonb" : ""}`).join(", ");
  const values = fields.map(([, value, isJson]) => isJson ? JSON.stringify(value) : value);
  return one(db, `UPDATE validation_tasks SET ${set} WHERE id = $1 RETURNING *`, [id, ...values], mapValidationTask);
}

export async function getAlerts(filters?: { legalEntityId?: string; severity?: string; resolved?: boolean; limit?: number; offset?: number }) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters?.legalEntityId) { values.push(filters.legalEntityId); conditions.push(`legal_entity_id = $${values.length}`); }
  if (filters?.severity) { values.push(filters.severity); conditions.push(`severity = $${values.length}`); }
  if (filters?.resolved !== undefined) conditions.push(filters.resolved ? "resolved_at IS NOT NULL" : "resolved_at IS NULL");
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM alerts ${where}`, values);
  const pageValues = [...values];
  let paging = "";
  if (filters?.limit !== undefined) { pageValues.push(filters.limit); paging += ` LIMIT $${pageValues.length}`; }
  if (filters?.offset !== undefined) { pageValues.push(filters.offset); paging += ` OFFSET $${pageValues.length}`; }
  const result = await pool.query(`SELECT * FROM alerts ${where} ORDER BY created_at DESC${paging}`, pageValues);
  return { alerts: result.rows.map(mapAlert), total: count.rows[0].total as number };
}

export async function createAlert(alert: Alert, db: Queryable = pool) {
  return one(db, `INSERT INTO alerts (id, legal_entity_id, rule_code, severity, message, created_at, resolved_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [alert.id, alert.legalEntityId, alert.ruleCode, alert.severity, alert.message, alert.createdAt, alert.resolvedAt ?? null], mapAlert);
}

export async function updateAlert(id: string, updates: Partial<Alert>, db: Queryable = pool) {
  const fields: [string, unknown][] = [
    ["rule_code", updates.ruleCode], ["severity", updates.severity], ["message", updates.message], ["resolved_at", updates.resolvedAt],
  ].filter(([, value]) => value !== undefined) as [string, unknown][];
  if (!fields.length) return one(db, "SELECT * FROM alerts WHERE id = $1", [id], mapAlert);
  const set = fields.map(([column], index) => `${column} = $${index + 2}`).join(", ");
  return one(db, `UPDATE alerts SET ${set} WHERE id = $1 RETURNING *`, [id, ...fields.map(([, value]) => value)], mapAlert);
}

export async function resolveAlertWithAudit(alertId: string, audit: AuditLog) {
  return withTransaction(async (client) => {
    const alert = await updateAlert(alertId, { resolvedAt: new Date().toISOString() }, client);
    if (!alert) return null;
    await createAuditLog(audit, client);
    return alert;
  });
}

export async function getRules(activeOnly = false) {
  const result = activeOnly
    ? await pool.query("SELECT * FROM rules WHERE is_active = TRUE ORDER BY code")
    : await pool.query("SELECT * FROM rules ORDER BY code");
  return result.rows.map(mapRule);
}

export async function getRule(id: string) {
  return one(pool, "SELECT * FROM rules WHERE id = $1", [id], mapRule);
}

export async function getRuleByCode(code: string) {
  return one(pool, "SELECT * FROM rules WHERE code = $1", [code], mapRule);
}

export async function createRule(rule: Rule, db: Queryable = pool) {
  return one(db, `INSERT INTO rules
    (id, code, name, description, severity_default, is_active, evaluator_type, config)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING *`,
    [rule.id, rule.code, rule.name, rule.description, rule.severityDefault, rule.isActive,
      rule.evaluatorType, JSON.stringify(rule.config)], mapRule);
}

export async function updateRule(id: string, updates: Partial<Rule>) {
  const fields: [string, unknown, boolean?][] = [
    ["code", updates.code], ["name", updates.name], ["description", updates.description],
    ["severity_default", updates.severityDefault], ["is_active", updates.isActive],
    ["evaluator_type", updates.evaluatorType], ["config", updates.config, true],
  ].filter(([, value]) => value !== undefined) as [string, unknown, boolean?][];
  if (!fields.length) return getRule(id);
  const set = fields.map(([column, , isJson], index) => `${column} = $${index + 2}${isJson ? "::jsonb" : ""}`).join(", ");
  const values = fields.map(([, value, isJson]) => isJson ? JSON.stringify(value) : value);
  return one(pool, `UPDATE rules SET ${set} WHERE id = $1 RETURNING *`, [id, ...values], mapRule);
}

export async function deleteRule(id: string) {
  const result = await pool.query("DELETE FROM rules WHERE id = $1", [id]);
  return result.rowCount === 1;
}

export async function createAuditLog(log: AuditLog, db: Queryable = pool) {
  return one(db, `INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, at, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING *`,
    [log.id, log.actorUserId, log.action, log.targetType, log.targetId, log.at, JSON.stringify(log.metadata)], mapAuditLog);
}

export async function getAuditLogs(filters?: { actorUserId?: string; targetType?: string; targetId?: string; limit?: number }) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters?.actorUserId) { values.push(filters.actorUserId); conditions.push(`actor_user_id = $${values.length}`); }
  if (filters?.targetType) { values.push(filters.targetType); conditions.push(`target_type = $${values.length}`); }
  if (filters?.targetId) { values.push(filters.targetId); conditions.push(`target_id = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  if (filters?.limit) values.push(filters.limit);
  const limit = filters?.limit ? ` LIMIT $${values.length}` : "";
  const result = await pool.query(`SELECT * FROM audit_logs ${where} ORDER BY at DESC${limit}`, values);
  return result.rows.map(mapAuditLog);
}

export async function exportDatabaseSnapshot(): Promise<Database> {
  return withConsistentRead(async (client) => {
    const users = (await client.query("SELECT * FROM app_users ORDER BY id")).rows.map(mapUser);
    const producers = (await client.query("SELECT * FROM producers ORDER BY id")).rows.map(mapProducer);
    const legalEntities = (await client.query("SELECT * FROM legal_entities ORDER BY id")).rows.map(mapLegalEntity);
    const ranches = (await client.query("SELECT * FROM ranches ORDER BY id")).rows.map(mapRanch);
    const crops = (await client.query("SELECT * FROM crops ORDER BY id")).rows.map(mapCrop);
    const financialSnapshots = (await client.query("SELECT * FROM financial_snapshots ORDER BY id")).rows.map(mapFinancialSnapshot);
    const validationTasks = (await client.query("SELECT * FROM validation_tasks ORDER BY id")).rows.map(mapValidationTask);
    const alerts = (await client.query("SELECT * FROM alerts ORDER BY id")).rows.map(mapAlert);
    const rules = (await client.query("SELECT * FROM rules ORDER BY id")).rows.map(mapRule);
    const auditLogs = (await client.query("SELECT * FROM audit_logs ORDER BY id")).rows.map(mapAuditLog);
    return {
      users, producers, legalEntities, ranches, crops, financialSnapshots,
      validationTasks, alerts, rules, auditLogs,
    };
  });
}

export async function getDatabaseCounts() {
  const result = await pool.query(`
    SELECT 'users' AS name, COUNT(*)::int AS count FROM app_users
    UNION ALL SELECT 'producers', COUNT(*)::int FROM producers
    UNION ALL SELECT 'legalEntities', COUNT(*)::int FROM legal_entities
    UNION ALL SELECT 'ranches', COUNT(*)::int FROM ranches
    UNION ALL SELECT 'crops', COUNT(*)::int FROM crops
    UNION ALL SELECT 'financialSnapshots', COUNT(*)::int FROM financial_snapshots
    UNION ALL SELECT 'validationTasks', COUNT(*)::int FROM validation_tasks
    UNION ALL SELECT 'alerts', COUNT(*)::int FROM alerts
    UNION ALL SELECT 'rules', COUNT(*)::int FROM rules
    UNION ALL SELECT 'auditLogs', COUNT(*)::int FROM audit_logs
  `);
  return Object.fromEntries(result.rows.map((row) => [row.name, Number(row.count)])) as Record<keyof Database, number>;
}

export async function restoreDatabaseSnapshot(snapshot: Database, options: { replace?: boolean } = {}) {
  return withTransaction(async (client) => {
    const existing = await client.query(`
      SELECT (
        (SELECT COUNT(*) FROM app_users) +
        (SELECT COUNT(*) FROM producers) +
        (SELECT COUNT(*) FROM legal_entities) +
        (SELECT COUNT(*) FROM ranches) +
        (SELECT COUNT(*) FROM crops) +
        (SELECT COUNT(*) FROM financial_snapshots) +
        (SELECT COUNT(*) FROM validation_tasks) +
        (SELECT COUNT(*) FROM alerts) +
        (SELECT COUNT(*) FROM rules) +
        (SELECT COUNT(*) FROM audit_logs)
      )::int AS total
    `);
    if (Number(existing.rows[0].total) > 0 && !options.replace) {
      throw new Error("The database is not empty. Pass an explicit replace option to restore a snapshot.");
    }

    if (options.replace) {
      await client.query(`
        DELETE FROM audit_logs;
        DELETE FROM alerts;
        DELETE FROM validation_tasks;
        DELETE FROM financial_snapshots;
        DELETE FROM crops;
        DELETE FROM ranches;
        DELETE FROM legal_entities;
        DELETE FROM rules;
        DELETE FROM producers;
        DELETE FROM app_users;
      `);
    }

    for (const user of snapshot.users) await createUser(user, client);
    for (const producer of snapshot.producers) await createProducer(producer, client);
    for (const entity of snapshot.legalEntities) await createLegalEntity(entity, client);
    for (const ranch of snapshot.ranches) await createRanch(ranch, client);
    for (const crop of snapshot.crops) await createCrop(crop, client);
    for (const financialSnapshot of snapshot.financialSnapshots) await createFinancialSnapshot(financialSnapshot, client);
    for (const task of snapshot.validationTasks) await createValidationTask(task, client);
    for (const rule of snapshot.rules) await createRule(rule, client);
    for (const alert of snapshot.alerts) await createAlert(alert, client);
    for (const log of snapshot.auditLogs) await createAuditLog(log, client);
  });
}