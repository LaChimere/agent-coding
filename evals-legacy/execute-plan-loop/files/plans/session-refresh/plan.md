# Refresh expired sessions

## Approved scope

Approved for implementation. Landing mode: working_tree. No commits, dependency
installation or network actions are authorized.

## Next slice

Fix the existing async refreshSession(session, exchange, now?) function in
src/auth/session.ts. The caller already provides a TokenExchange function:
it takes the current refresh-token string and resolves to the complete renewed
Session (accessToken, expiresAt and refreshToken), or rejects with the token-service
error. Tests supply an in-memory exchanger; no endpoint, credentials or real
authentication service is needed.

A session is active exactly when expiresAt > now. Resolve with the original
active session and never call exchange. Otherwise call exchange exactly once
with the current refreshToken and resolve with its authoritative renewed values,
including any rotated token. Propagate exchange rejection. Do not mutate the
input session, synthesize expiry or tokens, or change the exported signature.

## Verification

Run bun test src/auth/session.test.ts. The tests check the unexpired path, expired
and exactly-expiring sessions, token rotation, no input mutation, and rejection
propagation. Do not weaken these assertions to accept a cloned stale session.

## Execution status

- [ ] Refresh expired sessions

Evidence: none recorded.

## Working-tree readiness

Purpose: pending.
Changed files: pending.
Verification: pending.
No commit has been authorized.
