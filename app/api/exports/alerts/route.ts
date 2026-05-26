import { NextRequest, NextResponse } from "next/server";
import { getAlerts, getLegalEntity, getProducer } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

function escapeCSVField(field: string | number | null | undefined): string {
  const fieldStr = String(field ?? "N/A");
  return `"${fieldStr.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN", "ANALYST"]);
  if (!auth.authorized) return auth.response;

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

    const header = [
      "ID",
      "Fecha",
      "Severidad",
      "Mensaje",
      "Cultivo",
      "Distrito",
      "Nombre Área de Cultivo",
      "Productor",
      "ID COFIBE/CG",
      "Número de Productor",
      "Razón Social",
      "Representante Legal",
      "Dirección Fiscal",
      "Colonia",
      "Municipio",
      "Estado",
      "Código Postal",
      "RFC",
      "Nombre Contacto",
      "Teléfono Contacto",
      "Número de Celular",
      "Correo Electrónico",
      "Correo Electrónico Productor",
      "Resuelto",
    ].map(escapeCSVField).join(",");

    const rows = alerts.map((alert) => {
      const legalEntity = getLegalEntity(alert.legalEntityId);
      const producer = legalEntity ? getProducer(legalEntity.producerId) : null;

      return [
        escapeCSVField(alert.id),
        escapeCSVField(new Date(alert.createdAt).toLocaleDateString("es-MX")),
        escapeCSVField(alert.severity),
        escapeCSVField(alert.message),
        escapeCSVField(producer?.cultivo),
        escapeCSVField(producer?.distrito),
        escapeCSVField(producer?.nombreAreaCultivo),
        escapeCSVField(producer?.productor ?? producer?.displayName),
        escapeCSVField(producer?.idCofibeCg),
        escapeCSVField(producer?.numeroProductor),
        escapeCSVField(producer?.razonSocial ?? producer?.displayName),
        escapeCSVField(producer?.representanteLegal),
        escapeCSVField(producer?.direccionFiscal),
        escapeCSVField(producer?.colonia),
        escapeCSVField(producer?.municipio),
        escapeCSVField(producer?.estado),
        escapeCSVField(producer?.codigoPostal),
        escapeCSVField(legalEntity?.rfc ?? producer?.rfc),
        escapeCSVField(producer?.nombreContacto ?? producer?.contacto),
        escapeCSVField(producer?.telefonoContacto ?? producer?.phone),
        escapeCSVField(producer?.numeroCelular),
        escapeCSVField(producer?.correoElectronico ?? producer?.email),
        escapeCSVField(producer?.correoElectronicoProductor),
        escapeCSVField(alert.resolvedAt ? "Sí" : "No"),
      ].join(",");
    });

    const csv = "\uFEFF" + [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8;",
        "Content-Disposition": `attachment; filename="alertas-${periodo || "todas"}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to export alerts" },
      { status: 500 }
    );
  }
}
