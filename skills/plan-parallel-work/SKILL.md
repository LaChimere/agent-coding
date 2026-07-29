---
name: plan-parallel-work
description: Plan safe parallel work for multiple agents on one repository by defining a base PR, branch/worktree boundaries, path ownership, dependencies, validation, and merge order. Also trigger when the user mentions multiple agents, parallel tasks, worktrees, simultaneous work streams, or needs to coordinate who works where on which branch.
---

# Purpose

Decide **who works where, on which branch and working copy, and in what order the work merges**. It does not re-decide the PR sequence; `decompose-feature` owns that while the sequence is unclear.

# Use this skill when

- Multiple agents need to work on the same feature, or the user asks how to parallelize safely
- A base PR should land before fan-out work
- Shared contracts or schemas require controlled ownership
- A PR sequence already exists, but ownership boundaries and merge order do not

Decline fan-out when the task is small enough for one agent, the work overlaps heavily in the same hot files, or shared contracts are still changing rapidly with no stable base. When declining, name the rebase and coordination cost and the exact condition that would make parallel work safe.

Record the design in the active `plans/{slug}` artifacts and follow the recorded approval state. Invoke `workflow-orchestrator` only when phase, approval, or the PR sequence is unresolved.

# Safety rules

- One task owner, one branch, one isolated working copy. A branch name alone is not isolation: a worktree is the default, and an isolated clone or sandbox is equally acceptable when it provides the same guarantee. Never share a working directory.
- Every task states both owned and forbidden paths. Directory-level ownership is the default; use file-level ownership only when a single hot file genuinely needs a designated owner.
- Shared contracts change only in the base PR unless explicitly allowed.
- Files everyone touches — dependency manifests, lockfiles, CI matrices, generated output — get one named owner or a serial phase. Directory ownership does not protect them.
- Generated artifacts are regenerated after convergence, not merged between branches.
- Fan out only from a stable base; an unstable base makes every branch rebase.
- If boundaries cannot be stated clearly, parallel work is unsafe by default: serialize instead.

# Procedure

1. Identify the serial prerequisite base: the exact base ref or commit, plus the contract, schema, interface, feature flag, or abstraction that must stabilize first.
2. Separate the work into serial prerequisites, parallel fan-out tasks, and serial convergence/cleanup.
3. Define every parallel task and the merge strategy in the output below.

# Required output

## Base prerequisite
Name; exact base ref or commit; why it must be serial; what must stabilize first.

## Parallel task blocks
One block per real task — as many as the work has, never padded or collapsed to a fixed count — with identical fields: task name; owner; branch name; isolated working copy; owns; must not touch; depends on; acceptance criteria; validation commands and implementation-owned tests; handoff payload; expected merge order.

## Merge strategy
Rebase order; likely conflict hotspots; convergence owner; final cleanup owner; final convergence validation.

`templates/parallel-task-plan-template.md` is available for a written artifact; the structure above stands on its own.

# Strong preferences

Parallelize across modules, not inside the same hot files. Keep tests with the implementation owner unless shared test infrastructure is independently useful. Give branch reconciliation and final cleanup to one owner. If two tasks need the same core files, recommend serial execution instead.
