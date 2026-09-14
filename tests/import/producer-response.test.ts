import assert from "node:assert/strict";
import test from "node:test";
import {
  ProducerImportBusinessError,
  ProducerImportConflictError,
} from "../../lib/services/producer-import";
import { producerImportErrorResponse } from "../../lib/services/producer-import-response";

test("expected import errors remain useful while unexpected failures are correlated", async () => {
  const businessResponse = producerImportErrorResponse(
    new ProducerImportBusinessError("El archivo está vacío."),
  );
  assert.equal(businessResponse.status, 400);
  assert.deepEqual(await businessResponse.json(), { error: "El archivo está vacío." });

  const conflict = new ProducerImportConflictError([{
    row: 17,
    field: "Grower #",
    code: "EXISTING_GROWER_NUMBER",
    message: "Grower # ya pertenece a otro RFC.",
  }]);
  const conflictResponse = producerImportErrorResponse(conflict);
  assert.equal(conflictResponse.status, 422);
  assert.equal((await conflictResponse.json()).errors[0].row, 17);

  let logged: { correlationId: string; error: unknown } | undefined;
  const databaseError = new Error("duplicate key producers_grower_number_uq");
  const unexpectedResponse = producerImportErrorResponse(databaseError, {
    createCorrelationId: () => "correlation-test",
    logError: (_message, details) => { logged = details; },
  });
  const body = await unexpectedResponse.json();
  assert.equal(unexpectedResponse.status, 500);
  assert.equal(body.correlationId, "correlation-test");
  assert.doesNotMatch(body.error, /producers_grower_number_uq/);
  assert.equal(logged?.correlationId, "correlation-test");
  assert.equal(logged?.error, databaseError);
});