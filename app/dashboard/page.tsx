import { getAlerts, getProducers, getValidationTasks, getRanches, getCrops } from "@/lib/db";

export default function DashboardPage() {
  const { alerts } = getAlerts({ resolved: false });
  const highAlerts = alerts.filter((a) => a.severity === "HIGH");
  const { producers } = getProducers({});
  const highRiskProducers = producers.filter((p) => p.status === "FAIL" || p.status === "RISK");
  const tasks = getValidationTasks();
  const pendingTasks = tasks.filter((t) => t.estado === "PENDIENTE");

  const allRanches = getRanches();
  const allCrops = allRanches.flatMap((ranch) => getCrops(ranch.id));

  const zonaStats = producers.reduce((acc: any, producer) => {
    acc[producer.zona] = (acc[producer.zona] || 0) + 1;
    return acc;
  }, {});

  const cropStats = allCrops.reduce((acc: any, crop) => {
    acc[crop.tipo] = (acc[crop.tipo] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Vista general del sistema de monitoreo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Total Productores</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{producers.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Alertas Críticas</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{highAlerts.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Productores en Riesgo</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{highRiskProducers.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Tareas Pendientes</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{pendingTasks.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productores por Zona</h3>
          <div className="space-y-3">
            {Object.entries(zonaStats).map(([zona, count]) => (
              <div key={zona} className="flex justify-between items-center">
                <span className="text-gray-700">{zona}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{
                        width: `${((count as number) / producers.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cultivos por Tipo</h3>
          <div className="space-y-3">
            {Object.entries(cropStats).map(([tipo, count]) => (
              <div key={tipo} className="flex justify-between items-center">
                <span className="text-gray-700">{tipo}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${((count as number) / allCrops.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Recientes</h3>
        {alerts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay alertas activas</p>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded border-l-4"
                style={{
                  borderLeftColor:
                    alert.severity === "HIGH"
                      ? "#dc2626"
                      : alert.severity === "MEDIUM"
                      ? "#f59e0b"
                      : "#10b981",
                }}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(alert.createdAt).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-xs font-medium ${
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
