import assert from "node:assert/strict";
import { test } from "node:test";

import { HELP_TEXT, OPTIONS } from "../src/cli.ts";

test("help text documents every supported option", () => {
  for (const option of OPTIONS) {
    assert.ok(HELP_TEXT.includes(option), `help text is missing ${option}`);
  }
});

test("usage line matches the README", () => {
  assert.ok(HELP_TEXT.includes("recordctl <command> [options]"));
});
