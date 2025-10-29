import fs from "fs";
import path from "path";
import type { Database } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getEmptyDatabase(): Database {
  return {
    users: [],
    producers: [],
    legalEntities: [],
    ranches: [],
    crops: [],
    financialSnapshots: [],
    validationTasks: [],
    alerts: [],
    rules: [],
    auditLogs: [],
  };
}

export function readDatabase(): Database {
  ensureDataDir();
  
  if (!fs.existsSync(DB_FILE)) {
    return getEmptyDatabase();
  }

  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return getEmptyDatabase();
  }
}

export function writeDatabase(db: Database): void {
  ensureDataDir();
  
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database:", error);
    throw error;
  }
}

export function getUsers() {
  return readDatabase().users;
}

export function getUser(id: string) {
  return readDatabase().users.find((u) => u.id === id);
}

export function getUserByEmail(email: string) {
  return readDatabase().users.find((u) => u.email === email);
}

export function createUser(user: any) {
  const db = readDatabase();
  db.users.push(user);
  writeDatabase(db);
  return user;
}

export function updateUser(id: string, updates: Partial<any>) {
  const db = readDatabase();
  const index = db.users.findIndex((u) => u.id === id);
  if (index !== -1) {
    db.users[index] = { ...db.users[index], ...updates };
    writeDatabase(db);
    return db.users[index];
  }
  return null;
}

export function getProducers(filters?: {
  zona?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  let producers = readDatabase().producers;

  if (filters?.zona) {
    producers = producers.filter((p) => p.zona === filters.zona);
  }

  if (filters?.status) {
    producers = producers.filter((p) => p.status === filters.status);
  }

  const total = producers.length;

  if (filters?.offset !== undefined) {
    producers = producers.slice(filters.offset);
  }

  if (filters?.limit !== undefined) {
    producers = producers.slice(0, filters.limit);
  }

  return { producers, total };
}

export function getProducer(id: string) {
  return readDatabase().producers.find((p) => p.id === id);
}

export function createProducer(producer: any) {
  const db = readDatabase();
  db.producers.push(producer);
  writeDatabase(db);
  return producer;
}

export function updateProducer(id: string, updates: Partial<any>) {
  const db = readDatabase();
  const index = db.producers.findIndex((p) => p.id === id);
  if (index !== -1) {
    db.producers[index] = { ...db.producers[index], ...updates };
    writeDatabase(db);
    return db.producers[index];
  }
  return null;
}

export function getLegalEntities(producerId?: string) {
  const db = readDatabase();
  if (producerId) {
    return db.legalEntities.filter((le) => le.producerId === producerId);
  }
  return db.legalEntities;
}

export function getLegalEntity(id: string) {
  return readDatabase().legalEntities.find((le) => le.id === id);
}

export function createLegalEntity(entity: any) {
  const db = readDatabase();
  db.legalEntities.push(entity);
  writeDatabase(db);
  return entity;
}

export function updateLegalEntity(id: string, updates: Partial<any>) {
  const db = readDatabase();
  const index = db.legalEntities.findIndex((le) => le.id === id);
  if (index !== -1) {
    db.legalEntities[index] = { ...db.legalEntities[index], ...updates };
    writeDatabase(db);
    return db.legalEntities[index];
  }
  return null;
}

export function getRanches(producerId?: string) {
  const db = readDatabase();
  if (producerId) {
    return db.ranches.filter((r) => r.producerId === producerId);
  }
  return db.ranches;
}

export function createRanch(ranch: any) {
  const db = readDatabase();
  db.ranches.push(ranch);
  writeDatabase(db);
  return ranch;
}

export function getCrops(ranchId?: string) {
  const db = readDatabase();
  if (ranchId) {
    return db.crops.filter((c) => c.ranchId === ranchId);
  }
  return db.crops;
}

export function createCrop(crop: any) {
  const db = readDatabase();
  db.crops.push(crop);
  writeDatabase(db);
  return crop;
}

export function getFinancialSnapshots(legalEntityId?: string) {
  const db = readDatabase();
  if (legalEntityId) {
    return db.financialSnapshots.filter((fs) => fs.legalEntityId === legalEntityId);
  }
  return db.financialSnapshots;
}

export function getLatestFinancialSnapshot(legalEntityId: string) {
  const snapshots = getFinancialSnapshots(legalEntityId);
  if (snapshots.length === 0) return null;
  return snapshots.sort((a, b) => b.periodo.localeCompare(a.periodo))[0];
}

export function createFinancialSnapshot(snapshot: any) {
  const db = readDatabase();
  db.financialSnapshots.push(snapshot);
  writeDatabase(db);
  return snapshot;
}

export function getValidationTasks(legalEntityId?: string) {
  const db = readDatabase();
  if (legalEntityId) {
    return db.validationTasks.filter((vt) => vt.legalEntityId === legalEntityId);
  }
  return db.validationTasks;
}

export function createValidationTask(task: any) {
  const db = readDatabase();
  db.validationTasks.push(task);
  writeDatabase(db);
  return task;
}

export function updateValidationTask(id: string, updates: Partial<any>) {
  const db = readDatabase();
  const index = db.validationTasks.findIndex((vt) => vt.id === id);
  if (index !== -1) {
    db.validationTasks[index] = { ...db.validationTasks[index], ...updates };
    writeDatabase(db);
    return db.validationTasks[index];
  }
  return null;
}

export function getAlerts(filters?: {
  legalEntityId?: string;
  severity?: string;
  resolved?: boolean;
  limit?: number;
  offset?: number;
}) {
  let alerts = readDatabase().alerts;

  if (filters?.legalEntityId) {
    alerts = alerts.filter((a) => a.legalEntityId === filters.legalEntityId);
  }

  if (filters?.severity) {
    alerts = alerts.filter((a) => a.severity === filters.severity);
  }

  if (filters?.resolved !== undefined) {
    alerts = alerts.filter((a) =>
      filters.resolved ? a.resolvedAt !== undefined : a.resolvedAt === undefined
    );
  }

  alerts = alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = alerts.length;

  if (filters?.offset !== undefined) {
    alerts = alerts.slice(filters.offset);
  }

  if (filters?.limit !== undefined) {
    alerts = alerts.slice(0, filters.limit);
  }

  return { alerts, total };
}

export function createAlert(alert: any) {
  const db = readDatabase();
  db.alerts.push(alert);
  writeDatabase(db);
  return alert;
}

export function updateAlert(id: string, updates: Partial<any>) {
  const db = readDatabase();
  const index = db.alerts.findIndex((a) => a.id === id);
  if (index !== -1) {
    db.alerts[index] = { ...db.alerts[index], ...updates };
    writeDatabase(db);
    return db.alerts[index];
  }
  return null;
}

export function getRules(activeOnly = false) {
  const db = readDatabase();
  if (activeOnly) {
    return db.rules.filter((r) => r.isActive);
  }
  return db.rules;
}

export function getRule(id: string) {
  return readDatabase().rules.find((r) => r.id === id);
}

export function getRuleByCode(code: string) {
  return readDatabase().rules.find((r) => r.code === code);
}

export function createRule(rule: any) {
  const db = readDatabase();
  db.rules.push(rule);
  writeDatabase(db);
  return rule;
}

export function updateRule(id: string, updates: Partial<any>) {
  const db = readDatabase();
  const index = db.rules.findIndex((r) => r.id === id);
  if (index !== -1) {
    db.rules[index] = { ...db.rules[index], ...updates };
    writeDatabase(db);
    return db.rules[index];
  }
  return null;
}

export function deleteRule(id: string) {
  const db = readDatabase();
  const index = db.rules.findIndex((r) => r.id === id);
  if (index !== -1) {
    db.rules.splice(index, 1);
    writeDatabase(db);
    return true;
  }
  return false;
}

export function createAuditLog(log: any) {
  const db = readDatabase();
  db.auditLogs.push(log);
  writeDatabase(db);
  return log;
}

export function getAuditLogs(filters?: {
  actorUserId?: string;
  targetType?: string;
  targetId?: string;
  limit?: number;
}) {
  let logs = readDatabase().auditLogs;

  if (filters?.actorUserId) {
    logs = logs.filter((l) => l.actorUserId === filters.actorUserId);
  }

  if (filters?.targetType) {
    logs = logs.filter((l) => l.targetType === filters.targetType);
  }

  if (filters?.targetId) {
    logs = logs.filter((l) => l.targetId === filters.targetId);
  }

  logs = logs.sort((a, b) => b.at.localeCompare(a.at));

  if (filters?.limit) {
    logs = logs.slice(0, filters.limit);
  }

  return logs;
}
