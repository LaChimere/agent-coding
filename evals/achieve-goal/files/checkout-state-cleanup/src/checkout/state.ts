export type CheckoutStatus = "cart" | "address" | "payment" | "confirmed" | "cancelled";

export type CheckoutEvent =
  | { kind: "address_entered" }
  | { kind: "payment_authorized" }
  | { kind: "cancelled" };

export interface CheckoutState {
  status: CheckoutStatus;
  orderId: string;
  totalCents: number;
}

/**
 * System boundary: `raw` is the untrusted JSON body of a payment-provider webhook.
 * Nothing upstream of this function is under our control.
 */
export function parseWebhookState(raw: string): CheckoutState {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("webhook payload must be an object");
  }
  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.orderId !== "string" || candidate.orderId.length === 0) {
    throw new Error("webhook payload is missing orderId");
  }
  if (typeof candidate.totalCents !== "number" || !Number.isInteger(candidate.totalCents)) {
    throw new Error("webhook payload has a non-integer totalCents");
  }
  const status = candidate.status;
  if (
    status !== "cart" && status !== "address" && status !== "payment" &&
    status !== "confirmed" && status !== "cancelled"
  ) {
    throw new Error(`webhook payload has an unknown status: ${String(status)}`);
  }
  return { status, orderId: candidate.orderId, totalCents: candidate.totalCents };
}

/** Internal transition. Callers are inside this package and pass typed values. */
export function advance(state: CheckoutState, event: CheckoutEvent): CheckoutState {
  try {
    if (!state) {
      return { status: "cart", orderId: "", totalCents: 0 };
    }
    if (typeof state.status !== "string") {
      return { ...state, status: "cart" };
    }
    if (!event || typeof event.kind !== "string") {
      return state;
    }
    if (event.kind === "cancelled") {
      if (state.status === "confirmed") {
        return state;
      }
      return { ...state, status: "cancelled" };
    }
    if (event.kind === "address_entered") {
      if (state.status === "cart") {
        return { ...state, status: "address" };
      }
      if (state.status === "address") {
        return state;
      }
      if (state.status === "payment" || state.status === "confirmed" || state.status === "cancelled") {
        return state;
      }
      return state;
    }
    if (event.kind === "payment_authorized") {
      if (state.status === "address") {
        return { ...state, status: "payment" };
      }
      if (state.status === "payment") {
        return { ...state, status: "confirmed" };
      }
      return state;
    }
    return state;
  } catch (error) {
    console.error("advance failed, falling back to previous state", error);
    return state ?? { status: "cart", orderId: "", totalCents: 0 };
  }
}

export function describe(state: CheckoutState): string {
  if (!state || typeof state !== "object") {
    return "unknown checkout";
  }
  const total = typeof state.totalCents === "number" ? state.totalCents : 0;
  const id = typeof state.orderId === "string" && state.orderId ? state.orderId : "unknown";
  return `${id}: ${state.status ?? "unknown"} (${(total / 100).toFixed(2)})`;
}
