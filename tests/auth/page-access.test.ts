import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "next-auth";
import { createRequirePageUser } from "../../lib/auth/page-access";
import {
  getProducerAssociationLoginError,
  PRODUCER_ASSOCIATION_REQUIRED_CODE,
  PRODUCER_ASSOCIATION_REQUIRED_MESSAGE,
  PRODUCER_ASSOCIATION_REQUIRED_REDIRECT,
} from "../../lib/auth/producer-access";
import type { User } from "../../types";

class Redirected extends Error {
  constructor(readonly location: string) {
    super(`Redirected to ${location}`);
  }
}

const pendingUser: User = {
  id: "pending-user",
  name: "Pending Producer",
  email: "pending@example.test",
  role: "PRODUCER",
  hash: "hash",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const session = {
  user: { id: pendingUser.id },
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

test("a pending producer receives the explanatory redirect and cannot enter", async () => {
  const requirePageUser = createRequirePageUser({
    getSession: async () => session,
    findUser: async () => pendingUser,
    redirectTo: (location) => {
      throw new Redirected(location);
    },
  });

  await assert.rejects(
    requirePageUser,
    (error) =>
      error instanceof Redirected &&
      error.location === PRODUCER_ASSOCIATION_REQUIRED_REDIRECT,
  );
  assert.equal(
    getProducerAssociationLoginError(PRODUCER_ASSOCIATION_REQUIRED_CODE),
    PRODUCER_ASSOCIATION_REQUIRED_MESSAGE,
  );
  assert.match(PRODUCER_ASSOCIATION_REQUIRED_MESSAGE, /expediente/);
  assert.match(PRODUCER_ASSOCIATION_REQUIRED_MESSAGE, /administración/);
});

test("an associated producer can enter protected pages", async () => {
  const associatedUser = {
    ...pendingUser,
    producerId: "producer-a",
  };
  const requirePageUser = createRequirePageUser({
    getSession: async () => session,
    findUser: async () => associatedUser,
    redirectTo: (location) => {
      throw new Redirected(location);
    },
  });

  assert.deepEqual(await requirePageUser(), associatedUser);
});