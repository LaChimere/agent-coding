# Improve profile import errors

## Approval

Approved for implementation.

## Next slice

Validate uploaded CSV rows at the import boundary and preserve operational
errors from file and database operations.

## Verification

Run `npm run test:profile-import`. The fixture uses Node's built-in test
runner and must not require package installation or network access.
