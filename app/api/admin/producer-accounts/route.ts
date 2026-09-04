import { NextResponse } from "next/server";
import { getProducers, getUsers } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

function publicUser(user: Awaited<ReturnType<typeof getUsers>>[number]) {
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

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;

  try {
    const [{ producers }, users] = await Promise.all([getProducers(), getUsers()]);
    return NextResponse.json({
      users: users.filter((user) => user.role === "PRODUCER").map(publicUser),
      producers,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar las cuentas de productor" },
      { status: 500 },
    );
  }
}