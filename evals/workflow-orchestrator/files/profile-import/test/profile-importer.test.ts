import assert from "node:assert/strict";
import { importUploadedCsv } from "../src/profile-importer";
import { DatabaseTimeoutError, type ProfileStore } from "../src/profile-store";

const timeoutStore: ProfileStore = {
  async insertProfiles() {
    throw new DatabaseTimeoutError("connection timed out");
  },
};

await assert.rejects(
  importUploadedCsv(
    { filename: "profiles.csv", content: "email,name\nada@example.test,Ada" },
    timeoutStore,
  ),
  DatabaseTimeoutError,
);
