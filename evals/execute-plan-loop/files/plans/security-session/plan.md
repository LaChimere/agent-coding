# Harden session handling

## Approval

Approved for implementation.

## Current milestone

The session-handling change is a high-risk security milestone.

## Acceptance criteria

- Expired sessions cannot be used without a successful refresh.
- Session failures are reported rather than treated as authenticated access.
