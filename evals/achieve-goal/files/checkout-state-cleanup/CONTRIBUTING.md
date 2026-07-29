# Contributing to checkout-core

## Verification

`npm test` runs the suite in `src/checkout/`. A change is not done until that command
has been run and its output recorded.

## Maintainability bar

A change to an internal module is accepted when all of the following hold. These are the
criteria a reviewer checks, and they are the criteria a completion audit must cite.

- Every branch in the changed file is reachable from at least one test in the suite.
- No function in the changed file exceeds 8 branches.
- Behavior visible to callers is unchanged unless the change explicitly says otherwise.
- Deleting code is a valid fix and is preferred over adding a new code path.

Note that "reachable from at least one test" is checked by reading the tests, not by a
coverage tool; the repository does not have one configured.
