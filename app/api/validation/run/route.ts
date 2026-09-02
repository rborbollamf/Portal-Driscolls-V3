import { NextRequest, NextResponse } from "next/server";
import { ValidationService } from "@/lib/services/validation";
import { createAuditLog } from "@/lib/db";
import { generateId } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/middleware";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN", "ANALYST"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { legalEntityId, tipo, modo = "ONE_SHOT" } = body;

    if (!legalEntityId) {
      return NextResponse.json(
        { error: "legalEntityId is required" },
        { status: 400 }
      );
    }

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    }
    let result;

    if (tipo) {
      result = await ValidationService.enqueueDiagnostic(legalEntityId, tipo, modo, `manual:${auth.userId}:${idempotencyKey}`);
    } else {
      result = await ValidationService.enqueueCompleteDiagnostic(legalEntityId, modo, `manual:${auth.userId}:${idempotencyKey}`);
    }

    await createAuditLog({
      id: generateId(),
      actorUserId: auth.userId,
      action: "run_validation",
      targetType: "LegalEntity",
      targetId: legalEntityId,
      at: new Date().toISOString(),
      metadata: { tipo, modo },
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
