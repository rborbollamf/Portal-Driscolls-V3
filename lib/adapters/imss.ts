import type { LegalEntity } from "@/types";
import { z } from "zod";
import { requestAuthorizedProvider, type ProviderRequestDependencies } from "./http";

export interface ImssStatusResponse {
  status: "activo" | "suspendido";
  observedAt?: string;
  reference?: string;
}

export class ImssAdapter {
  static async getStatus(legalEntity: LegalEntity, correlationId: string, beforeRequest?: () => Promise<void>, dependencies?: ProviderRequestDependencies): Promise<ImssStatusResponse> {
    return requestAuthorizedProvider(
      "IMSS",
      "situacion-patronal",
      { rfc: legalEntity.rfc, legalEntityId: legalEntity.id },
      z.object({
        status: z.enum(["activo", "suspendido"]),
        observedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
        reference: z.string().max(200).optional(),
      }),
      correlationId,
      beforeRequest,
      dependencies,
    );
  }
}
