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
        <h1 className="text-3xl font-bold text-driscoll-green">Dashboard</h1>
        <p className="text-driscoll-green/70 mt-1 font-medium">Vista general del sistema de monitoreo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-driscoll-green">
          <h3 className="text-sm font-semibold text-driscoll-green/70">Total Productores</h3>
          <p className="text-3xl font-bold text-driscoll-green mt-2">{producers.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-driscoll-red">
          <h3 className="text-sm font-semibold text-driscoll-green/70">Alertas Críticas</h3>
          <p className="text-3xl font-bold text-driscoll-red mt-2">{highAlerts.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-driscoll-yellow">
          <h3 className="text-sm font-semibold text-driscoll-green/70">Productores en Riesgo</h3>
          <p className="text-3xl font-bold text-driscoll-yellow/90 mt-2">{highRiskProducers.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-driscoll-lightgreen">
          <h3 className="text-sm font-semibold text-driscoll-green/70">Tareas Pendientes</h3>
          <p className="text-3xl font-bold text-driscoll-lightgreen mt-2">{pendingTasks.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-driscoll-green mb-4">Productores por Zona</h3>
          <div className="space-y-3">
            {Object.entries(zonaStats).map(([zona, count]) => (
              <div key={zona} className="flex justify-between items-center">
                <span className="text-driscoll-green font-medium">{zona}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-driscoll-green/10 rounded-full h-3">
                    <div
                      className="bg-driscoll-green h-3 rounded-full"
                      style={{
                        width: `${((count as number) / producers.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-driscoll-green w-8">{count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-driscoll-green mb-4">Cultivos por Tipo</h3>
          <div className="space-y-3">
            {Object.entries(cropStats).map(([tipo, count]) => (
              <div key={tipo} className="flex justify-between items-center">
                <span className="text-driscoll-green font-medium">{tipo}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-driscoll-lightgreen/20 rounded-full h-3">
                    <div
                      className="bg-driscoll-lightgreen h-3 rounded-full"
                      style={{
                        width: `${((count as number) / allCrops.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-driscoll-green w-8">{count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-bold text-driscoll-green mb-4">Alertas Recientes</h3>
        {alerts.length === 0 ? (
          <p className="text-driscoll-green/50 text-center py-8">No hay alertas activas</p>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border-l-4"
                style={{
                  borderLeftColor:
                    alert.severity === "HIGH"
                      ? "#E53935"
                      : alert.severity === "MEDIUM"
                      ? "#FDD835"
                      : "#7CB342",
                }}
              >
                <div>
                  <p className="text-sm font-semibold text-driscoll-green">{alert.message}</p>
                  <p className="text-xs text-driscoll-green/60 mt-1">
                    {new Date(alert.createdAt).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold ${
                    alert.severity === "HIGH"
                      ? "bg-driscoll-red/10 text-driscoll-red border border-driscoll-red/30"
                      : alert.severity === "MEDIUM"
                      ? "bg-driscoll-yellow/20 text-driscoll-darkgreen border border-driscoll-yellow"
                      : "bg-driscoll-lightgreen/10 text-driscoll-lightgreen border border-driscoll-lightgreen/30"
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
