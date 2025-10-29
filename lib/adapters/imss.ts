import { hashRFC } from "@/lib/utils";
import type { LegalEntity } from "@/types";

export interface ImssStatusResponse {
  status: "activo" | "suspendido";
}

export class ImssAdapter {
  static async getStatus(legalEntity: LegalEntity): Promise<ImssStatusResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const hash = hashRFC(legalEntity.rfc);
    const isSuspended = hash % 10 < 1;

    return {
      status: isSuspended ? "suspendido" : "activo",
    };
  }
}
