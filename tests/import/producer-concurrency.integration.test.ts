import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { getPool, importProducerRows } from "../../lib/db";
import { ProducerImportConflictError, type ProducerImportRow } from "../../lib/services/producer-import";

function rfcCheckDigit(body: string) {
  const padded = body.padStart(12, " ");
  const map = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ";
  let sum = 0;
  for (let index = 0; index < padded.length; index++) {
    sum += map.indexOf(padded[index]) * (13 - index);
  }
  const remainder = 11 - (sum % 11);
  return remainder === 11 ? "0" : remainder === 10 ? "A" : String(remainder);
}

function testRfc(prefix: string, homoclave: string) {
  const body = `${prefix}010101${homoclave}`;
  return body + rfcCheckDigit(body);
}

function lettersFromHex(value: string) {
  return [...value].map((character) => String.fromCharCode(65 + Number.parseInt(character, 16))).join("");
}

function importRow(rfc: string, growerNumber: string, name: string): ProducerImportRow {
  return {
    "Cultivo": "RASP",
    "Distrito": "Jalisco",
    "Growing Area Name": "Área prueba concurrencia",
    "Productor (Grower)": name,
    "COFIBE/ ID CG": "",
    "Grower #": growerNumber,
    "Razón Social (Company name)": name,
    "Representante Legal (Administrator)": "",
    "Dirección Fiscal (Address)": "Av. Prueba 1",
    "Colonia": "",
    "Municipio": "Guadalajara",
    "Estado": "Jalisco",
    "Zip Code": "44100",
    "RFC (Tax ID)": rfc,
    "Contact": "",
    "Telephone number": "",
    "Cellular number": "",
    "Email": "",
    "Email productor": "",
  };
}

test("concurrent imports serialize Grower number ownership without silent data loss", async () => {
  const db = getPool();
  const token = randomUUID().replaceAll("-", "");
  const suffix = token.slice(0, 11).toUpperCase();
  const prefix = lettersFromHex(token.slice(12, 16));
  const firstHomoclave = lettersFromHex(token.slice(16, 18));
  const secondHomoclave = `${firstHomoclave[0] === "A" ? "B" : "A"}${firstHomoclave[1]}`;
  const firstRfc = testRfc(prefix, firstHomoclave);
  const secondRfc = testRfc(prefix, secondHomoclave);
  assert.notEqual(firstRfc, secondRfc);
  const growerNumber = `T${suffix}`;
  const batchIds = [`concurrency-${suffix}-a`, `concurrency-${suffix}-b`];
  const actor = await db.query("SELECT id FROM app_users WHERE role = $1 ORDER BY id LIMIT 1", ["ADMIN"]);
  assert.ok(actor.rows[0]?.id, "An ADMIN user is required for the import audit log");

  const fixtureIds: string[] = [];
  const cleanup = async () => {
    if (!fixtureIds.length) return;
    await db.query(
      "DELETE FROM legal_entities WHERE producer_id = ANY($1::text[])",
      [fixtureIds],
    );
    await db.query(
      "DELETE FROM producers WHERE id = ANY($1::text[])",
      [fixtureIds],
    );
  };
  const existing = await db.query(
    "SELECT id FROM producers WHERE upper(btrim(rfc)) = ANY($1::text[]) OR btrim(numero_productor) = $2",
    [[firstRfc, secondRfc], growerNumber],
  );
  assert.equal(existing.rowCount, 0, "The run-unique fixture must not overlap existing data");
  try {
    const results = await Promise.allSettled([
      importProducerRows(
        [importRow(firstRfc, growerNumber, "Productor concurrencia A")],
        [11],
        String(actor.rows[0].id),
        "ALL_OR_NOTHING",
        { batchId: batchIds[0] },
      ),
      importProducerRows(
        [importRow(secondRfc, growerNumber, "Productor concurrencia B")],
        [22],
        String(actor.rows[0].id),
        "ALL_OR_NOTHING",
        { batchId: batchIds[1] },
      ),
    ]);

    const persisted = await db.query(
      "SELECT id, rfc, numero_productor FROM producers WHERE btrim(numero_productor) = $1",
      [growerNumber],
    );
    fixtureIds.push(...persisted.rows.map((row) => String(row.id)));
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    const conflict = (rejected[0] as PromiseRejectedResult).reason;
    assert.ok(conflict instanceof ProducerImportConflictError);
    assert.equal(["11", "22"].includes(String(conflict.errors[0]?.row)), true);
    assert.equal(conflict.errors[0]?.code, "EXISTING_GROWER_NUMBER");

    assert.equal(persisted.rowCount, 1);
    assert.equal([firstRfc, secondRfc].includes(String(persisted.rows[0].rfc)), true);
  } finally {
    await cleanup();
    await db.query(
      "DELETE FROM audit_logs WHERE target_type = $1 AND target_id = ANY($2::text[])",
      ["PRODUCER_IMPORT", batchIds],
    );
  }
});