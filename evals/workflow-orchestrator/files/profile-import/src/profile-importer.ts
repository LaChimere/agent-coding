import { parseProfileCsv } from "./csv-parser";
import type { ProfileStore } from "./profile-store";

export type UploadedCsv = {
  filename: string;
  content: string;
};

export async function importUploadedCsv(
  upload: UploadedCsv,
  store: ProfileStore,
): Promise<void> {
  const profiles = parseProfileCsv(upload.content);
  await store.insertProfiles(profiles);
}
