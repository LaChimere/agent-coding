import test from "node:test";
import assert from "node:assert/strict";
import { parseFeatureFlags } from "../src/parse-feature-flags.js";

test("parses enabled and disabled flags", () => {
  assert.deepEqual(
    parseFeatureFlags("search=true,reports=false"),
    { search: true, reports: false },
  );
});
