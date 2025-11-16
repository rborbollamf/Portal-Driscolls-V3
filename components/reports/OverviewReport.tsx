"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { monthlyFinancialData, getTotals } from "@/lib/data/demoData";

export function OverviewReport() {
  const last12Months = monthlyFinancialData.slice(-12);
  const totals = getTotals();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const calculateGrowth = () => {
    const first6Months = last12Months.slice(0, 6).reduce((sum, m) => sum + m.ingresos, 0);
    const last6Months = last12Months.slice(6).reduce((sum, m) => sum + m.ingresos, 0);
    return ((last6Months - first6Months) / first6Months * 100);
  };

  const growth = calculateGrowth();
  
  const getHealthStatus = () => {
    if (totals.margenPromedio > 20 && growth > 10) return { color: 'bg-green-500', label: 'EXCELENTE', textColor: 'text-green-700' };
    if (totals.margenPromedio > 10 && growth > 0) return { color: 'bg-yellow-500', label: 'BUENO', textColor: 'text-yellow-700' };
    return { color: 'bg-red-500', label: 'REQUIERE ATENCIÓN', textColor: 'text-red-700' };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Visión General</h2>
        <p className="text-gray-600 mt-1">Métricas clave de los últimos 12 meses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-driscoll-green">
          <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totals.totalIngresos)}</p>
          <p className="text-xs text-gray-500 mt-1">Últimos 12 meses</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Utilidad Neta</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totals.totalUtilidad)}</p>
          <p className="text-xs text-gray-500 mt-1">Últimos 12 meses</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-driscoll-yellow">
          <p className="text-sm font-medium text-gray-600">Margen Neto</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatPercent(totals.margenPromedio)}</p>
          <p className="text-xs text-gray-500 mt-1">Promedio anual</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600">Crecimiento</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatPercent(growth)}</p>
          <p className="text-xs text-gray-500 mt-1">Semestral</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Egresos (Últimos 12 Meses)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={last12Months}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: '#000' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="ingresos" 
              stroke="#4A7C59" 
              strokeWidth={2}
              name="Ingresos"
              dot={{ fill: '#4A7C59' }}
            />
            <Line 
              type="monotone" 
              dataKey="egresos" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Egresos"
              dot={{ fill: '#ef4444' }}
            />
            <Line 
              type="monotone" 
              dataKey="utilidadNeta" 
              stroke="#FDD835" 
              strokeWidth={2}
              name="Utilidad Neta"
              dot={{ fill: '#FDD835' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicador de Salud General</h3>
        <div className="flex items-center space-x-4">
          <div className={`w-16 h-16 rounded-full ${healthStatus.color} flex items-center justify-center`}>
            <span className="text-white font-bold text-xs">{healthStatus.label.split(' ')[0]}</span>
          </div>
          <div>
            <p className={`text-xl font-bold ${healthStatus.textColor}`}>{healthStatus.label}</p>
            <p className="text-sm text-gray-600 mt-1">
              {totals.margenPromedio > 15 
                ? "La empresa muestra indicadores saludables con márgenes sostenibles."
                : "Se recomienda revisar estructura de costos y estrategias de crecimiento."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
