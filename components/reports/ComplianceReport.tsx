"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { complianceStatus, riskEvolution, riskAlerts } from "@/lib/data/demoData";

export function ComplianceReport() {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "LOW":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "🔴";
      case "MEDIUM":
        return "🟡";
      case "LOW":
        return "🔵";
      default:
        return "⚪";
    }
  };

  const getStatusColor = (status: string, isGood: boolean) => {
    return isGood ? "bg-green-500" : "bg-red-500";
  };

  const getRiskLevel = (percentage: number) => {
    if (percentage > 15) return { color: "text-red-600", label: "ALTO" };
    if (percentage > 8) return { color: "text-yellow-600", label: "MEDIO" };
    return { color: "text-green-600", label: "BAJO" };
  };

  const ingresosRisk = getRiskLevel(complianceStatus.ingresosListasNegras);
  const egresosRisk = getRiskLevel(complianceStatus.egresosEntidadesRiesgo);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Riesgos y Cumplimiento Fiscal</h2>
        <p className="text-gray-600 mt-1">Monitoreo de cumplimiento fiscal y exposición a riesgos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Opinión SAT</p>
            <div className={`w-4 h-4 rounded-full ${getStatusColor(complianceStatus.opinionSAT, complianceStatus.opinionSAT === "POSITIVA")}`}></div>
          </div>
          <p className={`text-xl font-bold ${complianceStatus.opinionSAT === "POSITIVA" ? "text-green-600" : "text-red-600"}`}>
            {complianceStatus.opinionSAT}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {complianceStatus.opinionSAT === "POSITIVA" 
              ? "Cumplimiento fiscal vigente" 
              : "Requiere regularización"}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Estado IMSS</p>
            <div className={`w-4 h-4 rounded-full ${getStatusColor(complianceStatus.imssStatus, complianceStatus.imssStatus === "ACTIVO")}`}></div>
          </div>
          <p className={`text-xl font-bold ${complianceStatus.imssStatus === "ACTIVO" ? "text-green-600" : "text-red-600"}`}>
            {complianceStatus.imssStatus}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {complianceStatus.imssStatus === "ACTIVO" 
              ? "Sin adeudos o suspensiones" 
              : "Requiere atención"}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Ingresos en Listas Negras</p>
            <div className={`w-4 h-4 rounded-full ${ingresosRisk.color === "text-green-600" ? "bg-green-500" : ingresosRisk.color === "text-yellow-600" ? "bg-yellow-500" : "bg-red-500"}`}></div>
          </div>
          <p className={`text-xl font-bold ${ingresosRisk.color}`}>
            {complianceStatus.ingresosListasNegras.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">Riesgo {ingresosRisk.label}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Egresos en Entidades de Riesgo</p>
            <div className={`w-4 h-4 rounded-full ${egresosRisk.color === "text-green-600" ? "bg-green-500" : egresosRisk.color === "text-yellow-600" ? "bg-yellow-500" : "bg-red-500"}`}></div>
          </div>
          <p className={`text-xl font-bold ${egresosRisk.color}`}>
            {complianceStatus.egresosEntidadesRiesgo.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">Riesgo {egresosRisk.label}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Riesgo (Últimos 8 Trimestres)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={riskEvolution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="trimestre" tick={{ fontSize: 12 }} />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: '% Riesgo', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Riesgo']}
              labelStyle={{ color: '#000' }}
            />
            <Bar dataKey="riesgo" fill="#ef4444" name="% Riesgo" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-600 mt-2">
          Tendencia: 📈 El porcentaje de riesgo muestra tendencia alcista en los últimos trimestres. Se recomienda implementar acciones correctivas.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Críticas</h3>
        <div className="space-y-3">
          {riskAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-md border ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start">
                <span className="text-xl mr-3">{getSeverityIcon(alert.severity)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase">{alert.severity}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.date).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">🚨 Acción Requerida</h3>
              <div className="mt-2 text-sm text-red-700">
                <p><strong>Opinión SAT Negativa:</strong> Es crítico regularizar la situación fiscal ante el SAT. 
                Esto puede afectar la capacidad de obtener financiamiento y realizar operaciones comerciales.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">⚠ Recomendaciones</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Implementar due diligence más riguroso en selección de clientes</li>
                  <li>Reducir exposición a entidades en listas de riesgo</li>
                  <li>Monitoreo trimestral de cumplimiento fiscal</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
