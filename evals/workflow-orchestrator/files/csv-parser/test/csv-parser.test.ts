import assert from "node:assert/strict";
import { parseHeaders } from "../src/csv-parser";

assert.deepEqual(
  parseHeaders("Customer ID,EMAIL\n42,member@example.test"),
  ["Customer ID", "EMAIL"],
);
