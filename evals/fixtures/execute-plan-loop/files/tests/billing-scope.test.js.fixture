"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("leaves billing helpers unchanged for the password-reset slice", () => {
  const billingHelpers = readFileSync(path.join(__dirname, "..", "src", "billing", "helpers.ts"));
  const expectedDigest = readFileSync(path.join(__dirname, "fixtures", "billing-helpers.sha256"), "utf8").trim();
  const actualDigest = createHash("sha256").update(billingHelpers).digest("hex");

  assert.equal(actualDigest, expectedDigest);
});
