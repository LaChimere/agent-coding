export function computeLineTotal(order) {
  // Rounds to the nearest cent using a half-up rule instead of truncating,
  // so totals no longer drift a cent low on repeating-decimal unit prices.
  return Math.round(order.quantity * order.unitPrice * 100) / 100;
}
