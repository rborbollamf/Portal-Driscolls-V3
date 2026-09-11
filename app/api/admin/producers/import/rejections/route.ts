import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { rejectionCsv } from "@/lib/services/producer-import";
import type { ImportError } from "@/lib/services/producer-import";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;
  const body = await request.json() as { rows?: Array<{ row: number; values?: Record<string, string>; errors: ImportError[] }> };
  if (!Array.isArray(body.rows) || body.rows.length > 50_000) {
    return NextResponse.json({ error: "Invalid rejection rows" }, { status: 400 });
  }
  const csv = rejectionCsv(body.rows ?? []);
  return new NextResponse("\uFEFF" + csv, {
    headers: { "Content-Type": "text/csv;charset=utf-8", "Content-Disposition": 'attachment; filename="rechazos-productores.csv"' },
  });
}