import { NextRequest, NextResponse } from "next/server";
import { scheduler } from "@/lib/services/scheduler";
import { requireAuth } from "@/lib/auth/middleware";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { cohort = "all" } = body;
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const monitoring = await scheduler.enqueueMonitoring(cohort, `admin:${auth.userId}`, idempotencyKey);

    return NextResponse.json({
      success: true,
      message: "Monitoring jobs queued",
      ...monitoring,
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
