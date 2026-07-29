"use strict";

const { readFile } = require("node:fs/promises");
const { parseProfile } = require("./profile-parser");

async function importProfiles(path, database) {
  const content = await readFile(path, "utf8");

  for (const line of content.split("\n")) {
    if (!line) continue;
    await database.insertProfile(parseProfile(line));
  }
}

module.exports = { importProfiles };
