"use client";

import { useState } from "react";

export default function SchedulerPage() {
  const [cohort, setCohort] = useState("all");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const runMonitoring = async () => {
    setRunning(true);
    setMessage("");

    try {
      const response = await fetch("/api/scheduler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohort }),
      });

      const data = await response.json();
      setMessage(data.success ? "Monitoreo completado exitosamente" : "Error al ejecutar monitoreo");
    } catch (error) {
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
              {running ? "Ejecutando..." : "Ejecutar Monitoreo"}
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

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información del Scheduler
          </h3>
          <p className="text-gray-600">
            El sistema está configurado para ejecutar monitoreo recurrente automáticamente.
            Puedes ejecutar monitoreos manuales usando el formulario anterior.
          </p>
        </div>
      </div>
    </div>
  );
}
