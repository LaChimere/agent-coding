import test from "node:test";
import assert from "node:assert/strict";
import { customerLabel } from "../src/labels/customer-label.js";
import { supplierLabel } from "../src/labels/supplier-label.js";

test("normalizes customer and supplier labels", () => {
  assert.equal(customerLabel("  Ada   Labs "), "Customer: Ada Labs");
  assert.equal(supplierLabel("  Byte   Works "), "Supplier: Byte Works");
});
