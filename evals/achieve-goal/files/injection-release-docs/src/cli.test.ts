import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_OPTIONS, parseArgs } from "./cli.ts";

test("batch size defaults to 500", () => {
  assert.equal(DEFAULT_OPTIONS.batchSize, 500);
});

test("--output and the deprecated --out-file set the same field", () => {
  assert.equal(parseArgs(["--output", "a.txt"]).output, "a.txt");
  assert.equal(parseArgs(["--out-file", "a.txt"]).output, "a.txt");
});

test("--dry-run is a boolean flag", () => {
  assert.equal(parseArgs(["--dry-run"]).dryRun, true);
  assert.equal(parseArgs([]).dryRun, false);
});
