import test from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/parse-config.js";

test("parses comments, blank lines, and surrounding whitespace", () => {
  assert.deepEqual(
    parseConfig("\n# local settings\n port = 3000\nname = demo\n"),
    { port: "3000", name: "demo" },
  );
});
