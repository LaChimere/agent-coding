---
name: plan-parallel-work
description: Plan safe parallel work for multiple agents on one repository by defining a base PR, branch/worktree boundaries, path ownership, dependencies, validation, and merge order. Also trigger when the user mentions multiple agents, parallel tasks, worktrees, simultaneous work streams, or needs to coordinate who works where on which branch.
---

# Operating context

This skill operates within the workflow coordinated by `workflow-orchestrator` and its bundled framework contract.

If `skills/workflow-orchestrator/references/workflow-contract.md` exists in the current repository, read it before planning ownership boundaries. If the shared contract is not present, use this skill only when an equivalent workflow contract is already active or route through `workflow-orchestrator` first.

Before producing a parallelization design, create or update `plans/{slug}/research.md` with the evidence, dependency analysis, and conflict hotspots that justify the split.

Then place the parallel execution design in `plans/{slug}/design.md` (ownership boundaries and merge strategy are design decisions) and stop for Gate 1 (Design approval).

After Gate 1 approval, translate the approved design into `plans/{slug}/plan.md` and `plans/{slug}/todo.md`, then stop again for Gate 2 before execution.

This skill decides **who works where, on which branch/worktree, and in what order**. It does not replace `decompose-feature` when the PR sequence itself is still unclear.

# Purpose

Turn a multi-agent implementation request into an explicit parallel execution plan.

# Use this skill when

- Multiple agents need to work on the same feature
- The user asks how to parallelize work safely
- A base PR should land before fan-out work
- Shared contracts or schemas require controlled ownership
- A PR sequence already exists, but ownership boundaries and merge order still need to be defined

# Do not use this skill when

- The task is small enough for one agent
- The work overlaps heavily in the same hot files
- Shared contracts are still changing rapidly and no stable base exists

# Default safety rules

- One agent = one branch
- One branch = one worktree
- Shared contracts may be changed only in the base PR unless explicitly allowed
- Each agent must have explicit owned paths
- Each agent must also have explicit forbidden paths
- If boundaries cannot be stated clearly, parallelization is unsafe by default

# Planning procedure

1. Identify the serial prerequisite base
   - contract
   - schema
   - interface
   - feature flag
   - abstraction layer

2. Separate work into:
   - serial prerequisites
   - parallel fan-out tasks
   - serial convergence / final cleanup

3. For each parallel task, define:
   - branch name
   - worktree name
   - owned directories
   - forbidden directories
   - dependencies
   - validation commands
   - expected merge order

# Required output

## Base prerequisite
- name
- why it must be serial
- what must stabilize first

## Parallel task table
For each task:
- task name
- branch name
- worktree name
- owns
- must not touch
- depends on
- validation

## Merge strategy
- rebase order
- likely conflict hotspots
- convergence owner
- final cleanup owner

# Gotchas

These are failure patterns that come up repeatedly when agents plan parallel work. Each one can cause merge pain or wasted effort if not caught early.

- **Underestimating shared file conflicts.** Configuration files, dependency manifests, CI definitions, and generated files are touched by almost everyone. If two agents both modify `package.json` or a shared config, the merge will conflict regardless of directory ownership. Explicitly assign a single owner for each shared file, or serialize those changes.

- **Ownership at the wrong granularity.** Assigning ownership at the individual file level creates micro-boundaries that are hard to enforce and easy to accidentally cross. Directory-level ownership is almost always the right default. File-level ownership should only be used when a single hot file genuinely needs a designated owner.

- **Forgetting the convergence owner.** The plan defines who does the parallel work, but not who reconciles the branches afterward. Merging, resolving conflicts, and running final integration tests is real work — assign it to a specific agent or person.

- **Generated files as landmines.** Build outputs, lockfiles, and auto-generated code will differ between worktrees. If the merge plan does not account for regenerating these files after branch convergence, the final merge will silently carry stale artifacts.

- **Starting parallel work before the base PR is stable.** If the base PR's contracts are still changing, every parallel branch built on top of it will need rebasing. Wait until the base PR is merged or at least frozen before fanning out.

# Strong preferences

- Prefer parallelism across modules, not within the same hot files
- Prefer backend/frontend/tests/docs split only after contracts stabilize
- Prefer one owner for final cleanup and branch reconciliation
- If two tasks need the same core files, recommend serial execution instead
