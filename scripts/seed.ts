import bcrypt from "bcrypt";
import { getDatabaseCounts, getPool, restoreDatabaseSnapshot } from "../lib/db";
import { snapshotCounts } from "../lib/db/snapshot";
import { generateId } from "../lib/utils";
import type { Database, Producer } from "../types";

function emptySnapshot(): Database {
  return {
    users: [], producers: [], legalEntities: [], ranches: [], crops: [],
    financialSnapshots: [], validationTasks: [], alerts: [], rules: [], auditLogs: [],
  };
}

async function buildDemoSnapshot(): Promise<Database> {
  const snapshot = emptySnapshot();
  const now = new Date().toISOString();
  const [adminHash, analystHash, producerHash] = await Promise.all([
    bcrypt.hash("Admin123!", 10),
    bcrypt.hash("Analyst123!", 10),
    bcrypt.hash("Producer123!", 10),
  ]);
  const producerData: Omit<Producer, "id" | "status">[] = [
    { displayName: "Agrícola Berrymex SA de CV", rfc: "ABE120515KL8", zona: "Occidente", contacto: "Juan Pérez", email: "contacto@berrymex.mx", phone: "+52 333 123 4567" },
    { displayName: "Berries del Valle SPR", rfc: "BDV150320MP2", zona: "Bajío", contacto: "María González", email: "info@berriesvalle.mx", phone: "+52 461 234 5678" },
    { displayName: "FresasMex Productores", rfc: "FMP180710QR5", zona: "Centro", contacto: "Carlos Ramírez", email: "carlos@fresamex.mx", phone: "+52 442 345 6789" },
    { displayName: "Frambuesas de Michoacán", rfc: "FDM190425ST9", zona: "Occidente", contacto: "Ana López", email: "ana.lopez@frambuesas.mx", phone: "+52 351 456 7890" },
    { displayName: "Arándanos del Norte", rfc: "ADN170815UV3", zona: "Norte", contacto: "Roberto Sánchez", email: "roberto@arandanos.mx", phone: "+52 686 567 8901" },
  ];

  for (const [index, data] of producerData.entries()) {
    const producer: Producer = { id: generateId(), ...data, status: "OK" };
    snapshot.producers.push(producer);
    const entity = {
      id: generateId(), producerId: producer.id, rfc: producer.rfc, tipo: "MORAL" as const,
      poderesVigentesAt: "2027-12-31T00:00:00.000Z", status: "OK" as const,
    };
    snapshot.legalEntities.push(entity);
    const ranch = {
      id: generateId(), producerId: producer.id, nombre: `Rancho ${index + 1}`,
      zona: producer.zona, hectareas: 25 + index * 10, empleados: 20 + index * 5,
    };
    snapshot.ranches.push(ranch);
    snapshot.crops.push({ id: generateId(), ranchId: ranch.id, tipo: index % 2 ? "FRAMBUESA" : "FRESA", temporada: "2024-2025" });
    snapshot.financialSnapshots.push({
      id: generateId(), legalEntityId: entity.id, periodo: "2024-12", liquidez: 1.2,
      endeudamientoPct: index === 0 ? 42 : 26, ingresosAnuales: 8_000_000, egresosAnuales: 6_000_000,
      notas: "Datos demo generados localmente",
    });
  }

  snapshot.users.push(
    { id: generateId(), name: "Admin User", email: "admin@demo.local", role: "ADMIN", hash: adminHash, isActive: true, createdAt: now },
    { id: generateId(), name: "Analyst User", email: "analyst@demo.local", role: "ANALYST", hash: analystHash, isActive: true, createdAt: now },
    {
      id: generateId(), name: "Producer User", email: "producer@demo.local", role: "PRODUCER",
      producerId: snapshot.producers[0].id, hash: producerHash, isActive: true, createdAt: now,
    },
  );

  snapshot.rules.push(
    { id: generateId(), code: "SAT_OPINION_NEGATIVA", name: "Opinión SAT Negativa", description: "Detecta opinión de cumplimiento negativa", severityDefault: "HIGH", isActive: true, evaluatorType: "BOOLEAN", config: { checkField: "status", expectedValue: "negativa" } },
    { id: generateId(), code: "IMSS_SUSPENSION", name: "Suspensión IMSS", description: "Detecta estatus suspendido", severityDefault: "HIGH", isActive: true, evaluatorType: "BOOLEAN", config: { checkField: "status", expectedValue: "suspendido" } },
    { id: generateId(), code: "ENDEUDAMIENTO_ALTO", name: "Endeudamiento Alto", description: "Detecta endeudamiento mayor a 35%", severityDefault: "HIGH", isActive: true, evaluatorType: "THRESHOLD", config: { field: "endeudamientoPct", operator: ">", threshold: 35 } },
    { id: generateId(), code: "LIQUIDEZ_BAJA", name: "Liquidez Baja", description: "Detecta liquidez baja", severityDefault: "MEDIUM", isActive: true, evaluatorType: "THRESHOLD", config: { field: "liquidez", operator: "<", threshold: 1 } },
    { id: generateId(), code: "PODERES_VENCIDOS", name: "Poderes Notariales Vencidos", description: "Detecta poderes vencidos", severityDefault: "MEDIUM", isActive: true, evaluatorType: "CUSTOM", config: { daysBeforeExpiration: 90 } },
  );
  snapshot.alerts.push({
    id: generateId(), legalEntityId: snapshot.legalEntities[0].id, ruleCode: "ENDEUDAMIENTO_ALTO",
    severity: "HIGH", message: "El endeudamiento supera el 35% permitido", createdAt: now,
  });
  return snapshot;
}

export async function seedDemoDatabase(options: { confirmed?: boolean } = {}) {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seeds are blocked in production.");
  if (!options.confirmed) throw new Error("Replacing development data requires explicit confirmation.");
  const snapshot = await buildDemoSnapshot();
  await restoreDatabaseSnapshot(snapshot, { replace: true });
  const actual = await getDatabaseCounts();
  if (JSON.stringify(actual) !== JSON.stringify(snapshotCounts(snapshot))) {
    throw new Error("Demo seed validation failed.");
  }
  console.log("Demo database seeded and validated:", actual);
  return snapshot;
}

if (require.main === module) {
  seedDemoDatabase({ confirmed: process.argv.includes("--confirm") }).catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  }).finally(() => {
    void getPool().end();
  });
}