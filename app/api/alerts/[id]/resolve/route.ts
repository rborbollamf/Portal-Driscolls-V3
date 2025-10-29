import { NextRequest, NextResponse } from "next/server";
import { updateAlert, createAuditLog } from "@/lib/db";
import { generateId } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN", "ANALYST"]);
  if (!auth.authorized) return auth.response;

  try {
    const updatedAlert = updateAlert(params.id, {
      resolvedAt: new Date().toISOString(),
    });

    if (!updatedAlert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    createAuditLog({
      id: generateId(),
      actorUserId: auth.userId,
      action: "resolve_alert",
      targetType: "Alert",
      targetId: params.id,
      at: new Date().toISOString(),
      metadata: {},
    });

    return NextResponse.json(updatedAlert);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to resolve alert" },
      { status: 500 }
    );
  }
}
