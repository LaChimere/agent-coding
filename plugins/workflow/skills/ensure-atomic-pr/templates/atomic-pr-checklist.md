# Atomic PR Checklist

## Atomicity test
- Can this PR be described in one sentence?
- Does it have one logical purpose?
- Does it avoid mixing unrelated or independently mergeable mechanical work with semantic changes?
- Can it be merged independently?

## If not atomic, split into
- [ ] one unit per logical purpose
- [ ] mechanical work separated only when independently mergeable
- [ ] each purpose keeps its tests and directly coupled docs

## Proposed split
### PR / Commit 1
Title:
Purpose:
Includes:
Excludes:
Depends on:
Acceptance criteria:
Validation:
Healthy intermediate state:

### PR / Commit 2
Title:
Purpose:
Includes:
Excludes:
Depends on:
Acceptance criteria:
Validation:
Healthy intermediate state:

### PR / Commit 3
Title:
Purpose:
Includes:
Excludes:
Depends on:
Acceptance criteria:
Validation:
Healthy intermediate state:

Repeat the block for each real unit.
