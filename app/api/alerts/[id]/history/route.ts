import { NextResponse } from "next/server";
import { getAlert, getAlertHistory, producerCanAccessAlert } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const alert = await getAlert(params.id);
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  if (auth.userRole === "PRODUCER") {
    if (!auth.producerId || !(await producerCanAccessAlert(params.id, auth.producerId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  return NextResponse.json(await getAlertHistory(params.id));
}