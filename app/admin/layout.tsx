import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { NavBar } from "@/components/nav-bar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar userRole={user.role} reportsEnabled={process.env.STAGE_2_ENABLED === "true"} />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}