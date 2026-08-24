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
    const producer = await getProducer(params.id);

    if (!producer) {
      return NextResponse.json(
        { error: "Producer not found" },
        { status: 404 }
      );
    }

    const [legalEntities, ranches] = await Promise.all([
      getLegalEntities(producer.id),
      getRanches(producer.id),
    ]);
    const crops = (await Promise.all(ranches.map(async (ranch) =>
      (await getCrops(ranch.id)).map((crop) => ({ ...crop, ranchName: ranch.nombre }))
    ))).flat();

    const financialSnapshots = (await Promise.all(legalEntities.map((le) =>
      getFinancialSnapshots(le.id)
    ))).flat();

    const validationTasks = (await Promise.all(legalEntities.map((le) =>
      getValidationTasks(le.id)
    ))).flat();

    const alerts = (await Promise.all(legalEntities.map(async (le) =>
      (await getAlerts({ legalEntityId: le.id, resolved: false })).alerts
    ))).flat();

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
