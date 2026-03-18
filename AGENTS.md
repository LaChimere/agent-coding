# AGENTS.md

## Purpose

This repository uses an agent-driven, small-PR, reviewable, incremental delivery model.

The default expectation is:
- prefer small, focused PRs
- prefer atomic commits inside each PR
- prefer mergeable intermediate states
- prefer staged delivery for large features
- prefer explicit planning before parallel execution

## Operating contract

- Prefer **evidence-driven** work: claims must be backed by repo artifacts (code references, logs, test output).
- Avoid speculative implementation. If key facts are missing, run the **Discovery Loop** first.
- Ask the user only the **minimal** blocking questions (expected vs actual, repro steps, env/version, log snippet).

## Mode switching

**Default**: If the task is trivial and low-risk (single-file, clearly specified, no public API/CI/data impact), proceed in execution mode.

**Enter plan mode** if ANY of these apply:

| Risk triggers | Design required? | Complexity triggers | Design required? |
|---|---|---|---|
| Public API/interface/schema changes | Yes | Spans multiple components/directories | No |
| Auth/security/concurrency/caching/correctness-critical logic | Yes | Needs comparing >1 design | Yes |
| Data migration/backfill/transformation | Yes | Unclear requirements or missing repro | No |
| CI/deploy/infra changes | No | Requires multiple verification steps beyond a single build | No |
| Dependency add/upgrade | No | | |
| Performance-sensitive change | No | | |

**Design required** means both Gate 1 and Gate 2 apply. When design is not required, only Gate 2 (Plan approval) applies. Gate 1 may still be added at the user's request.

## Discovery loop

When info is missing:

1. List unknowns.
2. Collect minimal evidence: read relevant code/docs, run existing tests, reproduce locally if possible, inspect logs/stack traces.
3. Stop once a justified plan can be written.

## Core delivery rules

- One PR should have one logical purpose.
- Do not mix behavioral changes, refactors, formatting-only edits, generated-file churn, and dependency upgrades in the same PR unless explicitly requested.
- If a task becomes too large to review comfortably, stop and split it.
- If a task can only be described with "A and B", it is probably not atomic enough for one PR.
- For large features, prefer this sequence:
  1. base / contract / flag / abstraction
  2. implementation
  3. integration
  4. cleanup

## Plan artifacts and approval gates

When plan mode is triggered, produce or update these artifacts **in the project repository**.

**Templates** are located in `templates/`. Use them when creating plan artifacts.

**Output location**: `plans/{slug}/`, where `{slug}` is a short kebab-case identifier (e.g., `add-auth-middleware`):

- `plans/{slug}/research.md` — facts + evidence (from `templates/RESEARCH.md`)
- `plans/{slug}/design.md` — solution design for review (from `templates/DESIGN.md`)
- `plans/{slug}/plan.md` — execution plan (from `templates/PLAN.md`)
- `plans/{slug}/todo.md` — checklist extracted from the plan (from `templates/TODO.md`)
- `plans/{slug}/lessons.md` — lessons learned, when applicable (from `templates/LESSONS.md`)

Create the directory if it does not exist.

**Workflow with approval gates**:

```
Research → Design → [Gate 1: Human Approve] → Plan + Todo → [Gate 2: Human Approve] → Execute → Verify → [Gate 3: Post-exec Review (high-risk only)] → Lessons
```

```
Fast path (urgent):  Execute → Verify → Lessons (backfill)
```

**Gate 1 — Design approval (human-in-the-loop)**:

1. After completing `research.md` and `design.md`, stop and present them for review.
2. The review surface is `design.md` (with `research.md` as supporting evidence).
3. If the reviewer annotates, edits, or requests changes, incorporate them and re-submit.
4. Do **not** proceed to Plan until design is explicitly approved.

**Gate 2 — Plan approval (human-in-the-loop)**:

1. After completing `plan.md`, extract `todo.md` from it, then stop and present both for review.
2. If the reviewer annotates or edits, incorporate changes.
3. Do **not** proceed to execution until the plan is explicitly approved.

**Skipping gates**: For trivial, low-risk tasks that do not trigger plan mode, both gates may be skipped. When plan mode is triggered but design is not required (see the trigger table above), Gate 1 may be skipped. The user may always request Gate 1 regardless of the trigger table.

**Fast path (urgent / emergency fixes)**: When production is down or an urgent hotfix is needed, gates may be bypassed entirely. Requirements:
- State explicitly that the fast path is being used and why.
- Still run the minimum applicable verification level before proposing completion.
- After the fix lands, backfill a brief `plans/{slug}/lessons.md` if the incident reveals a systemic gap.

**Gate 3 — Post-execution review (optional, high-risk only)**:

For changes marked as high-risk (auth/security, data migration, public API/schema, infra/deploy), the agent should present the actual diff for human review **after** execution and **before** proposing the final PR. This gate is optional and activated when:
- the change type requires L2+ verification
- the actual implementation deviated from the approved plan
- the reviewer requested it during Gate 1 or Gate 2

## Verification rules

Never mark done without evidence.

**Acceptance criteria**: Every plan must define concrete, verifiable acceptance criteria per step or per PR. Before proposing a PR, the agent must check:
1. All acceptance criteria defined in the plan for this PR are met, with evidence.
2. The diff is consistent with the approved plan — no scope creep, no missing pieces.
3. The applicable verification level has been executed.

If any acceptance criterion is not met, do not propose the PR. Follow this recovery flow:

1. **Can the agent fix it?** — If the gap is a straightforward implementation issue (missing edge case, failing test, incomplete logic), fix it directly and re-verify.
2. **Does the plan need to change?** — If the gap reveals that the approved plan is infeasible or incomplete (wrong assumption, unexpected constraint, missing dependency), update `plan.md` with the proposed change, explain what changed and why, and re-submit for Gate 2 approval before continuing.
3. **Does the design need to change?** — If the gap invalidates the approved design (wrong approach, broken contract, fundamental blocker), update `design.md`, explain the deviation, and re-submit for Gate 1 approval. Then update the plan accordingly through Gate 2.
4. **Is the agent stuck?** — If the agent cannot resolve the gap after a reasonable attempt, stop and report to the user: what was attempted, what failed, what evidence exists, and what options remain. Do not silently lower the acceptance bar.

| Verification level | Scope |
|---|---|
| **L1** | Lint/typecheck + unit tests or targeted test |
| **L2** | Integration/contract tests OR reproducible before/after behavior check |
| **L3** | E2e/staging/production-like validation when feasible |

| Change type | Minimum level |
|---|---|
| Refactor / no behavior change | L1 |
| Bug fix / behavior change | L2 (include before/after) |
| Infra / CI / deploy / security / data migration | L2 + rollback, L3 when feasible |
| Performance-related | Numbers + method (before/after) |

Before proposing completion, run the narrowest relevant validation first, then broader validation if needed.

Preferred commands:
- `make lint`
- `make test`
- `make typecheck`

If these do not exist:
- inspect the repository
- use the closest equivalent project commands
- report exactly what was run

Do not claim validation that was not actually executed.

Evidence artifacts: test outputs, logs, traces, before/after diffs, metrics.

## Parallel work rules

- Do not assume parallel work is safe by default.
- When parallelizing, use one branch per task and one worktree per branch.
- Shared contracts, schemas, and interfaces should be changed only in the base PR unless explicitly instructed otherwise.
- Parallel tasks must have explicit ownership boundaries:
  - owned directories
  - forbidden directories
  - dependency order
  - validation commands

## Subagent strategy

- Use subagents only when parallelism reduces uncertainty/time (e.g., root cause + design options + verification design).
- **Max 3 subagents**, one task each, no overlap.
- Each subagent output MUST include: Assumptions, Findings, Evidence, Recommendation, Open questions / Risks.

## Git discipline

- Do not commit directly to `main`.
- Prefer a branch name that reflects one task and one purpose.
- Prefer atomic commits with concise, descriptive commit messages.
- If the working tree contains multiple concerns, split them before proposing final commits or PRs.

## Elegance check and over-engineering guardrails

For non-trivial changes, briefly check whether complexity/coupling can be reduced. At the same time, guard against over-design and over-engineering.

**Simplicity first**:
- Solve the stated problem. Do not solve imagined future problems that have no current evidence of need.
- Prefer the simplest implementation that meets the acceptance criteria. Add abstraction only when justified by a concrete, present requirement — not by speculative future use.
- If a simpler approach is "good enough for now" and a more complex approach is "better for later," choose simple unless the cost of changing later is demonstrably high.

**When extensibility is justified**:
- There is an explicit, near-term requirement (not "we might need this someday").
- The cost of adding extensibility now is low relative to the cost of retrofitting later.
- The extension point is at a natural seam (interface boundary, configuration, plugin hook) — not a speculative abstraction layer.

**When extensibility is not justified**:
- The only argument is "what if we need to..."
- It adds indirection, generics, or abstraction that no current caller uses.
- It makes the code harder to understand without making it easier to change.

**Decision rule**: When in doubt, prefer concrete over abstract, direct over indirect, and "easy to change later" over "pre-built for every future." A well-structured simple solution is easier to extend than an over-abstracted complex one.

**Scope guardrails**:
- Do not expand scope to unrelated cleanup.
- Refactor only if it measurably reduces complexity and does not weaken verification.
- If extensibility work exceeds ~20% of the PR's core change, split it into a separate PR with its own justification.

## Lessons

After a material correction that caused wrong results/rework, update `plans/{slug}/lessons.md` using `templates/LESSONS.md`. Do not record purely stylistic feedback.

## Skill routing

Skills specialize the workflow in this file; they do **not** bypass the Discovery Loop, plan mode, or approval gates unless explicitly stated below.

Use the appropriate skill automatically when the request matches:

- `decompose-feature`
  - automatically enters plan mode
  - always requires `plans/{slug}/research.md` as the evidence base and `plans/{slug}/design.md` as the review surface
  - always uses Gate 1 before `plan.md` / `todo.md`, then Gate 2 before execution
  - when a feature is too large for one PR
  - when a user asks how to split a large feature
  - when a staged rollout or stacked PR plan is needed

- `plan-parallel-work`
  - automatically enters plan mode
  - always requires `plans/{slug}/research.md` as the evidence base and `plans/{slug}/design.md` as the review surface
  - always uses Gate 1 before `plan.md` / `todo.md`, then Gate 2 before execution
  - when multiple agents need to work in parallel
  - when branch/worktree ownership and merge order need to be defined
  - when a base PR must be established before fan-out work

- `ensure-atomic-pr`
  - may be used in any mode
  - quick assessment on an existing diff: no gate required
  - post-hoc recovery split on a completed change: no gate required
  - split that changes future execution strategy: enter plan mode, apply Gate 2 at minimum; if already in plan mode, follow existing gates
  - when a diff, commit, or PR is too large
  - when concerns are mixed
  - when recovery or splitting guidance is needed

## Output style

Prefer concrete plans over abstract advice.
Prefer explicit boundaries over vague recommendations.
Prefer mergeable increments over large end-to-end changes.
