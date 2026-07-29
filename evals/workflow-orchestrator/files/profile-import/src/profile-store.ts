import type { Profile } from "./csv-parser";

export class DatabaseTimeoutError extends Error {}

export interface ProfileStore {
  insertProfiles(profiles: Profile[]): Promise<void>;
}
