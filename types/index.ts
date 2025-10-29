export type UserRole = "ADMIN" | "ANALYST" | "PRODUCER";

export type LegalEntityType = "MORAL" | "FISICA";

export type CropType = "FRESA" | "FRAMBUESA" | "ARANDANO" | "MORA";

export type ValidationTaskType = "SAT" | "IMSS" | "FINANCIERA" | "LEGAL";

export type ValidationTaskMode = "ONE_SHOT" | "RECURRENTE";

export type ValidationTaskStatus = "PENDIENTE" | "OK" | "RISK" | "FAIL";

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH";

export type RuleEvaluatorType = "THRESHOLD" | "BOOLEAN" | "CUSTOM";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  rules: Rule[];
  auditLogs: AuditLog[];
}
