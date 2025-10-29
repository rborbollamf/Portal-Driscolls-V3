import bcrypt from "bcrypt";
import { writeDatabase } from "../lib/db";
import { generateId } from "../lib/utils";
import type { Database } from "../types";

async function seed() {
  console.log("🌱 Seeding database...");

  const db: Database = {
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

  const adminHash = await bcrypt.hash("Admin123!", 10);
  const analystHash = await bcrypt.hash("Analyst123!", 10);
  const producerHash = await bcrypt.hash("Producer123!", 10);

  db.users = [
    {
      id: generateId(),
      name: "Admin User",
      email: "admin@demo.local",
      role: "ADMIN",
      hash: adminHash,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "Analyst User",
      email: "analyst@demo.local",
      role: "ANALYST",
      hash: analystHash,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "Producer User",
      email: "producer@demo.local",
      role: "PRODUCER",
      hash: producerHash,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const producerData = [
    {
      displayName: "Agrícola Berrymex SA de CV",
      rfc: "ABE120515KL8",
      zona: "Occidente",
      contacto: "Juan Pérez",
      email: "contacto@berrymex.mx",
      phone: "+52 333 123 4567",
    },
    {
      displayName: "Berries del Valle SPR",
      rfc: "BDV150320MP2",
      zona: "Bajío",
      contacto: "María González",
      email: "info@berriesvalle.mx",
      phone: "+52 461 234 5678",
    },
    {
      displayName: "FresasMex Productores",
      rfc: "FMP180710QR5",
      zona: "Centro",
      contacto: "Carlos Ramírez",
      email: "carlos@fresamex.mx",
      phone: "+52 442 345 6789",
    },
    {
      displayName: "Frambuesas de Michoacán",
      rfc: "FDM190425ST9",
      zona: "Occidente",
      contacto: "Ana López",
      email: "ana.lopez@frambuesas.mx",
      phone: "+52 351 456 7890",
    },
    {
      displayName: "Arándanos del Norte",
      rfc: "ADN170815UV3",
      zona: "Norte",
      contacto: "Roberto Sánchez",
      email: "roberto@arandanos.mx",
      phone: "+52 686 567 8901",
    },
    {
      displayName: "Moras Premium SA",
      rfc: "MPR160205WX7",
      zona: "Bajío",
      contacto: "Laura Martínez",
      email: "laura@moraspremium.mx",
      phone: "+52 477 678 9012",
    },
    {
      displayName: "Productora El Fresón",
      rfc: "PEF141130YZ1",
      zona: "Centro",
      contacto: "Diego Torres",
      email: "diego@elfreson.mx",
      phone: "+52 449 789 0123",
    },
    {
      displayName: "Berries Exportación México",
      rfc: "BEM130915AB4",
      zona: "Occidente",
      contacto: "Patricia Flores",
      email: "patricia@berriesexport.mx",
      phone: "+52 322 890 1234",
    },
    {
      displayName: "Frutas Rojas del Bajío",
      rfc: "FRB191201CD8",
      zona: "Bajío",
      contacto: "Miguel Hernández",
      email: "miguel@frutasrojas.mx",
      phone: "+52 473 901 2345",
    },
    {
      displayName: "Cosecha Orgánica SPR",
      rfc: "COS200610EF2",
      zona: "Norte",
      contacto: "Sandra Jiménez",
      email: "sandra@cosechaorganica.mx",
      phone: "+52 664 012 3456",
    },
  ];

  producerData.forEach((p) => {
    db.producers.push({
      id: generateId(),
      ...p,
      status: "OK",
    });
  });

  db.producers.forEach((producer, idx) => {
    const numEntities = idx < 5 ? 2 : idx < 8 ? 3 : 1;

    for (let i = 0; i < numEntities; i++) {
      const legalEntity = {
        id: generateId(),
        producerId: producer.id,
        rfc: i === 0 ? producer.rfc : `${producer.rfc.substring(0, 9)}${String.fromCharCode(65 + i)}${producer.rfc.substring(10)}`,
        tipo: (i === 0 ? "MORAL" : "FISICA") as "MORAL" | "FISICA",
        poderesVigentesAt: new Date(2025, 11, 31).toISOString(),
        status: "OK" as "OK",
      };

      db.legalEntities.push(legalEntity);

      const endeudamiento = 20 + Math.floor(Math.random() * 25);
      const liquidez = 0.5 + Math.random() * 2;
      const ingresosAnuales = 5000000 + Math.random() * 20000000;

      db.financialSnapshots.push({
        id: generateId(),
        legalEntityId: legalEntity.id,
        periodo: "2024-12",
        liquidez,
        endeudamientoPct: endeudamiento,
        ingresosAnuales,
        egresosAnuales: ingresosAnuales * 0.75,
        notas: "",
      });

      db.financialSnapshots.push({
        id: generateId(),
        legalEntityId: legalEntity.id,
        periodo: "2024-06",
        liquidez: liquidez * 0.9,
        endeudamientoPct: endeudamiento - 5,
        ingresosAnuales: ingresosAnuales * 0.85,
        egresosAnuales: ingresosAnuales * 0.7,
        notas: "",
      });
    }
  });

  const ranchNames = [
    "El Rosal", "La Esperanza", "San José", "Las Flores", "El Paraíso",
    "Santa María", "Los Pinos", "La Aurora", "El Mirador", "San Antonio",
    "Las Palmas", "El Refugio", "La Primavera", "Los Arrayanes", "El Bosque",
  ];

  db.producers.forEach((producer, idx) => {
    const numRanches = 1 + (idx % 3);

    for (let i = 0; i < numRanches; i++) {
      const ranch = {
        id: generateId(),
        producerId: producer.id,
        nombre: `${ranchNames[idx]} ${i > 0 ? i + 1 : ""}`.trim(),
        zona: producer.zona,
        hectareas: 10 + Math.floor(Math.random() * 90),
        empleados: 15 + Math.floor(Math.random() * 85),
      };

      db.ranches.push(ranch);

      const cropTypes: Array<"FRESA" | "FRAMBUESA" | "ARANDANO" | "MORA"> = ["FRESA", "FRAMBUESA", "ARANDANO", "MORA"];
      const numCrops = 1 + (idx % 2);

      for (let j = 0; j < numCrops; j++) {
        db.crops.push({
          id: generateId(),
          ranchId: ranch.id,
          tipo: cropTypes[j % 4],
          temporada: "2024-2025",
        });
      }
    }
  });

  db.rules = [
    {
      id: generateId(),
      code: "SAT_OPINION_NEGATIVA",
      name: "Opinión SAT Negativa",
      description: "Detecta cuando el SAT emite opinión de cumplimiento negativa",
      severityDefault: "HIGH",
      isActive: true,
      evaluatorType: "BOOLEAN",
      config: {
        checkField: "status",
        expectedValue: "negativa",
      },
    },
    {
      id: generateId(),
      code: "IMSS_SUSPENSION",
      name: "Suspensión IMSS",
      description: "Detecta cuando el estatus del IMSS está suspendido",
      severityDefault: "HIGH",
      isActive: true,
      evaluatorType: "BOOLEAN",
      config: {
        checkField: "status",
        expectedValue: "suspendido",
      },
    },
    {
      id: generateId(),
      code: "ENDEUDAMIENTO_ALTO",
      name: "Endeudamiento Alto",
      description: "Detecta cuando el endeudamiento supera el 35%",
      severityDefault: "HIGH",
      isActive: true,
      evaluatorType: "THRESHOLD",
      config: {
        field: "endeudamientoPct",
        operator: ">",
        threshold: 35,
      },
    },
    {
      id: generateId(),
      code: "LIQUIDEZ_BAJA",
      name: "Liquidez Baja",
      description: "Detecta cuando la liquidez es menor al umbral configurado",
      severityDefault: "MEDIUM",
      isActive: true,
      evaluatorType: "THRESHOLD",
      config: {
        field: "liquidez",
        operator: "<",
        threshold: 1.0,
      },
    },
    {
      id: generateId(),
      code: "PODERES_VENCIDOS",
      name: "Poderes Notariales Vencidos",
      description: "Detecta cuando los poderes notariales están vencidos o próximos a vencer",
      severityDefault: "MEDIUM",
      isActive: true,
      evaluatorType: "CUSTOM",
      config: {
        daysBeforeExpiration: 90,
      },
    },
  ];

  const highRiskLegalEntities = db.legalEntities.slice(0, 3);
  
  highRiskLegalEntities.forEach((legalEntity) => {
    db.alerts.push({
      id: generateId(),
      legalEntityId: legalEntity.id,
      ruleCode: "ENDEUDAMIENTO_ALTO",
      severity: "HIGH",
      message: "El endeudamiento supera el 35% permitido",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    });
  });

  db.alerts.push({
    id: generateId(),
    legalEntityId: db.legalEntities[4].id,
    ruleCode: "LIQUIDEZ_BAJA",
    severity: "MEDIUM",
    message: "La liquidez está por debajo del umbral recomendado",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  });

  db.alerts.push({
    id: generateId(),
    legalEntityId: db.legalEntities[5].id,
    ruleCode: "SAT_OPINION_NEGATIVA",
    severity: "HIGH",
    message: "El SAT ha emitido opinión de cumplimiento negativa",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  });

  writeDatabase(db);

  console.log("✅ Database seeded successfully!");
  console.log(`   - ${db.users.length} users`);
  console.log(`   - ${db.producers.length} producers`);
  console.log(`   - ${db.legalEntities.length} legal entities`);
  console.log(`   - ${db.ranches.length} ranches`);
  console.log(`   - ${db.crops.length} crops`);
  console.log(`   - ${db.financialSnapshots.length} financial snapshots`);
  console.log(`   - ${db.rules.length} rules`);
  console.log(`   - ${db.alerts.length} alerts`);
  console.log("\n👤 Demo users:");
  console.log("   - admin@demo.local / Admin123!");
  console.log("   - analyst@demo.local / Analyst123!");
  console.log("   - producer@demo.local / Producer123!");
}

seed().catch(console.error);
