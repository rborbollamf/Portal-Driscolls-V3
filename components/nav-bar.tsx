"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";

export function NavBar({ userRole }: { userRole: string }) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-driscoll-green text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <Image 
                src="/driscoll-logo.png" 
                alt="Driscoll's Logo" 
                width={180} 
                height={60}
                className="h-12 w-auto"
              />
            </Link>

            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isActive("/dashboard")
                    ? "bg-driscoll-darkgreen text-driscoll-yellow"
                    : "hover:bg-driscoll-darkgreen/20"
                }`}
              >
                Dashboard
              </Link>

              <Link
                href="/producers"
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isActive("/producers")
                    ? "bg-driscoll-darkgreen text-driscoll-yellow"
                    : "hover:bg-driscoll-darkgreen/20"
                }`}
              >
                Productores
              </Link>

              <Link
                href="/alerts"
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isActive("/alerts")
                    ? "bg-driscoll-darkgreen text-driscoll-yellow"
                    : "hover:bg-driscoll-darkgreen/20"
                }`}
              >
                Alertas
              </Link>

              <Link
                href="/reports"
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isActive("/reports")
                    ? "bg-driscoll-darkgreen text-driscoll-yellow"
                    : "hover:bg-driscoll-darkgreen/20"
                }`}
              >
                Reportes
              </Link>

              {userRole === "ADMIN" && (
                <>
                  <Link
                    href="/admin/rules"
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      isActive("/admin/rules")
                        ? "bg-driscoll-darkgreen text-driscoll-yellow"
                        : "hover:bg-driscoll-darkgreen/20"
                    }`}
                  >
                    Reglas
                  </Link>

                  <Link
                    href="/admin/scheduler"
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      isActive("/admin/scheduler")
                        ? "bg-driscoll-darkgreen text-driscoll-yellow"
                        : "hover:bg-driscoll-darkgreen/20"
                    }`}
                  >
                    Scheduler
                  </Link>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
              signOut({ callbackUrl: `${baseUrl}/login` });
            }}
            className="px-6 py-2 bg-driscoll-yellow text-driscoll-green hover:bg-driscoll-yellow/90 rounded-md font-semibold transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
