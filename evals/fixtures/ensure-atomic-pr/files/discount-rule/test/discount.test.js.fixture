import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDiscount } from "../src/pricing/discount.js";

test("applies the gold-tier discount rate", () => {
  assert.equal(applyDiscount(100, "gold"), 85);
});

test("applies the silver-tier discount rate", () => {
  assert.equal(applyDiscount(100, "silver"), 90);
});

test("applies the default discount rate for other tiers", () => {
  assert.equal(applyDiscount(100, "bronze"), 95);
});

test("caps the discount rate at 15%", () => {
  assert.equal(applyDiscount(200, "gold"), 170);
});
