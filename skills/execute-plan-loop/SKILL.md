---
name: execute-plan-loop
description: Execute an approved feature request or approved `plans/{slug}` scope in a persistent implementation loop with atomic commits, per-commit verification, plan/todo status refreshes, doc checks, and periodic deep review. Use whenever the user asks the agent to implement a feature end-to-end, continue from an approved plan, finish a phase or step, carry part or all of a slug to completion, "keep going until it's done", or otherwise wants disciplined multi-commit execution instead of a single big diff.
---

# Operating context

This skill operates within the workflow defined in `AGENTS.md`.

It is an **execution skill**, not a planning shortcut. If the task triggers plan mode and the necessary approvals are missing, do not start coding. Create or update the required plan artifacts, stop at the correct gate, and wait for approval.

Use this skill after the goal and allowed scope are clear enough to execute:
- an approved `plans/{slug}/plan.md` + `todo.md`
- an explicitly scoped trivial task that does not require plan mode
- a partially completed slug where the remaining approved scope is known

If the PR sequence itself is still unclear, use `decompose-feature` first. If multiple agents need explicit ownership boundaries, use `plan-parallel-work`. If a diff stops being atomic, use `ensure-atomic-pr`. If doc updates may be needed, use `refresh-related-docs`.

# Purpose

Carry approved implementation work forward in small, reviewable, verified increments until the requested slice is complete.

# Use this skill when

- The user asks to implement a feature and keep going until a meaningful milestone is done
- The user asks to execute part or all of an approved `plans/{slug}` plan
- The user asks to finish a phase, step, or checklist item from a planning slug
- The user wants multi-commit discipline instead of one large unreviewed change
- The work needs explicit per-commit validation and periodic deeper review

# Do not use this skill when

- The task is still in discovery or design and the execution target is not approved
- The main need is to split a large feature into PRs rather than execute one
- The change is so small that a single atomic edit and verification pass is clearly enough

# Non-negotiables

- Keep the final approved objective visible at all times.
- Execute only the approved scope; do not silently expand to adjacent cleanup.
- One commit should have one logical purpose and be explainable in one sentence.
- Do not create a commit until the relevant checks for that slice have passed.
- Before each commit, check whether execution status artifacts and docs need to be updated, and include those updates in the same commit when they are directly tied to the slice.
- After every 3-5 commits, or at the end of any coherent milestone, run a deeper review before continuing.
- Review findings must lead to explicit action: fix now, split follow-up work, update the plan/design, or stop and escalate.

# Pre-loop setup

## 1) Resolve the target scope

- Identify whether the request is:
  - a direct feature implementation
  - part of an approved `plans/{slug}` scope
  - a continuation of previously started execution
- Read the relevant artifacts before coding:
  - `plans/{slug}/research.md` when background context matters
  - `plans/{slug}/design.md` when correctness depends on design constraints
  - `plans/{slug}/plan.md` for the approved steps and acceptance criteria
  - `plans/{slug}/todo.md` for current execution status
- If approvals required by `AGENTS.md` are missing, stop and request the missing gate approval instead of coding ahead.

## 2) Re-state the concrete objective

Before touching code, write down for yourself:
- the final outcome for this run
- the exact subset in scope
- the validation that must pass before the next commit
- any doc or status surfaces likely to need updates

If the user asked for only one phase or step, honor that boundary exactly.

## 3) Pick the next atomic slice

Choose the smallest next slice that:
- advances the approved plan
- leaves the repository in a valid state
- can be verified with the repo's existing checks
- can fit in one commit without mixed concerns

If the next step is too large for one commit, split it before coding. Reach for `ensure-atomic-pr` when you need help recovering atomic boundaries.

# Per-commit execution loop

Repeat this loop until the requested scope is complete or a gate blocks further execution.

## 1) Start from the progress truth

- Re-read the current item in `plans/{slug}/todo.md` or the equivalent task tracker.
- Confirm which acceptance criteria this slice is supposed to satisfy.
- If the plan has drifted from reality, stop and update the plan/design through the correct approval gate instead of improvising.

## 2) Implement one reviewable slice

- Make the smallest code change that satisfies the current acceptance target.
- Keep supporting tests, fixtures, config, and directly related docs/status files with the same slice when they are part of the same logical change.
- Avoid batching unrelated refactors, cleanup, or speculative extensibility into the same commit.

## 3) Refresh status artifacts before committing

Before creating the commit, update whichever progress artifacts are meant to reflect reality:
- `plans/{slug}/todo.md` checklist items and evidence notes
- `plans/{slug}/plan.md` only if the approved execution details truly changed
- `plans/{slug}/lessons.md` when a material correction revealed a reusable lesson
- any other slug-local status fields that the repository uses as the progress truth

If updating `plan.md` or `design.md` changes the approved path, stop for the required approval gate instead of committing implementation on top of unapproved drift.

## 4) Run the relevant checks

- Run the narrowest relevant verification first, then broader checks if the change type requires it.
- Prefer the exact validation commands captured in the plan.
- If the plan lacks commands, inspect the repository and use the closest existing lint/typecheck/test commands.
- Do not commit through red checks unless the approved plan explicitly allows a temporary non-green intermediate state, which should be rare.

## 5) Check whether docs must move with the code

Before every commit, ask whether this slice changed:
- user-visible behavior
- configuration
- public interfaces
- workflow instructions
- plan/slug status that future execution depends on

If yes, decide which class of documentation change you are making:

- **Directly coupled docs/status updates**: treat the user's request to run this long loop as standing approval for small documentation updates that are inseparable from the slice you are landing. Examples:
  - updating `README.md` when a new command, flag, or user-visible behavior ships
  - updating `plans/{slug}/todo.md` evidence and completion state
  - updating slug-local status notes that future execution depends on
- **Broader or high-impact doc refreshes**: use `refresh-related-docs` and follow its approval rule before editing. Examples:
  - `AGENTS.md`
  - broad doc sweeps across multiple Markdown files
  - canonical design docs or runbooks that extend beyond the current atomic slice

Do not stop the long loop for trivial docs that are tightly coupled to the implementation and clearly within the approved scope. Do stop for broader doc work that changes shared guidance or exceeds the slice's natural boundary.

Before proposing the final PR or completion message, do one last doc-staleness sweep consistent with `AGENTS.md`: count the inline slice-coupled updates you already made, then invoke `refresh-related-docs` only if broader Markdown docs may still be stale.

## 6) Create one atomic commit

Commit only the files that belong to this slice.

Good commit shapes:
- one implementation step + its tests
- one plan/todo status update tied to the implementation that just landed
- one doc update tied to the behavior/config change it documents

Bad commit shapes:
- multiple unrelated checklist items
- implementation plus opportunistic cleanup from another area
- mixed behavioral change, broad refactor, and follow-up doc rewrites

# Periodic deep review loop

Run a fuller review after every 3-5 commits, or sooner when a coherent milestone finishes.

## Review procedure

1. Review the recent diff against the approved plan and acceptance criteria.
2. Check for correctness, missing tests, scope creep, stale docs, and degraded atomicity.
3. Run a comprehensive code review using the strongest mechanism available in the current environment. Prefer a dedicated review tool or review agent when one exists; otherwise manually review the recent commits and diff for correctness, missing tests, scope creep, stale docs, and degraded atomicity.
4. Double-check the review findings yourself before acting on them blindly.

## Action triage

When review finds something, choose the action that matches the problem:

- **Straightforward implementation gap** -> fix it in the next atomic commit and re-run checks
- **Diff is no longer atomic** -> split the work and recover boundaries, using `ensure-atomic-pr` if helpful
- **Approved plan is incomplete or wrong** -> update `plan.md`, explain the change, and stop for Gate 2
- **Approved design is invalidated** -> update `design.md`, explain the deviation, and stop for Gate 1
- **Unclear or risky review feedback** -> stop and surface the trade-off or blocker with evidence

Resolve review comments at the root-cause level. Prefer the cleanest correct fix over narrow patches that only silence the comment.

# Completion criteria

The loop is complete only when all of these are true for the requested scope:

- The approved phase/step/feature slice is implemented
- The relevant acceptance criteria have evidence
- Required checks have passed at the appropriate verification level
- Related slug status artifacts reflect reality
- Related docs are updated or explicitly deferred under the repo's approval rules
- Periodic review findings are resolved, deferred explicitly, or escalated with evidence

# Gotchas

- **Losing track of the exact target.** Long execution loops drift easily. Re-anchor on the approved objective before each slice so "while I'm here" work does not quietly expand the change.
- **Letting `todo.md` lag behind the code.** If the status tracker says one thing and the branch says another, the next session will make bad decisions. Update the progress truth before you commit.
- **Treating review as a ceremony.** A 3-5 commit review checkpoint is there to catch structural problems early, not to rubber-stamp what already happened.
- **Fixing comments cosmetically.** Review feedback should improve the design, correctness, or maintainability of the change. Do not respond with the smallest possible patch if a more principled fix is warranted.
- **Plowing ahead through approval boundaries.** If plan or design drift is discovered mid-loop, stop and refresh the right artifact instead of sneaking in unapproved changes.
