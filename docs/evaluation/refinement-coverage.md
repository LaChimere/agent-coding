# Codex Evaluation Refinement Coverage

This table connects the agreed capability scope to concrete development cases,
requirements and checks. It is a coverage map, not a performance baseline.
An outcome case assesses ordinary work; a mechanism case assesses an explicitly
required skill or native collaboration behavior. A check can establish a failure
and still provide usable assessment evidence.

The current development collection contains 338 cases and 1,270 checks:
122 outcome cases and 216 mechanism cases. Outcome cases comprise 45 planning,
27 implementation, 41 review and 9 documentation cases. The complete machine
inventory is generated at `evals/out/refinement-coverage-inventory.json`; reports
produce their own frozen case/requirement/check/evidence mapping.

## Required scope

Requirement and check IDs below are scoped to their case. Rows name representative
checks rather than every check in the corpus. “Pending baseline” means there is
no qualified observation of the final corpus yet; it does not mean the candidate
failed that capability.

| Capability | Cases and assessment | Requirement → check IDs | Evidence needed | Current observation |
| --- | --- | --- | --- | --- |
| Planning | `decompose-feature/0`, outcome | `expectation-000`–`expectation-004` → matching `criterion-000`–`criterion-004` | A usable, scoped plan grounded in the supplied work and authority | Pending baseline |
| Implementation | `native/verified-fix`, outcome | `general-correctness` → `general-correctness`; `execution-and-scope` → `execution-and-scope` | Frozen source, independently run behavioral checks, candidate command completion and scope evidence | Pending baseline |
| Review | `native/implicit-review`, outcome; `pr-review/0`, outcome | `concrete-finding` → `concrete-finding`; `read-only` → `read-only`; `expectation-000` → `criterion-000` | Source-backed findings, uncertainty and unchanged reviewed artifacts | Pending baseline |
| Documentation | `refresh-related-docs/0`, outcome | `expectation-000`–`expectation-004` → matching `criterion-000`–`criterion-004` | Actual changed documents, source consistency and preserved scope | Pending baseline |
| Authorization | `refinement-probes/clarified-import`, outcome; `refinement-probes/role-repair`, outcome | `implementation-scope` → `implementation-scope`; `repair-scope` → `repair-scope` | Candidate-visible authority, ordered native actions, original/final artifacts and commit state | Fresh clarification probe observed visible authority and changes within scope; original hidden-authority judgment remains invalid. Full baseline pending. |
| Clarification | `native/scripted-context`, mechanism; `refinement-probes/clarified-import`, outcome | `clarification-order` → `clarification-order`; `clarification-before-edit` → `clarification-before-edit` | An actual question, the matching user answer, and ordering before the dependent action | Diagnostic native conversation observed; final baseline pending |
| Continuation | `native/scripted-context`, mechanism; `refinement-probes/clarified-import`, outcome | `same-thread-continuation` → `same-thread`; `continued-selected-behavior` → `continued-selected-behavior`, `same-thread-continuation` | Same-thread continuation that consumes the answer and produces the selected behavior | Diagnostic native conversation observed; final baseline pending |
| Recovery and blockers | `refinement-probes/unreadable-source`, `refinement-probes/infeasible-test`, `refinement-probes/role-repair`, outcomes | `source-blocker` → `source-blocker`; `test-blocker` → `test-blocker`; `repair-history` → `repair-history` | Real missing input or conflicting test, honest limitation, retained attempt history and authorized repair | Pending baseline |
| Delegation | `native/subagent-evidence`, mechanism; `refinement-probes/role-repair`, outcome | `native-worker` → `native-worker`; `initial-worker-inspection` → `initial-worker-inspection`; `same-worker-continuation` → `same-worker-continuation`, `same-native-thread` | Native role/assignment, actual child work, completion, parent consumption and context reuse | An `ordinary_worker` result was observed in a diagnostic probe; same-worker repair pending |
| Required reviewer unavailable | `refinement-probes/reviewer-unavailable`, outcome | `review-result` → `review-result`; `independence-gap` → `independence-gap`; `review-read-only` → `review-read-only` | Useful primary analysis, explicit unmet independent review and preserved read-only authority | Pending baseline |
| Configured roles | `role-probes/complex-worker`, `role-probes/critical-reviewer`, `role-probes/deep-critical-reviewer`, mechanisms | `complex-role-invocation`, `critical-role-invocation`, `deep-role-invocation` → same-named checks; accompanying boundary checks | Own-session native assignment and effective context, worker output, completion and role boundary | `critical_reviewer` observed in a diagnostic probe; the other two roles pending |
| Skill mechanisms and routing | Development routing cases; `scan-image-vulnerabilities/1`, outcome with an explicit scanner requirement | `route-answer` where declared; scanner `observed-scanner` → `observed-scanner`, `recorded-targets` → `recorded-targets` | Accepted route alternatives; actual installed bundled-script invocation and fixture target records when requested | Assessment sensitivity tests pass; full native baseline pending |

## How to interpret observed coverage

Each report separates planned, recorded, unknown and decidable requirement
observations. Diagnostic-only requirements do not qualify a required capability.
Having an execution record, a requested role or a named skill is not sufficient:
the relevant check must be grounded in retained evidence. Native roles and their
effective model/effort are collected from observed records, never inferred from
a model name or the parent's description.

The first diagnostic reports are retained at:

- Conversation ordering: run `62c15d0c-f9a3-48fa-89bf-1a678db7f646`, report
  `1cad166e-9c1d-42df-90b2-9edd98d94421`.
- Worker and reviewer evidence: run `30978033-b060-490e-9e5c-12fddde9b322`, report
  `5f71c732-4686-4d21-b540-ad7f86459df3`.

These probes precede the final candidate prompt delivery contract and expanded
human calibration. They validate particular execution/evidence paths; they are
not pooled into a baseline or used to claim an instruction improvement.
The [acceptance report](refinement-acceptance.md) records the subsequent prompt
delivery probe and the disposition of the invalid authorization judgment.

## Holdout coverage

An independent author and validator prepared 6 holdout cases with 10 assertions
and 8 fixtures: one outcome case for each ordinary work family and two mechanism
cases. Static validation, fixture bindings, route sensitivity and candidate-visible
authorization checks passed in the independent context. No holdout model execution
has occurred, and no task contents or diagnostic feedback entered the primary
tuning context.

This establishes preparation and assessment readiness for that small collection,
not generalization or runtime preservation. Holdout task details intentionally
remain outside this document. A later frozen candidate comparison requires an
explicit holdout selection and its own observed evidence.
