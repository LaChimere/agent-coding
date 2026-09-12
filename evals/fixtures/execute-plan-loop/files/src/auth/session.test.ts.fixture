import { expect, test } from "bun:test";
import { refreshSession, type Session } from "./session";

const now = 1_800_000_000_000;

test("returns an active session unchanged without exchanging", async () => {
  const session = { accessToken: "active", expiresAt: now + 60_000, refreshToken: "r-active" };
  let calls = 0;
  const exchange = async () => { calls++; throw new Error("must not exchange"); };

  expect(await refreshSession(session, exchange, now)).toBe(session);
  expect(calls).toBe(0);
});

for (const expiresAt of [now - 60_000, now]) {
  test(`exchanges an expired session at ${expiresAt} and returns the service result`, async () => {
    const session = { accessToken: "expired", expiresAt, refreshToken: `r-${expiresAt}` };
    const original = { ...session };
    const renewed = { accessToken: "renewed", expiresAt: now + 90_000, refreshToken: "rotated" };
    const calls: string[] = [];
    const exchange = async (token: string): Promise<Session> => {
      calls.push(token);
      return renewed;
    };

    expect(await refreshSession(session, exchange, now)).toEqual(renewed);
    expect(calls).toEqual([session.refreshToken]);
    expect(session).toEqual(original);
  });
}

test("propagates an exchange rejection without mutating the expired session", async () => {
  const session = { accessToken: "expired", expiresAt: now - 1, refreshToken: "revoked" };
  const original = { ...session };
  const failure = new Error("refresh rejected");
  const calls: string[] = [];
  const exchange = async (token: string): Promise<Session> => {
    calls.push(token);
    throw failure;
  };

  await expect(refreshSession(session, exchange, now)).rejects.toBe(failure);
  expect(calls).toEqual(["revoked"]);
  expect(session).toEqual(original);
});
