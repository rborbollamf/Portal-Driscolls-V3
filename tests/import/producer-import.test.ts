import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import {
  diagnoseRfc,
  filterValidImportRows,
  isFileLevelImportError,
  isValidMexicanRfc,
  normalizePhone,
  parseProducerImport,
  PRODUCER_IMPORT_HEADERS,
  summarizeValidation,
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

function rfcCheckDigit(body: string) {
  const padded = body.padStart(12, " ");
  const map = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ";
  let sum = 0;
  for (let index = 0; index < padded.length; index++) sum += map.indexOf(padded[index]) * (13 - index);
  const remainder = 11 - (sum % 11);
  return remainder === 11 ? "0" : remainder === 10 ? "A" : String(remainder);
}

function syntheticRfc(index: number) {
  const first = String.fromCharCode(65 + Math.floor(index / 26));
  const second = String.fromCharCode(65 + (index % 26));
  const body = `AA${first}${second}010101AA`;
  return body + rfcCheckDigit(body);
}

async function xlsx(rows: Array<{ number: number; values: string[] }>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ALL complete Data Base");
  sheet.getRow(1).values = [...PRODUCER_IMPORT_HEADERS];
  for (const input of rows) sheet.getRow(input.number).values = input.values;
  return Buffer.from(await workbook.xlsx.writeBuffer());
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

test("normalizes national phone separators and rejects country codes or extensions", () => {
  assert.equal(normalizePhone("914 532 6574"), "9145326574");
  assert.equal(normalizePhone("(443) 123-4567"), "4431234567");
  assert.equal(normalizePhone("+52 443 123 4567"), "524431234567");
  assert.equal(normalizePhone("443 123 4567 ext. 9"), "44312345679");
});

test("diagnoses RFC format, date and checksum independently", () => {
  assert.equal(diagnoseRfc("XXXX")?.code, "INVALID_RFC_FORMAT");
  assert.match(diagnoseRfc("XXXX")?.message ?? "", /Longitud recibida: 4/);
  assert.equal(diagnoseRfc("ABC991399AB2")?.code, "INVALID_RFC_DATE");
  assert.match(diagnoseRfc("ABC991399AB2")?.message ?? "", /991399/);
  assert.equal(diagnoseRfc("XAXX010101000")?.code, "INVALID_RFC_CHECKSUM");
  assert.match(diagnoseRfc("XAXX010101000")?.message ?? "", /se esperaba 4/);
});

test("accepts a valid CSV while preserving optional empty fields", async () => {
  const parsed = await parseProducerImport(csv([row]), "productores.csv");
  assert.equal(parsed.totalRows, 1);
  assert.equal(parsed.validRows, 1);
  assert.equal(parsed.invalidRows, 0);
  assert.equal(parsed.rows[0]["Zip Code"], "58000");
  assert.equal(parsed.warnings[0]?.code, "CATALOG_NOT_CONFIGURED");
  assert.equal(parsed.warnings.filter((warning) => warning.code === "CATALOG_NOT_CONFIGURED").length, 1);
});

test("stores normalized phones in parsed import rows", async () => {
  const withPhones = [...row];
  withPhones[15] = "914 532 6574";
  withPhones[16] = "(443) 123-4567";
  const parsed = await parseProducerImport(csv([withPhones]), "productores.csv");
  assert.equal(parsed.validRows, 1);
  assert.equal(parsed.rows[0]["Telephone number"], "9145326574");
  assert.equal(parsed.rows[0]["Cellular number"], "4431234567");
});

test("rejects parsed phones with a country code or extension", async () => {
  const withCountryCode = [...row];
  withCountryCode[15] = "+52 443 123 4567";
  const withExtension = [...row];
  withExtension[15] = "443 123 4567 ext. 9";
  for (const input of [withCountryCode, withExtension]) {
    const parsed = await parseProducerImport(csv([input]), "productores.csv");
    assert.equal(parsed.validRows, 0);
    assert.equal(parsed.errors.some((error) => error.field === "Telephone number"), true);
  }
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
  assert.match(parsed.errors.find((error) => error.field === "Telephone number")?.message ?? "", /10 dígitos/);
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

test("uses physical XLSX row numbers and ignores whitespace-only rows", async () => {
  const invalid = [...row];
  invalid[13] = "XXXX";
  const workbook = await xlsx([
    { number: 3, values: invalid },
    { number: 7, values: Array(PRODUCER_IMPORT_HEADERS.length).fill(" ") },
  ]);
  const parsed = await parseProducerImport(workbook, "productores.xlsx");
  assert.equal(parsed.totalRows, 1);
  assert.deepEqual(parsed.rowNumbers, [3]);
  assert.equal(parsed.errors.find((error) => error.field === "RFC (Tax ID)")?.row, 3);
  assert.equal(parsed.rejectedRows[0]?.row, 3);
});

test("keeps structural errors file-level even when the first XLSX row is shifted", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ALL complete Data Base");
  const wrongHeaders: string[] = [...PRODUCER_IMPORT_HEADERS];
  wrongHeaders[0] = "Cultivo incorrecto";
  sheet.getRow(3).values = wrongHeaders;
  const parsed = await parseProducerImport(Buffer.from(await workbook.xlsx.writeBuffer()), "productores.xlsx");
  assert.equal(parsed.errors[0]?.row, 3);
  assert.equal(isFileLevelImportError(parsed.errors[0]), true);
  assert.equal(parsed.invalidRows, 0);
});

test("uses physical row numbers when re-summarizing database conflicts", async () => {
  const parsed = await parseProducerImport(await xlsx([{ number: 5, values: row }]), "productores.xlsx");
  const validation = summarizeValidation(
    parsed.rows,
    parsed.rowNumbers,
    [...parsed.errors, { row: 5, field: "Grower #", code: "EXISTING_GROWER_NUMBER", message: "Conflicto." }],
    parsed.warnings,
    parsed.totalRows,
  );
  assert.equal(validation.validRows, 0);
  assert.equal(validation.invalidRows, 1);
  assert.equal(validation.rejectedRows[0]?.row, 5);
  assert.deepEqual(filterValidImportRows(validation.rows, validation.rowNumbers, validation.errors), []);
});

test("validates configured districts without emitting the file-level warning", { concurrency: false }, async () => {
  const previous = process.env.PRODUCER_IMPORT_DISTRICTS;
  process.env.PRODUCER_IMPORT_DISTRICTS = "Jalisco,Michoacan,Altos - Bajio";
  try {
    const parsed = await parseProducerImport(csv([row]), "productores.csv");
    assert.equal(parsed.warnings.some((warning) => warning.code === "CATALOG_NOT_CONFIGURED"), false);
    assert.equal(parsed.errors.some((error) => error.field === "Distrito" && error.code === "INVALID_CATALOG"), true);
  } finally {
    if (previous === undefined) delete process.env.PRODUCER_IMPORT_DISTRICTS;
    else process.env.PRODUCER_IMPORT_DISTRICTS = previous;
  }
});

test("validates a temporary XLSX fixture with 50 RFCs and spaced phones", async () => {
  const fixtureRows = Array.from({ length: 50 }, (_, index) => {
    const values = [...row];
    values[3] = `PRODUCTOR ${index + 1}`;
    values[5] = String(900001 + index);
    values[6] = `PERSONA ${index + 1}`;
    values[13] = syntheticRfc(index);
    values[15] = "914 532 6574";
    values[16] = "(443) 123-4567";
    return { number: index + 2, values };
  });
  const parsed = await parseProducerImport(await xlsx(fixtureRows), "fixture-temporal.xlsx");
  assert.equal(parsed.totalRows, 50);
  assert.equal(parsed.validRows, 50);
  assert.equal(parsed.invalidRows, 0);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.warnings.filter((warning) => warning.code === "CATALOG_NOT_CONFIGURED").length, 1);
  assert.equal(parsed.rows.every((value) => value["Telephone number"] === "9145326574"), true);
});