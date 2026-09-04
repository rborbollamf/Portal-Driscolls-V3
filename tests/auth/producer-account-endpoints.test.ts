import assert from "node:assert/strict";
import { after, test } from "node:test";
import { NextRequest, NextResponse } from "next/server";
import {
  createListProducerAccountsHandler,
  createUpdateProducerAccountHandler,
} from "../../lib/api/admin-producer-accounts";
import { requireAuth } from "../../lib/auth/middleware";
import {
  getPool,
  setUserProducerAssociation,
} from "../../lib/db";
import type { Producer, User } from "../../types";

const adminAuthorization = (async (allowedRoles?: string[]) => {
  assert.deepEqual(allowedRoles, ["ADMIN"]);
  return {
    authorized: true as const,
    session: {
      user: { id: "admin-test", role: "ADMIN" },
      expires: "2099-01-01T00:00:00.000Z",
    },
    userId: "admin-test",
    userRole: "ADMIN",
  };
}) as typeof requireAuth;

function forbiddenAuthorization(role: "ANALYST" | "PRODUCER") {
  return (async (allowedRoles?: string[]) => {
    assert.deepEqual(allowedRoles, ["ADMIN"]);
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Forbidden", attemptedRole: role },
        { status: 403 },
      ),
    };
  }) as typeof requireAuth;
}

function updateRequest(producerId: string) {
  return new NextRequest(
    "http://localhost/api/admin/producer-accounts/user-test",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producerId }),
    },
  );
}

const producer: Producer = {
  id: "producer-list",
  displayName: "Producer List",
  rfc: "PLI010101AAA",
  zona: "Norte",
  contacto: "Contact",
  email: "producer-list@example.test",
  phone: "5550101",
};

const producerUser: User = {
  id: "user-list",
  name: "Producer User",
  email: "producer-user@example.test",
  role: "PRODUCER",
  producerId: producer.id,
  hash: "must-not-be-returned",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const analystUser: User = {
  ...producerUser,
  id: "analyst-list",
  role: "ANALYST",
  producerId: undefined,
};

test("only ADMIN can list producer accounts and the response exposes no password hash", async () => {
  const adminHandler = createListProducerAccountsHandler({
    authorize: adminAuthorization,
    listUsers: async () => [producerUser, analystUser],
    listProducers: async () => ({ producers: [producer], total: 1 }),
  });

  const response = await adminHandler();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.producers, [producer]);
  assert.equal(body.users.length, 1);
  assert.equal(body.users[0].id, producerUser.id);
  assert.equal("hash" in body.users[0], false);

  for (const role of ["ANALYST", "PRODUCER"] as const) {
    let queried = false;
    const forbiddenHandler = createListProducerAccountsHandler({
      authorize: forbiddenAuthorization(role),
      listUsers: async () => {
        queried = true;
        return [];
      },
      listProducers: async () => {
        queried = true;
        return { producers: [], total: 0 };
      },
    });

    const forbidden = await forbiddenHandler();
    assert.equal(forbidden.status, 403);
    assert.equal(queried, false);
  }
});

test("only ADMIN can update a producer account", async () => {
  for (const role of ["ANALYST", "PRODUCER"] as const) {
    let mutated = false;
    const handler = createUpdateProducerAccountHandler({
      authorize: forbiddenAuthorization(role),
      setAssociation: async () => {
        mutated = true;
        return { kind: "USER_NOT_FOUND" };
      },
    });

    const response = await handler(
      updateRequest("producer-list"),
      { params: { userId: "user-list" } },
    );

    assert.equal(response.status, 403);
    assert.equal(mutated, false);
  }
});

test("an unknown producer is rejected without changing the account", async () => {
  const client = await getPool().connect();
  const suffix = `${process.pid}-${Date.now()}`;
  const userId = `association-user-${suffix}`;
  const originalProducerId = `association-original-${suffix}`;

  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO producers
        (id, display_name, rfc, zona, contacto, email, phone, status, profile)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, '{}'::jsonb)`,
      [
        originalProducerId,
        "Original Producer",
        `ORI${suffix}`.slice(0, 13),
        "Norte",
        "Contact",
        `${originalProducerId}@example.test`,
        "5550101",
      ],
    );
    await client.query(
      `INSERT INTO app_users
        (id, name, email, role, producer_id, hash, is_active, created_at)
       VALUES ($1, $2, $3, 'PRODUCER', $4, 'hash', TRUE, NOW())`,
      [
        userId,
        "Association User",
        `${userId}@example.test`,
        originalProducerId,
      ],
    );

    const handler = createUpdateProducerAccountHandler({
      authorize: adminAuthorization,
      setAssociation: (id, selectedProducerId) =>
        setUserProducerAssociation(id, selectedProducerId, client),
    });
    const response = await handler(
      updateRequest("producer-does-not-exist"),
      { params: { userId } },
    );
    const stored = await client.query(
      "SELECT producer_id FROM app_users WHERE id = $1",
      [userId],
    );

    assert.equal(response.status, 400);
    assert.equal(stored.rows[0].producer_id, originalProducerId);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

test("a valid link and a reassignment are persisted", async () => {
  const client = await getPool().connect();
  const suffix = `${process.pid}-${Date.now()}`;
  const userId = `reassignment-user-${suffix}`;
  const firstProducerId = `reassignment-first-${suffix}`;
  const secondProducerId = `reassignment-second-${suffix}`;

  await client.query("BEGIN");
  try {
    for (const [id, name] of [
      [firstProducerId, "First Producer"],
      [secondProducerId, "Second Producer"],
    ]) {
      await client.query(
        `INSERT INTO producers
          (id, display_name, rfc, zona, contacto, email, phone, status, profile)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, '{}'::jsonb)`,
        [
          id,
          name,
          `RFC${id}`.slice(0, 13),
          "Norte",
          "Contact",
          `${id}@example.test`,
          "5550101",
        ],
      );
    }
    await client.query(
      `INSERT INTO app_users
        (id, name, email, role, producer_id, hash, is_active, created_at)
       VALUES ($1, $2, $3, 'PRODUCER', NULL, 'hash', TRUE, NOW())`,
      [userId, "Pending User", `${userId}@example.test`],
    );

    const handler = createUpdateProducerAccountHandler({
      authorize: adminAuthorization,
      setAssociation: (id, selectedProducerId) =>
        setUserProducerAssociation(id, selectedProducerId, client),
    });

    const linked = await handler(
      updateRequest(firstProducerId),
      { params: { userId } },
    );
    assert.equal(linked.status, 200);
    assert.equal((await linked.json()).producerId, firstProducerId);

    const reassigned = await handler(
      updateRequest(secondProducerId),
      { params: { userId } },
    );
    const stored = await client.query(
      "SELECT producer_id FROM app_users WHERE id = $1",
      [userId],
    );

    assert.equal(reassigned.status, 200);
    assert.equal((await reassigned.json()).producerId, secondProducerId);
    assert.equal(stored.rows[0].producer_id, secondProducerId);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

after(async () => {
  await getPool().end();
});