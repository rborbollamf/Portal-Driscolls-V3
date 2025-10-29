import { NextRequest, NextResponse } from "next/server";
import { getAlerts, getLegalEntity, getProducer } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodo = searchParams.get("periodo");

    let { alerts } = getAlerts({});

    if (periodo) {
      const [year, month] = periodo.split("-");
      alerts = alerts.filter((alert) => {
        const alertDate = new Date(alert.createdAt);
        return (
          alertDate.getFullYear() === parseInt(year) &&
          alertDate.getMonth() + 1 === parseInt(month)
        );
      });
    }

    const csv = [
      "ID,Fecha,Severidad,Mensaje,Productor,RFC,Zona,Resuelto",
      ...alerts.map((alert) => {
        const legalEntity = getLegalEntity(alert.legalEntityId);
        const producer = legalEntity ? getProducer(legalEntity.producerId) : null;

        return [
          alert.id,
          new Date(alert.createdAt).toLocaleDateString(),
          alert.severity,
          `"${alert.message.replace(/"/g, '""')}"`,
          producer?.displayName || "N/A",
          legalEntity?.rfc || "N/A",
          producer?.zona || "N/A",
          alert.resolvedAt ? "Sí" : "No",
        ].join(",");
      }),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="alertas-${periodo || 'todas'}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to export alerts" },
      { status: 500 }
    );
  }
}
