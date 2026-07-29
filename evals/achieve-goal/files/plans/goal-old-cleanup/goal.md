# Goal State

objective: |
  old cleanup
status: cleared
slug: "goal-old-cleanup"
turns_used: 2
turn_budget: 5
budget_note: null
landing_mode: working_tree
docs_update_approved: false
created_at: "2026-05-20T09:00:00Z"
updated_at: "2026-05-21T09:00:00Z"

## Acceptance criteria

### User-visible behavior

- Deprecated cleanup scripts no longer run in CI.

### Implementation scope

- `scripts/legacy-cleanup/` directory.

### Validation

- CI no longer invokes the removed scripts.

### Docs/status

- No user-facing docs change required.

### Deferred/out of scope

- Removing the underlying data this cleanup targeted is out of scope.

## Progress log

- Turn 0: Goal registered.
- Turn 1: Removed one deprecated cleanup script.
- Turn 2: User cleared the goal before the remaining scripts were removed.

## Deferred items

- Remaining legacy cleanup scripts; reason=needs_user_decision.

## Blockers

- None.
