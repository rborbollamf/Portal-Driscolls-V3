import { NextRequest, NextResponse } from "next/server";
import { ValidationService } from "@/lib/services/validation";
import { createAuditLog } from "@/lib/db";
import { generateId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { legalEntityId, tipo, modo = "ONE_SHOT" } = body;

    if (!legalEntityId) {
      return NextResponse.json(
        { error: "legalEntityId is required" },
        { status: 400 }
      );
    }

    let result;

    if (tipo) {
      result = await ValidationService.runDiagnostic(legalEntityId, tipo, modo);
    } else {
      result = await ValidationService.runCompleteDiagnostic(legalEntityId, modo);
    }

    createAuditLog({
      id: generateId(),
      actorUserId: "current-user",
      action: "run_validation",
      targetType: "LegalEntity",
      targetId: legalEntityId,
      at: new Date().toISOString(),
      metadata: { tipo, modo },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
