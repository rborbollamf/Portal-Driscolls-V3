"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProducersPage() {
  const [producers, setProducers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ zona: "", status: "" });

  useEffect(() => {
    fetchProducers();
  }, [filter]);

  const fetchProducers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.zona) params.append("zona", filter.zona);
    if (filter.status) params.append("status", filter.status);

    const response = await fetch(`/api/producers?${params.toString()}`);
    const data = await response.json();
    setProducers(data.producers || []);
    setLoading(false);
  };

  const runDiagnostic = async (producerId: string) => {
    if (!confirm("¿Ejecutar diagnóstico completo?")) return;

    const producer = producers.find((p) => p.id === producerId);
    if (!producer) return;

    const legalEntitiesResponse = await fetch(`/api/producers/${producerId}`);
    const producerData = await legalEntitiesResponse.json();

    for (const legalEntity of producerData.legalEntities) {
      await fetch("/api/validation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalEntityId: legalEntity.id,
          modo: "ONE_SHOT",
        }),
      });
    }

    alert("Diagnóstico completado");
    fetchProducers();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OK":
        return "bg-green-100 text-green-800";
      case "RISK":
        return "bg-yellow-100 text-yellow-800";
      case "FAIL":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productores</h1>
          <p className="text-gray-600 mt-1">Gestión y monitoreo de productores</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zona
            </label>
            <select
              value={filter.zona}
              onChange={(e) => setFilter({ ...filter, zona: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas las zonas</option>
              <option value="Occidente">Occidente</option>
              <option value="Bajío">Bajío</option>
              <option value="Centro">Centro</option>
              <option value="Norte">Norte</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos los estados</option>
              <option value="OK">OK</option>
              <option value="RISK">RISK</option>
              <option value="FAIL">FAIL</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando productores...</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RFC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Razones Sociales
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {producers.map((producer) => (
                <tr key={producer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {producer.displayName}
                    </div>
                    <div className="text-sm text-gray-500">{producer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producer.rfc}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producer.zona}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        producer.status
                      )}`}
                    >
                      {producer.status || "PENDIENTE"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producer.legalEntitiesCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/producers/${producer.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Ver Detalle
                    </Link>
                    <button
                      onClick={() => runDiagnostic(producer.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Diagnóstico
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
