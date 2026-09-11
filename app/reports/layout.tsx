import { NavBar } from "@/components/nav-bar";
import { requirePageUser } from "@/lib/auth/page-access";
import { redirect } from "next/navigation";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();
  if (process.env.STAGE_2_ENABLED !== "true") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar userRole={user.role} reportsEnabled />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}