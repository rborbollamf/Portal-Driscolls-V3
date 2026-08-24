import { NextRequest, NextResponse } from "next/server";
import { getProducers, createProducer, getLegalEntities, getRanches, getCrops } from "@/lib/db";
import { generateId } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN", "ANALYST", "PRODUCER"]);
  if (!auth.authorized) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const zona = searchParams.get("zona") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const producerId = auth.userRole === "PRODUCER" ? auth.producerId : undefined;
    const { producers, total } = await getProducers({ producerId, zona, status, limit, offset });

    const enrichedProducers = await Promise.all(producers.map(async (producer) => {
      const [legalEntities, ranches] = await Promise.all([
        getLegalEntities(producer.id),
        getRanches(producer.id),
      ]);
      const allCrops = (await Promise.all(ranches.map((ranch) => getCrops(ranch.id)))).flat();

      return {
        ...producer,
        legalEntitiesCount: legalEntities.length,
        ranchesCount: ranches.length,
        cropsCount: allCrops.length,
      };
    }));

    return NextResponse.json({
      producers: enrichedProducers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch producers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN", "ANALYST"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();

    const producer = {
      id: generateId(),
      displayName: body.displayName,
      rfc: body.rfc,
      zona: body.zona,
      contacto: body.contacto,
      email: body.email,
      phone: body.phone,
      status: "OK" as const,
    };

    await createProducer(producer);

    return NextResponse.json(producer, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create producer" },
      { status: 500 }
    );
  }
}
