# Goal State

objective: |
  fix search ranking tests
status: active
slug: "goal-fix-search"
turns_used: 3
turn_budget: 8
budget_note: null
landing_mode: working_tree
docs_update_approved: false
created_at: "2026-06-05T09:00:00Z"
updated_at: "2026-06-05T14:00:00Z"

## Acceptance criteria

### User-visible behavior

- Search results rank previously-misordered documents correctly.

### Implementation scope

- `src/search/ranking.ts` and its test suite.

### Validation

- `src/search/ranking.test.ts` passes.

### Docs/status

- No user-facing docs change required.

### Deferred/out of scope

- Broader relevance-model changes are out of scope.

## Progress log

- Turn 0: Goal registered.
- Turn 1: Reproduced the ranking regression with a failing test.
- Turn 2: Adjusted the tie-break comparator.
- Turn 3: Two of three failing cases now pass; one edge case remains.

## Deferred items

- None. Use `reason=<out_of_scope|needs_user_decision|future_phase|blocked_by_dependency>` when adding deferred work.

## Blockers

- None.
