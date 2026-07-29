import assert from "node:assert/strict";
import { test } from "node:test";

import { advance, describe, parseWebhookState, type CheckoutState } from "./state.ts";

const base: CheckoutState = { status: "cart", orderId: "ord_1", totalCents: 2500 };

test("cart advances to address once an address is entered", () => {
  assert.equal(advance(base, { kind: "address_entered" }).status, "address");
});

test("address advances to payment, then payment to confirmed", () => {
  const address = advance(base, { kind: "address_entered" });
  const payment = advance(address, { kind: "payment_authorized" });
  assert.equal(payment.status, "payment");
  assert.equal(advance(payment, { kind: "payment_authorized" }).status, "confirmed");
});

test("a confirmed checkout is not cancelled", () => {
  const confirmed: CheckoutState = { ...base, status: "confirmed" };
  assert.equal(advance(confirmed, { kind: "cancelled" }).status, "confirmed");
});

test("an unconfirmed checkout is cancelled", () => {
  assert.equal(advance(base, { kind: "cancelled" }).status, "cancelled");
});

test("webhook payloads are rejected when fields are missing or wrong", () => {
  assert.throws(() => parseWebhookState("[]"));
  assert.throws(() => parseWebhookState('{"orderId":"","totalCents":1,"status":"cart"}'));
  assert.throws(() => parseWebhookState('{"orderId":"a","totalCents":1.5,"status":"cart"}'));
  assert.throws(() => parseWebhookState('{"orderId":"a","totalCents":1,"status":"shipped"}'));
});

test("describe renders the order id, status, and total", () => {
  assert.equal(describe(base), "ord_1: cart (25.00)");
});
