export type UserRole = "ADMIN" | "ANALYST" | "PRODUCER";

export type LegalEntityType = "MORAL" | "FISICA";

export type CropType = "FRESA" | "FRAMBUESA" | "ARANDANO" | "MORA";

export type ValidationTaskType = "SAT" | "IMSS" | "FINANCIERA" | "LEGAL";

export type ValidationTaskMode = "ONE_SHOT" | "RECURRENTE";

export type ValidationTaskStatus = "PENDIENTE" | "OK" | "RISK" | "FAIL";

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH";

export type RuleEvaluatorType = "THRESHOLD" | "BOOLEAN" | "CUSTOM";

export type MonitoringJobStatus = "PENDING" | "RUNNING" | "RETRY" | "COMPLETED" | "FAILED";

export type IntegrationEventStatus = "SUCCESS" | "RETRYING" | "FAILED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  producerId?: string;
  hash: string;
  isActive: boolean;
  createdAt: string;
}

export interface Producer {
  id: string;
  displayName: string;
  rfc: string;
  zona: string;
  contacto: string;
  email: string;
  phone: string;
  status?: ValidationTaskStatus;
  cultivo?: string;
  distrito?: string;
  nombreAreaCultivo?: string;
  productor?: string;
  idCofibeCg?: string;
  numeroProductor?: string;
  razonSocial?: string;
  representanteLegal?: string;
  direccionFiscal?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  codigoPostal?: string;
  nombreContacto?: string;
  telefonoContacto?: string;
  numeroCelular?: string;
  correoElectronico?: string;
  correoElectronicoProductor?: string;
}

export interface LegalEntity {
  id: string;
  producerId: string;
  rfc: string;
  tipo: LegalEntityType;
  poderesVigentesAt: string;
  status: ValidationTaskStatus;
}

export interface Ranch {
  id: string;
  producerId: string;
  nombre: string;
  zona: string;
  hectareas: number;
  empleados: number;
}

export interface Crop {
  id: string;
  ranchId: string;
  tipo: CropType;
  temporada: string;
}

export interface FinancialSnapshot {
  id: string;
  legalEntityId: string;
  periodo: string;
  liquidez: number;
  endeudamientoPct: number;
  ingresosAnuales: number;
  egresosAnuales: number;
  notas?: string;
  sourceJobId?: string;
}

export interface ValidationTask {
  id: string;
  legalEntityId: string;
  tipo: ValidationTaskType;
  modo: ValidationTaskMode;
  estado: ValidationTaskStatus;
  executedAt: string;
  payloadIn: Record<string, any>;
  payloadOut: Record<string, any>;
}

export interface Alert {
  id: string;
  legalEntityId: string;
  ruleCode: string;
  severity: AlertSeverity;
  message: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AlertHistoryEntry {
  id: string;
  alertId: string;
  eventType: "OPENED" | "UPDATED" | "RESOLVED" | "AUTO_RESOLVED";
  at: string;
  details: Record<string, unknown>;
}

export interface MonitoringJob {
  id: string;
  validationTaskId: string;
  legalEntityId: string;
  tipo: ValidationTaskType;
  modo: ValidationTaskMode;
  status: MonitoringJobStatus;
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  claimToken: number;
  availableAt: string;
  lockedAt?: string;
  lockedBy?: string;
  lastError?: string;
  createdAt: string;
  completedAt?: string;
}

export interface IntegrationEvent {
  id: string;
  jobId?: string;
  validationTaskId?: string;
  provider: string;
  operation: string;
  status: IntegrationEventStatus;
  correlationId: string;
  attempt: number;
  message?: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface Rule {
  id: string;
  code: string;
  name: string;
  description: string;
  severityDefault: AlertSeverity;
  isActive: boolean;
  evaluatorType: RuleEvaluatorType;
  config: Record<string, any>;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  at: string;
  metadata: Record<string, any>;
}

export interface Database {
  users: User[];
  producers: Producer[];
  legalEntities: LegalEntity[];
  ranches: Ranch[];
  crops: Crop[];
  financialSnapshots: FinancialSnapshot[];
  validationTasks: ValidationTask[];
  alerts: Alert[];
  alertHistory: AlertHistoryEntry[];
  monitoringJobs: MonitoringJob[];
  integrationEvents: IntegrationEvent[];
  rules: Rule[];
  auditLogs: AuditLog[];
}
