# Goal State

objective: |
  cleanup API handlers
status: active
slug: "goal-cleanup-api"
turns_used: 2
turn_budget: 6
budget_note: null
landing_mode: working_tree
docs_update_approved: false
created_at: "2026-06-03T09:00:00Z"
updated_at: "2026-06-03T12:00:00Z"

## Acceptance criteria

### User-visible behavior

- API responses are unchanged; only internal handler code is simplified.

### Implementation scope

- Deduplicate repeated validation logic across the API handler modules.

### Validation

- Existing handler tests continue to pass after each simplification slice.

### Docs/status

- No user-facing docs change required.

### Deferred/out of scope

- Renaming public route paths is out of scope.

## Progress log

- Turn 0: Goal registered.
- Turn 1: Extracted shared request-validation helper for two handlers.
- Turn 2: Migrated a third handler onto the shared helper; tests pass.

## Deferred items

- None. Use `reason=<out_of_scope|needs_user_decision|future_phase|blocked_by_dependency>` when adding deferred work.

## Blockers

- None.
