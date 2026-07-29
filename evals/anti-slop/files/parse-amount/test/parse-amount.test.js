import test from "node:test";
import assert from "node:assert/strict";
import { parseAmount } from "../src/parse-amount.js";

test("parses the visible decimal amount", () => {
  assert.equal(parseAmount("12.50"), 1250);
});
