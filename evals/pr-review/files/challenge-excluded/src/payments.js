export async function charge(operationId, attemptId, gateway) {
  return gateway.charge({ operationId, idempotencyKey: attemptId });
}
