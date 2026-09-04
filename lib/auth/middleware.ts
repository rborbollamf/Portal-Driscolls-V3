import { getServerSession, type Session } from "next-auth";
import { authOptions } from "./index";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/db";
import {
  canAccessProducerResource,
  PRODUCER_ASSOCIATION_REQUIRED_CODE,
  PRODUCER_ASSOCIATION_REQUIRED_MESSAGE,
} from "./producer-access";

export { canAccessProducerResource } from "./producer-access";

type AuthResult =
  | { authorized: false; response: NextResponse }
  | {
    authorized: true;
    session: Session;
    userId: string;
    userRole: string;
    producerId?: string;
  };

export async function requireAuth(allowedRoles?: string[]): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userId = (session.user as any).id;
  const user = userId ? await getUser(userId) : null;

  if (!user || !user.isActive) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userRole = user.role;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (userRole === "PRODUCER" && !user.producerId) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        {
          error: PRODUCER_ASSOCIATION_REQUIRED_MESSAGE,
          code: PRODUCER_ASSOCIATION_REQUIRED_CODE,
        },
        { status: 403 },
      ),
    };
  }

  return {
    authorized: true as const,
    session,
    userId: user.id,
    userRole,
    producerId: user.producerId,
  };
}

export function requireProducerAccess(
  auth: { userRole: string; producerId?: string },
  producerId: string,
) {
  if (canAccessProducerResource(auth.userRole, auth.producerId, producerId)) {
    return null;
  }

  return NextResponse.json({ error: "Producer not found" }, { status: 404 });
}
