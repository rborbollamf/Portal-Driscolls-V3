import { hashRFC } from "@/lib/utils";
import type { LegalEntity } from "@/types";

export interface FinancialSnapshotResponse {
  liquidez: number;
  endeudamientoPct: number;
  ingresosAnuales: number;
  egresosAnuales: number;
}

export class FinancialAdapter {
  static async getSnapshot(legalEntity: LegalEntity): Promise<FinancialSnapshotResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const hash = hashRFC(legalEntity.rfc);
    const seed = hash / 1000000;

    const liquidez = 0.5 + (seed % 2.5);
    const endeudamientoPct = 20 + (hash % 30);
    const ingresosAnuales = 5000000 + (hash % 20000000);
    const egresosAnuales = ingresosAnuales * 0.75;

    return {
      liquidez,
      endeudamientoPct,
      ingresosAnuales,
      egresosAnuales,
    };
  }
}
