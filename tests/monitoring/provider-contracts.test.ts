import assert from "node:assert/strict";
import test from "node:test";
import { FinancialAdapter } from "../../lib/adapters/financial";
import { ImssAdapter } from "../../lib/adapters/imss";
import { IntegrationError, type ProviderRequestDependencies } from "../../lib/adapters/http";
import { LegalAdapter } from "../../lib/adapters/legal";
import { SatAdapter } from "../../lib/adapters/sat";

const entity = {
  id: "entity-contract", producerId: "producer-contract", rfc: "AAA010101AAA",
  tipo: "MORAL" as const, poderesVigentesAt: "2027-01-01T00:00:00.000Z", status: "OK" as const,
};

const configs = [
  { provider: "SAT", operation: "opinion-cumplimiento", call: (deps: ProviderRequestDependencies) => SatAdapter.getStatus(entity, "corr", undefined, deps), body: { status: "positiva", vigencia: "2027-01-01T00:00:00.000Z" } },
  { provider: "IMSS", operation: "situacion-patronal", call: (deps: ProviderRequestDependencies) => ImssAdapter.getStatus(entity, "corr", undefined, deps), body: { status: "activo" } },
  { provider: "FINANCIAL", operation: "financial-snapshot", call: (deps: ProviderRequestDependencies) => FinancialAdapter.getSnapshot(entity, "corr", undefined, deps), body: { liquidez: 1.2, endeudamientoPct: 20, ingresosAnuales: 100, egresosAnuales: 80 } },
  { provider: "LEGAL", operation: "poderes-notariales", call: (deps: ProviderRequestDependencies) => LegalAdapter.getStatus(entity, "corr", undefined, deps), body: { poderesVigentesAt: "2027-01-01T00:00:00.000Z" } },
] as const;

for (const config of configs) {
  test(`${config.provider} accepts its certified response contract and sends authorization metadata`, async () => {
    const url = `https://${config.provider.toLowerCase()}.certified-double.invalid`;
    process.env[`${config.provider}_VALIDATION_URL`] = url;
    process.env[`${config.provider}_API_TOKEN`] = "test-token";
    const result = await config.call({
      acquireRateLimit: async () => 0,
      fetch: async (requestedUrl, init) => {
        assert.equal(requestedUrl, url);
        const headers = new Headers(init?.headers);
        assert.equal(headers.get("authorization"), "Bearer test-token");
        assert.equal(headers.get("x-correlation-id"), "corr");
        assert.equal(headers.get("x-monitoring-operation"), config.operation);
        assert.deepEqual(JSON.parse(String(init?.body)), { rfc: entity.rfc, legalEntityId: entity.id });
        return Response.json(config.body);
      },
    });
    assert.ok(result.observedAt);
  });

  test(`${config.provider} rejects a changed response without producing a usable result`, async () => {
    process.env[`${config.provider}_VALIDATION_URL`] = "https://certified-double.invalid";
    process.env[`${config.provider}_API_TOKEN`] = "test-token";
    await assert.rejects(() => config.call({
      acquireRateLimit: async () => 0,
      fetch: async () => Response.json({ unexpected: true }),
    }), (error: unknown) => error instanceof IntegrationError && !error.retryable);
  });
}

for (const status of [429, 500, 503]) {
  test(`HTTP ${status} is retryable`, async () => {
    process.env.SAT_VALIDATION_URL = "https://certified-double.invalid";
    process.env.SAT_API_TOKEN = "test-token";
    await assert.rejects(() => SatAdapter.getStatus(entity, "corr", undefined, {
      acquireRateLimit: async () => 0,
      fetch: async () => new Response(null, { status }),
    }), (error: unknown) => error instanceof IntegrationError && error.retryable && error.statusCode === status);
  });
}