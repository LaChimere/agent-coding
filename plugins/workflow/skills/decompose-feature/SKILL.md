---
name: decompose-feature
description: Design a commit sequence for a feature, migration or existing branch when work needs incremental implementation or exceeds one coherent commit. Group commits into PRs when preparing submission or explicitly asked.
---

# Purpose

Decide what independently meaningful commits should exist and their dependency order.
`ensure-atomic-pr` checks whether a proposed or existing commit has one purpose.
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

For an engineering design document, [templates/DESIGN.md](templates/DESIGN.md) remains an optional
writing aid. Adapt its depth and sections to the request.
