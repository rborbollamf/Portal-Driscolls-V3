import type { Database } from "@/types";

const collections: (keyof Database)[] = [
  "users", "producers", "legalEntities", "ranches", "crops",
  "financialSnapshots", "validationTasks", "alerts", "rules", "auditLogs",
];

const legacyDemoProducerEmail = "producer@demo.local";
const legacyDemoProducerRfc = "ABE120515KL8";

export function normalizeLegacyProducerAssociations(snapshot: Database): Database {
  const producerIdFor = (email: string) => {
    const normalizedEmail = email.toLowerCase();
    const matches = snapshot.producers.filter((producer) =>
      [producer.email, producer.correoElectronico, producer.correoElectronicoProductor]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase() === normalizedEmail),
    );
    if (matches.length === 1) return matches[0].id;

    if (normalizedEmail === legacyDemoProducerEmail) {
      const demoMatches = snapshot.producers.filter((producer) => producer.rfc === legacyDemoProducerRfc);
      return demoMatches.length === 1 ? demoMatches[0].id : undefined;
    }
    return undefined;
  };

  return {
    ...snapshot,
    users: snapshot.users.map((user) => (
      user.role === "PRODUCER" && !user.producerId
        ? { ...user, producerId: producerIdFor(user.email) }
        : user
    )),
  };
}

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

  for (const user of snapshot.users!) {
    if (user.role === "PRODUCER" && !user.producerId) {
      throw new Error(`Producer user ${user.id} is not associated with a producer.`);
    }
    if (user.producerId && !producerIds.has(user.producerId)) {
      throw new Error(`User ${user.id} references an unknown producer.`);
    }
  }
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