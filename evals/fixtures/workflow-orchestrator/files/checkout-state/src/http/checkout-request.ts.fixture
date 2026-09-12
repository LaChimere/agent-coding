import { advanceCheckout, type CheckoutAction, type CheckoutState } from "../checkout-state";

const actions = new Set<CheckoutAction>(["authorize", "capture"]);

export function advanceFromRequest(
  state: CheckoutState,
  body: unknown,
): CheckoutState {
  if (
    !body ||
    typeof body !== "object" ||
    !("action" in body) ||
    typeof body.action !== "string" ||
    !actions.has(body.action as CheckoutAction)
  ) {
    throw new Error("Invalid checkout request");
  }

  return advanceCheckout(state, body.action as CheckoutAction);
}
