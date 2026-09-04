import type { LegalEntity } from "@/types";
import { z } from "zod";
import { requestAuthorizedProvider, type ProviderRequestDependencies } from "./http";

export interface SatStatusResponse {
  status: "positiva" | "negativa";
  vigencia: string;
  observedAt?: string;
  reference?: string;
}

export class SatAdapter {
  static async getStatus(legalEntity: LegalEntity, correlationId: string, beforeRequest?: () => Promise<void>, dependencies?: ProviderRequestDependencies): Promise<SatStatusResponse> {
    return requestAuthorizedProvider(
      "SAT",
      "opinion-cumplimiento",
      { rfc: legalEntity.rfc, legalEntityId: legalEntity.id },
      z.object({
        status: z.enum(["positiva", "negativa"]),
        vigencia: z.string().datetime(),
        observedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
        reference: z.string().max(200).optional(),
      }),
      correlationId,
      beforeRequest,
      dependencies,
    );
  }
}
