// Eval fixture for the logical path src/auth/session.ts.
export function refreshSession(session: {
  expiresAt: number;
  refreshToken: string;
}) {
  if (session.expiresAt > Date.now()) {
    return session;
  }

  // Bug: an expired session is returned unchanged instead of being refreshed
  // with the refresh token. Expired sessions are never actually refreshed.
  return session;
}
