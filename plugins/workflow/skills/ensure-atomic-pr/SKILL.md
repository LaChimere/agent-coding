---
name: ensure-atomic-pr
description: Assess whether a proposed or existing diff, commit, branch or PR has one independently meaningful purpose, and identify recoverable boundaries when it mixes concerns.
---

# Purpose

An atomic change has one purpose and can be reviewed or reverted as a coherent unit.
Inspect the named change and its original requirements. `decompose-feature` designs a future PR
sequence; this skill checks or recovers boundaries of the change already under discussion.

# Assess the boundaries

Establish the actual comparison target: working tree, named commit, range, branch or PR. Inspect
its requirements, diff and relevant history; distinguish pre-existing or unrelated user changes
from the work being assessed. Trace changed callers and contracts where needed to understand
whether concerns really depend on one another.

Identify unrelated behavior, independently mergeable mechanical work and opportunistic cleanup.
Diff size alone is not a defect. An indivisible rename across many files can stay together;
independent formatting or renaming should separate from a semantic change only when each can
land safely on its own. Mechanical edits with the same independently meaningful purpose can
remain one unit; separate filenames or operations do not automatically require separate commits.

Keep implementation, its tests and directly coupled documentation together. Avoid separate
all-tests or all-refactors PRs spanning unrelated purposes. Test infrastructure may be separate
when it is independently useful and can land without the feature; the feature's own acceptance
tests still belong with its behavior. Do not manufacture tiny units or compatibility work just
to force a split.

# Recover a mixed change

Map each concern to concrete paths and, when a file mixes purposes, the relevant hunks or symbols.
Identify prerequisite edits and shared contracts before recommending extraction. A split is useful
only when the resulting units are understandable and their intermediate states remain healthy.

Explain which concern can be extracted first, which edits must stay together, and which unrelated
cleanup can be deferred. Interactive staging can separate independent working-tree hunks; a
preparatory PR can isolate a genuine prerequisite. These are recovery suggestions, not authority
to stage, rewrite history or alter a published PR. Keep existing commits when they already express
the right boundaries; do not reorganize history merely for appearance.

If changes cannot be separated safely, explain the coupling and keep one coherent unit. Recommend
proportionate validation for each proposed unit: behavior preservation for mechanical work and
observable behavior for semantic changes. Validation units need not equal commit units; relevant
evidence can cover directly related commits without claiming coverage it does not provide.

# Return the assessment

State whether the change is atomic and identify its logical purposes. If it is already coherent,
stop. Otherwise propose boundaries with included/excluded concerns, genuine dependencies,
acceptance and evidence that intermediate states remain healthy. Explain when a safe split is
not possible. Use concise prose or a table as appropriate to the requested assessment.

Assessment and recovery advice are read-only. Staging, commits, history rewriting and remote
changes need their own authority; preserve unrelated user work and never discard it to recover
boundaries. Write a requested report only within the authorized location.
