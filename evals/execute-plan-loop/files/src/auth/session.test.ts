import { refreshSession } from "./session";

test("returns an active session unchanged", () => {
  const session = { expiresAt: Date.now() + 60_000, refreshToken: "token" };

  expect(refreshSession(session)).toBe(session);
});

test("refreshes an expired session", () => {
  const session = { expiresAt: Date.now() - 60_000, refreshToken: "token" };

  expect(refreshSession(session)).not.toBe(session);
});
