import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type {
  Alert,
  AlertHistoryEntry,
  AuditLog,
  Crop,
  Database,
  FinancialSnapshot,
  LegalEntity,
  MonitoringJob,
  IntegrationEvent,
  Producer,
  Ranch,
  Rule,
  User,
  ValidationTask,
} from "@/types";
import type { ImportError, ProducerImportRow } from "@/lib/services/producer-import";

export type Queryable = Pick<Pool, "query"> | PoolClient;

function isTransactionClient(db: Queryable): db is PoolClient {
  return "release" in db && typeof db.release === "function";
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const producerFields = new Set([
  "id", "displayName", "rfc", "zona", "contacto", "email", "phone", "status",
  "cultivo", "distrito", "nombreAreaCultivo", "productor", "idCofibeCg", "numeroProductor",
  "razonSocial", "representanteLegal", "direccionFiscal", "colonia", "municipio", "estado",
  "codigoPostal", "nombreContacto", "telefonoContacto", "numeroCelular", "correoElectronico",
  "correoElectronicoProductor",
]);
const producerTypedColumns: Array<[keyof Producer, string]> = [
  ["cultivo", "cultivo"], ["distrito", "distrito"], ["nombreAreaCultivo", "nombre_area_cultivo"],
  ["productor", "productor"], ["idCofibeCg", "id_cofibe_cg"], ["numeroProductor", "numero_productor"],
  ["razonSocial", "razon_social"], ["representanteLegal", "representante_legal"],
  ["direccionFiscal", "direccion_fiscal"], ["colonia", "colonia"], ["municipio", "municipio"],
  ["estado", "estado"], ["codigoPostal", "codigo_postal"], ["nombreContacto", "nombre_contacto"],
  ["telefonoContacto", "telefono_contacto"], ["numeroCelular", "numero_celular"],
  ["correoElectronico", "correo_electronico"],
  ["correoElectronicoProductor", "correo_electronico_productor"],
];

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
    producerId: row.producer_id ?? undefined, isActive: row.is_active, createdAt: toIso(row.created_at),
  };
}

function mapProducer(row: QueryResultRow): Producer {
  return {
    id: row.id, displayName: row.display_name, rfc: row.rfc, zona: row.zona,
    contacto: row.contacto, email: row.email, phone: row.phone, status: row.status,
    ...json(row.profile),
    cultivo: row.cultivo ?? undefined,
    distrito: row.distrito ?? undefined,
    nombreAreaCultivo: row.nombre_area_cultivo ?? undefined,
    productor: row.productor ?? undefined,
    idCofibeCg: row.id_cofibe_cg ?? undefined,
    numeroProductor: row.numero_productor ?? undefined,
    razonSocial: row.razon_social ?? undefined,
    representanteLegal: row.representante_legal ?? undefined,
    direccionFiscal: row.direccion_fiscal ?? undefined,
    colonia: row.colonia ?? undefined,
    municipio: row.municipio ?? undefined,
    estado: row.estado ?? undefined,
    codigoPostal: row.codigo_postal ?? undefined,
    nombreContacto: row.nombre_contacto ?? undefined,
    telefonoContacto: row.telefono_contacto ?? undefined,
    numeroCelular: row.numero_celular ?? undefined,
    correoElectronico: row.correo_electronico ?? undefined,
    correoElectronicoProductor: row.correo_electronico_productor ?? undefined,
  } as Producer;
}

function mapLegalEntity(row: QueryResultRow): LegalEntity {
  return {
    id: row.id, producerId: row.producer_id, rfc: row.rfc, tipo: row.tipo,
    poderesVigentesAt: row.poderes_vigentes_at ? toIso(row.poderes_vigentes_at) : undefined,
    status: row.status,
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
    notas: row.notas ?? undefined, sourceJobId: row.source_job_id ?? undefined,
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

function mapAlertHistory(row: QueryResultRow): AlertHistoryEntry {
  return {
    id: row.id, alertId: row.alert_id, eventType: row.event_type,
    at: toIso(row.at), details: json(row.details),
  } as AlertHistoryEntry;
}

function mapMonitoringJob(row: QueryResultRow): MonitoringJob {
  return {
    id: row.id, validationTaskId: row.validation_task_id, legalEntityId: row.legal_entity_id,
    tipo: row.tipo, modo: row.modo, status: row.status, idempotencyKey: row.idempotency_key,
    attempts: Number(row.attempts), maxAttempts: Number(row.max_attempts),
    claimToken: Number(row.claim_token),
    availableAt: toIso(row.available_at), lockedAt: row.locked_at ? toIso(row.locked_at) : undefined,
    lockedBy: row.locked_by ?? undefined, lastError: row.last_error ?? undefined,
    createdAt: toIso(row.created_at), completedAt: row.completed_at ? toIso(row.completed_at) : undefined,
  } as MonitoringJob;
}

function mapIntegrationEvent(row: QueryResultRow): IntegrationEvent {
  return {
    id: row.id, jobId: row.job_id ?? undefined, validationTaskId: row.validation_task_id ?? undefined,
    provider: row.provider, operation: row.operation, status: row.status,
    correlationId: row.correlation_id, attempt: Number(row.attempt), message: row.message ?? undefined,
    metadata: json(row.metadata), occurredAt: toIso(row.occurred_at),
  } as IntegrationEvent;
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
  return one(db, `INSERT INTO app_users (id, name, email, role, producer_id, hash, is_active, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [user.id, user.name, user.email, user.role, user.producerId ?? null, user.hash, user.isActive, user.createdAt], mapUser);
}

export async function updateUser(id: string, updates: Partial<User>) {
  const fields: [string, unknown][] = [
    ["name", updates.name], ["email", updates.email], ["role", updates.role],
    ["producer_id", updates.producerId], ["hash", updates.hash], ["is_active", updates.isActive],
  ].filter(([, value]) => value !== undefined) as [string, unknown][];
  if (!fields.length) return getUser(id);
  const set = fields.map(([column], index) => `${column} = $${index + 2}`).join(", ");
  return one(pool, `UPDATE app_users SET ${set} WHERE id = $1 RETURNING *`, [id, ...fields.map(([, value]) => value)], mapUser);
}

export async function setUserProducerAssociation(
  userId: string,
  producerId: string,
  db?: Queryable,
) {
  const updateAssociation = async (client: Queryable) => {
    const user = await one(client, "SELECT * FROM app_users WHERE id = $1 FOR UPDATE", [userId], mapUser);
    if (!user) return { kind: "USER_NOT_FOUND" as const };
    if (user.role !== "PRODUCER") return { kind: "NOT_PRODUCER_ACCOUNT" as const };

    const producer = await one(
      client,
      "SELECT id FROM producers WHERE id = $1",
      [producerId],
      (row) => String(row.id),
    );
    if (!producer) return { kind: "PRODUCER_NOT_FOUND" as const };

    const updatedUser = await one(
      client,
      "UPDATE app_users SET producer_id = $2 WHERE id = $1 RETURNING *",
      [userId, producerId],
      mapUser,
    );
    return { kind: "UPDATED" as const, user: updatedUser! };
  };

  return db ? updateAssociation(db) : withTransaction(updateAssociation);
}

export async function getProducers(
  filters?: { producerId?: string; zona?: string; distrito?: string; status?: string; limit?: number; offset?: number },
  db: Queryable = pool,
) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters?.producerId) { values.push(filters.producerId); conditions.push(`id = $${values.length}`); }
  if (filters?.zona) { values.push(filters.zona); conditions.push(`zona = $${values.length}`); }
  if (filters?.distrito) { values.push(filters.distrito); conditions.push(`distrito = $${values.length}`); }
  if (filters?.status) { values.push(filters.status); conditions.push(`status = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM producers ${where}`, values);
  const pageValues = [...values];
  let paging = "";
  if (filters?.limit !== undefined) { pageValues.push(filters.limit); paging += ` LIMIT $${pageValues.length}`; }
  if (filters?.offset !== undefined) { pageValues.push(filters.offset); paging += ` OFFSET $${pageValues.length}`; }
  const result = await db.query(`SELECT * FROM producers ${where} ORDER BY display_name ASC, id ASC${paging}`, pageValues);
  return { producers: result.rows.map(mapProducer), total: count.rows[0].total as number };
}

export type ProducerListCounts = {
  legalEntitiesCount: number;
  ranchesCount: number;
  cropsCount: number;
};

export async function getProducerListCounts(producerIds: string[], db: Queryable = pool) {
  const counts = new Map<string, ProducerListCounts>();
  if (!producerIds.length) return counts;
  const result = await db.query(
    `SELECT p.id,
            COUNT(DISTINCT le.id)::int AS legal_entities_count,
            COUNT(DISTINCT r.id)::int AS ranches_count,
            COUNT(DISTINCT c.id)::int AS crops_count
       FROM producers p
       LEFT JOIN legal_entities le ON le.producer_id = p.id
       LEFT JOIN ranches r ON r.producer_id = p.id
       LEFT JOIN crops c ON c.ranch_id = r.id
      WHERE p.id = ANY($1::text[])
      GROUP BY p.id`,
    [producerIds],
  );
  for (const row of result.rows) {
    counts.set(String(row.id), {
      legalEntitiesCount: Number(row.legal_entities_count),
      ranchesCount: Number(row.ranches_count),
      cropsCount: Number(row.crops_count),
    });
  }
  return counts;
}

export async function getProducerDistricts(producerId?: string, db: Queryable = pool) {
  const values: unknown[] = [];
  let producerScope = "";
  if (producerId) {
    values.push(producerId);
    producerScope = ` AND id = $${values.length}`;
  }
  const result = await db.query(
    `SELECT DISTINCT distrito
       FROM producers
      WHERE distrito IS NOT NULL
        AND btrim(distrito) <> ''${producerScope}
      ORDER BY distrito`,
    values,
  );
  return result.rows.map((row) => String(row.distrito));
}

export async function getProducer(id: string) {
  return one(pool, "SELECT * FROM producers WHERE id = $1", [id], mapProducer);
}

export async function createProducer(producer: Producer, db: Queryable = pool) {
  const typedColumns = producerTypedColumns.map(([, column]) => column);
  const typedValues = producerTypedColumns.map(([key]) => producer[key] ?? null);
  const placeholders = typedValues.map((_, index) => `$${index + 10}`);
  return one(db, `INSERT INTO producers
    (id, display_name, rfc, zona, contacto, email, phone, status, profile, ${typedColumns.join(", ")})
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, ${placeholders.join(", ")}) RETURNING *`,
    [producer.id, producer.displayName, producer.rfc, producer.zona, producer.contacto, producer.email,
      producer.phone, producer.status ?? null, JSON.stringify(producerProfile(producer)), ...typedValues], mapProducer);
}

export async function updateProducer(id: string, updates: Partial<Producer>, db: Queryable = pool) {
  const fields: [string, unknown][] = [
    ["display_name", updates.displayName], ["rfc", updates.rfc], ["zona", updates.zona],
    ["contacto", updates.contacto], ["email", updates.email], ["phone", updates.phone], ["status", updates.status],
    ...producerTypedColumns.map(([key, column]) => [column, updates[key]] as [string, unknown]),
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

export async function getCropsForProducer(producerId: string) {
  const result = await pool.query(`
    SELECT crops.* FROM crops
    INNER JOIN ranches ON ranches.id = crops.ranch_id
    WHERE ranches.producer_id = $1
    ORDER BY crops.temporada DESC
  `, [producerId]);
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
    (id, legal_entity_id, periodo, liquidez, endeudamiento_pct, ingresos_anuales, egresos_anuales, notas, source_job_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (source_job_id) WHERE source_job_id IS NOT NULL DO UPDATE
    SET notas = EXCLUDED.notas
    RETURNING *`,
    [snapshot.id, snapshot.legalEntityId, snapshot.periodo, snapshot.liquidez, snapshot.endeudamientoPct,
      snapshot.ingresosAnuales, snapshot.egresosAnuales, snapshot.notas ?? null, snapshot.sourceJobId ?? null], mapFinancialSnapshot);
}

export async function getValidationTasks(legalEntityId?: string) {
  const result = legalEntityId
    ? await pool.query("SELECT * FROM validation_tasks WHERE legal_entity_id = $1 ORDER BY executed_at DESC", [legalEntityId])
    : await pool.query("SELECT * FROM validation_tasks ORDER BY executed_at DESC");
  return result.rows.map(mapValidationTask);
}

export async function getValidationTasksForProducer(producerId: string) {
  const result = await pool.query(`
    SELECT validation_tasks.* FROM validation_tasks
    INNER JOIN legal_entities ON legal_entities.id = validation_tasks.legal_entity_id
    WHERE legal_entities.producer_id = $1
    ORDER BY validation_tasks.executed_at DESC
  `, [producerId]);
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

export async function createMonitoringJob(input: {
  id: string;
  validationTask: ValidationTask;
  idempotencyKey: string;
  maxAttempts?: number;
}, db: Queryable = pool): Promise<{ job: MonitoringJob; created: boolean }> {
  const create = async (client: PoolClient) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.idempotencyKey]);
    const existing = await one(
      client,
      "SELECT * FROM monitoring_jobs WHERE idempotency_key = $1",
      [input.idempotencyKey],
      mapMonitoringJob,
    );
    if (existing) return { job: existing, created: false };
    await createValidationTask(input.validationTask, client);
    const job = await one(client, `INSERT INTO monitoring_jobs
      (id, validation_task_id, legal_entity_id, tipo, modo, status, idempotency_key, max_attempts, available_at, created_at)
      VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, NOW(), NOW()) RETURNING *`,
      [input.id, input.validationTask.id, input.validationTask.legalEntityId, input.validationTask.tipo,
        input.validationTask.modo, input.idempotencyKey, input.maxAttempts ?? 4],
      mapMonitoringJob,
    );
    if (!job) throw new Error("Could not create monitoring job");
    return { job, created: true };
  };
  if (!isTransactionClient(db)) return withTransaction(create);
  return create(db);
}

export async function claimMonitoringJobs(workerId: string, limit = 10): Promise<MonitoringJob[]> {
  return withTransaction(async (client) => {
    const result = await client.query(`WITH ready AS (
      SELECT id FROM monitoring_jobs
      WHERE status IN ('PENDING', 'RETRY') AND available_at <= NOW()
      ORDER BY available_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $1
    )
    UPDATE monitoring_jobs AS job
    SET status = 'RUNNING', attempts = job.attempts + 1, claim_token = job.claim_token + 1,
      locked_at = NOW(), locked_by = $2
    FROM ready WHERE job.id = ready.id
    RETURNING job.*`, [limit, workerId]);
    return result.rows.map(mapMonitoringJob);
  });
}

export async function completeMonitoringJob(
  id: string,
  workerId: string,
  claimToken: number,
  validation: Pick<ValidationTask, "estado" | "payloadOut">,
  db: Queryable = pool,
) {
  const complete = async (client: PoolClient) => {
    const job = await one(client, `UPDATE monitoring_jobs
      SET status = 'COMPLETED', completed_at = NOW(), locked_at = NULL, locked_by = NULL, last_error = NULL
      WHERE id = $1 AND status = 'RUNNING' AND locked_by = $2 AND claim_token = $3 RETURNING *`,
      [id, workerId, claimToken], mapMonitoringJob);
    if (!job) return null;
    await updateValidationTask(job.validationTaskId, validation, client);
    const entityRisk = await client.query(`SELECT CASE
      WHEN EXISTS (SELECT 1 FROM alerts WHERE legal_entity_id = $1 AND resolved_at IS NULL AND severity = 'HIGH') THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM alerts WHERE legal_entity_id = $1 AND resolved_at IS NULL AND severity = 'MEDIUM') THEN 'RISK'
      ELSE 'OK' END AS status`, [job.legalEntityId]);
    const entityStatus = entityRisk.rows[0].status;
    await updateLegalEntity(job.legalEntityId, { status: entityStatus }, client);
    await client.query(`UPDATE producers AS producer SET status = CASE
      WHEN EXISTS (
        SELECT 1 FROM alerts
        INNER JOIN legal_entities ON legal_entities.id = alerts.legal_entity_id
        WHERE legal_entities.producer_id = producer.id AND alerts.resolved_at IS NULL AND alerts.severity = 'HIGH'
      ) THEN 'FAIL'
      WHEN EXISTS (
        SELECT 1 FROM alerts
        INNER JOIN legal_entities ON legal_entities.id = alerts.legal_entity_id
        WHERE legal_entities.producer_id = producer.id AND alerts.resolved_at IS NULL AND alerts.severity = 'MEDIUM'
      ) THEN 'RISK'
      ELSE 'OK' END
      WHERE producer.id = (SELECT producer_id FROM legal_entities WHERE id = $1)`, [job.legalEntityId]);
    return job;
  };
  if (!isTransactionClient(db)) return withTransaction(complete);
  return complete(db);
}

export async function retryMonitoringJob(id: string, workerId: string, claimToken: number, error: string, retryAt: Date, db: Queryable = pool) {
  return one(db, `UPDATE monitoring_jobs
    SET status = CASE WHEN attempts >= max_attempts THEN 'FAILED' ELSE 'RETRY' END,
      available_at = CASE WHEN attempts >= max_attempts THEN available_at ELSE $5 END,
      completed_at = CASE WHEN attempts >= max_attempts THEN NOW() ELSE NULL END,
      locked_at = NULL, locked_by = NULL, last_error = $4
    WHERE id = $1 AND status = 'RUNNING' AND locked_by = $2 AND claim_token = $3 RETURNING *`,
    [id, workerId, claimToken, error.slice(0, 1000), retryAt.toISOString()], mapMonitoringJob);
}

export async function failMonitoringJob(id: string, workerId: string, claimToken: number, error: string, db: Queryable = pool) {
  return one(db, `UPDATE monitoring_jobs
    SET status = 'FAILED', completed_at = NOW(), locked_at = NULL, locked_by = NULL, last_error = $4
    WHERE id = $1 AND status = 'RUNNING' AND locked_by = $2 AND claim_token = $3 RETURNING *`,
    [id, workerId, claimToken, error.slice(0, 1000)], mapMonitoringJob);
}

export async function transitionMonitoringJobFailure(
  id: string,
  workerId: string,
  claimToken: number,
  error: string,
  retryable: boolean,
  retryAt: Date,
  provider: string,
) {
  return withTransaction(async (client) => {
    const job = await one(client, `UPDATE monitoring_jobs
      SET status = CASE WHEN $4::boolean = FALSE OR attempts >= max_attempts THEN 'FAILED' ELSE 'RETRY' END,
        available_at = CASE WHEN $4::boolean = FALSE OR attempts >= max_attempts THEN available_at ELSE $6 END,
        completed_at = CASE WHEN $4::boolean = FALSE OR attempts >= max_attempts THEN NOW() ELSE NULL END,
        locked_at = NULL, locked_by = NULL, last_error = $5
      WHERE id = $1 AND status = 'RUNNING' AND locked_by = $2 AND claim_token = $3
      RETURNING *`,
      [id, workerId, claimToken, retryable, error.slice(0, 1000), retryAt.toISOString()],
      mapMonitoringJob);
    if (!job) return null;
    const final = job.status === "FAILED";
    await updateValidationTask(job.validationTaskId, {
      estado: final ? "FAIL" : "PENDIENTE",
      payloadOut: { error, retryAt: final ? undefined : job.availableAt, final },
    }, client);
    await createIntegrationEvent({
      id: `integration-${job.id}-${claimToken}`,
      jobId: job.id, validationTaskId: job.validationTaskId, provider, operation: job.tipo,
      status: final ? "FAILED" : "RETRYING", correlationId: job.id, attempt: job.attempts,
      message: error, metadata: {}, occurredAt: new Date().toISOString(),
    }, client);
    return job;
  });
}

export async function recoverStalledMonitoringJobs() {
  return withTransaction(async (client) => {
    const stale = await client.query(`SELECT * FROM monitoring_jobs
      WHERE status = 'RUNNING' AND locked_at < NOW() - INTERVAL '10 minutes'
      FOR UPDATE SKIP LOCKED`);
    const recovered: MonitoringJob[] = [];
    for (const row of stale.rows) {
      const job = mapMonitoringJob(row);
      const updated = await one(client, `UPDATE monitoring_jobs
        SET status = CASE WHEN attempts >= max_attempts THEN 'FAILED' ELSE 'RETRY' END,
          available_at = NOW(), completed_at = CASE WHEN attempts >= max_attempts THEN NOW() ELSE NULL END,
          locked_at = NULL, locked_by = NULL, last_error = 'Worker lease expired'
        WHERE id = $1 AND status = 'RUNNING' AND claim_token = $2
        RETURNING *`, [job.id, job.claimToken], mapMonitoringJob);
      if (!updated) continue;
      const final = updated.status === "FAILED";
      await updateValidationTask(updated.validationTaskId, {
        estado: final ? "FAIL" : "PENDIENTE",
        payloadOut: { error: "Worker lease expired", retryAt: final ? undefined : updated.availableAt, final },
      }, client);
      await createIntegrationEvent({
        id: `integration-recovery-${updated.id}-${updated.claimToken}`,
        jobId: updated.id, validationTaskId: updated.validationTaskId,
        provider: "WORKER", operation: updated.tipo,
        status: final ? "FAILED" : "RETRYING", correlationId: updated.id,
        attempt: updated.attempts, message: "Worker lease expired", metadata: {},
        occurredAt: new Date().toISOString(),
      }, client);
      recovered.push(updated);
    }
    return recovered;
  });
}

export async function renewMonitoringJobLease(id: string, workerId: string, claimToken: number) {
  const result = await pool.query(`UPDATE monitoring_jobs SET locked_at = NOW()
    WHERE id = $1 AND status = 'RUNNING' AND locked_by = $2 AND claim_token = $3`,
    [id, workerId, claimToken]);
  return result.rowCount === 1;
}

export async function getMonitoringJobs(filters: { status?: string; limit?: number } = {}) {
  const values: unknown[] = [];
  const conditions: string[] = [];
  if (filters.status) { values.push(filters.status); conditions.push(`status = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  if (filters.limit) values.push(filters.limit);
  const limit = filters.limit ? ` LIMIT $${values.length}` : "";
  const result = await pool.query(`SELECT * FROM monitoring_jobs ${where} ORDER BY created_at DESC${limit}`, values);
  return result.rows.map(mapMonitoringJob);
}

export async function getMonitoringJobSummary() {
  const result = await pool.query(`SELECT status, COUNT(*)::int AS count
    FROM monitoring_jobs GROUP BY status`);
  return Object.fromEntries(result.rows.map((row) => [row.status, Number(row.count)])) as Record<string, number>;
}

export async function acquireProviderRateLimit(provider: string, requestsPerMinute: number) {
  const intervalMs = Math.ceil(60_000 / requestsPerMinute);
  return withTransaction(async (client) => {
    await client.query(`INSERT INTO provider_rate_limits (provider, next_available_at)
      VALUES ($1, NOW()) ON CONFLICT (provider) DO NOTHING`, [provider]);
    const current = await client.query(
      "SELECT next_available_at FROM provider_rate_limits WHERE provider = $1 FOR UPDATE",
      [provider],
    );
    const nextAvailableAt = new Date(current.rows[0].next_available_at).getTime();
    const now = Date.now();
    const scheduledAt = Math.max(now, nextAvailableAt);
    await client.query(
      "UPDATE provider_rate_limits SET next_available_at = $2 WHERE provider = $1",
      [provider, new Date(scheduledAt + intervalMs).toISOString()],
    );
    return Math.max(0, scheduledAt - now);
  });
}

export async function createIntegrationEvent(event: IntegrationEvent, db: Queryable = pool) {
  return one(db, `INSERT INTO integration_events
    (id, job_id, validation_task_id, provider, operation, status, correlation_id, attempt, message, metadata, occurred_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11) RETURNING *`,
    [event.id, event.jobId ?? null, event.validationTaskId ?? null, event.provider, event.operation,
      event.status, event.correlationId, event.attempt, event.message ?? null,
      JSON.stringify(event.metadata), event.occurredAt], mapIntegrationEvent);
}

export async function getIntegrationEvents(filters: { status?: string; limit?: number } = {}) {
  const values: unknown[] = [];
  const conditions: string[] = [];
  if (filters.status) { values.push(filters.status); conditions.push(`status = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  if (filters.limit) values.push(filters.limit);
  const limit = filters.limit ? ` LIMIT $${values.length}` : "";
  const result = await pool.query(`SELECT * FROM integration_events ${where} ORDER BY occurred_at DESC${limit}`, values);
  return result.rows.map(mapIntegrationEvent);
}

export async function getAlerts(filters?: {
  legalEntityId?: string;
  producerId?: string;
  severity?: string;
  zona?: string;
  resolved?: boolean;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const needsProducerJoin = Boolean(filters?.producerId || filters?.zona);
  const from = needsProducerJoin
    ? "FROM alerts INNER JOIN legal_entities ON legal_entities.id = alerts.legal_entity_id INNER JOIN producers ON producers.id = legal_entities.producer_id"
    : "FROM alerts";
  if (filters?.legalEntityId) { values.push(filters.legalEntityId); conditions.push(`alerts.legal_entity_id = $${values.length}`); }
  if (filters?.producerId) { values.push(filters.producerId); conditions.push(`legal_entities.producer_id = $${values.length}`); }
  if (filters?.zona) { values.push(filters.zona); conditions.push(`producers.zona = $${values.length}`); }
  if (filters?.severity) { values.push(filters.severity); conditions.push(`alerts.severity = $${values.length}`); }
  if (filters?.resolved !== undefined) conditions.push(filters.resolved ? "alerts.resolved_at IS NOT NULL" : "alerts.resolved_at IS NULL");
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await pool.query(`SELECT COUNT(*)::int AS total ${from} ${where}`, values);
  const pageValues = [...values];
  let paging = "";
  if (filters?.limit !== undefined) { pageValues.push(filters.limit); paging += ` LIMIT $${pageValues.length}`; }
  if (filters?.offset !== undefined) { pageValues.push(filters.offset); paging += ` OFFSET $${pageValues.length}`; }
  const result = await pool.query(`SELECT alerts.* ${from} ${where} ORDER BY alerts.created_at DESC${paging}`, pageValues);
  return { alerts: result.rows.map(mapAlert), total: count.rows[0].total as number };
}

export async function getAlert(id: string) {
  return one(pool, "SELECT * FROM alerts WHERE id = $1", [id], mapAlert);
}

export async function producerCanAccessAlert(alertId: string, producerId: string) {
  const result = await pool.query(`SELECT 1 FROM alerts
    INNER JOIN legal_entities ON legal_entities.id = alerts.legal_entity_id
    WHERE alerts.id = $1 AND legal_entities.producer_id = $2`, [alertId, producerId]);
  return result.rowCount === 1;
}

export async function createAlert(alert: Alert, db: Queryable = pool) {
  return one(db, `INSERT INTO alerts (id, legal_entity_id, rule_code, severity, message, created_at, resolved_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [alert.id, alert.legalEntityId, alert.ruleCode, alert.severity, alert.message, alert.createdAt, alert.resolvedAt ?? null], mapAlert);
}

export async function createAlertHistory(entry: AlertHistoryEntry, db: Queryable = pool) {
  return one(db, `INSERT INTO alert_history (id, alert_id, event_type, at, details)
    VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
    [entry.id, entry.alertId, entry.eventType, entry.at, JSON.stringify(entry.details)], mapAlertHistory);
}

export async function getAlertHistory(alertId: string) {
  const result = await pool.query("SELECT * FROM alert_history WHERE alert_id = $1 ORDER BY at DESC", [alertId]);
  return result.rows.map(mapAlertHistory);
}

export async function upsertRuleAlert(alert: Alert, db: Queryable = pool) {
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${alert.legalEntityId}:${alert.ruleCode}`]);
  const active = await one(db, `SELECT * FROM alerts
    WHERE legal_entity_id = $1 AND rule_code = $2 AND resolved_at IS NULL
    FOR UPDATE`, [alert.legalEntityId, alert.ruleCode], mapAlert);
  if (!active) {
    const created = await createAlert(alert, db);
    if (!created) throw new Error("Could not create alert");
    await createAlertHistory({
      id: `history-${alert.id}`, alertId: alert.id, eventType: "OPENED", at: alert.createdAt,
      details: { severity: alert.severity, message: alert.message },
    }, db);
    return { alert: created, created: true };
  }
  if (active.severity !== alert.severity || active.message !== alert.message) {
    const updated = await updateAlert(active.id, { severity: alert.severity, message: alert.message }, db);
    await createAlertHistory({
      id: `history-${alert.id}`, alertId: active.id, eventType: "UPDATED", at: alert.createdAt,
      details: { severity: alert.severity, message: alert.message },
    }, db);
    return { alert: updated!, created: false };
  }
  return { alert: active, created: false };
}

export async function autoResolveRuleAlerts(legalEntityId: string, ruleCodes: string[], db: Queryable = pool) {
  if (!ruleCodes.length) return [];
  const result = await db.query(`UPDATE alerts SET resolved_at = NOW()
    WHERE legal_entity_id = $1 AND resolved_at IS NULL AND rule_code = ANY($2::text[])
    RETURNING *`, [legalEntityId, ruleCodes]);
  const resolved = result.rows.map(mapAlert);
  for (const alert of resolved) {
    await createAlertHistory({
      id: `history-auto-${alert.id}-${Date.now()}`, alertId: alert.id, eventType: "AUTO_RESOLVED",
      at: alert.resolvedAt!, details: { reason: "Rule condition is no longer present" },
    }, db);
  }
  return resolved;
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
    await createAlertHistory({
      id: `history-resolved-${alert.id}-${Date.now()}`, alertId: alert.id, eventType: "RESOLVED",
      at: alert.resolvedAt!, details: { actorUserId: audit.actorUserId },
    }, client);
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

export async function importProducerRows(
  rows: Array<Record<string, string>>,
  actorUserId: string,
  mode: "ALL_OR_NOTHING" | "VALID_ONLY" = "ALL_OR_NOTHING",
  auditMetadata: Record<string, unknown> = {},
) {
  const { generateId } = await import("@/lib/utils");
  const columns = [
    "cultivo", "distrito", "nombre_area_cultivo", "productor", "id_cofibe_cg",
    "numero_productor", "razon_social", "representante_legal", "direccion_fiscal",
    "colonia", "municipio", "estado", "codigo_postal", "rfc", "nombre_contacto",
    "telefono_contacto", "numero_celular", "correo_electronico", "correo_electronico_productor",
  ];
  const keys = ["Cultivo", "Distrito", "Growing Area Name", "Productor (Grower)", "COFIBE/ ID CG",
    "Grower #", "Razón Social (Company name)", "Representante Legal (Administrator)", "Dirección Fiscal (Address)", "Colonia",
    "Municipio", "Estado", "Zip Code", "RFC (Tax ID)", "Contact", "Telephone number",
    "Cellular number", "Email", "Email productor"];
  return withTransaction(async (client) => {
    let created = 0; let updated = 0;
    // Deliberately sequential: this keeps lock ordering deterministic and makes
    // retries safe even for very large workbooks.
    for (let offset = 0; offset < rows.length; offset += 250) {
      for (const row of rows.slice(offset, offset + 250)) {
        const values = keys.map((key) => row[key] ?? "");
        const rfc = values[13].trim().toUpperCase();
        const candidateId = generateId();
        const upserted = await client.query(`INSERT INTO producers
            (id, display_name, rfc, zona, contacto, email, phone, status, profile, ${columns.filter((c) => c !== "rfc").join(", ")})
            VALUES ($20, COALESCE(NULLIF($4, ''), $14), $14, $2, $15, $18, $16, 'PENDIENTE', '{}'::jsonb,
              ${columns.filter((c) => c !== "rfc").map((c) => `$${columns.indexOf(c) + 1}`).join(", ")})
            ON CONFLICT (upper(btrim(rfc))) WHERE btrim(rfc) <> ''
            DO UPDATE SET
              ${columns.filter((c) => c !== "rfc").map((c) => `${c} = EXCLUDED.${c}`).join(", ")},
              rfc = EXCLUDED.rfc,
              display_name = EXCLUDED.display_name,
              zona = EXCLUDED.zona,
              contacto = EXCLUDED.contacto,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone
            RETURNING id, (xmax = 0) AS inserted`,
          [...values, candidateId]);
        const producerId = String(upserted.rows[0].id);
        if (upserted.rows[0].inserted) created++;
        else updated++;
        const tipo = rfc.length === 12 ? "MORAL" : "FISICA";
        await client.query(`INSERT INTO legal_entities (id, producer_id, rfc, tipo, status)
          VALUES ($1, $2, $3, $4, 'PENDIENTE')
          ON CONFLICT (producer_id, (upper(btrim(rfc)))) DO UPDATE SET tipo = EXCLUDED.tipo`,
          [generateId(), producerId, rfc, tipo]);
      }
    }
    await createAuditLog({
      id: generateId(), actorUserId, action: "PRODUCER_BULK_IMPORT",
      targetType: "PRODUCER_IMPORT",
      targetId: String(auditMetadata.batchId ?? generateId()),
      at: new Date().toISOString(),
      metadata: { ...auditMetadata, mode, rows: rows.length, created, updated },
    }, client);
    return { created, updated, imported: rows.length };
  });
}

export async function getProducerImportDatabaseIssues(rows: ProducerImportRow[], rowNumbers: number[], db: Queryable = pool) {
  if (!rows.length) return { errors: [] as ImportError[], warnings: [] as ImportError[] };
  const rfcs = rows.map((row) => row["RFC (Tax ID)"]);
  const growerNumbers = rows.map((row) => row["Grower #"]);
  const result = await db.query(
    `SELECT upper(btrim(rfc)) AS rfc, numero_productor
       FROM producers
      WHERE upper(btrim(rfc)) = ANY($1::text[])
         OR numero_productor = ANY($2::text[])`,
    [rfcs, growerNumbers],
  );
  const rfcSet = new Set(result.rows.map((row) => String(row.rfc)));
  const growerOwners = new Map(
    result.rows
      .filter((row) => row.numero_productor)
      .map((row) => [String(row.numero_productor), String(row.rfc)]),
  );
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];
  rows.forEach((row, index) => {
    const rowNumber = rowNumbers[index];
    const rfc = row["RFC (Tax ID)"];
    if (rfcSet.has(rfc)) {
      warnings.push({
        row: rowNumber,
        field: "RFC (Tax ID)",
        code: "EXISTING_RFC",
        message: "El RFC ya existe y se actualizará.",
      });
    }
    const ownerRfc = growerOwners.get(row["Grower #"]);
    if (ownerRfc && ownerRfc !== rfc) {
      errors.push({
        row: rowNumber,
        field: "Grower #",
        code: "EXISTING_GROWER_NUMBER",
        message: `Grower # ya pertenece a otro RFC (${ownerRfc}).`,
      });
    }
  });
  return { errors, warnings };
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
    const alertHistory = (await client.query("SELECT * FROM alert_history ORDER BY id")).rows.map(mapAlertHistory);
    const monitoringJobs = (await client.query("SELECT * FROM monitoring_jobs ORDER BY id")).rows.map(mapMonitoringJob);
    const integrationEvents = (await client.query("SELECT * FROM integration_events ORDER BY id")).rows.map(mapIntegrationEvent);
    const rules = (await client.query("SELECT * FROM rules ORDER BY id")).rows.map(mapRule);
    const auditLogs = (await client.query("SELECT * FROM audit_logs ORDER BY id")).rows.map(mapAuditLog);
    return {
      users, producers, legalEntities, ranches, crops, financialSnapshots,
      validationTasks, alerts, alertHistory, monitoringJobs, integrationEvents, rules, auditLogs,
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
    UNION ALL SELECT 'alertHistory', COUNT(*)::int FROM alert_history
    UNION ALL SELECT 'monitoringJobs', COUNT(*)::int FROM monitoring_jobs
    UNION ALL SELECT 'integrationEvents', COUNT(*)::int FROM integration_events
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
         (SELECT COUNT(*) FROM alert_history) +
         (SELECT COUNT(*) FROM monitoring_jobs) +
         (SELECT COUNT(*) FROM integration_events) +
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
        DELETE FROM integration_events;
        DELETE FROM financial_snapshots;
        DELETE FROM alert_history;
        DELETE FROM monitoring_jobs;
        DELETE FROM alerts;
        DELETE FROM validation_tasks;
        DELETE FROM crops;
        DELETE FROM ranches;
        DELETE FROM legal_entities;
        DELETE FROM rules;
        DELETE FROM app_users;
        DELETE FROM producers;
      `);
    }

    for (const producer of snapshot.producers) await createProducer(producer, client);
    for (const user of snapshot.users) await createUser(user, client);
    for (const entity of snapshot.legalEntities) await createLegalEntity(entity, client);
    for (const ranch of snapshot.ranches) await createRanch(ranch, client);
    for (const crop of snapshot.crops) await createCrop(crop, client);
    for (const task of snapshot.validationTasks) await createValidationTask(task, client);
    for (const rule of snapshot.rules) await createRule(rule, client);
    for (const alert of snapshot.alerts) await createAlert(alert, client);
    for (const entry of snapshot.alertHistory) await createAlertHistory(entry, client);
    for (const job of snapshot.monitoringJobs) {
      await one(client, `INSERT INTO monitoring_jobs
        (id, validation_task_id, legal_entity_id, tipo, modo, status, idempotency_key, attempts, max_attempts, claim_token, available_at, locked_at, locked_by, last_error, created_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
        [job.id, job.validationTaskId, job.legalEntityId, job.tipo, job.modo, job.status, job.idempotencyKey,
          job.attempts, job.maxAttempts, job.claimToken, job.availableAt, job.lockedAt ?? null, job.lockedBy ?? null,
          job.lastError ?? null, job.createdAt, job.completedAt ?? null], mapMonitoringJob);
    }
    for (const financialSnapshot of snapshot.financialSnapshots) await createFinancialSnapshot(financialSnapshot, client);
    for (const event of snapshot.integrationEvents) await createIntegrationEvent(event, client);
    for (const log of snapshot.auditLogs) await createAuditLog(log, client);
  });
}