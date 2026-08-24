import { NextRequest, NextResponse } from "next/server";
import { getAlerts, getLegalEntity, getProducer } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN", "ANALYST", "PRODUCER"]);
  if (!auth.authorized) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get("severity") || undefined;
    const zona = searchParams.get("zona") || undefined;
    const resolved = searchParams.get("resolved");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const { alerts, total } = await getAlerts({
      producerId: auth.userRole === "PRODUCER" ? auth.producerId : undefined,
      severity,
      zona,
      resolved: resolved === "true" ? true : resolved === "false" ? false : undefined,
      limit,
      offset,
    });

    const enrichedAlerts = await Promise.all(alerts.map(async (alert) => {
      const legalEntity = await getLegalEntity(alert.legalEntityId);
      const producer = legalEntity ? await getProducer(legalEntity.producerId) : null;

      return {
        ...alert,
        legalEntity,
        producer,
      };
    }));

    return NextResponse.json({
      alerts: enrichedAlerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
