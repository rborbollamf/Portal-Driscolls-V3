import { NextRequest, NextResponse } from "next/server";
import {
  getProducer,
  getLegalEntities,
  getRanches,
  getCrops,
  getFinancialSnapshots,
  getValidationTasks,
  getAlerts,
} from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN", "ANALYST", "PRODUCER"]);
  if (!auth.authorized) return auth.response;

  try {
    const producer = getProducer(params.id);

    if (!producer) {
      return NextResponse.json(
        { error: "Producer not found" },
        { status: 404 }
      );
    }

    const legalEntities = getLegalEntities(producer.id);
    const ranches = getRanches(producer.id);
    const crops = ranches.flatMap((ranch) => ({
      ...getCrops(ranch.id).map((crop) => ({ ...crop, ranchName: ranch.nombre })),
    })).flat();

    const financialSnapshots = legalEntities.flatMap((le) =>
      getFinancialSnapshots(le.id)
    );

    const validationTasks = legalEntities.flatMap((le) =>
      getValidationTasks(le.id)
    );

    const alerts = legalEntities.flatMap((le) =>
      getAlerts({ legalEntityId: le.id, resolved: false }).alerts
    );

    return NextResponse.json({
      producer,
      legalEntities,
      ranches,
      crops,
      financialSnapshots,
      validationTasks,
      alerts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch producer details" },
      { status: 500 }
    );
  }
}
