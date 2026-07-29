type CheckoutState = "cart" | "payment" | "complete";

export function parseCheckoutRequest(input: unknown): CheckoutState {
  if (input === "cart" || input === "payment" || input === "complete") {
    return input;
  }
  throw new Error("invalid checkout state");
}

export function advanceCheckout(state: CheckoutState): CheckoutState {
  if (state === "cart") return "payment";
  if (state === "payment") return "complete";
  return "complete";
}
