---
name: decompose-feature
description: Plan what PRs should exist and how they should land as a trunk-safe sequence, for new work or an existing branch being reorganized for delivery. Use for stacked PRs, phased delivery, incremental rollout, or work that exceeds one reviewable PR. Not for judging whether a change set is atomic or recovering its commit boundaries — that is ensure-atomic-pr.
---

# Purpose

Decide **what PRs should exist** for work that has not been written yet, and in what order they land.

# Boundaries

| Situation | Owner |
|---|---|
| Work needing a delivery sequence — including an existing branch when the question is what PRs should exist | this skill |
| A change set whose atomicity or commit boundaries need assessment/recovery | `ensure-atomic-pr` |
| A settled PR sequence that now needs branch/worktree/path ownership across agents | `plan-parallel-work` |

If an existing branch question mixes both concerns, decide the PR sequence here and name `ensure-atomic-pr` only for commit/diff recovery detail.

Skip this skill when the planned change is already narrow and single-purpose.

For workflow-managed delivery, put the split in the active `plans/{slug}` design artifact and follow the recorded approval state. Invoke `workflow-orchestrator` only when phase or approval is unresolved.

# Advisory mode

When the user asks for a rough, provisional, or early breakdown, or says they are not ready to start: answer inline with 3–6 concise bullets, one per candidate PR, each a name plus its one-sentence purpose, and state plainly that the split is provisional and will change as evidence arrives.

Do not create artifacts, require approval gates, or emit the full required output below. End with at most one factual sentence that the provisional split can later be materialized into `plans/{slug}`; do not turn it into an open-ended offer of further help.

# Decomposition model

Prefer vertical slices: each PR delivers one meaningful behavior end to end with its own tests and directly coupled docs.

Use a base PR only when evidence shows later slices share a real prerequisite — a schema, public contract, compatibility layer, or stabilized interface. Keep the base to what the fan-out genuinely requires: contracts, types, and wiring stubs, never consumer logic, speculative flags, or no-op abstractions. Parallelism or partial mergeability alone never justifies a base PR. Add a cleanup PR only to remove temporary compatibility or migration work the sequence itself introduced.

Schema work orders as compatible schema first, then readers and writers, then removal of the legacy path.

Rules that override PR count:

- Never leave trunk broken in an intermediate state; every PR must be independently mergeable.
- If the components must change together and every partial merge is invalid, recommend **one PR** — never a split by file count. Commits inside it may still separate mechanical preparation from semantic behavior. Do not invent dual-read, compatibility, or rollout mechanisms the request or codebase evidence does not provide.
- Tests ship with the implementation they verify. There is no standalone "tests PR".
- Optimize for reviewability, not PR count: three well-scoped PRs beat eight tiny ones.

# Required output

For a delivery request (not advisory mode):

## Feature summary
One sentence, main constraints, why this split.

## PR sequence
One block per PR: name; goal; likely paths; dependencies; allowed changes; prohibited changes; concrete acceptance criteria; validation command or method; mergeability note. Every block, cleanup PRs included, carries acceptance criteria and validation.

If the feature is one indivisible purpose, say so and propose one PR instead of manufacturing a sequence.

## Parallelization readiness
Which PRs stay serial, which can fan out after the base lands. Readiness only; `plan-parallel-work` assigns agents, branches, and paths.

## Risks
Contract churn, migration hazards, conflict hotspots, rollback considerations.

`templates/feature-plan-template.md` is available for a fuller written artifact; the structure above stands on its own.

# Quality bar

A proposed PR is good only if its purpose is singular, a reviewer understands it in isolation, it merges safely alone, and it smuggles in no unrelated cleanup.
