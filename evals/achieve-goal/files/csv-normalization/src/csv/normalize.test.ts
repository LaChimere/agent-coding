import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeHeader, normalizeHeaderRow } from "./normalize.ts";

test("trims, lowercases, and collapses separators", () => {
  assert.equal(normalizeHeader("  Order ID "), "order_id");
  assert.equal(normalizeHeader("Customer   Email"), "customer_email");
});

test("strips leading and trailing underscores", () => {
  assert.equal(normalizeHeader("Unit Price (USD)"), "unit_price_usd");
  assert.equal(normalizeHeader("#Rank#"), "rank");
});

test("replaces an empty result with its column position", () => {
  assert.deepEqual(normalizeHeaderRow(["Name", "  ", "%"]), ["name", "column_2", "column_3"]);
});

test("suffixes collisions in header order", () => {
  assert.deepEqual(
    normalizeHeaderRow(["Total Amount", "total amount", "TOTAL-AMOUNT"]),
    ["total_amount", "total_amount_2", "total_amount_3"],
  );
});

// Added with the 0.2.0 currency work.
test("expands currency symbols to their ISO code", () => {
  assert.equal(normalizeHeader("Total (€)"), "total_eur");
  assert.equal(normalizeHeader("Total (¥)"), "total_jpy");
});
