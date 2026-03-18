---
name: plan-parallel-work
description: Plan safe parallel work for multiple agents on one repository by defining a base PR, branch/worktree boundaries, path ownership, dependencies, validation, and merge order.
---

# Operating context

This skill operates within the workflow defined in `AGENTS.md`.

Before producing a parallelization design, create or update `plans/{slug}/research.md` with the evidence, dependency analysis, and conflict hotspots that justify the split.

Then place the parallel execution design in `plans/{slug}/design.md` (ownership boundaries and merge strategy are design decisions) and stop for Gate 1 (Design approval).

After Gate 1 approval, translate the approved design into `plans/{slug}/plan.md` and `plans/{slug}/todo.md`, then stop again for Gate 2 before execution.

# Purpose

Turn a multi-agent implementation request into an explicit parallel execution plan.

# Use this skill when

- Multiple agents need to work on the same feature
- The user asks how to parallelize work safely
- A base PR should land before fan-out work
- Shared contracts or schemas require controlled ownership

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

# Strong preferences

- Prefer parallelism across modules, not within the same hot files
- Prefer backend/frontend/tests/docs split only after contracts stabilize
- Prefer one owner for final cleanup and branch reconciliation
- If two tasks need the same core files, recommend serial execution instead
