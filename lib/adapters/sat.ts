import { hashRFC } from "@/lib/utils";
import type { LegalEntity } from "@/types";

export interface SatStatusResponse {
  status: "positiva" | "negativa";
  vigencia: string;
}

export class SatAdapter {
  static async getStatus(legalEntity: LegalEntity): Promise<SatStatusResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const hash = hashRFC(legalEntity.rfc);
    const isNegative = hash % 10 < 2;

    const vigencia = new Date();
    vigencia.setDate(vigencia.getDate() + 90);

    return {
      status: isNegative ? "negativa" : "positiva",
      vigencia: vigencia.toISOString(),
    };
  }
}
