# Goal lifecycle state and script contract

Read this when you need the exact state fields, transition rules, JSON request shapes, or error codes of `scripts/goal_lifecycle.py`. The script does structural mechanics only; every judgment (objective wording, criteria content, whether evidence is real, whether a gate is crossed) stays with the agent.

## State file

One goal per file at `plans/{slug}/goal.md`, slug matching `^goal-[a-z0-9]+(-[a-z0-9]+)*$`.

| Field | Meaning |
|---|---|
| `objective: \|` | Literal block, stored verbatim, never re-parsed as state |
| `status` | `active`, `paused`, `budget_limited`, `complete`, `cleared`, `blocked` |
| `slug` | Directory slug |
| `turns_used` | Completed evidence-backed loop iterations |
| `turn_budget` | Positive integer or `null` |
| `budget_note` | Advisory/token budget text or re-authorization quote |
| `landing_mode` | `working_tree` (default) or `commits` |
| `docs_update_approved` | Approval for the doc targets the objective named |
| `created_at` / `updated_at` | ISO-8601 strings or `null` |
| `format_version` | Optional; preserved when present, never added |

Sections: `## Acceptance criteria` (five `###` headings: User-visible behavior, Implementation scope, Validation, Docs/status, Deferred/out of scope), `## Progress log`, `## Deferred items`, `## Blockers`, and `## Completion audit` after a passing audit. Unknown metadata keys and unknown `##` sections are preserved verbatim. Legacy repair may add `### Unclassified legacy criteria` for bullets you have not classified yet.

## Statuses and legal transitions

| Operation | Legal from | Result |
|---|---|---|
| `create` | no goal at slug, no other live goal unless `allow_parallel_scope` | `active`, `turns_used: 0` |
| `repair_legacy` | any status | structure repaired, status unchanged |
| `pause` | `active`, `budget_limited`, `blocked` | `paused` |
| `resume` | `paused`, `budget_limited`, `blocked` | `active` only with `explicit_resume_instruction`; budget-limited goals also need `reauthorization`, and blocked goals need evidence for every blocker |
| `clear` | any except `cleared` | `cleared` |
| `replace` | any except `cleared` | old goal `cleared`, new goal `active` |
| `record_progress` | `active` | stays `active`, or `budget_limited` when the budget is hit |
| `block` | `active` | `blocked` |
| `audit_complete` | `active` | `complete` |

Anything else returns `illegal_transition`. Only `record_progress` changes `turns_used`, and only with `verified_evidence: true`. `read` and `discover` never write.

## JSON request

`apply --repo REPO --request -` reads one object from stdin:

```json
{
  "op": "record_progress",
  "slug": "goal-fix-search",
  "entry": "fixed ranking tie-break",
  "evidence": "pytest tests/test_rank.py -> 12 passed",
  "verified_evidence": true,
  "expected_revision": "9f2c...",
  "now": "2026-03-01T00:00:00Z"
}
```

Common fields: `slug` or `path` (omit both to use the single live goal), `expected_revision`, `now`, `note`.

Operation fields:

- `create` / `replace.replacement`: `objective` (required), `slug`, `turn_budget`, `budget_note`, `landing_mode`, `docs_update_approved`, `acceptance_criteria` (canonical section -> bullets), `allow_parallel_scope`.
- `repair_legacy`: optional `classification` mapping canonical sections to the exact unclassified bullets.
- `resume`: required `explicit_resume_instruction` copied from the current user message; it must explicitly contain `/goal resume`, `resume ... goal`, or `unpause ... goal` (generic `continue` does not qualify). Use `reauthorization` `{kind: new_budget|narrowed_objective|explicit_acknowledgement, turn_budget, note}` when the budget is exhausted and `blocker_resolutions` mapping every open blocker to non-empty evidence before a blocked goal can resume.
  - If a valid budget reauthorization is supplied but blockers remain, the script persists the new budget and reauthorization note, keeps the goal `blocked`, and returns `resume_deferred` plus the unresolved blockers.
- `block`: `blocker`.
- `record_progress`: `entry`, `verified_evidence`, `evidence`, `blockers_add`, `deferred_add`.
- `replace`: `explicit_replacement: true` plus `replacement`.
- `audit_complete`: `audit` rows `{criterion, evidence, status: met|deferred-out-of-scope}` and optional `blocker_resolutions` mapping blocker text to resolution evidence.

## Responses and errors

Success: `{"schema": "achieve-goal/goal-lifecycle-v1", "ok": true, "command": ..., "op": ..., "goal": {...}, "turn_increment": 0|1, ...}`, exit 0. `goal` carries the parsed state plus `objective_escaped`, `objective_prompt_block`, `criteria_ids`, `unclassified_criteria`, `unresolved_blockers`, `legacy_structure`, `missing_metadata`, `needs_repair`, `budget_exhausted`, and `revision`.

Failure: `{"ok": false, "error": {"code", "message", "details"}}`, exit 1, file unchanged.

| Code | Meaning |
|---|---|
| `bad_request` | Malformed JSON, unknown op, missing or invalid field |
| `invalid_slug` / `path_escape` | Slug rejected, or path outside the repository |
| `not_found` / `already_exists` | Missing goal file, or slug already used |
| `no_active_goal` / `ambiguous_active_goal` | Zero or several live goals; disambiguate with the user |
| `active_goal_exists` | `create` while another goal is live (active, paused, budget_limited, or blocked) |
| `replacement_not_authorized` | `replace` without `explicit_replacement: true` |
| `illegal_transition` | Operation not legal from the current status |
| `evidence_required` | `record_progress` without `verified_evidence: true` |
| `budget_exhausted` / `budget_reauthorization_required` / `invalid_budget` | Turn budget rules |
| `legacy_structure` / `no_acceptance_criteria` | Audit attempted before repair, or with no criteria |
| `audit_incomplete` | `missing`, `unexpected`, or `duplicates` audit rows |
| `blockers_unresolved` | Open blockers at audit time |
| `revision_conflict` | `expected_revision` no longer matches |
| `read_failed` / `write_failed` | I/O failure; the atomic write left the original intact |

## Legacy behavior

`needs_repair` is true whenever metadata keys are missing or the criteria sections are not canonical. `repair_legacy` adds missing metadata with defaults (`status: active`, `turns_used: 0`, `landing_mode: working_tree`), adds missing sections, and rebuilds the five criteria headings while keeping existing bullets. Flat bullets stay verbatim under `### Unclassified legacy criteria` and are returned in `needs_classification` until you supply `classification`. Progress log, deferred items, blockers, unknown metadata, and unknown sections are preserved. Repair never increments `turns_used` and never changes status. `audit_complete` refuses while `legacy_structure` is true.
