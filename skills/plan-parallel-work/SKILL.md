---
name: plan-parallel-work
description: Plan isolation, ownership, dependencies, and integration for multiple implementers preparing to edit code concurrently, or when the user explicitly asks to assess parallel implementation. Fill gaps in the overall plan; do not trigger for parallel research or review, a single worktree, or one agent working sequentially.
---

# Purpose

Complete the overall plan's **Parallel execution** section: who may edit which code concurrently, how their work is isolated, and how it is integrated and verified. This is a planning specialty, not a separate plan, approval gate, or progress tracker. Task parallelism does not imply multiple PRs; use `decompose-feature` only when the delivery sequence itself needs design.

# Use this skill when

- Multiple implementers are preparing to modify code concurrently and need isolation or ownership decisions.
- The user explicitly asks to assess parallel implementation.

Parallel research or review, creating a single worktree, and sequential execution by one agent do not trigger this skill.

Decline fan-out when the task is small enough for one agent, the work overlaps heavily in the same hot files, or shared contracts are still changing rapidly with no stable base. When declining, name the rebase and coordination cost and the exact condition that would make parallel work safe.

Consume the existing objective, task split, and native plan or `plans/{slug}/plan.md`. If the parallel arrangements are sufficient, report that directly; otherwise fill only the missing decisions. Do not repeat settled questions or rewrite the overall plan. Invoke `workflow-orchestrator` only for unresolved phase or approval, not as a prerequisite.

Keep the result in the native proposal's `Parallel execution` section until file writes are allowed and authorized, then in the same living `plan.md` (the single execution-progress source). This skill does not create an independent parallel-plan file. Approval of the overall execution plan covers its parallel arrangements without another gate. Routine assignments and non-conflicting branch names can be chosen during authorized execution; changes to concurrency semantics, interface ownership, isolation, or integration risk require renewed alignment.

If the overall plan has not been materialized, return the supplemental section inline with the native proposal. Do not create a new `plan.md` containing only parallel arrangements. When explicitly authorized to save the overall plan, preserve its accepted scope and acceptance criteria together with the supplemental section; missing file scaffolding does not require another planning round or approval.

# Safety rules

- One task owner, one branch, one isolated working copy. A branch name alone is not isolation: a worktree is the default, and an isolated clone or sandbox is equally acceptable when it provides the same guarantee. Never share a working directory.
- Every task states both owned and forbidden paths. Directory-level ownership is the default; use file-level ownership only when a single hot file genuinely needs a designated owner.
- Stabilize shared contracts in a serial prerequisite, or assign their changes to an explicit owner.
- Files everyone touches — dependency manifests, lockfiles, CI matrices, generated output — get one named owner or a serial phase. Directory ownership does not protect them.
- Generated artifacts are regenerated after convergence, not merged between branches.
- Fan out only from a stable base; an unstable base makes every branch rebase.
- If boundaries cannot be stated clearly, parallel work is unsafe by default: serialize instead.

# Procedure

1. Check the existing plan against the fields below and identify only its gaps. If one shared file lacks an owner, resolve that owner rather than rebuilding the task split.
2. Identify the stable starting ref or commit and any genuine serial prerequisite. An existing stable ref is sufficient; a new base PR is not required.
3. Complete the missing serial/parallel boundaries, ownership, isolation, acceptance, and integration decisions in the same plan.

Planning records intended roles and arrangements. Creating branches or worktrees and dispatching implementation tasks belong to authorized execution; do not perform or claim those actions while only planning.

# Parallel execution section

## Starting point and serial work
Exact stable base ref or commit; any prerequisite and why it must be serial; work that must remain serial.

## Parallel task blocks
One block per real parallel task: task name; intended owner; planned branch and isolated working copy; allowed and forbidden paths; dependencies; acceptance criteria; validation and implementation-owned tests; handoff evidence. Reference existing task acceptance where sufficient rather than copying it or its progress.

## Integration strategy
Integration order; reconciliation method; shared-file owners or serial phases; likely conflict hotspots; integration and final cleanup owner; final validation.

Use `templates/parallel-task-plan-template.md` as an embeddable section, not a separate artifact. Existing sufficient plans need no template rewrite.

# Strong preferences

Parallelize across modules, not inside the same hot files. Keep tests with the implementation owner unless shared test infrastructure is independently useful. Give branch reconciliation and final cleanup to one owner. If two tasks need the same core files, recommend serial execution instead.
