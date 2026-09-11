import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidMexicanRfc,
  parseProducerImport,
  PRODUCER_IMPORT_HEADERS,
} from "../../lib/services/producer-import";

const row = [
  "RASP", "DISTRITO DEMO", "ÁREA FICTICIA", "PRODUCTOR FICTICIO", "", "900001",
  "PERSONA FICTICIA", "", "AV. EJEMPLO 1", "", "MORELIA", "Michoacán", "58000",
  "XAXX010101004", "", "", "", "ficticio@example.com", "",
];

function csv(rows: string[][]) {
  return Buffer.from([PRODUCER_IMPORT_HEADERS, ...rows].map((values) =>
    values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
  ).join("\r\n"));
}

test("validates SAT check digits for physical and moral RFCs", () => {
  assert.equal(isValidMexicanRfc("XAXX010101004"), true);
  assert.equal(isValidMexicanRfc("COSC8001137NA"), true);
  assert.equal(isValidMexicanRfc("XAXX010101000"), false);
  assert.equal(isValidMexicanRfc("ABC010101AB0"), false);
  assert.equal(isValidMexicanRfc("ABC010101AA"), false);
  assert.equal(isValidMexicanRfc("ABC991399AB2"), false);
  assert.equal(isValidMexicanRfc("ABC000229AB5"), true);
  assert.equal(isValidMexicanRfc("XAXX000229008"), true);
});

test("accepts a valid CSV while preserving optional empty fields", async () => {
  const parsed = await parseProducerImport(csv([row]), "productores.csv");
  assert.equal(parsed.totalRows, 1);
  assert.equal(parsed.validRows, 1);
  assert.equal(parsed.invalidRows, 0);
  assert.equal(parsed.rows[0]["Zip Code"], "58000");
  assert.equal(parsed.warnings[0]?.code, "CATALOG_NOT_CONFIGURED");
});

test("reports required, catalog, format and conditional validation errors", async () => {
  const invalid = [...row];
  invalid[0] = "APPLE";
  invalid[5] = "1.5";
  invalid[11] = "Atlantis";
  invalid[12] = "1234";
  invalid[13] = "XAXX010101000";
  invalid[15] = "443-123";
  invalid[17] = "not-an-email";
  const parsed = await parseProducerImport(csv([invalid]), "productores.csv");
  const fields = new Set(parsed.errors.map((error) => error.field));
  assert.equal(parsed.invalidRows, 1);
  for (const field of ["Cultivo", "Grower #", "Estado", "Zip Code", "RFC (Tax ID)", "Telephone number", "Email"]) {
    assert.equal(fields.has(field), true, `missing error for ${field}`);
  }
  assert.equal(parsed.rejectedRows[0].values["Grower #"], "1.5");
});

test("marks every row participating in duplicate RFC and Grower numbers", async () => {
  const second = [...row];
  second[3] = "OTRO PRODUCTOR";
  const parsed = await parseProducerImport(csv([row, second]), "productores.csv");
  assert.equal(parsed.invalidRows, 2);
  assert.equal(parsed.errors.filter((error) => error.code === "DUPLICATE_IN_FILE").length, 4);
});

test("rejects unsupported extensions and non-exact headers", async () => {
  await assert.rejects(() => parseProducerImport(Buffer.from("x"), "productores.txt"), /xlsx o .csv/);
  const wrongHeaders: string[] = [...PRODUCER_IMPORT_HEADERS];
  wrongHeaders[2] = "Nombre Área de Cultivo";
  const parsed = await parseProducerImport(
    Buffer.from([wrongHeaders, row].map((values) => values.join(",")).join("\n")),
    "productores.csv",
  );
  assert.equal(parsed.errors[0].code, "INVALID_HEADERS");
});