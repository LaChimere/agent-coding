---
name: ensure-atomic-pr
description: Evaluate whether a diff, commit, or PR is atomic enough. Use when a change is too large, mixes concerns, or needs to be assessed, split, or recovered into smaller commits or PRs. Also trigger when a PR review reveals mixed concerns, when git diff shows changes across unrelated modules, or when a branch has grown beyond its original intent.
---

# Operating context

This skill operates within the workflow defined in `AGENTS.md`. It can be invoked at any point — during design, during execution, or after the fact as a recovery tool.

When used as a quick assessment on an existing diff, it does not by itself force plan mode. The assessment can be delivered directly.

When used proactively to change the execution strategy:
- If already in plan mode: capture evidence in `plans/{slug}/research.md`, carry the split into `design.md` or `plan.md`, and follow existing gates.
- If not in plan mode and the split is post-hoc recovery on an already-completed change: the split can proceed without gates.
- If not in plan mode but the split changes the execution strategy for future work: enter plan mode and apply Gate 2 at minimum.

# Purpose

Reduce oversized or mixed-purpose changes into atomic, reviewable units.

# Use this skill when

- A diff is too large
- A PR mixes multiple concerns
- The user asks for atomic commits or atomic PRs
- A branch needs recovery after oversized changes

# Atomicity standard

A change is not atomic enough if:
- it has more than one logical purpose
- it can only be described with "A and B"
- it mixes mechanical changes with semantic changes
- it forces reviewers to reason about unrelated concerns together

# Preferred split order

Prefer this order when splitting:

1. mechanical-only changes
   - formatting
   - imports
   - isolated renames
   - generated files, if isolated

2. preparatory refactor
   - extraction
   - adapters
   - interfaces
   - indirection required to support a later change

3. behavioral change
   - feature logic
   - bug fix
   - state transition change

4. tests
   - regression tests
   - integration tests
   - fixtures

5. docs / cleanup
   - documentation
   - comments
   - follow-up cleanup

# Required output

## Atomicity assessment
- whether the change is atomic enough
- why or why not

## Proposed split
For each proposed commit or PR:
- title
- purpose
- included concerns
- excluded concerns
- dependencies

## Recovery guidance
- whether to use interactive staging
- whether to carve out a prep PR
- whether to separate cleanup into a later PR

# Gotchas

These are failure patterns that come up when agents evaluate or split changes for atomicity.

- **Splitting genuinely indivisible changes.** Some changes — like a rename that touches 50 files — are inherently atomic even though the diff is large. Splitting a rename into two PRs (half the files each) creates a broken intermediate state. If a change cannot be meaningfully paused midway, keep it in one PR and use commits to separate mechanical from semantic work.

- **Separating tests from the code they test.** Tests exist to verify specific behavior. Moving tests into a separate PR means the implementation PR has no verification, and the test PR has no context. Keep tests with their implementation unless there is a strong structural reason to separate them (e.g., a large test infrastructure setup that is independently useful).

- **Over-splitting into trivially small PRs.** A PR that changes one line of a config file and nothing else still costs a full review cycle. If several small related changes can be coherently grouped into one PR without mixing concerns, that is better than five one-line PRs.

- **Proposing a split that no one asked for.** If the existing diff is already atomic and reviewable, do not invent a split just because this skill was triggered. Report that the change is atomic and move on.

# Strong preferences

- Prefer small PRs over clever commit history inside one giant PR
- Prefer one logical purpose per PR
- If the split cannot preserve a healthy intermediate state, say so explicitly
- If the change is inherently indivisible, keep one PR but still separate commits by concern
