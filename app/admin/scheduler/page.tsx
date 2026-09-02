"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Job {
  id: string;
  tipo: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
}

interface IntegrationEvent {
  id: string;
  provider: string;
  status: string;
  message?: string;
  occurredAt: string;
}

export default function SchedulerPage() {
  const [cohort, setCohort] = useState("all");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const pendingSubmissionKey = useRef<string | null>(null);
  const [status, setStatus] = useState<{ queue: Record<string, number>; recentJobs: Job[]; integrationEvents: IntegrationEvent[] }>();

  const refresh = useCallback(async () => {
    const response = await fetch("/api/scheduler/status", { cache: "no-store" });
    if (response.ok) setStatus(await response.json());
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const runMonitoring = async () => {
    setRunning(true);
    setMessage("");
    pendingSubmissionKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/scheduler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": pendingSubmissionKey.current },
        body: JSON.stringify({ cohort }),
      });

      const data = await response.json();
      setMessage(data.success ? `${data.jobs?.length ?? 0} trabajos fueron encolados para el worker` : "Error al encolar monitoreo");
      await refresh();
      if (data.success) pendingSubmissionKey.current = null;
    } catch {
      setMessage("Error al ejecutar monitoreo");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Programador de Tareas</h1>
        <p className="text-gray-600 mt-1">Configuración de monitoreo recurrente</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ejecutar Monitoreo Manual
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cohorte
              </label>
              <select
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">Todos los productores</option>
                <option value="zona:Occidente">Zona: Occidente</option>
                <option value="zona:Bajío">Zona: Bajío</option>
                <option value="zona:Centro">Zona: Centro</option>
                <option value="zona:Norte">Zona: Norte</option>
              </select>
            </div>

            <button
              onClick={runMonitoring}
              disabled={running}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
                {running ? "Encolando..." : "Encolar Monitoreo"}
            </button>

            {message && (
              <div
                className={`p-3 rounded ${
                  message.includes("Error")
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Estado operativo</h3>
              <p className="text-sm text-gray-600">Actualización automática cada 10 segundos. El worker procesa la cola fuera del servidor web.</p>
            </div>
            <button onClick={() => void refresh()} className="px-3 py-2 text-sm border rounded hover:bg-gray-50">Actualizar</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["PENDING", "RUNNING", "RETRY", "COMPLETED", "FAILED"].map((state) => (
              <div key={state} className={`rounded border p-3 ${state === "FAILED" ? "border-red-200 bg-red-50" : ""}`}>
                <p className="text-xs text-gray-500">{state === "PENDING" ? "Pendientes" : state === "RETRY" ? "Reintentos" : state === "RUNNING" ? "En proceso" : state === "FAILED" ? "Fallidos" : "Completados"}</p>
                <p className="text-2xl font-bold">{status?.queue?.[state] ?? 0}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <h4 className="font-medium text-gray-900 mb-2">Trabajos recientes</h4>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b"><tr><th className="p-2">Tipo</th><th className="p-2">Estado</th><th className="p-2">Intentos</th><th className="p-2">Creado</th><th className="p-2">Último error</th></tr></thead>
              <tbody>
                {status?.recentJobs?.map((job) => (
                  <tr key={job.id} className="border-b">
                    <td className="p-2">{job.tipo}</td><td className="p-2 font-medium">{job.status}</td>
                    <td className="p-2">{job.attempts}/{job.maxAttempts}</td><td className="p-2">{new Date(job.createdAt).toLocaleString()}</td>
                    <td className="p-2 text-red-700">{job.lastError ?? "—"}</td>
                  </tr>
                ))}
                {!status?.recentJobs?.length && <tr><td colSpan={5} className="p-3 text-gray-500">No hay trabajos registrados todavía.</td></tr>}
              </tbody>
            </table>
          </div>
          {status?.integrationEvents?.length ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-medium text-amber-900">Fallas de integración</h4>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {status.integrationEvents.map((event) => <li key={event.id}><strong>{event.provider}</strong> · {event.status} · {event.message ?? "Sin detalle"} · {new Date(event.occurredAt).toLocaleString()}</li>)}
              </ul>
            </div>
          ) : <p className="text-sm text-green-700">No hay fallas de integración recientes.</p>}
        </div>
      </div>
    </div>
  );
}
