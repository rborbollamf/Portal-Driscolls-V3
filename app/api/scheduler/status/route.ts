import { NextResponse } from "next/server";
import { scheduler } from "@/lib/services/scheduler";
import { requireAuth } from "@/lib/auth/middleware";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;

  try {
      const status = await scheduler.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get scheduler status" },
      { status: 500 }
    );
  }
}
