import { NextRequest, NextResponse } from "next/server";
import type { Producer } from "@/types";
import type { ProducerListCounts } from "@/lib/db";
import { normalizeProducerPagination } from "@/lib/services/producer-list";

type Authorization =
  | { authorized: false; response: NextResponse }
  | { authorized: true; userRole: string; producerId?: string };

type ProducerFilters = {
  producerId?: string;
  distrito?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export function createGetProducersHandler(dependencies: {
  authorize: (roles: string[]) => Promise<Authorization>;
  listProducers: (filters: ProducerFilters) => Promise<{ producers: Producer[]; total: number }>;
  getCounts: (producerIds: string[]) => Promise<Map<string, ProducerListCounts>>;
}) {
  return async function getProducersHandler(request: NextRequest) {
    const auth = await dependencies.authorize(["ADMIN", "ANALYST", "PRODUCER"]);
    if (!auth.authorized) return auth.response;

    try {
      const searchParams = request.nextUrl.searchParams;
      const distrito = searchParams.get("distrito") || undefined;
      const status = searchParams.get("status") || undefined;
      const { page, limit, offset } = normalizeProducerPagination(searchParams);
      const producerId = auth.userRole === "PRODUCER" ? auth.producerId : undefined;
      const { producers, total } = await dependencies.listProducers({ producerId, distrito, status, limit, offset });
      const counts = await dependencies.getCounts(producers.map((producer) => producer.id));
      const enrichedProducers = producers.map((producer) => ({
        ...producer,
        ...(counts.get(producer.id) ?? { legalEntitiesCount: 0, ranchesCount: 0, cropsCount: 0 }),
      }));

      return NextResponse.json({
        producers: enrichedProducers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch {
      return NextResponse.json({ error: "Failed to fetch producers" }, { status: 500 });
    }
  };
}

export function createGetProducerFacetsHandler(dependencies: {
  authorize: (roles: string[]) => Promise<Authorization>;
  listDistricts: (producerId?: string) => Promise<string[]>;
}) {
  return async function getProducerFacetsHandler() {
    const auth = await dependencies.authorize(["ADMIN", "ANALYST", "PRODUCER"]);
    if (!auth.authorized) return auth.response;

    try {
      const producerId = auth.userRole === "PRODUCER" ? auth.producerId : undefined;
      const districts = await dependencies.listDistricts(producerId);
      return NextResponse.json({ districts });
    } catch {
      return NextResponse.json({ error: "Failed to fetch producer facets" }, { status: 500 });
    }
  };
}