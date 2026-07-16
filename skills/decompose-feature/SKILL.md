---
name: decompose-feature
description: Split work that is too large for one reviewable PR into a trunk-safe sequence of mergeable slices. Use when the user asks for stacked PRs, phased delivery, incremental rollout, or when evidence shows one PR would mix purposes or exceed a comfortable review boundary.
---

# Operating context

This skill operates within the workflow coordinated by `workflow-orchestrator` and its bundled framework contract.

Use an active handoff from the installed `workflow-orchestrator` when materializing workflow artifacts. If phase or approval is unresolved, invoke that skill by name. Do not rely on repository-source paths.

For an advisory request, especially when the user says they are not ready to start, return the decomposition inline without creating artifacts or approval gates. Offer materialization into `plans/{slug}` only as an optional later step.

For workflow-managed delivery, create or update `plans/{slug}/research.md`, place the proposed split in `design.md`, and follow the active approval state before translating it into `plan.md` and `todo.md`.

This skill decides **what PRs should exist**. If the resulting PR sequence also needs explicit branch/worktree/path ownership for multiple agents, follow it with `plan-parallel-work`.

# Purpose

Convert a large feature request into a staged delivery plan made of small PRs.

# Use this skill when

- The requested feature spans multiple modules, layers, or services
- The user asks for small PRs, stacked PRs, phased delivery, or incremental rollout
- The task is too large for one reviewable PR
- The task may later be parallelized, but the PR sequence is not stable enough yet to assign agent ownership

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

Prefer vertical slices: each PR delivers one meaningful behavior end to end, including its tests and directly coupled documentation.

Use a serial base PR only when evidence shows later PRs share a real prerequisite such as a schema, public contract, compatibility layer, or stabilized interface. Keep that base limited to what the fan-out genuinely requires; do not add speculative flags, abstractions, or no-op wiring for structure alone.

Use cleanup PRs only for temporary compatibility or migration work introduced by the sequence.

# Decision rules

Prefer base/fan-out/cleanup only when:
- there is a demonstrated shared prerequisite
- more than one later slice depends on the same stabilized contract

Parallelism and partial mergeability strengthen that choice, but neither justifies a base PR without the shared prerequisite.

Prefer vertical slices when:
- each slice is independently meaningful
- coupling is low
- slices do not fight over hot files

Do not propose a split that leaves the repository broken in an intermediate state.

If the evidence states that components must change together and every partial merge is invalid, recommend one PR. Do not invent dual-read, compatibility, or rollout mechanisms that the request or codebase evidence does not provide. Commits inside the PR may separate mechanical preparation from semantic behavior when useful.

# Required output

Return the plan in this structure:

## Feature summary
- one-sentence summary
- main constraints
- why this split was chosen

## PR sequence
Use one repeatable block per proposed PR:
- PR name
- goal
- likely directories/files
- dependencies
- allowed changes
- prohibited changes
- acceptance criteria (concrete, verifiable conditions that must be true before this PR can be proposed)
- validation commands
- mergeability notes

Every PR block includes both concrete acceptance criteria and a validation command or method, including cleanup PRs.

If the feature is already one reviewable, indivisible purpose, recommend one PR instead of manufacturing a sequence.

## Parallelization readiness
- which PRs must be serial
- which PRs can fan out after the base PR lands
- note that this is only readiness guidance; use `plan-parallel-work` for explicit agent / branch / worktree ownership

## Risks
- contract churn
- migration hazards
- conflict hotspots
- rollback considerations

# Gotchas

These are failure patterns that come up repeatedly when agents use this skill. Knowing them upfront saves entire rework cycles.

- **Lumping all tests into a "tests PR."** Tests should travel with the implementation they verify, not be batched into a separate PR. A standalone "add all tests" PR is hard to review because the reviewer has to mentally reconnect each test to its implementation. If a test belongs to PR 2's logic, it ships in PR 2.

- **Over-splitting.** Not every conceptual boundary deserves its own PR. If splitting a feature into 8 tiny PRs makes the whole sequence harder to follow than 3 well-scoped ones, the split is hurting, not helping. Optimize for reviewability, not for PR count.

- **Base PR scope creep.** The base PR should contain only contracts, types, flags, and wiring stubs — things that other PRs depend on. When implementation logic starts leaking into the base PR "for convenience," the entire staged delivery plan weakens because the base PR becomes a large, hard-to-review change itself.

- **Ignoring data migration order.** When a feature involves schema changes, the decomposition must respect the migration order: schema first, then code that reads/writes the new schema, then cleanup of the old schema. Splitting these out of order creates broken intermediate states.

- **Forgetting that each PR must be independently mergeable.** A proposed split that leaves the repository broken after PR 2 merges but before PR 3 lands is not a valid decomposition. Every intermediate state must be trunk-safe.

# Quality bar

A proposed PR is good only if:
- its purpose is singular
- a reviewer can understand it in isolation
- it can be safely merged on its own
- it does not quietly smuggle unrelated cleanup
