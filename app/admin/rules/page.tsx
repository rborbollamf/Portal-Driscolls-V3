"use client";

import { useEffect, useState } from "react";

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const response = await fetch("/api/rules");
    const data = await response.json();
    setRules(data || []);
    setLoading(false);
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    await fetch(`/api/rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchRules();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reglas de Validación</h1>
        <p className="text-gray-600 mt-1">Configuración del motor de reglas</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando reglas...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {rule.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        rule.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {rule.isActive ? "Activa" : "Inactiva"}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        rule.severityDefault === "HIGH"
                          ? "bg-red-100 text-red-800"
                          : rule.severityDefault === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {rule.severityDefault}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{rule.description}</p>
                  <div className="mt-3 text-sm">
                    <p className="text-gray-500">
                      <strong>Código:</strong> {rule.code}
                    </p>
                    <p className="text-gray-500">
                      <strong>Tipo:</strong> {rule.evaluatorType}
                    </p>
                    <p className="text-gray-500 mt-2">
                      <strong>Configuración:</strong>
                    </p>
                    <pre className="bg-gray-50 p-2 rounded mt-1 text-xs overflow-auto">
                      {JSON.stringify(rule.config, null, 2)}
                    </pre>
                  </div>
                </div>
                <button
                  onClick={() => toggleRule(rule.id, rule.isActive)}
                  className={`ml-4 px-4 py-2 rounded ${
                    rule.isActive
                      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {rule.isActive ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
