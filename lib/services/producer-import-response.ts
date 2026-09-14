import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  ProducerImportBusinessError,
  ProducerImportConflictError,
} from "@/lib/services/producer-import";

type ErrorResponseDependencies = {
  createCorrelationId?: () => string;
  logError?: (message: string, details: { correlationId: string; error: unknown }) => void;
};

export function producerImportErrorResponse(
  error: unknown,
  dependencies: ErrorResponseDependencies = {},
) {
  if (error instanceof ProducerImportBusinessError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ProducerImportConflictError) {
    return NextResponse.json(
      { error: error.message, errors: error.errors },
      { status: 422 },
    );
  }

  const correlationId = dependencies.createCorrelationId?.() ?? randomUUID();
  const logError = dependencies.logError ?? console.error;
  logError("Unexpected producer import error", { correlationId, error });
  return NextResponse.json(
    {
      error: "No se pudo completar la importación. Contacta a soporte con el identificador proporcionado.",
      correlationId,
    },
    { status: 500 },
  );
}