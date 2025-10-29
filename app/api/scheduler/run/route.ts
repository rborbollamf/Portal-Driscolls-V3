import { NextRequest, NextResponse } from "next/server";
import { scheduler } from "@/lib/services/scheduler";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cohort = "all" } = body;

    await scheduler.runMonitoring(cohort);

    return NextResponse.json({
      success: true,
      message: "Monitoring completed",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
