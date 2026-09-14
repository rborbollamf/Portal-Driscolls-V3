import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { getProducerImportDatabaseIssues, importProducerRows } from "@/lib/db";
import { filterValidImportRows, isFileLevelImportError, parseProducerImport, summarizeValidation } from "@/lib/services/producer-import";
import { createHash } from "crypto";
import { producerImportErrorResponse } from "@/lib/services/producer-import-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
    if (!/\.(xlsx|csv)$/i.test(file.name)) return NextResponse.json({ error: "Solo se permiten archivos .xlsx o .csv." }, { status: 400 });
    if (!file.size) return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "File exceeds 25 MB limit" }, { status: 413 });
    const mode = form.get("mode") === "VALID_ONLY" ? "VALID_ONLY" : "ALL_OR_NOTHING";
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseProducerImport(buffer, file.name);
    const database = await getProducerImportDatabaseIssues(parsed.rows, parsed.rowNumbers);
    const validation = summarizeValidation(
      parsed.rows,
      parsed.rowNumbers,
      [...parsed.errors, ...database.errors],
      [...parsed.warnings, ...database.warnings],
      parsed.totalRows,
    );
    const fileErrors = validation.errors.filter(isFileLevelImportError);
    if (fileErrors.length) {
      return NextResponse.json({ ...validation, preview: validation.rows.slice(0, 20) }, { status: 422 });
    }
    if (mode === "ALL_OR_NOTHING" && validation.errors.length) {
      return NextResponse.json({ ...validation, preview: validation.rows.slice(0, 20) }, { status: 422 });
    }
    const rows = filterValidImportRows(validation.rows, validation.rowNumbers, validation.errors);
    const invalidRows = new Set(validation.errors.map((error) => error.row));
    const rowNumbers = validation.rowNumbers.filter((rowNumber) => !invalidRows.has(rowNumber));
    const hash = createHash("sha256").update(buffer).digest("hex");
    const result = await importProducerRows(rows, rowNumbers, auth.userId, mode, {
      batchId: `producer-import-${hash.slice(0, 24)}`,
      filename: file.name,
      sha256: hash,
      received: validation.totalRows,
      valid: validation.validRows,
      rejected: validation.invalidRows,
      imported: rows.length,
    });
    return NextResponse.json({
      ...result,
      mode,
      received: validation.totalRows,
      valid: validation.validRows,
      rejected: validation.invalidRows,
      warnings: validation.warnings,
      rejectedRows: validation.rejectedRows,
      preview: rows.slice(0, 20),
    });
  } catch (error) {
    return producerImportErrorResponse(error);
  }
}