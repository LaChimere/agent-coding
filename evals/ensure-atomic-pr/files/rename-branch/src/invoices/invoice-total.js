import { computeLineTotal } from "../orders/order-total.js";

export function summarizeInvoice(lines) {
  return lines.reduce((sum, line) => sum + computeLineTotal(line), 0);
}
