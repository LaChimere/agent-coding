"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { importProfiles } = require("../profile-import");

const fixture = (name) => path.join(__dirname, "..", "fixtures", name);

test("rejects invalid uploaded data at the boundary", async () => {
  await assert.rejects(
    importProfiles(fixture("invalid-profile.csv"), { insertProfile: async () => {} }),
    TypeError,
  );
});

test("propagates a file read failure", async () => {
  await assert.rejects(
    importProfiles(fixture("missing-profile.csv"), { insertProfile: async () => {} }),
    /ENOENT/,
  );
});

test("propagates a database write failure", async () => {
  await assert.rejects(
    importProfiles(fixture("valid-profile.csv"), {
      insertProfile: async () => {
        throw new Error("database unavailable");
      },
    }),
    /database unavailable/,
  );
});
