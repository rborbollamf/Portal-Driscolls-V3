import { NextRequest, NextResponse } from "next/server";
import {
  getProducers,
  getUsers,
  setUserProducerAssociation,
} from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

type Dependencies = {
  authorize: typeof requireAuth;
  listProducers: typeof getProducers;
  listUsers: typeof getUsers;
  setAssociation: typeof setUserProducerAssociation;
};

const defaultDependencies: Dependencies = {
  authorize: requireAuth,
  listProducers: getProducers,
  listUsers: getUsers,
  setAssociation: setUserProducerAssociation,
};

function publicUser(
  user: Awaited<ReturnType<typeof getUsers>>[number],
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    producerId: user.producerId,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export function createListProducerAccountsHandler(
  overrides: Partial<Dependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function listProducerAccounts() {
    const auth = await dependencies.authorize(["ADMIN"]);
    if (!auth.authorized) return auth.response;

    try {
      const [{ producers }, users] = await Promise.all([
        dependencies.listProducers(),
        dependencies.listUsers(),
      ]);
      return NextResponse.json({
        users: users
          .filter((user) => user.role === "PRODUCER")
          .map(publicUser),
        producers,
      });
    } catch {
      return NextResponse.json(
        { error: "No se pudieron cargar las cuentas de productor" },
        { status: 500 },
      );
    }
  };
}

export function createUpdateProducerAccountHandler(
  overrides: Partial<Dependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function updateProducerAccount(
    request: NextRequest,
    { params }: { params: { userId: string } },
  ) {
    const auth = await dependencies.authorize(["ADMIN"]);
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
      const result = await dependencies.setAssociation(
        params.userId,
        producerId.trim(),
      );

      if (result.kind === "USER_NOT_FOUND") {
        return NextResponse.json(
          { error: "Cuenta de productor no encontrada" },
          { status: 404 },
        );
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

      return NextResponse.json(publicUser(result.user));
    } catch {
      return NextResponse.json(
        { error: "No se pudo guardar el vínculo de productor" },
        { status: 500 },
      );
    }
  };
}