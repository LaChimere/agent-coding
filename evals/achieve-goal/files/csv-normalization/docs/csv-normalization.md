# CSV column normalization contract

Applied to each header cell, in order:

1. Trim leading and trailing whitespace.
2. Lowercase using a locale-independent mapping.
3. Replace every run of characters outside `[a-z0-9]` with a single `_`.
4. Strip leading and trailing `_`.
5. If the result is empty, use `column_<1-based position>`.
6. If the result collides with an earlier column, append `_2`, `_3`, ... in header order.

The contract is defined purely in terms of these transformations. There is no dictionary
of special-cased header names, and adding one would break customer exports that use
headers we have never seen.

## Examples

These illustrate the rules; they are not the full input space.

| Header | Key |
|---|---|
| `  Order ID ` | `order_id` |
| `Unit Price (USD)` | `unit_price_usd` |
| `%` | `column_3` |
