import { NextRequest, NextResponse } from "next/server";
import { getProducers, createProducer, getProducerListCounts } from "@/lib/db";
import { generateId } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/middleware";
import { createGetProducersHandler } from "@/lib/services/producer-list-handlers";

const getProducersHandler = createGetProducersHandler({
  authorize: requireAuth,
  listProducers: getProducers,
  getCounts: getProducerListCounts,
});

export async function GET(request: NextRequest) {
  return getProducersHandler(request);
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
