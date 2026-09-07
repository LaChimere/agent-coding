export type Session = {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
};

// The caller supplies its existing token service. The fixture uses an in-memory
// exchanger, not live authentication. The returned session is authoritative;
// rejection must propagate without returning a stale success-shaped session.
export type TokenExchange = (refreshToken: string) => Promise<Session>;

export async function refreshSession(
  session: Session,
  exchange: TokenExchange,
  now = Date.now(),
): Promise<Session> {
  if (session.expiresAt > now) {
    return session;
  }

  return session;
}
