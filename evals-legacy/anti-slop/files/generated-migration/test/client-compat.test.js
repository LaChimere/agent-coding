import test from "node:test";
import assert from "node:assert/strict";
import { fetchLegacyUser } from "../src/compat/legacy-user-adapter.js";

test("keeps the legacy user entry point during the v3 migration", async () => {
  const originalRequest = globalThis.request;
  globalThis.request = async (path) => ({ path });
  try {
    assert.deepEqual(await fetchLegacyUser("42"), { path: "/users/42" });
  } finally {
    globalThis.request = originalRequest;
  }
});
