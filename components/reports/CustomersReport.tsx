"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { topClients, getConcentration } from "@/lib/data/demoData";

export function CustomersReport() {
  const concentration = getConcentration();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const pieData = [
    ...topClients.map((client, index) => ({
      name: client.nombre,
      value: client.ingresosAnuales,
      percentage: client.porcentaje,
    })),
  ];

  const COLORS = ['#4A7C59', '#FDD835', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clientes y Concentración</h2>
        <p className="text-gray-600 mt-1">Análisis de cartera de clientes y riesgos de concentración</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-driscoll-green">
          <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">47</p>
          <p className="text-xs text-gray-500 mt-1">Clientes con facturación</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-driscoll-yellow">
          <p className="text-sm font-medium text-gray-600">Concentración Top 5</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{concentration.topClientesPorcentaje.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">Del total de ingresos</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">Ingresos en Riesgo</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(concentration.ingresosEnRiesgo)}</p>
          <p className="text-xs text-gray-500 mt-1">{concentration.porcentajeEnRiesgo.toFixed(1)}% del total</p>
        </div>
      </div>

      {concentration.topClientesPorcentaje > 40 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">⚠ Alerta de Concentración</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>La concentración del Top 5 de clientes supera el umbral recomendado del 40% (actualmente {concentration.topClientesPorcentaje.toFixed(1)}%). 
                Se recomienda diversificar la cartera de clientes para reducir el riesgo de dependencia.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Clientes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingresos Anuales
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % del Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topClients.map((client, index) => (
                <tr key={index} className={client.enRiesgo ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {client.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(client.ingresosAnuales)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {client.porcentaje.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {client.enRiesgo ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        En Riesgo
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Activo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  Total Top 5
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                  {formatCurrency(concentration.totalIngresos)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                  {concentration.topClientesPorcentaje.toFixed(1)}%
                </td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Ingresos por Cliente</h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.percentage.toFixed(1)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Clientes Saludables</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{topClients.filter(c => !c.enRiesgo).length} clientes sin indicadores de riesgo representan {((concentration.totalIngresos - concentration.ingresosEnRiesgo) / concentration.totalIngresos * 100).toFixed(1)}% de los ingresos.</p>
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
              <h3 className="text-sm font-medium text-yellow-800">Recomendación</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Implementar estrategia de diversificación para reducir dependencia de clientes principales y monitorear clientes en riesgo trimestralmente.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
