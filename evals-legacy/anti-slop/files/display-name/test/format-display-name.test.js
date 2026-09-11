import test from "node:test";
import assert from "node:assert/strict";
import { formatDisplayName } from "../src/format-display-name.js";

test("formats a full display name", () => {
  assert.equal(
    formatDisplayName({ givenName: "Ada", familyName: "Lovelace" }),
    "Ada Lovelace",
  );
});
