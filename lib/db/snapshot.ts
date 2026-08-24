import type { Database } from "@/types";

const collections: (keyof Database)[] = [
  "users", "producers", "legalEntities", "ranches", "crops",
  "financialSnapshots", "validationTasks", "alerts", "rules", "auditLogs",
];

function ids(items: Array<{ id: string }>, name: string) {
  const values = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.id !== "string" || !item.id) {
      throw new Error(`${name} contains a record without an id.`);
    }
    if (values.has(item.id)) throw new Error(`${name} contains a duplicate id: ${item.id}`);
    values.add(item.id);
  }
  return values;
}

export function validateDatabaseSnapshot(input: unknown): asserts input is Database {
  if (!input || typeof input !== "object") throw new Error("Snapshot must be an object.");
  const snapshot = input as Partial<Database>;
  for (const collection of collections) {
    if (!Array.isArray(snapshot[collection])) throw new Error(`Snapshot is missing ${collection}.`);
  }

  const producerIds = ids(snapshot.producers!, "producers");
  const entityIds = ids(snapshot.legalEntities!, "legalEntities");
  const ranchIds = ids(snapshot.ranches!, "ranches");
  ids(snapshot.users!, "users");
  ids(snapshot.crops!, "crops");
  ids(snapshot.financialSnapshots!, "financialSnapshots");
  ids(snapshot.validationTasks!, "validationTasks");
  ids(snapshot.alerts!, "alerts");
  ids(snapshot.rules!, "rules");
  ids(snapshot.auditLogs!, "auditLogs");

  for (const entity of snapshot.legalEntities!) {
    if (!producerIds.has(entity.producerId)) throw new Error(`Legal entity ${entity.id} references an unknown producer.`);
  }
  for (const ranch of snapshot.ranches!) {
    if (!producerIds.has(ranch.producerId)) throw new Error(`Ranch ${ranch.id} references an unknown producer.`);
  }
  for (const crop of snapshot.crops!) {
    if (!ranchIds.has(crop.ranchId)) throw new Error(`Crop ${crop.id} references an unknown ranch.`);
  }
  for (const record of [...snapshot.financialSnapshots!, ...snapshot.validationTasks!, ...snapshot.alerts!]) {
    if (!entityIds.has(record.legalEntityId)) {
      throw new Error(`Record ${record.id} references an unknown legal entity.`);
    }
  }
}

export function snapshotCounts(snapshot: Database): Record<keyof Database, number> {
  return Object.fromEntries(collections.map((collection) => [collection, snapshot[collection].length])) as Record<keyof Database, number>;
}