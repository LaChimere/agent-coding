# Goal State

objective: |
  finish API migration
status: active
slug: "goal-existing"
turns_used: 1
turn_budget: 5
budget_note: null
landing_mode: working_tree
docs_update_approved: false
created_at: "2026-06-01T09:00:00Z"
updated_at: "2026-06-01T10:00:00Z"

## Acceptance criteria

### User-visible behavior

- All API consumers use the migrated endpoints without a change in observable response shape.

### Implementation scope

- Legacy API handlers under `src/api/legacy/` are replaced by the migrated handlers.

### Validation

- Existing API integration tests pass against the migrated handlers.

### Docs/status

- API changelog entry describing the migration.

### Deferred/out of scope

- Client SDK regeneration is a follow-up goal.

## Progress log

- Turn 0: Goal registered.
- Turn 1: Migrated the first batch of read-only API handlers; targeted tests pass.

## Deferred items

- None. Use `reason=<out_of_scope|needs_user_decision|future_phase|blocked_by_dependency>` when adding deferred work.

## Blockers

- None.
