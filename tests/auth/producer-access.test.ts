import assert from "node:assert/strict";
import test from "node:test";
import { canAccessProducerResource } from "../../lib/auth/producer-access";

test("a producer can access only the producer record associated with their account", () => {
  assert.equal(canAccessProducerResource("PRODUCER", "producer-a", "producer-a"), true);
  assert.equal(canAccessProducerResource("PRODUCER", "producer-a", "producer-b"), false);
});

test("a producer without an association cannot access any producer resource", () => {
  assert.equal(canAccessProducerResource("PRODUCER", undefined, "producer-a"), false);
});

test("administrators and analysts retain global producer resource access", () => {
  assert.equal(canAccessProducerResource("ADMIN", undefined, "producer-a"), true);
  assert.equal(canAccessProducerResource("ANALYST", undefined, "producer-b"), true);
});