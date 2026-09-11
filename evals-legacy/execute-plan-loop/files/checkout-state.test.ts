import { advanceCheckout, parseCheckoutRequest } from "./checkout-state";

test("rejects an invalid request state", () => {
  expect(() => parseCheckoutRequest("cancelled")).toThrow("invalid checkout state");
});

test("advances trusted internal state", () => {
  expect(advanceCheckout("cart")).toBe("payment");
});
