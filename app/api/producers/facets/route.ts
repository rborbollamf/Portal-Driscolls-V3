import { requireAuth } from "@/lib/auth/middleware";
import { getProducerDistricts } from "@/lib/db";
import { createGetProducerFacetsHandler } from "@/lib/services/producer-list-handlers";

const getProducerFacetsHandler = createGetProducerFacetsHandler({
  authorize: requireAuth,
  listDistricts: getProducerDistricts,
});

export async function GET() {
  return getProducerFacetsHandler();
}