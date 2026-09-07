# Approval, recovery and verification

## Conditional gates

Gate 1 approves design direction and permits planning, not implementation. Use design alignment for public interfaces, schemas, security, concurrency, data transformations or consequential alternatives. Component count and multiple checks alone do not demand a design exercise.

Gate 2 approves implementation scope and its constraints, including necessary execution order, ownership and recovery decisions. A clear implementation request or explicit approval of a native proposal can supply this authority directly; neither a particular file nor a formatted handoff is required. Low-risk small tasks can execute directly.

Gate 3 is post-execution review for high-impact work (security, persisted data, public contracts, infrastructure), material deviations or an explicit review requirement. Review depth follows affected risk rather than commit count.

## Native planning handoff

- Use native Plan Mode, when available, for exploration, discussion and the overall proposal. Without it, discuss the proposal without implementing it until authorized. Consume the proposal and explicit revisions rather than repeating the design process.
- Host write restrictions still apply. A template is not permission to write in Plan Mode.
- “Save the plan, do not implement” permits only document writes when the host allows them. “Implement the plan” authorizes that scope and necessary progress records; leaving Plan Mode alone does not.
- Record the user's actual approval source, not a fabricated approver or unchecked template field. A native plan already approved needs no new approval when saved.
- Incorporate parallel decisions in the overall proposal and the same living plan. Its approval covers that section; filling routine allocation details adds no gate.

## Two short paths

**Lightweight path:** clear, low-risk tasks are handled directly by the primary session with relevant checks; no mandatory files, orchestrator or formal gates.

**Urgent fast path:** for a genuinely urgent, authorized repair, state why discussion is shortened, perform the minimum relevant verification and record any earned lesson afterward. Urgency does not grant authority to implement, commit, deploy or take destructive actions, and cannot waive a host restriction or an explicit user approval requirement.

## Scope and landing

Default to `working_tree`. Only explicit commit authorization (including an approved plan's `commits` landing mode) permits atomic commits. Pushes, PR changes, pipeline triggers, deployments, destructive changes and other external mutations require their own authorization. A native goal never expands these permissions.

Routine internal choices, evidence updates, progress records and equivalent execution refinements preserve approval. Re-align before changing user-visible behavior, a public contract, important architecture, state/concurrency semantics, safety, cost or scope. Do not reset approval merely because a plan's progress or validation command was updated.

## Evidence scaled to risk

Verify the requested behavior and the existing behavior affected by the change. Choose the smallest decisive checks and required repository gates; a documentation-only change needs consistency review, not invented code tests.

| Evidence level | Meaning |
|---|---|
| L1 | Targeted local/static/unit checks appropriate to the change |
| L2 | Integration/contract test or reproducible before/after behavior proof |
| L3 | End-to-end or production-like validation where risk requires it and the environment permits it |

Behavioral changes generally need L2 evidence; high-impact changes need recovery reasoning and L3 where feasible. Performance claims require measurements and a method. Levels describe evidence, not a universal command checklist. Never substitute structural checks for behavioral or host validation.

## Recovery and stopping

1. Fix an implementation-caused, safely repairable validation failure and rerun affected checks under the existing approval.
2. Update progress/evidence and equivalent execution detail without reapproval. Broaden checks only for failures, changes or a concrete unresolved risk.
3. If the approved design or scope must materially change, explain the evidence and ask for the relevant design or implementation decision before proceeding across that boundary.
4. If a necessary capability is missing, the failure cannot be safely resolved, or new authority is needed, finish independent authorized work and report the exact blocker and missing evidence.

A slice is a checkpoint, not the end of a whole-plan request. Return at the user's requested whole-scope, phase or step boundary. Completion requires an audit against the original request: acceptance evidence, affected regression checks, required reviews, actual scope/deviations and no unresolved in-scope blocking issue. Label missing validation as incomplete, not passed.
