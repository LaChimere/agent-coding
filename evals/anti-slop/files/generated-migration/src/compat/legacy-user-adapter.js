import { getUser } from "../generated/client.js";

// Remove after the v3 migration release, when legacy callers use getUser directly.
export async function fetchLegacyUser(id) {
  return getUser(id);
}
