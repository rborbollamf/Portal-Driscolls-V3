import ExcelJS from "exceljs";

export const PRODUCER_IMPORT_HEADERS = [
  "Cultivo", "Distrito", "Growing Area Name", "Productor (Grower)", "COFIBE/ ID CG",
  "Grower #", "Razón Social (Company name)", "Representante Legal (Administrator)", "Dirección Fiscal (Address)",
  "Colonia", "Municipio", "Estado", "Zip Code", "RFC (Tax ID)", "Contact",
  "Telephone number", "Cellular number", "Email", "Email productor",
] as const;
export type ProducerImportRow = Record<(typeof PRODUCER_IMPORT_HEADERS)[number], string>;
export type ImportError = { row: number; field?: string; code: string; message: string };
export type RejectedImportRow = { row: number; values: ProducerImportRow; errors: ImportError[] };
export type ParsedProducerImport = {
  rows: ProducerImportRow[];
  errors: ImportError[];
  warnings: ImportError[];
  rejectedRows: RejectedImportRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
};
export const MEXICAN_STATES = ["Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"];
const fold = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const REQUIRED_HEADERS = new Set<(typeof PRODUCER_IMPORT_HEADERS)[number]>([
  "Cultivo", "Distrito", "Growing Area Name", "Productor (Grower)", "Grower #",
  "Razón Social (Company name)", "Dirección Fiscal (Address)", "Municipio", "Estado",
  "Zip Code", "RFC (Tax ID)",
]);

export function normalizeRfc(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

/** Mexican RFC format plus the SAT modulo-11 check digit. */
export function isValidMexicanRfc(value: string): boolean {
  const rfc = normalizeRfc(value);
  const isMoral = /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/.test(rfc);
  const isFisica = /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/.test(rfc);
  if (!isMoral && !isFisica) return false;
  const datePart = rfc.slice(isMoral ? 3 : 4, isMoral ? 9 : 10);
  const year = Number(datePart.slice(0, 2));
  const month = Number(datePart.slice(2, 4));
  const day = Number(datePart.slice(4, 6));
  const isRealDate = (fullYear: number) => {
    const date = new Date(Date.UTC(fullYear, month - 1, day));
    return date.getUTCFullYear() === fullYear &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  };
  if (!isRealDate(1900 + year) && !isRealDate(2000 + year)) return false;
  const body = rfc.slice(0, -1).padStart(12, " ");
  const check = rfc.at(-1)!;
  const map = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ";
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const n = map.indexOf(body[i]);
    if (n < 0) return false;
    sum += n * (13 - i);
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "A" : String(remainder);
  return expected === check;
}

function cellText(cell: ExcelJS.CellValue): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell === "object" && "result" in cell) return String(cell.result ?? "").trim();
  return String(cell).trim();
}

export async function parseProducerImport(buffer: Buffer, filename: string, maxRows = 50_000) {
  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (extension !== ".csv" && extension !== ".xlsx") {
    throw new Error("Solo se permiten archivos .xlsx o .csv.");
  }
  if (!buffer.length) throw new Error("El archivo está vacío.");
  const workbook = new ExcelJS.Workbook();
  if (extension === ".csv") {
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const records = lines.map((line) => {
      const out: string[] = []; let current = ""; let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (quoted && line[i + 1] === '"') { current += '"'; i++; } else quoted = !quoted; }
        else if (ch === "," && !quoted) { out.push(current.trim()); current = ""; } else current += ch;
      }
      if (quoted) throw new Error("El CSV contiene una celda entrecomillada sin cerrar.");
      out.push(current.trim()); return out;
    });
    return validateRows(records, maxRows);
  }
  await workbook.xlsx.load(buffer);
  if (workbook.worksheets.length !== 1 || workbook.worksheets[0].name !== "ALL complete Data Base") throw new Error('Workbook must contain exactly one worksheet named "ALL complete Data Base".');
  const sheet = workbook.worksheets[0];
  const records: string[][] = [];
  sheet.eachRow((row) => records.push((row.values as ExcelJS.CellValue[]).slice(1).map(cellText)));
  return validateRows(records, maxRows);
}

function validateRows(records: string[][], maxRows: number): ParsedProducerImport {
  const errors: ImportError[] = []; const warnings: ImportError[] = [];
  const header = records[0] ?? [];
  if (header.length !== PRODUCER_IMPORT_HEADERS.length ||
      header.some((v, i) => v !== PRODUCER_IMPORT_HEADERS[i])) {
    errors.push({ row: 1, code: "INVALID_HEADERS", message: "Headers must exactly match the ordered template." });
    return { rows: [], errors, warnings, rejectedRows: [], totalRows: 0, validRows: 0, invalidRows: 0 };
  }
  if (records.length - 1 > maxRows) {
    errors.push({ row: 1, code: "ROW_LIMIT", message: `Maximum rows is ${maxRows}.` });
  }
  const rows: ProducerImportRow[] = [];
  const rfcRows = new Map<string, number[]>();
  const growerRows = new Map<string, number[]>();
  records.slice(1, maxRows + 1).forEach((values, index) => {
    const rowNumber = index + 2;
    const row = Object.fromEntries(PRODUCER_IMPORT_HEADERS.map((h, i) => [h, String(values[i] ?? "").trim()])) as ProducerImportRow;
    for (const field of REQUIRED_HEADERS) {
      if (!row[field]) errors.push({ row: rowNumber, field, code: "REQUIRED", message: "El campo es obligatorio." });
    }
    const rfc = normalizeRfc(row["RFC (Tax ID)"]);
    if (rfc && !isValidMexicanRfc(rfc)) errors.push({ row: rowNumber, field: "RFC (Tax ID)", code: "INVALID_RFC", message: "El RFC tiene formato o dígito verificador inválido." });
    if (rfc) rfcRows.set(rfc, [...(rfcRows.get(rfc) ?? []), rowNumber]);
    if (row["Grower #"]) growerRows.set(row["Grower #"], [...(growerRows.get(row["Grower #"]) ?? []), rowNumber]);
    if (values.length !== PRODUCER_IMPORT_HEADERS.length) errors.push({ row: rowNumber, code: "INVALID_CELLS", message: "La fila contiene columnas faltantes o adicionales." });
    if (row.Cultivo && !["RASP","BLUE","BLACK","STRAW"].includes(fold(row.Cultivo))) errors.push({ row: rowNumber, field: "Cultivo", code: "INVALID_CATALOG", message: "Cultivo fuera del catálogo RASP, BLUE, BLACK o STRAW." });
    const districts = (process.env.PRODUCER_IMPORT_DISTRICTS ?? "").split(",").map(fold).filter(Boolean);
    if (row.Distrito && districts.length && !districts.includes(fold(row.Distrito))) errors.push({ row: rowNumber, field: "Distrito", code: "INVALID_CATALOG", message: "Distrito fuera del catálogo configurado." });
    if (row.Distrito && !districts.length) warnings.push({ row: rowNumber, field: "Distrito", code: "CATALOG_NOT_CONFIGURED", message: "No se configuró PRODUCER_IMPORT_DISTRICTS; se validó únicamente que Distrito no esté vacío." });
    if (row["Grower #"] && !/^[1-9]\d*$/.test(row["Grower #"])) errors.push({ row: rowNumber, field: "Grower #", code: "INVALID_FORMAT", message: "Grower # debe ser un entero positivo." });
    if (row.Estado && !MEXICAN_STATES.map(fold).includes(fold(row.Estado))) errors.push({ row: rowNumber, field: "Estado", code: "INVALID_CATALOG", message: "Estado fuera del catálogo de entidades federativas de México." });
    if (row["Zip Code"] && !/^\d{5}$/.test(row["Zip Code"])) errors.push({ row: rowNumber, field: "Zip Code", code: "INVALID_FORMAT", message: "Zip Code debe contener exactamente cinco dígitos." });
    for (const field of ["Telephone number","Cellular number"] as const) if (row[field] && !/^\d+$/.test(row[field])) errors.push({ row: rowNumber, field, code: "INVALID_FORMAT", message: "El teléfono debe contener solo dígitos." });
    for (const field of ["Email","Email productor"] as const) if (row[field] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row[field])) errors.push({ row: rowNumber, field, code: "INVALID_FORMAT", message: "El correo electrónico no es válido." });
    if (rfc.length === 12 && !row["Representante Legal (Administrator)"]) errors.push({ row: rowNumber, field: "Representante Legal (Administrator)", code: "REQUIRED", message: "El representante legal es obligatorio para una persona moral." });
    rows.push({ ...row, "RFC (Tax ID)": rfc });
  });
  for (const rowNumbers of rfcRows.values()) {
    if (rowNumbers.length > 1) for (const row of rowNumbers) errors.push({ row, field: "RFC (Tax ID)", code: "DUPLICATE_IN_FILE", message: `RFC duplicado en las filas ${rowNumbers.join(", ")}.` });
  }
  for (const [grower, rowNumbers] of growerRows) {
    if (rowNumbers.length > 1) for (const row of rowNumbers) errors.push({ row, field: "Grower #", code: "DUPLICATE_IN_FILE", message: `Grower # ${grower} duplicado en las filas ${rowNumbers.join(", ")}.` });
  }
  return summarizeValidation(rows, errors, warnings, Math.max(0, records.length - 1));
}

export function summarizeValidation(
  rows: ProducerImportRow[],
  errors: ImportError[],
  warnings: ImportError[],
  totalRows: number,
): ParsedProducerImport {
  const invalid = new Set(errors.filter((error) => error.row > 1).map((error) => error.row));
  const rejectedRows = rows.flatMap((values, index) => {
    const row = index + 2;
    const rowErrors = errors.filter((error) => error.row === row);
    return rowErrors.length ? [{ row, values, errors: rowErrors }] : [];
  });
  return {
    rows,
    errors,
    warnings,
    rejectedRows,
    totalRows,
    validRows: rows.filter((_, index) => !invalid.has(index + 2)).length,
    invalidRows: invalid.size,
  };
}

export function rejectionCsv(rows: Array<{ row: number; values?: Record<string, string>; errors: ImportError[] }>) {
  const esc = (v: unknown) => {
    const raw = String(v ?? "");
    const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [PRODUCER_IMPORT_HEADERS.join(",") + ",Errores",
    ...rows.map((r) => `${PRODUCER_IMPORT_HEADERS.map((h) => esc(r.values?.[h])).join(",")},${esc(r.errors.map((e) => e.message).join("; "))}`),
  ].join("\r\n");
}