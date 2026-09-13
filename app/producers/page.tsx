"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Producer } from "@/types";
import { PRODUCER_PAGE_SIZES } from "@/lib/services/producer-list";

type ListedProducer = Producer & {
  legalEntitiesCount: number;
  ranchesCount: number;
  cropsCount: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function ProducersPage() {
  const [producers, setProducers] = useState<ListedProducer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ distrito: "", status: "" });
  const [districts, setDistricts] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });

  useEffect(() => {
    fetch("/api/producers/facets")
      .then((response) => response.ok ? response.json() : { districts: [] })
      .then((data) => setDistricts(data.districts ?? []))
      .catch(() => setDistricts([]));
  }, []);

  const fetchProducers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (filter.distrito) params.append("distrito", filter.distrito);
    if (filter.status) params.append("status", filter.status);

    try {
      const response = await fetch(`/api/producers?${params.toString()}`);
      const data = await response.json();
      const nextPagination = data.pagination ?? { page: 1, limit, total: 0, totalPages: 1 };
      if (page > nextPagination.totalPages) {
        setPage(nextPagination.totalPages);
        return;
      }
      setProducers(data.producers || []);
      setPagination(nextPagination);
    } finally {
      setLoading(false);
    }
  }, [filter, limit, page]);

  useEffect(() => {
    void fetchProducers();
  }, [fetchProducers]);

  const runDiagnostic = async (producerId: string) => {
    if (!confirm("¿Ejecutar diagnóstico completo?")) return;

    const producer = producers.find((p) => p.id === producerId);
    if (!producer) return;

    const legalEntitiesResponse = await fetch(`/api/producers/${producerId}`);
    const producerData = await legalEntitiesResponse.json();

    for (const legalEntity of producerData.legalEntities) {
      await fetch("/api/validation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          legalEntityId: legalEntity.id,
          modo: "ONE_SHOT",
        }),
      });
    }

    alert("Diagnóstico completado");
    void fetchProducers();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OK":
        return "bg-green-100 text-green-800";
      case "RISK":
        return "bg-yellow-100 text-yellow-800";
      case "FAIL":
        return "bg-red-100 text-red-800";
      case "PENDIENTE":
        return "bg-blue-100 text-blue-800";
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
              Distrito
            </label>
            <select
              value={filter.distrito}
              onChange={(e) => {
                setPage(1);
                setFilter({ ...filter, distrito: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos los distritos</option>
              {districts.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filter.status}
              onChange={(e) => {
                setPage(1);
                setFilter({ ...filter, status: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos los estados</option>
              <option value="OK">OK</option>
              <option value="RISK">RISK</option>
              <option value="FAIL">FAIL</option>
              <option value="PENDIENTE">PENDIENTE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registros por página
            </label>
            <select
              value={limit}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {PRODUCER_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
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
                   Distrito
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
                     {producer.distrito || "Sin distrito"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                         producer.status || "PENDIENTE"
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
          <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              {pagination.total} {pagination.total === 1 ? "productor" : "productores"} · Página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1 || loading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
         </div>
      )}
    </div>
  );
}
