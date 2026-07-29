// Eval fixture for the logical path src/auth/session.ts.
export function refreshSession(session: {
  expiresAt: number;
  refreshToken: string;
}) {
  if (session.expiresAt > Date.now()) {
    return session;
  }

  return session;
}
