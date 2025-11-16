// Datos mock de reportería financiera basados en información real
// Empresa Demo SA de CV - Datos fiscales y financieros

export interface MonthlyData {
  month: string;
  ingresos: number;
  egresos: number;
  utilidadNeta: number;
  margen: number;
}

export interface FinancialRatios {
  year: number;
  margenBruto: number;
  margenNeto: number;
  liquidez: number;
  endeudamiento: number;
  roa: number;
  roe: number;
}

export interface TopClient {
  nombre: string;
  ingresosAnuales: number;
  porcentaje: number;
  enRiesgo: boolean;
}

export interface ComplianceStatus {
  opinionSAT: "POSITIVA" | "NEGATIVA";
  imssStatus: "ACTIVO" | "SUSPENDIDO";
  ingresosListasNegras: number;
  egresosEntidadesRiesgo: number;
}

export interface RiskAlert {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  date: string;
}

// Datos mensuales últimos 24 meses (2021-2022)
export const monthlyFinancialData: MonthlyData[] = [
  // 2021
  { month: "Ene 2021", ingresos: 2670508, egresos: 2136406, utilidadNeta: 534102, margen: 20 },
  { month: "Feb 2021", ingresos: 3149168, egresos: 2519334, utilidadNeta: 629834, margen: 20 },
  { month: "Mar 2021", ingresos: 4894154, egresos: 3915323, utilidadNeta: 978831, margen: 20 },
  { month: "Abr 2021", ingresos: 3063244, egresos: 2450595, utilidadNeta: 612649, margen: 20 },
  { month: "May 2021", ingresos: 6983390, egresos: 5586712, utilidadNeta: 1396678, margen: 20 },
  { month: "Jun 2021", ingresos: 5988548, egresos: 4790838, utilidadNeta: 1197710, margen: 20 },
  { month: "Jul 2021", ingresos: 8748026, egresos: 6998421, utilidadNeta: 1749605, margen: 20 },
  { month: "Ago 2021", ingresos: 5878003, egresos: 4702402, utilidadNeta: 1175601, margen: 20 },
  { month: "Sep 2021", ingresos: 10513840, egresos: 8411072, utilidadNeta: 2102768, margen: 20 },
  { month: "Oct 2021", ingresos: 9284572, egresos: 7427658, utilidadNeta: 1856914, margen: 20 },
  { month: "Nov 2021", ingresos: 11453847, egresos: 9163078, utilidadNeta: 2290769, margen: 20 },
  { month: "Dic 2021", ingresos: 14598453, egresos: 11678762, utilidadNeta: 2919691, margen: 20 },
  
  // 2022
  { month: "Ene 2022", ingresos: 6783414, egresos: 6104473, utilidadNeta: 678941, margen: 10 },
  { month: "Feb 2022", ingresos: 6364780, egresos: 5728302, utilidadNeta: 636478, margen: 10 },
  { month: "Mar 2022", ingresos: 4840305, egresos: 4356275, utilidadNeta: 484031, margen: 10 },
  { month: "Abr 2022", ingresos: 2878584, egresos: 2590726, utilidadNeta: 287858, margen: 10 },
  { month: "May 2022", ingresos: 7829313, egresos: 7046382, utilidadNeta: 782931, margen: 10 },
  { month: "Jun 2022", ingresos: 12224371, egresos: 11001934, utilidadNeta: 1222437, margen: 10 },
  { month: "Jul 2022", ingresos: 10172328, egresos: 9155095, utilidadNeta: 1017233, margen: 10 },
  { month: "Ago 2022", ingresos: 8282382, egresos: 7454144, utilidadNeta: 828238, margen: 10 },
  { month: "Sep 2022", ingresos: 11089071, egresos: 9980164, utilidadNeta: 1108907, margen: 10 },
  { month: "Oct 2022", ingresos: 9845623, egresos: 8861061, utilidadNeta: 984562, margen: 10 },
  { month: "Nov 2022", ingresos: 10523784, egresos: 9471406, utilidadNeta: 1052378, margen: 10 },
  { month: "Dic 2022", ingresos: 13794727, egresos: 12415254, utilidadNeta: 1379473, margen: 10 },
];

// Ratios financieros por año
export const financialRatios: FinancialRatios[] = [
  {
    year: 2020,
    margenBruto: 5.2,
    margenNeto: 1.0,
    liquidez: 1.15,
    endeudamiento: 68.5,
    roa: 1.2,
    roe: 3.8,
  },
  {
    year: 2021,
    margenBruto: 38.5,
    margenNeto: 32.4,
    liquidez: 1.85,
    endeudamiento: 42.3,
    roa: 18.5,
    roe: 32.1,
  },
  {
    year: 2022,
    margenBruto: 15.8,
    margenNeto: 11.2,
    liquidez: 1.62,
    endeudamiento: 51.2,
    roa: 12.3,
    roe: 25.2,
  },
];

// Top 5 clientes
export const topClients: TopClient[] = [
  {
    nombre: "Distribuidora Nacional SA",
    ingresosAnuales: 32450000,
    porcentaje: 31.0,
    enRiesgo: false,
  },
  {
    nombre: "Comercializadora del Norte",
    ingresosAnuales: 24680000,
    porcentaje: 23.6,
    enRiesgo: true, // Cliente con riesgo
  },
  {
    nombre: "Exportadora Agrícola MX",
    ingresosAnuales: 18920000,
    porcentaje: 18.1,
    enRiesgo: false,
  },
  {
    nombre: "Supermercados Unidos",
    ingresosAnuales: 15340000,
    porcentaje: 14.7,
    enRiesgo: false,
  },
  {
    nombre: "Retail Internacional Corp",
    ingresosAnuales: 13180000,
    porcentaje: 12.6,
    enRiesgo: true, // Cliente con riesgo
  },
];

// Estado de cumplimiento fiscal
export const complianceStatus: ComplianceStatus = {
  opinionSAT: "NEGATIVA", // Basado en el PDF
  imssStatus: "ACTIVO",
  ingresosListasNegras: 8.5, // % de ingresos con clientes en listas negras
  egresosEntidadesRiesgo: 12.3, // % de egresos en entidades de riesgo
};

// Evolución de riesgo por trimestre (últimos 8 trimestres)
export const riskEvolution = [
  { trimestre: "Q1 2021", riesgo: 5.2 },
  { trimestre: "Q2 2021", riesgo: 4.8 },
  { trimestre: "Q3 2021", riesgo: 6.1 },
  { trimestre: "Q4 2021", riesgo: 7.3 },
  { trimestre: "Q1 2022", riesgo: 8.5 },
  { trimestre: "Q2 2022", riesgo: 9.8 },
  { trimestre: "Q3 2022", riesgo: 11.2 },
  { trimestre: "Q4 2022", riesgo: 12.3 },
];

// Alertas clave generadas
export const riskAlerts: RiskAlert[] = [
  {
    id: "alert-001",
    severity: "HIGH",
    message: "Opinión de cumplimiento SAT NEGATIVA - Requiere atención inmediata",
    date: "2022-04-28",
  },
  {
    id: "alert-002",
    severity: "HIGH",
    message: "Concentración de ingresos en Top 5 clientes supera el 40% (actualmente 100%)",
    date: "2022-04-27",
  },
  {
    id: "alert-003",
    severity: "MEDIUM",
    message: "Clientes en riesgo representan el 36.2% de los ingresos totales",
    date: "2022-04-26",
  },
  {
    id: "alert-004",
    severity: "MEDIUM",
    message: "Incremento de egresos en entidades de riesgo (12.3%, tendencia alcista)",
    date: "2022-04-25",
  },
  {
    id: "alert-005",
    severity: "MEDIUM",
    message: "Ingresos con clientes en listas negras: 8.5%",
    date: "2022-04-24",
  },
  {
    id: "alert-006",
    severity: "LOW",
    message: "Ratio de endeudamiento aumentó de 42.3% a 51.2%",
    date: "2022-04-23",
  },
  {
    id: "alert-007",
    severity: "LOW",
    message: "Margen neto descendió de 32.4% a 11.2%",
    date: "2022-04-22",
  },
];

// Datos adicionales para KPIs
export const kpiData = {
  ingresosUltimos12Meses: 104628682, // Basado en el PDF
  utilidadNetaUltimos12Meses: 10462868, // 10% margen
  margenNetoPromedio: 11.2,
  crecimientoAnual: 17.2, // Crecimiento 2021 vs 2022
  clientesActivos: 47,
  empleadosActivos: 70, // Del PDF
  nominaPromedio: 4247, // Del PDF
  bancarizacion: 12, // Del PDF
  dilucion: 13, // Del PDF (2022)
};

// Helper function para calcular totales
export const getTotals = () => {
  const last12Months = monthlyFinancialData.slice(-12);
  
  const totalIngresos = last12Months.reduce((sum, item) => sum + item.ingresos, 0);
  const totalEgresos = last12Months.reduce((sum, item) => sum + item.egresos, 0);
  const totalUtilidad = last12Months.reduce((sum, item) => sum + item.utilidadNeta, 0);
  const margenPromedio = (totalUtilidad / totalIngresos) * 100;

  return {
    totalIngresos,
    totalEgresos,
    totalUtilidad,
    margenPromedio,
  };
};

// Helper para calcular concentración
export const getConcentration = () => {
  const totalIngresos = topClients.reduce((sum, client) => sum + client.ingresosAnuales, 0);
  const topClientesPorcentaje = topClients.reduce((sum, client) => sum + client.porcentaje, 0);
  const ingresosEnRiesgo = topClients
    .filter(c => c.enRiesgo)
    .reduce((sum, client) => sum + client.ingresosAnuales, 0);
  const porcentajeEnRiesgo = (ingresosEnRiesgo / totalIngresos) * 100;

  return {
    totalIngresos,
    topClientesPorcentaje,
    ingresosEnRiesgo,
    porcentajeEnRiesgo,
  };
};
