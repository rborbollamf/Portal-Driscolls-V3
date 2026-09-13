export type ProducerPagination = {
  page: number;
  limit: number;
  offset: number;
};

export const PRODUCER_PAGE_SIZES = [10, 25, 50, 100] as const;

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeProducerPagination(searchParams: URLSearchParams): ProducerPagination {
  const page = positiveInteger(searchParams.get("page"), 1);
  const requestedLimit = positiveInteger(searchParams.get("limit"), 10);
  const limit = requestedLimit > 100
    ? 100
    : PRODUCER_PAGE_SIZES.includes(requestedLimit as (typeof PRODUCER_PAGE_SIZES)[number])
      ? requestedLimit
      : 10;
  return { page, limit, offset: (page - 1) * limit };
}