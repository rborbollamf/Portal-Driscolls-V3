import { NextRequest, NextResponse } from "next/server";
import { setUserProducerAssociation } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es válido" },
      { status: 400 },
    );
  }

  const producerId =
    typeof body === "object" && body !== null && "producerId" in body
      ? (body as { producerId?: unknown }).producerId
      : undefined;

  if (typeof producerId !== "string" || !producerId.trim()) {
    return NextResponse.json(
      { error: "Debes seleccionar un expediente de productor" },
      { status: 400 },
    );
  }

  try {
    const result = await setUserProducerAssociation(params.userId, producerId.trim());

    if (result.kind === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Cuenta de productor no encontrada" }, { status: 404 });
    }
    if (result.kind === "NOT_PRODUCER_ACCOUNT") {
      return NextResponse.json(
        { error: "Solo se pueden vincular cuentas con rol PRODUCTOR" },
        { status: 409 },
      );
    }
    if (result.kind === "PRODUCER_NOT_FOUND") {
      return NextResponse.json(
        { error: "El expediente de productor seleccionado no existe" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      producerId: result.user.producerId,
      isActive: result.user.isActive,
      createdAt: result.user.createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar el vínculo de productor" },
      { status: 500 },
    );
  }
}