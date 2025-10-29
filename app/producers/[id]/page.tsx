"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ProducerDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchProducerData();
  }, []);

  const fetchProducerData = async () => {
    setLoading(true);
    const response = await fetch(`/api/producers/${params.id}`);
    const producerData = await response.json();
    setData(producerData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Cargando detalles del productor...</p>
      </div>
    );
  }

  if (!data || !data.producer) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Productor no encontrado</p>
      </div>
    );
  }

  const { producer, legalEntities, ranches, crops, financialSnapshots, validationTasks, alerts } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-gray-900">{producer.displayName}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-600">RFC</p>
            <p className="font-medium">{producer.rfc}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Zona</p>
            <p className="font-medium">{producer.zona}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Contacto</p>
            <p className="font-medium">{producer.contacto}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estado</p>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                producer.status === "OK"
                  ? "bg-green-100 text-green-800"
                  : producer.status === "RISK"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {producer.status}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-4 px-6">
            {["overview", "legal", "ranches", "financial", "alerts"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "overview" && "Resumen"}
                {tab === "legal" && "Razones Sociales"}
                {tab === "ranches" && "Ranchos"}
                {tab === "financial" && "Financiero"}
                {tab === "alerts" && "Alertas"}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded">
                <h4 className="text-sm font-medium text-blue-900">Razones Sociales</h4>
                <p className="text-2xl font-bold text-blue-700 mt-2">{legalEntities.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <h4 className="text-sm font-medium text-green-900">Ranchos</h4>
                <p className="text-2xl font-bold text-green-700 mt-2">{ranches.length}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <h4 className="text-sm font-medium text-purple-900">Cultivos</h4>
                <p className="text-2xl font-bold text-purple-700 mt-2">{crops.length}</p>
              </div>
            </div>
          )}

          {activeTab === "legal" && (
            <div className="space-y-4">
              {legalEntities.map((le: any) => (
                <div key={le.id} className="border p-4 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{le.rfc}</h4>
                      <p className="text-sm text-gray-600">Tipo: {le.tipo}</p>
                      <p className="text-sm text-gray-600">
                        Poderes vigentes hasta: {new Date(le.poderesVigentesAt).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        le.status === "OK"
                          ? "bg-green-100 text-green-800"
                          : le.status === "RISK"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {le.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "ranches" && (
            <div className="space-y-4">
              {ranches.map((ranch: any) => (
                <div key={ranch.id} className="border p-4 rounded">
                  <h4 className="font-semibold">{ranch.nombre}</h4>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <p className="text-gray-600">Zona</p>
                      <p className="font-medium">{ranch.zona}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Hectáreas</p>
                      <p className="font-medium">{ranch.hectareas}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Empleados</p>
                      <p className="font-medium">{ranch.empleados}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "financial" && (
            <div className="space-y-4">
              {financialSnapshots.map((snapshot: any) => (
                <div key={snapshot.id} className="border p-4 rounded">
                  <h4 className="font-semibold mb-3">Periodo: {snapshot.periodo}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Liquidez</p>
                      <p className="font-medium">{snapshot.liquidez.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Endeudamiento</p>
                      <p className="font-medium">{snapshot.endeudamientoPct.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Ingresos Anuales</p>
                      <p className="font-medium">${(snapshot.ingresosAnuales / 1000000).toFixed(2)}M</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Egresos Anuales</p>
                      <p className="font-medium">${(snapshot.egresosAnuales / 1000000).toFixed(2)}M</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay alertas para este productor</p>
              ) : (
                alerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className="border-l-4 p-3 bg-gray-50 rounded"
                    style={{
                      borderLeftColor:
                        alert.severity === "HIGH"
                          ? "#dc2626"
                          : alert.severity === "MEDIUM"
                          ? "#f59e0b"
                          : "#10b981",
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(alert.createdAt).toLocaleDateString("es-MX")}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          alert.severity === "HIGH"
                            ? "bg-red-100 text-red-800"
                            : alert.severity === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
