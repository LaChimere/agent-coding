# Goal State

objective: |
  explain whether src/auth/session.ts refreshes expired sessions
status: active
slug: "goal-answer-auth"
turns_used: 0
turn_budget: null
budget_note: null
landing_mode: working_tree
docs_update_approved: false
created_at: "2026-06-18T09:00:00Z"
updated_at: "2026-06-18T09:00:00Z"

## Acceptance criteria

### User-visible behavior

- The answer states, with evidence from `src/auth/session.ts`, whether expired sessions are refreshed.

### Implementation scope

- Read-only investigation of `src/auth/session.ts`; no code changes required to answer the question.

### Validation

- The cited behavior in the answer matches what `src/auth/session.ts` actually does.

### Docs/status

- No user-facing docs change required.

### Deferred/out of scope

- Fixing any bug found while answering is out of scope unless the user asks for it.

## Progress log

- Turn 0: Goal registered.

## Deferred items

- None. Use `reason=<out_of_scope|needs_user_decision|future_phase|blocked_by_dependency>` when adding deferred work.

## Blockers

- None.
