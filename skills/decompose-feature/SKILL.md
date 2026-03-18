---
name: decompose-feature
description: Split a large feature into a sequence of small, mergeable, reviewable PRs. Use when a task is too broad for one PR, when stacked PRs or vertical slices are desired, or when a base PR plus parallel fan-out work is needed.
---

# Operating context

This skill operates within the workflow defined in `AGENTS.md`.

Before producing a split plan, create or update `plans/{slug}/research.md` with the evidence, constraints, and unknowns that justify the decomposition.

Then place the proposed PR decomposition in `plans/{slug}/design.md` (the split itself is a design decision) and stop for Gate 1 (Design approval).

After Gate 1 approval, translate the approved design into `plans/{slug}/plan.md` and `plans/{slug}/todo.md`, then stop again for Gate 2 before execution.

# Purpose

Convert a large feature request into a staged delivery plan made of small PRs.

# Use this skill when

- The requested feature spans multiple modules, layers, or services
- The user asks for small PRs, stacked PRs, phased delivery, or incremental rollout
- The task is too large for one reviewable PR
- The task may later be parallelized, but shared contracts are not stable yet

# Do not use this skill when

- The change is already narrow and single-purpose
- The task is a trivial fix that fits cleanly into one PR
- The change is inherently indivisible and intermediate states would be invalid

# Primary goal

Produce a PR sequence where each PR:
- has one logical purpose
- can be described in one sentence
- can merge without breaking trunk
- is independently testable at the appropriate level
- has clear dependencies

# Default decomposition model

Prefer this structure unless the codebase strongly suggests another split:

1. Base PR
   - types / schema / interfaces
   - feature flag
   - abstraction / adapter / compatibility layer
   - no-op or disabled wiring
   - no intended user-visible behavior change

2. Implementation PR(s)
   - core logic
   - unit tests
   - still guarded by flag or abstraction when possible

3. Integration PR(s)
   - connect callers, routes, handlers, workers, UI entry points
   - add focused integration tests

4. Cleanup PR
   - remove legacy path
   - remove temporary compatibility code
   - update docs / metrics / migration notes if relevant

# Decision rules

Prefer base/fan-out/cleanup when:
- there is shared infrastructure
- there are shared contracts
- multiple agents may work in parallel
- partial mergeability matters

Prefer vertical slices when:
- each slice is independently meaningful
- coupling is low
- slices do not fight over hot files

Do not propose a split that leaves the repository broken in an intermediate state.

# Required output

Return the plan in this structure:

## Feature summary
- one-sentence summary
- main constraints
- why this split was chosen

## PR sequence
For each PR:
- PR name
- goal
- likely directories/files
- dependencies
- allowed changes
- prohibited changes
- acceptance criteria (concrete, verifiable conditions that must be true before this PR can be proposed)
- validation commands
- mergeability notes

## Parallelization readiness
- which PRs must be serial
- which PRs can fan out after the base PR lands

## Risks
- contract churn
- migration hazards
- conflict hotspots
- rollback considerations

# Quality bar

A proposed PR is good only if:
- its purpose is singular
- a reviewer can understand it in isolation
- it can be safely merged on its own
- it does not quietly smuggle unrelated cleanup
