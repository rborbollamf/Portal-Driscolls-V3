import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUser } from "@/lib/db";

export async function requirePageUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const user = userId ? await getUser(userId) : null;

  if (!user?.isActive) {
    redirect("/login");
  }
  if (user.role === "PRODUCER" && !user.producerId) {
    redirect("/login?error=producer_association_required");
  }

  return user;
}