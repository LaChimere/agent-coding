import assert from "node:assert/strict";
import test from "node:test";
import { getShippingRate } from "../src/shipping/rates.js";
import { createQuoteProvider } from "../src/shipping/provider.js";
import { checkoutTotal } from "../src/checkout.js";

test("published shipping and checkout APIs return numbers synchronously", () => {
  for (const destination of ["local", "overseas"]) {
    const rate = getShippingRate(destination);
    assert.equal(typeof rate, "number");
    assert.equal(checkoutTotal(20, destination), 20 + rate);
  }
});

test("provider resolves a per-request amount asynchronously", async () => {
  const calls = [];
  const provider = createQuoteProvider({
    async request(input) {
      calls.push(input);
      return { amount: 7.25 };
    },
  });
  const result = provider.quote("local");
  assert.equal(typeof result.then, "function");
  assert.equal(await result, 7.25);
  assert.deepEqual(calls, [{ destination: "local" }]);
});
