import test from "node:test";
import assert from "node:assert/strict";
import { greetingFor } from "../src/greeting.js";

test("removes surrounding whitespace from a name", () => {
  assert.equal(greetingFor("  Ada  "), "Hello, Ada!");
});
