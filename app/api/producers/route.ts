import { NextRequest, NextResponse } from "next/server";
import { getProducers, createProducer, getLegalEntities, getRanches, getCrops } from "@/lib/db";
import { generateId } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zona = searchParams.get("zona") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const { producers, total } = getProducers({ zona, status, limit, offset });

    const enrichedProducers = producers.map((producer) => {
      const legalEntities = getLegalEntities(producer.id);
      const ranches = getRanches(producer.id);
      
      const allCrops = ranches.flatMap((ranch) => getCrops(ranch.id));

      return {
        ...producer,
        legalEntitiesCount: legalEntities.length,
        ranchesCount: ranches.length,
        cropsCount: allCrops.length,
      };
    });

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
      status: "OK",
    };

    createProducer(producer);

    return NextResponse.json(producer, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create producer" },
      { status: 500 }
    );
  }
}
