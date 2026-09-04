import { getServerSession, type Session } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUser } from "@/lib/db";
import { PRODUCER_ASSOCIATION_REQUIRED_REDIRECT } from "./producer-access";

type PageAccessDependencies = {
  getSession: () => Promise<Session | null>;
  findUser: typeof getUser;
  redirectTo: (url: string) => never;
};

const defaultDependencies: PageAccessDependencies = {
  getSession: () => getServerSession(authOptions),
  findUser: getUser,
  redirectTo: redirect,
};

export function createRequirePageUser(
  overrides: Partial<PageAccessDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function requireConfiguredPageUser() {
    const session = await dependencies.getSession();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const user = userId ? await dependencies.findUser(userId) : null;

    if (!user?.isActive) {
      return dependencies.redirectTo("/login");
    }
    if (user.role === "PRODUCER" && !user.producerId) {
      return dependencies.redirectTo(PRODUCER_ASSOCIATION_REQUIRED_REDIRECT);
    }

    return user;
  };
}

export const requirePageUser = createRequirePageUser();