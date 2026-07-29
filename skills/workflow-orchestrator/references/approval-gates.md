# Approval gates and verification

Read when a gate, approval, landing mode, fast path, or verification level is unclear. Not required for routine routing.

## Plan-mode triggers

| Trigger | Design gate required? |
|---|---|
| Public API / interface / schema change | Yes |
| Auth / security / concurrency / correctness-critical logic | Yes |
| Data migration / backfill / transformation | Yes |
| Needs comparing more than one design | Yes |
| Spans multiple components or directories | No |
| Needs multiple verification steps beyond one build/test pass | No |
| Dependency add/upgrade | No |
| Performance-sensitive change | No |

Trivial low-risk work can execute directly.

## Gate model

Conditional transitions, not mandatory ceremony:

`Discover if needed -> Design if needed -> Plan if needed -> Execute -> Verify -> Review if needed -> Record lessons if earned`

- **Gate 1 (design)** when the trigger table requires design or the user asks for a design review.
- **Gate 2 (plan)** when the work spans multiple slices or commits, when execution/migration order, ownership, or rollback needs review, or when the user or active design asks for plan approval. Low-risk work with clear scope may skip it.
- **Gate 3 (post-execution review)** for high-risk changes (auth, security, data migration, infra, public contracts), when implementation deviated from the approved plan, or when a reviewer asked for a diff review.

**Fast path** bypasses Gates 1-3 only for genuine urgency such as production down or a hotfix that cannot wait. Say fast path is being used and why, still run the minimum relevant verification, and backfill `plans/{slug}/lessons.md` when the incident reveals a reusable process gap.

## What counts as approval

Explicit affirmative language: `approved`, `proceed`, `LGTM`, `可以开始`. Silence, acknowledgement, or the mere existence of an artifact is not approval.

## Landing authorization

- Authorization to implement is not authorization to commit.
- Record the mode as `working_tree` or `commits`; absent a record, default to `working_tree`.
- Use `commits` only under explicit user or approved-workflow authorization. Words like "implement", "fix", or "continue" do not change the mode.
- Destructive or externally visible actions (history rewrites, force pushes, deletes, deploys, remote or third-party mutations) need their own explicit approval even when implementation is approved.

## Verification

Before proposing completion: acceptance criteria met with evidence, diff matches the approved scope, appropriate verification run, related docs not stale.

| Level | Scope |
|---|---|
| L1 | lint/typecheck + unit or targeted test |
| L2 | integration/contract test or reproducible before/after check |
| L3 | e2e/staging/production-like validation when feasible |

| Change type | Minimum |
|---|---|
| Refactor / no behavior change | L1 |
| Bug fix / behavior change | L2 |
| Infra / CI / deploy / security / data migration | L2 + rollback, L3 when feasible |
| Performance-related | numbers + method |

When no named command exists, use the closest existing evidence that verifies the changed behavior and record the limitation. Do not invent a command or treat missing tooling as a pass.

## Recovery when a criterion fails

1. **Fix directly** when the gap is a straightforward implementation issue, then re-verify.
2. **Update `plan.md`** and re-submit for Gate 2 when the approved path is incomplete or infeasible.
3. **Update `design.md`** and re-submit for Gate 1, then Gate 2, when the design is invalidated.
4. **Escalate** with what was attempted, what failed, and the remaining decision.

## Escalate immediately when

- the next action would cross a gate without approval
- the approved plan or design no longer matches reality
- a required verification step is missing or failing
- the orchestration contract and repo-local policy conflict materially
