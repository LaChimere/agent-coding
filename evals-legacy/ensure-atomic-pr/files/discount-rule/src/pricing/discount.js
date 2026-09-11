// Applies the loyalty-tier discount described in docs/pricing/discount-formula.md.
export function applyDiscount(subtotal, loyaltyTier) {
  const rate = loyaltyTier === "gold" ? 0.15 : loyaltyTier === "silver" ? 0.1 : 0.05;
  const capped = Math.min(rate, 0.15);
  return Math.round(subtotal * (1 - capped) * 100) / 100;
}
