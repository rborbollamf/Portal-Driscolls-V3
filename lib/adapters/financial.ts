import type { LegalEntity } from "@/types";
import { z } from "zod";
import { requestAuthorizedProvider } from "./http";

export interface FinancialSnapshotResponse {
  liquidez: number;
  endeudamientoPct: number;
  ingresosAnuales: number;
  egresosAnuales: number;
  observedAt?: string;
  reference?: string;
}

export class FinancialAdapter {
  static async getSnapshot(legalEntity: LegalEntity, correlationId: string, beforeRequest?: () => Promise<void>): Promise<FinancialSnapshotResponse> {
    return requestAuthorizedProvider(
      "FINANCIAL",
      "financial-snapshot",
      { rfc: legalEntity.rfc, legalEntityId: legalEntity.id },
      z.object({
        liquidez: z.number().finite().nonnegative(),
        endeudamientoPct: z.number().finite().nonnegative(),
        ingresosAnuales: z.number().finite().nonnegative(),
        egresosAnuales: z.number().finite().nonnegative(),
        observedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
        reference: z.string().max(200).optional(),
      }),
      correlationId,
      beforeRequest,
    );
  }
}
