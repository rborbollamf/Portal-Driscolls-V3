"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export function NavBar({ userRole }: { userRole: string }) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold">
              Portal Driscoll's
            </Link>

            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded ${
                  isActive("/dashboard")
                    ? "bg-indigo-700"
                    : "hover:bg-indigo-500"
                }`}
              >
                Dashboard
              </Link>

              <Link
                href="/producers"
                className={`px-3 py-2 rounded ${
                  isActive("/producers")
                    ? "bg-indigo-700"
                    : "hover:bg-indigo-500"
                }`}
              >
                Productores
              </Link>

              <Link
                href="/alerts"
                className={`px-3 py-2 rounded ${
                  isActive("/alerts")
                    ? "bg-indigo-700"
                    : "hover:bg-indigo-500"
                }`}
              >
                Alertas
              </Link>

              {userRole === "ADMIN" && (
                <>
                  <Link
                    href="/admin/rules"
                    className={`px-3 py-2 rounded ${
                      isActive("/admin/rules")
                        ? "bg-indigo-700"
                        : "hover:bg-indigo-500"
                    }`}
                  >
                    Reglas
                  </Link>

                  <Link
                    href="/admin/scheduler"
                    className={`px-3 py-2 rounded ${
                      isActive("/admin/scheduler")
                        ? "bg-indigo-700"
                        : "hover:bg-indigo-500"
                    }`}
                  >
                    Scheduler
                  </Link>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
