import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { Database } from "../../types";
import {
  normalizeLegacyProducerAssociations,
  validateDatabaseSnapshot,
} from "../../lib/db/snapshot";
import { canAccessProducerResource } from "../../lib/auth/producer-access";

function snapshot(): Database {
  return {
    users: [{
      id: "user-a", name: "Producer A", email: "producer-a@example.test", role: "PRODUCER",
      producerId: "producer-a", hash: "hash", isActive: true, createdAt: "2026-01-01T00:00:00.000Z",
    }],
    producers: [{
      id: "producer-a", displayName: "Producer A", rfc: "AAA010101AAA", zona: "Norte",
      contacto: "Contact", email: "producer-a@example.test", phone: "5550101",
    }],
    legalEntities: [],
    ranches: [],
    crops: [],
    financialSnapshots: [],
    validationTasks: [],
    alerts: [],
    alertHistory: [],
    monitoringJobs: [],
    integrationEvents: [],
    rules: [],
    auditLogs: [],
  };
}

test("a backup permits a producer account to remain pending association", () => {
  const pending = snapshot();
  delete pending.users[0].producerId;

  assert.doesNotThrow(() => validateDatabaseSnapshot(pending));
  assert.equal(canAccessProducerResource("PRODUCER", pending.users[0].producerId, "producer-a"), false);
});

test("a backup rejects an association to a nonexistent producer", () => {
  const invalid = snapshot();
  invalid.users[0].producerId = "producer-missing";

  assert.throws(
    () => validateDatabaseSnapshot(invalid),
    /User user-a references an unknown producer/,
  );
});

test("the legacy demo snapshot is upgraded to its documented producer association", () => {
  const legacy = snapshot();
  legacy.users[0].email = "producer@demo.local";
  delete legacy.users[0].producerId;
  legacy.producers[0].rfc = "ABE120515KL8";

  const migrated = normalizeLegacyProducerAssociations(legacy);

  assert.equal(migrated.users[0].producerId, "producer-a");
  assert.doesNotThrow(() => validateDatabaseSnapshot(migrated));
});

test("the checked-in JSON import keeps its producer account associated", () => {
  const imported = JSON.parse(fs.readFileSync("data/db.json", "utf8")) as Database;

  assert.doesNotThrow(() => validateDatabaseSnapshot(imported));
  assert.equal(
    imported.users.find((user) => user.role === "PRODUCER")?.producerId,
    imported.producers[0].id,
  );
});

test("a migrated legacy producer account can access only its linked producer", () => {
  const legacy = snapshot();
  legacy.users[0].email = "producer@demo.local";
  delete legacy.users[0].producerId;
  legacy.producers[0].rfc = "ABE120515KL8";
  legacy.producers.push({
    id: "producer-b", displayName: "Producer B", rfc: "BBB010101BBB", zona: "Sur",
    contacto: "Other contact", email: "producer-b@example.test", phone: "5550102",
  });

  const migrated = normalizeLegacyProducerAssociations(legacy);
  const producerId = migrated.users[0].producerId;

  assert.equal(canAccessProducerResource("PRODUCER", producerId, "producer-a"), true);
  assert.equal(canAccessProducerResource("PRODUCER", producerId, "producer-b"), false);
});

test("an ambiguous legacy demo account stays pending and cannot access producer data", () => {
  const legacy = snapshot();
  legacy.users[0].email = "producer@demo.local";
  delete legacy.users[0].producerId;
  legacy.producers[0].rfc = "ABE120515KL8";
  legacy.producers.push({
    id: "producer-duplicate", displayName: "Duplicate RFC", rfc: "ABE120515KL8", zona: "Sur",
    contacto: "Duplicate contact", email: "duplicate@example.test", phone: "5550103",
  });

  const migrated = normalizeLegacyProducerAssociations(legacy);

  assert.equal(migrated.users[0].producerId, undefined);
  assert.doesNotThrow(() => validateDatabaseSnapshot(migrated));
  assert.equal(canAccessProducerResource("PRODUCER", migrated.users[0].producerId, "producer-a"), false);
});