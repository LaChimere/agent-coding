# Goal State

objective: |
  implement the approved import retry plan
status: active
slug: "goal-import-retry"
turns_used: 0
turn_budget: null
budget_note: null
landing_mode: working_tree
docs_update_approved: false
created_at: "2026-06-22T09:00:00Z"
updated_at: "2026-06-22T09:00:00Z"

## Acceptance criteria

### User-visible behavior

- Failed data imports automatically retry with backoff instead of failing permanently on transient errors.

### Implementation scope

- Whatever the approved `plans/import-retry/plan.md` scope covers.

### Validation

- The approved plan's tests pass.

### Docs/status

- No user-facing docs change required.

### Deferred/out of scope

- Retrying non-transient (validation) failures is out of scope.

## Progress log

- Turn 0: Goal registered. Confirmed `plans/import-retry/plan.md` and `plans/import-retry/todo.md` are already approved.

## Deferred items

- None. Use `reason=<out_of_scope|needs_user_decision|future_phase|blocked_by_dependency>` when adding deferred work.

## Blockers

- None.
