---
name: execute-plan-loop
description: Execute an approved implementation scope in small verified slices while keeping plan and status artifacts accurate. Use for an approved `plans/{slug}` step, an explicitly scoped implementation request, or continuation of execution that needs atomic changes and milestone review. This skill does not create persistent goal lifecycle state.
---

# Operating context

This skill operates within the workflow coordinated by `workflow-orchestrator` and its bundled framework contract.

If `workflow-orchestrator` or `achieve-goal` handed off an approved scope with recorded phase, approval, and landing mode, treat that as the active contract and do not route the unchanged decision back through the orchestrator. Invoke `workflow-orchestrator` only when phase, approval, scope, or worker selection is unresolved. If no active contract exists and the orchestrator is unavailable, report the missing dependency.

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
- The work needs explicit per-slice validation and milestone review

# Do not use this skill when

- The task is still in discovery or design and the execution target is not approved
- The main need is to split a large feature into PRs rather than execute one
- The change is so small that a single atomic edit and verification pass is clearly enough

# Non-negotiables

- Keep the final approved objective visible at all times.
- Read the referenced code, tests, plans, or docs before making claims about them. If the user names a file or symbol, inspect it before answering or editing.
- Execute only the approved scope; do not silently expand to adjacent cleanup.
- One landed slice should have one logical purpose and be explainable in one sentence.
- Do not create a commit unless commit creation is authorized and the relevant checks have passed.
- Before landing a slice, check whether execution status artifacts and directly coupled docs need to move with it.
- Run deeper review at coherent milestones, earlier for high-risk changes, and at the cadence set by the user or active contract.
- Review findings must lead to explicit action: fix now, split follow-up work, update the plan/design, or stop and escalate.
- Follow the shared contract's implementation-quality, boundary-validation, and error-handling rules rather than repeating them here.

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
- If approvals required by the active workflow contract are missing, stop and request the missing gate approval instead of coding ahead.

## 2) Re-state the concrete objective

Before touching code, write down for yourself:
- the final outcome for this run
- the exact subset in scope
- the validation that must pass before the next commit
- any doc or status surfaces likely to need updates

If the user asked for only one phase or step, honor that boundary exactly.

If the implementation target depends on code you have not opened, inspect the relevant files first. Do not infer behavior from filenames, test names, or stale plan text when the source is available.

## 3) Resolve landing authorization

Implementation authorization and commit authorization are separate. Read the active landing mode from the workflow state:

- If landing mode is `commits`, use atomic commits after verification.
- Otherwise make and verify logical working-tree slices, update approved status artifacts, and report what is ready to commit.
- Do not infer commit permission from requests such as "implement", "fix", "finish", or "keep going".

## 4) Pick the next atomic slice

Choose the smallest next slice that:
- advances the approved plan
- leaves the repository in a valid state
- can be verified with the repo's existing checks
- can fit in one commit without mixed concerns

If the next step is too large for one commit, split it before coding. Reach for `ensure-atomic-pr` when you need help recovering atomic boundaries.

# Per-slice execution loop

Repeat this loop until the requested scope is complete or a gate blocks further execution.

## 1) Start from the progress truth

- Re-read the current item in `plans/{slug}/todo.md` or the equivalent task tracker.
- Confirm which acceptance criteria this slice is supposed to satisfy.
- If the plan has drifted from reality, stop and update the plan/design through the correct approval gate instead of improvising.

## 2) Implement one reviewable slice

- Make the smallest code change that satisfies the current acceptance target.
- Keep supporting tests, fixtures, config, and directly related docs/status files with the same slice when they are part of the same logical change.
- Avoid batching unrelated refactors, cleanup, or speculative extensibility into the same commit.
- Solve the actual algorithm or product behavior for all valid inputs. Tests verify the solution; they do not define a set of values to special-case.
- Add data validation where invalid data can enter from a boundary. For trusted internal calls, prefer clear invariants and simple code over redundant guards. Handle operational failures where the operation can actually fail, but propagate or report them explicitly instead of adding broad catches or success-shaped fallbacks.
- If a requested change is infeasible, unsafe, or based on an incorrect test, stop with evidence instead of building a workaround.
- During real execution, stop when a concrete required source, test, or plan artifact cannot be inspected. When the user asks only to plan or describe the next slice, state the required inspection, the boundary or invariant that must be confirmed, and the intended behavior without pretending the evidence was already read.
- Before changing validation or error handling, name the actual external trust boundary before relying on internal invariants.
- Identify each operation that can fail. For file-to-database flows, cover file-read and database failures separately rather than collapsing them into one generic error path.
- Verification for boundary/error-handling work covers invalid-data behavior and each relevant operational-failure class, and records that evidence before completion.

## 3) Refresh status artifacts before landing the slice

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

Before landing or reporting every slice, ask whether it changed:
- user-visible behavior
- configuration
- public interfaces
- workflow instructions
- plan/slug status that future execution depends on

If yes, decide which class of documentation change you are making:

- **Directly coupled docs/status updates**: treat the user's request to run this long loop as standing approval for narrow slug-local status updates that are inseparable from the slice you are landing. Examples:
  - updating `plans/{slug}/todo.md` evidence and completion state
  - updating slug-local status notes that future execution depends on
- **Broader or high-impact doc refreshes**: use `refresh-related-docs` and follow its approval rule before editing. Examples:
  - `README.md`
  - `AGENTS.md`
  - broad doc sweeps across multiple Markdown files
  - canonical design docs or runbooks that extend beyond the current atomic slice

Do not stop the long loop for trivial docs that are tightly coupled to the implementation and clearly within the approved scope. Do stop for broader doc work that changes shared guidance or exceeds the slice's natural boundary.

Before proposing the final PR or completion message, do one last doc-staleness sweep consistent with the active workflow contract: count the inline slice-coupled updates you already made, then invoke `refresh-related-docs` only if broader Markdown docs may still be stale.

## 6) Land or report one atomic slice

When commits are authorized, commit only the files that belong to this slice. Otherwise leave the verified slice in the working tree and report its purpose, files, evidence, and readiness.

Good commit shapes:
- one implementation step + its tests
- one plan/todo status update tied to the implementation that just landed
- one doc update tied to the behavior/config change it documents

Bad commit shapes:
- multiple unrelated checklist items
- implementation plus opportunistic cleanup from another area
- mixed behavioral change, broad refactor, and follow-up doc rewrites

# Periodic deep review loop

Run a fuller review when a coherent milestone finishes, before or after a high-risk slice as appropriate, or at the cadence requested by the user or active workflow. Commit count alone is not the trigger. Every milestone review compares the actual diff with the approved plan and acceptance criteria, then turns each validated finding into a fix, split, plan/design update, or evidence-backed escalation.

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

## Repeated-failure rule

Do not continue a fix-on-fix loop without new evidence. After two materially similar failed attempts:

1. record what was tried and what each result disproved
2. reassess the current assumption and implementation path
3. update the plan or design through the required gate when the path changed
4. stop and escalate when safe replanning is not possible

# Completion criteria

The loop is complete only when all of these are true for the requested scope:

- The approved phase/step/feature slice is implemented
- The relevant acceptance criteria have evidence
- Required checks have passed at the appropriate verification level
- Related slug status artifacts reflect reality
- Related docs are updated or explicitly deferred under the repo's approval rules
- Milestone review findings are resolved, deferred explicitly, or escalated with evidence

# Gotchas

- **Losing track of the exact target.** Long execution loops drift easily. Re-anchor on the approved objective before each slice so "while I'm here" work does not quietly expand the change.
- **Letting `todo.md` lag behind the code.** If the status tracker says one thing and the branch says another, the next session will make bad decisions. Update the progress truth before you commit.
- **Treating review as a ceremony.** Milestone review exists to catch structural problems early, not to rubber-stamp what already happened.
- **Fixing comments cosmetically.** Review feedback should improve the design, correctness, or maintainability of the change. Do not respond with the smallest possible patch if a more principled fix is warranted.
- **Plowing ahead through approval boundaries.** If plan or design drift is discovered mid-loop, stop and refresh the right artifact instead of sneaking in unapproved changes.
- **Test-fitting instead of solving.** A green targeted test is not enough if the implementation hard-codes that test's values, creates a throwaway workaround script, or ignores valid inputs outside the fixture. Do not confuse this with legitimate repository tooling that supports the real implementation or verification.
- **Over-defensive internals.** Data validation belongs at boundaries. Extra fallback branches inside trusted code can hide broken assumptions and make future maintenance harder; operational errors are different and should still be surfaced or propagated where they can occur.
