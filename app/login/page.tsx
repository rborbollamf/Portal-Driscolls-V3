"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "producer_association_required") {
      setError("Tu cuenta de productor aún no está vinculada a un expediente. Solicita a administración que complete el vínculo.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciales inválidas");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-driscoll-yellow/20 to-driscoll-lightgreen/20">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md border-2 border-driscoll-green/10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image 
              src="/driscoll-logo.png" 
              alt="Driscoll's Logo" 
              width={240} 
              height={80}
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-driscoll-green">Portal de Monitoreo</h1>
          <p className="text-driscoll-green/70 mt-2 font-medium">Financiero-Fiscal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-driscoll-green mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 border-2 border-driscoll-green/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-driscoll-green focus:border-driscoll-green transition-all"
              placeholder="usuario@demo.local"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-driscoll-green mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 border-2 border-driscoll-green/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-driscoll-green focus:border-driscoll-green transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-driscoll-red/10 border border-driscoll-red/30 text-driscoll-red text-sm text-center py-2 px-4 rounded-lg font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-driscoll-green bg-driscoll-yellow hover:bg-driscoll-yellow/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-driscoll-green disabled:opacity-50 transition-all"
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-6 border-t border-driscoll-green/20 pt-6">
          <p className="text-sm text-driscoll-green font-semibold text-center mb-3">Usuarios demo:</p>
          <div className="space-y-2 text-xs text-driscoll-green/70">
            <p className="bg-driscoll-yellow/10 p-2 rounded"><strong className="text-driscoll-green">Admin:</strong> admin@demo.local / Admin123!</p>
            <p className="bg-driscoll-yellow/10 p-2 rounded"><strong className="text-driscoll-green">Analyst:</strong> analyst@demo.local / Analyst123!</p>
            <p className="bg-driscoll-yellow/10 p-2 rounded"><strong className="text-driscoll-green">Producer:</strong> producer@demo.local / Producer123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
