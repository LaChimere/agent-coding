# Goal State

objective: |
  ship account deletion safely
status: active
slug: "goal-ship-account-deletion"
turns_used: 1
turn_budget: null
budget_note: null
landing_mode: working_tree
docs_update_approved: false
created_at: "2026-06-21T09:00:00Z"
updated_at: "2026-06-21T10:00:00Z"

## Acceptance criteria

### User-visible behavior

- A user can permanently delete their account and all associated personal data through a supported flow.

### Implementation scope

- Account deletion API endpoint and the data-purge worker it triggers.

### Validation

- Deletion removes personal data across all stores covered by the design; verified by an integration test.

### Docs/status

- Support docs updated once the design is approved and implemented.

### Deferred/out of scope

- Bulk/administrative deletion tooling is a follow-up goal.

## Progress log

- Turn 0: Goal registered.
- Turn 1: Asked `workflow-orchestrator` to classify the gate for this objective. It returned: Gate 1 design approval is required before implementation because the change touches account deletion and personal data. Recorded here; implementation is blocked on that approval and this decision should not be re-requested unless the objective changes.

## Deferred items

- None. Use `reason=<out_of_scope|needs_user_decision|future_phase|blocked_by_dependency>` when adding deferred work.

## Blockers

- Gate 1 design approval from workflow-orchestrator is still required before implementation can start.
