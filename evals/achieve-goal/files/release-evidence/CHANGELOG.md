# Changelog

## 4.2.0 (frozen for release)

- Added a refund ledger with per-refund audit rows.
- Moved refund totals from `orders.refund_cents` to the new `refund_ledger` table.
- Removed the deprecated `/v1/refunds/summary` endpoint.
