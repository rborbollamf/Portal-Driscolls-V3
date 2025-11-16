"use client";

import { useState } from "react";
import { OverviewReport } from "@/components/reports/OverviewReport";
import { RatiosReport } from "@/components/reports/RatiosReport";
import { CustomersReport } from "@/components/reports/CustomersReport";
import { ComplianceReport } from "@/components/reports/ComplianceReport";

type ReportType = "overview" | "ratios" | "customers" | "compliance";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("overview");

  const tabs = [
    { id: "overview", label: "Visión General", icon: "📊" },
    { id: "ratios", label: "Rentabilidad y Ratios", icon: "📈" },
    { id: "customers", label: "Clientes", icon: "👥" },
    { id: "compliance", label: "Riesgos y Cumplimiento", icon: "🔒" },
  ];

  const renderReport = () => {
    switch (activeReport) {
      case "overview":
        return <OverviewReport />;
      case "ratios":
        return <RatiosReport />;
      case "customers":
        return <CustomersReport />;
      case "compliance":
        return <ComplianceReport />;
      default:
        return <OverviewReport />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reportería Financiera y Fiscal</h1>
          <p className="text-gray-600 mt-2">Empresa Demo SA de CV - Análisis Integral</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-2 px-4" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveReport(tab.id as ReportType)}
                  className={`
                    whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm
                    transition-colors duration-200 flex items-center space-x-2
                    ${
                      activeReport === tab.id
                        ? "border-driscoll-green text-driscoll-green"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="transition-all duration-300 ease-in-out">
          {renderReport()}
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border-t-4 border-driscoll-yellow">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-driscoll-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">Nota Importante</h3>
              <div className="mt-2 text-sm text-gray-700">
                <p>
                  Este módulo de reportería utiliza datos de demostración basados en información financiera y fiscal real. 
                  Los datos presentados son ilustrativos y fueron diseñados para mostrar las capacidades de análisis del sistema.
                </p>
                <p className="mt-2">
                  <strong>Fecha del reporte:</strong> 28 de Abril del 2022 | <strong>Reporte:</strong> 2054
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
