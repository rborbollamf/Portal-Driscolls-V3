import { getServerSession } from "next-auth";
import { authOptions } from "./index";
import { NextResponse } from "next/server";

export async function requireAuth(allowedRoles?: string[]) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userRole = (session.user as any).role;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    authorized: true,
    session,
    userId: (session.user as any).id,
    userRole,
  };
}
