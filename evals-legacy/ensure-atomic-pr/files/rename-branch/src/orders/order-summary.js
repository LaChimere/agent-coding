import { computeLineTotal } from "./order-total.js";

export function summarizeOrder(order) {
  return {
    id: order.id,
    total: computeLineTotal(order),
  };
}
