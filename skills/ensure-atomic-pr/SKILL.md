---
name: ensure-atomic-pr
description: Assess whether a planned or existing change is one atomic unit, and recover the commit/PR boundaries of an existing diff, commit, branch, or PR. Use for atomicity questions, mixed concerns, or work that grew beyond its purpose. Not for designing the multi-PR delivery sequence — that is decompose-feature.
---

# Purpose

Judge whether an existing change is atomic, and when it is not, recover it into reviewable units.

# Boundaries

This skill owns atomicity: whether a planned change is one coherent PR, and how to recover the boundaries of a working-tree diff, commit, branch, or open PR that mixes concerns. `decompose-feature` owns the different question of what PR sequence should deliver the work, including when an existing branch is being reorganized into a delivery stack.

It applies during design, during execution, or as post-hoc recovery. A plain assessment is delivered directly, with no plan artifacts or approval gates. Record a split in the active `plans/{slug}` artifacts and follow the recorded approval state only when it changes the execution strategy for future work; invoke `workflow-orchestrator` only when phase or approval is unresolved.

# Atomicity standard

A change is not atomic enough when:

- it serves more than one logical purpose
- its description joins independent outcomes instead of one behavior with its supporting tests and docs
- it mixes unrelated or independently mergeable mechanical work with semantic change
- it forces a reviewer to reason about unrelated concerns together

Diff size alone is never the test.

# Splitting rules

Split by logical purpose first, keeping each purpose's preparation, behavior, tests, and directly coupled documentation together as one reviewable outcome. Never group all refactors, all tests, or all docs across unrelated purposes merely because they share an artifact type.

Behavior-preserving mechanical work of one purpose is **one unit**: an automated formatting pass together with an isolated rename is a single mechanical change, not two. Separate mechanical from semantic work only when it can land independently and would otherwise obscure review.

An indivisible change stays one PR. A rename across 50 files cannot be halved by file count without a broken intermediate state: keep it whole, and move an unrelated semantic tweak that rode along into its own commit or a follow-up PR.

Tests stay with the behavior they verify unless the test infrastructure is large and independently useful. Unrelated cleanup or dependency bumps get their own unit and must not block the feature. Do not over-split into trivially small units, and do not invent a split for a change that is already atomic.

Validation is proportionate: a mechanical unit needs only the check proving behavior is unchanged; a behavioral unit needs tests demonstrating the new behavior.

# Required output

## Atomicity assessment
Whether the change is atomic enough, its logical purpose(s), and why.

If it is atomic, say so, recommend proceeding, and stop — do not add a proposed split.

If it is not atomic, add:

## Proposed split
One block per commit or PR: title; purpose; included concerns; excluded concerns; genuine dependencies; acceptance criteria; validation; evidence that the intermediate state stays healthy.

## Recovery guidance
Only what applies: interactive staging, a prep PR carved out first, or cleanup deferred to a follow-up. Say explicitly when a split cannot preserve a healthy intermediate state.

`templates/atomic-pr-checklist.md` is available for a written artifact; the structure above stands on its own.

# Strong preferences

Prefer small PRs over clever commit history inside one giant PR, and one logical purpose per PR. When a change is inherently indivisible, keep one PR whose commits still separate mechanical from semantic work.
