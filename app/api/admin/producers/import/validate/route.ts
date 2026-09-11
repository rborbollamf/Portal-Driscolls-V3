import { NextRequest, NextResponse } from "next/server";
import { getProducerImportDatabaseIssues } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";
import { parseProducerImport, summarizeValidation } from "@/lib/services/producer-import";

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
    const parsed = await parseProducerImport(Buffer.from(await file.arrayBuffer()), file.name);
    const database = await getProducerImportDatabaseIssues(parsed.rows);
    const validation = summarizeValidation(
      parsed.rows,
      [...parsed.errors, ...database.errors],
      [...parsed.warnings, ...database.warnings],
      parsed.totalRows,
    );
    return NextResponse.json({ ...validation, preview: validation.rows.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid import file" }, { status: 400 });
  }
}