"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { isPasswordResetExpired } = require("../src/auth/password-reset.ts");

test("treats a token at its expiry time as expired", () => {
  assert.equal(isPasswordResetExpired({ expiresAt: 1_000 }, 1_000), true);
});

test("keeps a token valid before expiry", () => {
  assert.equal(isPasswordResetExpired({ expiresAt: 1_001 }, 1_000), false);
});
