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
- Do not let any workflow step make codebase claims without evidence. If the user references a specific file or symbol, route to a step that inspects it before answering or implementing.
- Ask only the minimal blocking questions.
- Prefer small, focused, reviewable changes.
- Do not mix unrelated concerns in one PR or one commit.
- Route implementation work toward principled, general solutions rather than test-fitting or workaround-driven slices.
- When safety, validation, or error handling is part of the request, route toward boundary-focused analysis instead of blanket defensive coding. Boundary-focused means validating data where untrusted input enters while still surfacing operational failures such as I/O, network, permission, timeout, or resource errors where they can occur.

## Discovery loop

When key facts are missing:

1. List the unknowns.
2. Collect minimal evidence from code, docs, tests, repro steps, or logs.
3. Stop once the next plan or design decision is justified.

If the user asks a question about a specific file or symbol, ensure discovery includes inspecting the referenced file or defining implementation before the workflow answers or proceeds to execution.

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

When plan mode applies, create only the runtime artifacts needed for the active phase under `plans/{slug}/`:

- `research.md` when evidence or unknowns need durable capture
- `design.md` when a design decision requires review
- `plan.md` and `todo.md` when execution needs an approved, reviewable sequence
- `lessons.md` after a material correction reveals reusable learning

Use the skill-local templates to create missing artifacts. Treat the repo-local files as the runtime source of truth after creation.

## Gate model

Treat the workflow as conditional transitions, not a mandatory ceremony:

`Discover if needed -> Design if needed -> Plan if needed -> Execute -> Verify -> Review if needed -> Record lessons if earned`

Use Gate 1 for design approval when:
- design is required by the trigger table
- the user explicitly wants a design review

Use Gate 2 before execution when:
- the work spans multiple implementation slices or commits
- execution order, migration order, ownership, or rollback needs review
- the user explicitly asks to approve the plan before implementation
- the active design or policy requires a plan gate

Low-risk work that does not need a reviewable sequence can proceed without Gate 2 once its scope is clear.

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

When a repository does not provide a named lint, typecheck, test, integration, or staging command, use the closest existing evidence that verifies the changed behavior. Record what was run and the limitation; do not invent a command or treat missing tooling as a pass.

## Landing authorization

Authorization to implement does not automatically authorize commits.

- Record the active landing mode as `working_tree` or `commits`.
- Use `commits` only when the user or approved workflow explicitly authorizes creating commits.
- When landing mode is absent, default to `working_tree`.
- A worker may produce verified logical slices in either mode; it creates commits only in `commits` mode.
- Changing landing mode requires explicit user or workflow authorization, not inference from words such as "implement", "fix", or "continue".

## Parallel work rules

- Do not assume parallel work is safe by default.
- Shared contracts should stabilize in a base PR first.
- One agent should own one branch/worktree.
- Ownership boundaries should be explicit.

## Simplicity rules

- Solve the stated problem, not hypothetical future ones.
- Prefer concrete over abstract when both satisfy the requirement.
- If extensibility adds noticeable complexity without a present need, leave it for a later PR.
- If a requirement appears infeasible, unsafe, or contradicted by evidence, surface that conflict instead of routing toward a workaround.
- Do not route toward throwaway scripts or fixture rewrites that only make visible tests pass. Do allow normal repository tooling such as build scripts, migrations, fixture generators, eval scripts, and CI utilities when they are part of the real solution or verification path.

## Worker-skill map

- `decompose-feature` -> decide what PRs should exist
- `plan-parallel-work` -> decide who works where and in what order
- `execute-plan-loop` -> carry approved work forward in atomic verified increments
- `achieve-goal` -> persist and pursue a long-running objective until complete, paused, blocked, or budget-limited
- `ensure-atomic-pr` -> recover or assess atomic boundaries
- `refresh-related-docs` -> update broader stale Markdown docs
- `anti-slop` -> accompany implementation as a quality guard; it is not the primary workflow owner
- `scan-image-vulnerabilities` -> direct read-only image inspection outside plan mode

Workers are separate installed skills. Route by skill name and current capability availability; do not rely on repository-source paths. If a required worker is unavailable, report the capability gap. Use a bounded contract-equivalent fallback only when the active environment can perform it safely without pretending the missing skill was invoked.

## Escalation conditions

Stop and surface the issue when:
- the next action would cross a gate without approval
- the approved plan or design no longer matches reality
- a required verification step is missing or failing
- the orchestration bundle and repo-local policy conflict materially

When a diff is no longer atomic, pause the current implementation route and use `ensure-atomic-pr` to assess or recover the boundaries. Resume only after the split preserves valid intermediate states and the active approval state still applies.
