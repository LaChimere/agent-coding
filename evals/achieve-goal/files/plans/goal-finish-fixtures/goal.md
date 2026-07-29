# Goal State

objective: |
  finish fixtures cleanup
status: budget_limited
slug: "goal-finish-fixtures"
turns_used: 3
turn_budget: 3
budget_note: null
landing_mode: working_tree
docs_update_approved: false
created_at: "2026-06-06T09:00:00Z"
updated_at: "2026-06-06T15:00:00Z"

## Acceptance criteria

### User-visible behavior

- Stale test fixtures no longer cause flaky test runs.

### Implementation scope

- `tests/fixtures/` directory.

### Validation

- Full fixture-dependent test suite passes twice in a row.

### Docs/status

- No user-facing docs change required.

### Deferred/out of scope

- Rewriting the fixture-generation tooling itself is out of scope.

## Progress log

- Turn 0: Goal registered.
- Turn 1: Removed two stale fixture files that no longer match current schemas.
- Turn 2: Regenerated fixtures for the billing module.
- Turn 3: Budget exhausted with the search module fixtures still stale; stopped as budget_limited.

## Deferred items

- Search module fixture regeneration deferred; reason=future_phase.

## Blockers

- None.
