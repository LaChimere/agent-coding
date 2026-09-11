import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSlug } from "../src/normalize-slug.js";

test("normalizes a display title", () => {
  assert.equal(normalizeSlug("  Release Notes  "), "release-notes");
});
