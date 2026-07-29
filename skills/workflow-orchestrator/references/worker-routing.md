# Worker routing and handoff detail

Read when the primary/companion split is contested, when two workers look equally plausible, or when a worker is unavailable. Routine routing needs only the table in `SKILL.md`.

## What each worker owns and returns

| Worker | Owns | Returns |
|---|---|---|
| `decompose-feature` | Deciding what PRs should exist | A PR sequence with acceptance criteria and validation per PR |
| `plan-parallel-work` | Who works where, in what order | Base prerequisite, parallel task table, merge strategy |
| `execute-plan-loop` | Approved implementation in atomic verified slices | Slice-by-slice verified progress, milestone review, commits only in `commits` landing mode |
| `achieve-goal` | Durable objective lifecycle | `plans/{slug}/goal.md` state, progress updates, and a complete / paused / blocked / budget-limited stop report |
| `ensure-atomic-pr` | Atomic boundary assessment and recovery | A cleaner split or an explicit recovery path |
| `refresh-related-docs` | Broader stale Markdown surfaces | An approved doc refresh across affected files |
| `anti-slop` | Signal-driven companion for explicit quality checks, pre-commit readiness, scope/add-only/fix-on-fix signals, or meaningful/high-risk milestones | Slop/complexity findings folded into the executor's existing review checkpoint |
| `scan-image-vulnerabilities` | Read-only image inspection outside plan mode | Findings for an exact image reference against a freshly refreshed database |

## Contested pairs

- **`achieve-goal` vs `execute-plan-loop`** — lifecycle versus implementation. If an approved plan exists and the user also wants goal status, both apply: `achieve-goal` is the outer layer on the *same* slug, `execute-plan-loop` executes the approved scope and returns evidence, then `achieve-goal` records it. Never create a second goal or slug for scope the approved plan already covers, and never let the lifecycle layer dictate the executor's slice or commit cadence.
- **`decompose-feature` vs `plan-parallel-work`** — what PRs exist versus who owns which branch. Decompose first; parallelize only after shared contracts stabilize in a base PR.
- **`ensure-atomic-pr` vs continuing execution** — when a diff stops being atomic, pause the implementation route, assess or recover boundaries, and resume only if the split preserves valid intermediate states and the recorded approval still applies.
- **`refresh-related-docs` vs slice-local doc edits** — the executor updates tightly coupled docs inside its slice; route to `refresh-related-docs` only for broader surfaces.
- **Direct inspection vs orchestration** — read-only scans and answers do not need slug artifacts or gates unless the user asks for remediation work.

## Companion rules

A companion adds a distinct supporting role and never takes over planning, cadence, or commits. State the return boundary in the handoff: the companion stops when the primary worker returns the requested verified slice or milestone evidence.

## Unavailable worker

Installed workers may be absent. When the selected worker is missing:

1. Do not claim a handoff or invocation happened.
2. Name the missing capability and the intended worker.
3. Give the required action: install the skill, authorize a bounded contract-equivalent fallback the current environment can safely perform, or supply the missing decision/approval.
4. Stop if none of those is available. Route by skill name and current availability, never by repository-source paths.

## Parallel-work safety

Parallel work is not safe by default. Shared contracts stabilize in a base PR first, one task owner owns one branch and one isolated working copy (worktree, clone, or sandbox), and ownership boundaries are explicit.
