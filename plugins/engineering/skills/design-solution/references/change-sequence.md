# Purpose

Decide what independently meaningful commits should exist and their dependency order.
The atomicity assessment below checks whether a proposed or existing commit has one purpose.
PR grouping is a submission decision; settle it when preparing a PR or when explicitly requested.

# Understand the constraints

Inspect the requested behavior, accepted design, existing contracts and deployment constraints.
For an existing branch, inspect what is already implemented before proposing a sequence.
Distinguish code dependencies from rollout dependencies such as schema availability or client
compatibility. A commit boundary does not imply a separate PR or deployment.

When one coherent commit is sufficient, explain that conclusion rather than manufacture a split.

# Design the sequence

Prefer vertical slices: each commit delivers one meaningful behavior through the relevant layers,
with its tests and directly coupled documentation. Splitting by frontend/backend, directory or
artifact type alone does not establish useful boundaries. An independently useful prerequisite
can be its own commit when its intermediate state remains usable and verifiable.

Each proposed commit should be understandable and leave a valid intermediate code state.
If components must change together and partial states are invalid, keep them in one commit.
File count and parallel workers are not reasons to split an indivisible change. Preserve existing
coherent commits; avoid reorganizing history for appearance.

Use a prerequisite commit only when later work genuinely depends on a schema, contract or
stabilized interface. Keep it minimal, without speculative flags, wiring stubs or compatibility
mechanisms unrelated to the requested change. Parallel work alone does not require a base commit.

For migrations, check compatibility between old and new readers, writers and deployed versions.
Explain what must be available before each transition can run or deploy. Several commits in one
PR still need a safe rollout; separate commits do not by themselves make mixed deployed versions
compatible. Expose any unresolved product or compatibility choice rather than silently adding a
mechanism. Include cleanup only for temporary work introduced by the chosen approach, with its
removal condition and validation.

# Return the proposal

Give each commit's purpose, included and excluded concerns, relevant paths, real dependencies
and observable validation. Explain intermediate-state safety and material rollout or rollback
risks, including data changes that reverting code cannot undo. Mark unresolved choices explicitly.

A short sequence can be a few bullets. Reuse accepted decisions and follow the requested output
form. At PR submission, group the commits by review purpose and actual landing dependencies;
when explicitly asked for PR boundaries, explain their grouping and intermediate landing safety.
Otherwise leave PR grouping open.

A proposal does not authorize implementation, staging, commits, history rewriting, pushes, PR
changes or pipeline triggers. Preserve existing authorization and unrelated user changes.

For an engineering design document, [design template](templates/DESIGN.md) remains an optional
writing aid. Adapt its depth and sections to the request.

---

# Purpose

An atomic commit has one purpose and can be reviewed or reverted as a coherent unit.
Inspect the named change and its original requirements. Sequence planning above designs a future
commit sequence; this skill checks or recovers the boundaries already under discussion.
The assessment unit is a commit unless the user selects a PR.

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
