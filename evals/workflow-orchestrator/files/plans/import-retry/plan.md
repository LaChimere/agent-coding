# Import retry

Status: approved
Approval: implementation scope approved

Retry failed profile imports with the existing job queue. Preserve the import
identifier so a retry does not create a second profile.

## Acceptance criteria

- A transient queue failure leaves the import eligible for retry.
- Retrying an already completed import does not duplicate a profile.

## Verification

Run the existing profile-import tests.
