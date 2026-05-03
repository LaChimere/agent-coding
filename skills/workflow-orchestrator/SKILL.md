---
name: workflow-orchestrator
description: Orchestrate the full framework workflow from request to research/design/plan/execution/review by creating or updating `plans/{slug}` artifacts, applying the framework contract, and choosing the right worker skill next. Use whenever the user wants one skill to decide how work should proceed end-to-end, asks to turn a request into the right slug docs plus next action, or wants multiple workflow skills to cooperate as one system.
---

# Purpose

Act as the **front door** for this workflow.

This skill does not replace the worker skills. It decides:
- which workflow phase applies now
- which `plans/{slug}` artifacts must exist
- which worker skill should handle the next step
- when to stop for approval, review, or missing information

# Use this skill when

- The user wants one entry point that can take a request from discovery to execution
- The user asks how the existing skills should cooperate on a task
- The user has a feature/problem statement, but the correct next skill is not obvious yet
- The user wants the agent to create or update the slug artifacts and then continue with the right workflow
- The work may need planning, execution, diff recovery, review, or doc refresh in sequence

# Do not use this skill when

- The correct worker skill is already obvious and the user is explicitly asking for that narrower workflow
- The task is a tiny one-off edit that clearly does not need slug artifacts or cross-skill coordination

# Operating model

## 1) Load the bundled contract first

Read `references/workflow-contract.md` before making orchestration decisions.

That file is the portable summary of the framework rules this skill needs:
- discovery expectations
- grounded investigation rules
- plan-mode triggers
- artifact layout
- approval gates
- verification rules
- implementation quality posture
- worker-skill routing

## 2) Use repo-local `AGENTS.md` only for project-specific rules

If the repository also has `AGENTS.md`, treat it as the source for **project-local contributor rules** such as:

- validation command preferences
- hot-file or directory ownership notes
- repo maintenance conventions
- documentation expectations for that specific repository

Do **not** treat repo-root `AGENTS.md` as the orchestration contract for the skill graph. That coordination logic lives in this skill and `references/workflow-contract.md`.

## 3) Use skill-local templates to create runtime artifacts

When `plans/{slug}` artifacts are missing or need to be bootstrapped, use this skill's bundled `templates/` directory as the source material.

Write the runtime artifacts into the repository under:

`plans/{slug}/research.md`
`plans/{slug}/design.md`
`plans/{slug}/plan.md`
`plans/{slug}/todo.md`
`plans/{slug}/lessons.md`

The bundled templates are the creation source. The repo-local `plans/{slug}` files are the runtime truth.

# Orchestration procedure

## 1) Classify the request

Decide which state the work is currently in:

- **Discovery needed** — key facts or scope are still unclear
- **Design needed** — trade-offs or workflow shape must be reviewed
- **Plan needed** — implementation steps should be written before execution
- **Execution ready** — approved scope can move forward
- **Recovery/review needed** — an existing diff or branch lost atomicity
- **Doc refresh needed** — broader Markdown docs may be stale

Ground the classification in evidence. If the user references a concrete file, symbol, plan slug, diff, or test failure and the evidence is not already available, route first to discovery/research or the appropriate worker step with explicit instructions to inspect it before making codebase claims. If available evidence contradicts the request or tests, stop and report the conflict rather than routing toward a workaround.

Also decide whether the task is:
- a new slug
- a continuation of an existing slug
- a direct small task that still benefits from orchestration

## 2) Derive and normalize the slug

Choose a short kebab-case slug that matches the task's one logical purpose.

Prefer:
- `add-auth-middleware`
- `parallelize-report-import`
- `workflow-orchestrator-skill`

Avoid broad or mixed slugs like:
- `misc-fixes`
- `auth-and-ci-and-docs`

## 3) Materialize the minimum artifact set

Create or update only the artifacts needed for the current phase:

- `research.md` when discovery or evidence capture is needed
- `design.md` when workflow/architecture trade-offs need review
- `plan.md` and `todo.md` once the implementation path is stable enough to execute
- `lessons.md` only after a material correction or reusable process failure

Do not create files just for ceremony. Create them when they clarify the workflow or are required by the contract.

## 4) Pick the next worker skill

Use this routing table:

### `decompose-feature`
Use when:
- the request is too large for one PR
- the PR sequence itself is still unclear
- staged delivery or stacked PRs are needed

Output expectation:
- a proposed PR sequence
- acceptance criteria and validation per PR

### `plan-parallel-work`
Use when:
- multiple agents need explicit ownership boundaries
- a base PR must stabilize before fan-out
- branch/worktree/path ownership must be defined

Output expectation:
- base prerequisite
- parallel task table
- merge strategy

### `execute-plan-loop`
Use when:
- scope is approved or clearly trivial
- the next need is disciplined implementation in atomic commits
- the user wants the agent to keep going until a meaningful slice is done

Output expectation:
- commit-by-commit execution with verification, progress refreshes, and periodic deeper review

### `achieve-goal`
Use when:
- the user sets a persistent objective with `/goal <objective>` or equivalent language
- the user wants autonomous goal pursuit with pause/resume/clear semantics
- the work should keep re-anchoring to a long-running objective until complete, blocked, paused, or budget-limited

Output expectation:
- a goal state under `plans/{slug}/goal.md`
- repeated verified slices with progress updates
- a clear stop condition and completion, budget, or blocker report

### `ensure-atomic-pr`
Use when:
- an existing diff, branch, or PR mixes concerns
- the current change no longer fits one logical purpose
- recovery guidance is needed before continuing

Output expectation:
- a cleaner split or explicit recovery path

### `refresh-related-docs`
Use when:
- broader Markdown docs may be stale after a behavior/config/API change
- the update extends beyond tightly coupled slice-local docs/status files

Output expectation:
- approved doc refresh across the affected Markdown surfaces

## 5) Keep the state surfaces synchronized

As the workflow moves, keep these aligned:

- the active request
- the chosen slug
- the current gate/phase
- the repo-local `plans/{slug}` files
- the worker skill that should act next

If those surfaces disagree, fix the artifact/state mismatch before continuing.

## 6) Stop at the right boundary

Stop and wait when:
- key scope or expected behavior is still unclear
- the contract says a gate is required
- design/plan drift invalidates the current path
- the next action would mix concerns or silently expand scope

Continue directly when:
- the next phase is clear
- the required artifacts already exist or can be created safely
- the appropriate worker skill is obvious

# Strong preferences

- Prefer creating the missing slug artifacts over describing them abstractly.
- Prefer a concrete next worker skill over a vague "someone should figure this out."
- Prefer preserving the existing `plans/{slug}` runtime layout over inventing a new one.
- Prefer a bounded first step over trying to solve framework portability, orchestration, and full worker-skill refactoring in one pass.

# Gotchas

- **Thin-wrapper trap.** If this skill merely punts coordination back to repo-root files, it has not actually integrated the framework.
- **Artifact spam.** Do not create every possible file up front when only one or two are needed right now.
- **Routing without state.** Choosing a worker skill without first checking which artifacts and approvals already exist leads to bad handoffs.
- **Overclaiming portability.** This skill can carry the orchestration contract itself, but the wider framework may still have repo-local assumptions. Be explicit about that boundary.
