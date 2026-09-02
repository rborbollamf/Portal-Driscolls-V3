import type { LegalEntity } from "@/types";
import { z } from "zod";
import { requestAuthorizedProvider } from "./http";

export interface LegalStatusResponse {
  poderesVigentesAt: string;
  observedAt?: string;
  reference?: string;
}

export class LegalAdapter {
  static async getStatus(legalEntity: LegalEntity, correlationId: string, beforeRequest?: () => Promise<void>): Promise<LegalStatusResponse> {
    return requestAuthorizedProvider(
      "LEGAL",
      "poderes-notariales",
      { rfc: legalEntity.rfc, legalEntityId: legalEntity.id },
      z.object({
        poderesVigentesAt: z.string().datetime(),
        observedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
        reference: z.string().max(200).optional(),
      }),
      correlationId,
      beforeRequest,
    );
  }
}