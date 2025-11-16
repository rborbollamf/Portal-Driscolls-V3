"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { financialRatios } from "@/lib/data/demoData";

export function RatiosReport() {
  const currentYear = financialRatios[financialRatios.length - 1];
  const previousYear = financialRatios[financialRatios.length - 2];

  const radarData = [
    { 
      ratio: 'Margen Bruto', 
      [currentYear.year]: currentYear.margenBruto, 
      [previousYear.year]: previousYear.margenBruto,
      fullMark: 50 
    },
    { 
      ratio: 'Margen Neto', 
      [currentYear.year]: currentYear.margenNeto, 
      [previousYear.year]: previousYear.margenNeto,
      fullMark: 50 
    },
    { 
      ratio: 'Liquidez', 
      [currentYear.year]: currentYear.liquidez * 20, 
      [previousYear.year]: previousYear.liquidez * 20,
      fullMark: 50 
    },
    { 
      ratio: 'ROA', 
      [currentYear.year]: currentYear.roa, 
      [previousYear.year]: previousYear.roa,
      fullMark: 50 
    },
    { 
      ratio: 'ROE', 
      [currentYear.year]: currentYear.roe, 
      [previousYear.year]: previousYear.roe,
      fullMark: 50 
    },
  ];

  const getRatioStatus = (ratio: string, value: number) => {
    const thresholds: Record<string, { good: number; warning: number }> = {
      margenBruto: { good: 25, warning: 15 },
      margenNeto: { good: 15, warning: 8 },
      liquidez: { good: 1.5, warning: 1.2 },
      endeudamiento: { good: 50, warning: 65 },
      roa: { good: 10, warning: 5 },
      roe: { good: 15, warning: 10 },
    };

    const threshold = thresholds[ratio];
    if (!threshold) return 'text-gray-600';

    if (ratio === 'endeudamiento') {
      if (value <= threshold.good) return 'text-green-600';
      if (value <= threshold.warning) return 'text-yellow-600';
      return 'text-red-600';
    }

    if (value >= threshold.good) return 'text-green-600';
    if (value >= threshold.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAnalysis = (ratio: string, current: number, previous: number) => {
    const change = current - previous;
    const percentChange = ((change / previous) * 100).toFixed(1);
    const direction = change > 0 ? 'aumentó' : 'disminuyó';
    
    return {
      change: Math.abs(change).toFixed(2),
      percentChange: Math.abs(Number(percentChange)).toFixed(1),
      direction,
      isPositive: (ratio === 'endeudamiento') ? change < 0 : change > 0,
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Rentabilidad y Ratios Financieros</h2>
        <p className="text-gray-600 mt-1">Análisis comparativo de indicadores clave</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ratios por Año</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ratio
                </th>
                {financialRatios.map((year) => (
                  <th key={year.year} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {year.year}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Margen Bruto %
                </td>
                {financialRatios.map((year) => (
                  <td key={year.year} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {year.margenBruto.toFixed(1)}%
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`font-semibold ${getRatioStatus('margenBruto', currentYear.margenBruto)}`}>
                    {currentYear.margenBruto >= 25 ? '✓ Saludable' : currentYear.margenBruto >= 15 ? '⚠ Moderado' : '✗ Bajo'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Margen Neto %
                </td>
                {financialRatios.map((year) => (
                  <td key={year.year} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {year.margenNeto.toFixed(1)}%
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`font-semibold ${getRatioStatus('margenNeto', currentYear.margenNeto)}`}>
                    {currentYear.margenNeto >= 15 ? '✓ Saludable' : currentYear.margenNeto >= 8 ? '⚠ Moderado' : '✗ Bajo'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Liquidez
                </td>
                {financialRatios.map((year) => (
                  <td key={year.year} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {year.liquidez.toFixed(2)}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`font-semibold ${getRatioStatus('liquidez', currentYear.liquidez)}`}>
                    {currentYear.liquidez >= 1.5 ? '✓ Saludable' : currentYear.liquidez >= 1.2 ? '⚠ Moderado' : '✗ Bajo'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Endeudamiento %
                </td>
                {financialRatios.map((year) => (
                  <td key={year.year} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {year.endeudamiento.toFixed(1)}%
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`font-semibold ${getRatioStatus('endeudamiento', currentYear.endeudamiento)}`}>
                    {currentYear.endeudamiento <= 50 ? '✓ Saludable' : currentYear.endeudamiento <= 65 ? '⚠ Moderado' : '✗ Alto'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ROA %
                </td>
                {financialRatios.map((year) => (
                  <td key={year.year} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {year.roa.toFixed(1)}%
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`font-semibold ${getRatioStatus('roa', currentYear.roa)}`}>
                    {currentYear.roa >= 10 ? '✓ Saludable' : currentYear.roa >= 5 ? '⚠ Moderado' : '✗ Bajo'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ROE %
                </td>
                {financialRatios.map((year) => (
                  <td key={year.year} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {year.roe.toFixed(1)}%
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`font-semibold ${getRatioStatus('roe', currentYear.roe)}`}>
                    {currentYear.roe >= 15 ? '✓ Saludable' : currentYear.roe >= 10 ? '⚠ Moderado' : '✗ Bajo'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparativo de Ratios ({previousYear.year} vs {currentYear.year})</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="ratio" />
            <PolarRadiusAxis angle={90} domain={[0, 50]} />
            <Radar 
              name={String(previousYear.year)} 
              dataKey={String(previousYear.year)} 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.3} 
            />
            <Radar 
              name={String(currentYear.year)} 
              dataKey={String(currentYear.year)} 
              stroke="#4A7C59" 
              fill="#4A7C59" 
              fillOpacity={0.3} 
            />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Análisis de Tendencias</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Los márgenes han disminuido respecto a 2021, pero se mantienen en niveles aceptables</li>
                <li>La liquidez se mantiene por encima del umbral recomendado de 1.5</li>
                <li>El endeudamiento aumentó, requiere monitoreo continuo</li>
                <li>ROA y ROE muestran rentabilidad saludable sobre activos y capital</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
