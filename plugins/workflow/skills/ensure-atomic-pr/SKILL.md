---
name: ensure-atomic-pr
description: Assess whether a proposed or existing commit has one independently meaningful purpose, and recover commit boundaries from a mixed diff or branch. Assess PR grouping when preparing submission or explicitly asked.
---

# Purpose

An atomic commit has one purpose and can be reviewed or reverted as a coherent unit.
Inspect the named change and its original requirements. `decompose-feature` designs a future
commit sequence; this skill checks or recovers the boundaries already under discussion.
The existing invocation name is retained; the default assessment unit is a commit.

# Assess the boundaries

Establish the actual target: proposed commit, working-tree diff, named commit, range, branch or
explicitly selected PR. Inspect requirements, relevant history and changed callers or contracts.
For a range, branch or PR, inspect the individual commits as well as their combined effect.
Distinguish pre-existing or unrelated user changes from the work being assessed.

Identify unrelated behavior, independently meaningful mechanical work and opportunistic cleanup.
Diff size alone is not a defect. An indivisible rename across many files can stay together;
independent formatting or renaming can separate from semantic changes when both intermediate
states remain valid. File boundaries alone do not require separate commits.

Keep implementation, its tests and directly coupled documentation together. Avoid all-tests or
all-refactors commits spanning unrelated purposes. Test infrastructure can separate when useful
on its own, while acceptance tests remain with the behavior they verify. Keep inseparable work
in one coherent commit rather than adding compatibility work merely to force a split.

# Recover a mixed change

Map each purpose to paths and, when a file mixes purposes, the relevant hunks or symbols.
Identify prerequisites and shared contracts before recommending extraction. Explain which edits
must stay together, which can form another commit and which unrelated cleanup can be deferred.
Interactive staging is a possible recovery method, not authority to stage or rewrite history.
Keep existing commits when their boundaries already work.

Check that the resulting commits are understandable and their intermediate code states remain
usable. Recommend proportionate validation: behavior preservation for mechanical work and
observable behavior for semantic changes. A check may cover related commits without proving
unrelated behavior. Assess deployment compatibility separately from code-state validity.

# Return the assessment

State whether each assessed commit is atomic and identify any mixed purposes. For uncommitted
work, propose commit boundaries only where needed. If the boundaries already work, stop.
Explain genuine dependencies and any coupling that prevents a safe split.

Group commits into PRs when preparing submission or explicitly asked. A PR may contain several
coherent commits serving one review purpose; a commit split does not require multiple PRs.
For an explicit PR-atomicity question, assess that combined purpose and landing safety as well.

Assessment and recovery advice are read-only. Staging, commits, history rewriting and remote
changes need their own authority. Preserve unrelated user work and write requested reports only
within the authorized location.
