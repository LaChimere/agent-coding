---
name: decompose-feature
description: Design the PR sequence for a feature, migration or existing branch being organized for delivery. Use when work needs staged landing or exceeds one independently reviewable PR.
---

# Purpose

Decide what pull requests should exist and in what order they can safely land.
`ensure-atomic-pr` answers the different question of whether an existing change has one purpose.

# Understand the delivery constraints

Inspect the requested behavior, selected design, existing contracts and deployment constraints.
For an existing branch, inspect what is already implemented before proposing a new sequence.
Identify which components can evolve independently and which must change together. Distinguish
code dependencies from rollout dependencies such as schema availability or client compatibility.

When one coherent PR is sufficient, explain that conclusion rather than manufacture a split.

# Design the sequence

Prefer vertical slices: each PR delivers one meaningful behavior through the relevant layers,
with its tests and directly coupled documentation. Splitting by frontend/backend, directory or
artifact type alone does not establish useful boundaries. A genuine prerequisite or independently
valuable infrastructure change can be its own PR when it leaves the existing system usable.

Each PR must leave trunk healthy and be understandable on its own. If components must change
together and every partial state is invalid, propose one PR. File count and parallel workers are
not reasons to split an indivisible change. Optimize for reviewable outcomes, not a target PR count.

Use a prerequisite PR only when later work genuinely depends on a schema, contract or stabilized
interface. Keep it minimal; avoid wiring stubs, speculative flags and compatibility mechanisms
not justified by the requested migration. Parallel implementation alone does not justify a base PR.

For schema or contract migrations, check compatibility between old and new readers, writers and
deployed versions. A compatible schema followed by consumers and eventual legacy removal is a
common safe sequence, not proof that every migration supports it. Explain how each intermediate
state works and what must be available before the next PR can land or deploy. If a safe partial
state requires an unapproved product or compatibility mechanism, expose that choice rather than
silently add the mechanism.

Include a cleanup PR only for temporary work introduced by the sequence, with its removal condition
and acceptance evidence. Separate genuinely independent work from changes sharing an unstable
contract; a possible implementation overlap does not change their landing dependencies.

# Return the proposal

Give each PR's purpose, included and excluded concerns, relevant paths, real dependencies,
observable acceptance and validation method. Explain intermediate-state safety and material
rollout or rollback risks, including data changes that reverting code cannot undo. Mark assumptions
and unresolved decisions explicitly. Cleanup PRs need the same acceptance clarity as other PRs.

A provisional breakdown can be a few bullets; a larger sequence can use a table. Reuse accepted
decisions without reopening settled comparisons. Follow the requested output form and use the
authorized location for any requested document.

A delivery proposal does not authorize implementation, staging, commits, pushes, PR changes or
pipeline triggers. Resolve material behavior and migration choices with the user before dependent
work; preserve decisions already made.

For an engineering design document, [templates/DESIGN.md](templates/DESIGN.md) is an optional
writing aid. Adapt its depth and sections to the request.
