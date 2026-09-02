import assert from "node:assert/strict";
import test from "node:test";
import { SatAdapter } from "../../lib/adapters/sat";
import { IntegrationError } from "../../lib/adapters/http";

test("an unconfigured provider fails explicitly instead of returning simulated monitoring data", async () => {
  const previousUrl = process.env.SAT_VALIDATION_URL;
  const previousToken = process.env.SAT_API_TOKEN;
  delete process.env.SAT_VALIDATION_URL;
  delete process.env.SAT_API_TOKEN;

  try {
    await assert.rejects(
      () => SatAdapter.getStatus({
        id: "entity-1", producerId: "producer-1", rfc: "AAA010101AAA",
        tipo: "MORAL", poderesVigentesAt: "2027-01-01T00:00:00.000Z", status: "OK",
      }, "test-correlation"),
      (error: unknown) => error instanceof IntegrationError && error.retryable === false,
    );
  } finally {
    if (previousUrl === undefined) delete process.env.SAT_VALIDATION_URL;
    else process.env.SAT_VALIDATION_URL = previousUrl;
    if (previousToken === undefined) delete process.env.SAT_API_TOKEN;
    else process.env.SAT_API_TOKEN = previousToken;
  }
});