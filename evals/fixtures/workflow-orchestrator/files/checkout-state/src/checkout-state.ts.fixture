export type CheckoutState = "pending" | "authorized" | "captured";
export type CheckoutAction = "authorize" | "capture";

export function advanceCheckout(
  state: CheckoutState,
  action: CheckoutAction,
): CheckoutState {
  if (state === "pending" && action === "authorize") return "authorized";
  if (state === "authorized" && action === "capture") return "captured";
  throw new Error(`Cannot ${action} checkout in ${state}`);
}
