# Goal State

objective: |
  beta cleanup
status: active
slug: "goal-beta"
turns_used: 2
turn_budget: 5
budget_note: null
landing_mode: working_tree
docs_update_approved: false
created_at: "2026-06-09T09:15:00Z"
updated_at: "2026-06-09T11:00:00Z"

## Acceptance criteria

### User-visible behavior

- The beta module's deprecated helpers are removed without changing its public behavior.

### Implementation scope

- `src/beta/` directory.

### Validation

- Existing beta module tests pass.

### Docs/status

- No user-facing docs change required.

### Deferred/out of scope

- Renaming the beta module's public exports is out of scope.

## Progress log

- Turn 0: Goal registered.
- Turn 1: Removed one unused helper function.
- Turn 2: Simplified a redundant conditional branch.

## Deferred items

- None. Use `reason=<out_of_scope|needs_user_decision|future_phase|blocked_by_dependency>` when adding deferred work.

## Blockers

- None.
