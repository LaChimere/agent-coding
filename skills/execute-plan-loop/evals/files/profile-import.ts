import { readFile } from "node:fs/promises";

type Database = {
  insertProfile(row: { email: string }): Promise<void>;
};

export async function importProfiles(path: string, database: Database) {
  const content = await readFile(path, "utf8");
  for (const line of content.split("\n")) {
    if (!line) continue;
    await database.insertProfile({ email: line });
  }
}
