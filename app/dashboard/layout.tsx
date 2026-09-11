import { NavBar } from "@/components/nav-bar";
import { requirePageUser } from "@/lib/auth/page-access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar userRole={user.role} reportsEnabled={process.env.STAGE_2_ENABLED === "true"} />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
