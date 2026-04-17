# Workflow Contract Reference

This file is the orchestration-focused summary of the workflow rules that matter for `workflow-orchestrator`.

Use it to decide:
- whether discovery is still needed
- whether plan mode applies
- which `plans/{slug}` artifacts must exist
- whether a human approval gate blocks the next step
- which worker skill should act next

Repo-local `AGENTS.md` files may add project-specific contributor rules, but they are not the shared orchestration contract for this skill system.

## Default posture

- Prefer evidence over speculation.
- Ask only the minimal blocking questions.
- Prefer small, focused, reviewable changes.
- Do not mix unrelated concerns in one PR or one commit.

## Discovery loop

When key facts are missing:

1. List the unknowns.
2. Collect minimal evidence from code, docs, tests, repro steps, or logs.
3. Stop once the next plan or design decision is justified.

## Plan-mode triggers

Enter plan mode when any of these apply:

| Trigger | Design required? |
|---|---|
| Public API / interface / schema change | Yes |
| Auth / security / concurrency / correctness-critical logic | Yes |
| Data migration / backfill / transformation | Yes |
| Spans multiple components or directories | No |
| Needs comparing more than one design | Yes |
| Requires multiple verification steps beyond one build/test pass | No |
| Dependency add/upgrade | No |
| Performance-sensitive change | No |

If the task is trivial and low-risk, execution can proceed directly.

## Runtime artifact layout

When plan mode applies, the runtime artifacts live under `plans/{slug}/`:

- `research.md`
- `design.md`
- `plan.md`
- `todo.md`
- `lessons.md`

Use the skill-local templates to create missing artifacts. Treat the repo-local files as the runtime source of truth after creation.

## Gate model

Default sequence:

`Research -> Design -> Gate 1 -> Plan + Todo -> Gate 2 -> Execute -> Verify -> Gate 3 -> Lessons`

Use Gate 1 for design approval when:
- design is required by the trigger table
- the user explicitly wants a design review

Use Gate 2 before execution when:
- a reviewable execution plan is required

Use Gate 3 after execution when:
- the change is high-risk (for example auth, security, data migration, infra, or public contract changes)
- the implementation deviated from the approved plan
- the reviewer explicitly requested a post-execution diff review

Fast path may bypass Gates 1-3 only when the task is genuinely urgent, such as:
- production is down
- a hotfix cannot wait for the normal approval flow

When using fast path:
- say explicitly that fast path is being used and why
- still run the minimum relevant verification
- backfill `plans/{slug}/lessons.md` when the incident reveals a reusable process gap

Explicit approval means clear affirmative language such as:
- `approved`
- `proceed`
- `LGTM`
- `可以开始`

Silence or acknowledgement without approval is not approval.

## Verification rules

Before proposing completion:

1. Check that the relevant acceptance criteria are met with evidence.
2. Check that the diff matches the approved scope.
3. Run the appropriate verification level.
4. Confirm related docs are not stale.

If any acceptance criterion is not met, follow this recovery flow:

1. **Fix directly** — if the gap is a straightforward implementation issue, fix it and re-verify.
2. **Update the plan** — if the approved execution path is incomplete or infeasible, update `plan.md` and re-submit for Gate 2 before continuing.
3. **Update the design** — if the problem invalidates the approved design, update `design.md` and re-submit for Gate 1, then Gate 2.
4. **Escalate** — if the agent cannot resolve the gap safely, stop and report what was attempted, what failed, and what decision remains.

Verification levels:

| Level | Scope |
|---|---|
| L1 | lint/typecheck + unit tests or targeted test |
| L2 | integration/contract test or reproducible before/after behavior check |
| L3 | e2e/staging/production-like validation when feasible |

Minimum expectations:

| Change type | Minimum |
|---|---|
| Refactor / no behavior change | L1 |
| Bug fix / behavior change | L2 |
| Infra / CI / deploy / security / data migration | L2 + rollback, L3 when feasible |
| Performance-related | numbers + method |

## Parallel work rules

- Do not assume parallel work is safe by default.
- Shared contracts should stabilize in a base PR first.
- One agent should own one branch/worktree.
- Ownership boundaries should be explicit.

## Simplicity rules

- Solve the stated problem, not hypothetical future ones.
- Prefer concrete over abstract when both satisfy the requirement.
- If extensibility adds noticeable complexity without a present need, leave it for a later PR.

## Worker-skill map

- `decompose-feature` -> decide what PRs should exist
- `plan-parallel-work` -> decide who works where and in what order
- `execute-plan-loop` -> carry approved work forward in atomic verified increments
- `ensure-atomic-pr` -> recover or assess atomic boundaries
- `refresh-related-docs` -> update broader stale Markdown docs

## Escalation conditions

Stop and surface the issue when:
- the next action would cross a gate without approval
- the approved plan or design no longer matches reality
- the diff is no longer atomic
- a required verification step is missing or failing
- the orchestration bundle and repo-local policy conflict materially
