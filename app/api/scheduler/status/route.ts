import { NextResponse } from "next/server";
import { scheduler } from "@/lib/services/scheduler";

export async function GET() {
  try {
    const status = scheduler.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get scheduler status" },
      { status: 500 }
    );
  }
}
