import assert from "node:assert/strict";
import test from "node:test";
import {
  getProducerDistricts,
  getProducerListCounts,
  getProducers,
} from "../../lib/db";
import { normalizeProducerPagination } from "../../lib/services/producer-list";
import { createGetProducerFacetsHandler, createGetProducersHandler } from "../../lib/services/producer-list-handlers";
import { NextRequest, NextResponse } from "next/server";

const producerRow = {
  id: "producer-a",
  display_name: "Productor A",
  rfc: "XAXX010101004",
  zona: "Jalisco",
  contacto: "",
  email: "",
  phone: "",
  status: "PENDIENTE",
  profile: {},
  distrito: "Jalisco",
};

test("normalizes pagination defaults, invalid values and the maximum limit", () => {
  assert.deepEqual(normalizeProducerPagination(new URLSearchParams()), { page: 1, limit: 10, offset: 0 });
  assert.deepEqual(normalizeProducerPagination(new URLSearchParams("page=-2&limit=0")), { page: 1, limit: 10, offset: 0 });
  assert.deepEqual(normalizeProducerPagination(new URLSearchParams("page=3&limit=25")), { page: 3, limit: 25, offset: 50 });
  assert.deepEqual(normalizeProducerPagination(new URLSearchParams("page=2&limit=500")), { page: 2, limit: 100, offset: 100 });
  assert.deepEqual(normalizeProducerPagination(new URLSearchParams("page=2&limit=37")), { page: 2, limit: 10, offset: 10 });
});

test("filters producers by district with parameterized pagination in two queries", async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    query: async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      return calls.length === 1
        ? { rows: [{ total: 1 }], rowCount: 1 }
        : { rows: [producerRow], rowCount: 1 };
    },
  };
  const result = await getProducers(
    { distrito: "Michoacán", status: "PENDIENTE", limit: 100, offset: 200 },
    db as never,
  );
  assert.equal(result.total, 1);
  assert.equal(result.producers[0]?.distrito, "Jalisco");
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /distrito = \$1/);
  assert.match(calls[0].sql, /status = \$2/);
  assert.deepEqual(calls[0].values, ["Michoacán", "PENDIENTE"]);
  assert.deepEqual(calls[1].values, ["Michoacán", "PENDIENTE", 100, 200]);
  assert.match(calls[1].sql, /ORDER BY display_name ASC, id ASC/);
});

test("aggregates producer relationship counts with one LEFT JOIN query", async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    query: async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      return {
        rows: [{
          id: "producer-a",
          legal_entities_count: 1,
          ranches_count: 0,
          crops_count: 0,
        }],
        rowCount: 1,
      };
    },
  };
  const counts = await getProducerListCounts(Array.from({ length: 100 }, (_, index) => `producer-${index}`), db as never);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /LEFT JOIN legal_entities/);
  assert.match(calls[0].sql, /LEFT JOIN ranches/);
  assert.match(calls[0].sql, /LEFT JOIN crops/);
  assert.match(calls[0].sql, /COUNT\(DISTINCT/);
  assert.equal(counts.get("producer-a")?.legalEntitiesCount, 1);
  assert.equal(counts.get("producer-a")?.ranchesCount, 0);
});

test("scopes district facets to a producer without exposing blank districts", async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    query: async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      return { rows: [{ distrito: "Jalisco" }], rowCount: 1 };
    },
  };
  const districts = await getProducerDistricts("producer-a", db as never);
  assert.deepEqual(districts, ["Jalisco"]);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /distrito IS NOT NULL/);
  assert.match(calls[0].sql, /btrim\(distrito\) <> ''/);
  assert.match(calls[0].sql, /id = \$1/);
  assert.deepEqual(calls[0].values, ["producer-a"]);
});

test("does not query aggregate counts for an empty page", async () => {
  let calls = 0;
  const db = { query: async () => { calls++; return { rows: [], rowCount: 0 }; } };
  const counts = await getProducerListCounts([], db as never);
  assert.equal(calls, 0);
  assert.equal(counts.size, 0);
});

test("producer listing route scopes results to the authenticated producer", async () => {
  let receivedFilters: Record<string, unknown> | undefined;
  const handler = createGetProducersHandler({
    authorize: async () => ({
      authorized: true as const,
      session: {} as never,
      userId: "user-a",
      userRole: "PRODUCER",
      producerId: "producer-a",
    }),
    listProducers: async (filters) => {
      receivedFilters = filters;
      return { producers: [], total: 0 };
    },
    getCounts: async () => new Map(),
  });
  const response = await handler(new NextRequest("http://localhost/api/producers?page=2&limit=25&distrito=Jalisco"));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(receivedFilters?.producerId, "producer-a");
  assert.equal(receivedFilters?.distrito, "Jalisco");
  assert.deepEqual(body.pagination, { page: 2, limit: 25, total: 0, totalPages: 1 });
});

test("producer facets route scopes districts and preserves authorization failures", async () => {
  let receivedProducerId: string | undefined;
  const scopedHandler = createGetProducerFacetsHandler({
    authorize: async () => ({
      authorized: true as const,
      session: {} as never,
      userId: "user-a",
      userRole: "PRODUCER",
      producerId: "producer-a",
    }),
    listDistricts: async (producerId) => {
      receivedProducerId = producerId;
      return ["Jalisco"];
    },
  });
  const scopedResponse = await scopedHandler();
  assert.equal(scopedResponse.status, 200);
  assert.equal(receivedProducerId, "producer-a");
  assert.deepEqual(await scopedResponse.json(), { districts: ["Jalisco"] });

  const deniedHandler = createGetProducerFacetsHandler({
    authorize: async () => ({
      authorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }),
    listDistricts: async () => {
      assert.fail("district query must not run when authorization fails");
    },
  });
  assert.equal((await deniedHandler()).status, 401);
});