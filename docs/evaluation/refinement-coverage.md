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
checks rather than every check in the corpus. Current observations refer to full
run `40418426-0012-4dfb-b4cc-4d5c4a70f1fb`; assessment corrections and the selected
report are tracked in the [acceptance report](refinement-acceptance.md). Observing
a failure does not establish successful preservation of that capability.

| Capability | Cases and assessment | Requirement → check IDs | Evidence needed | Current observation |
| --- | --- | --- | --- | --- |
| Planning | `decompose-feature/0`, outcome | `expectation-000`–`expectation-004` → matching `criterion-000`–`criterion-004` | A usable, scoped plan grounded in the supplied work and authority | Full run: representative plan checks passed. |
| Implementation | `native/verified-fix`, outcome | `general-correctness` → `general-correctness`; `execution-and-scope` → `execution-and-scope` | Frozen source, independently run behavioral checks, candidate command completion and scope evidence | Full run: source repair, verification and scope checks passed. |
| Review | `native/implicit-review`, outcome; `pr-review/0`, outcome | `concrete-finding` → `concrete-finding`; `read-only` → `read-only`; `expectation-000` → `criterion-000` | Source-backed findings, uncertainty and unchanged reviewed artifacts | Full run: concrete finding and read-only checks passed. |
| Documentation | `refresh-related-docs/0`, outcome | `expectation-000`–`expectation-004` → matching `criterion-000`–`criterion-004` | Actual changed documents, source consistency and preserved scope | Full run: all nine documentation outcomes passed. |
| Authorization | `refinement-probes/clarified-import`, outcome; `refinement-probes/role-repair`, outcome | `implementation-scope` → `implementation-scope`; `repair-scope` → `repair-scope` | Candidate-visible authority, ordered native actions, original/final artifacts and commit state | Full run: clarification and same-worker repair scope checks passed; the earlier hidden-authority probe remains separately invalid. |
| Clarification | `native/scripted-context`, mechanism; `refinement-probes/clarified-import`, outcome | `clarification-order` → `clarification-order`; `clarification-before-edit` → `clarification-before-edit` | An actual question, the matching user answer, and ordering before the dependent action | Full run: ordered question, answer and dependent-action checks passed. |
| Continuation | `native/scripted-context`, mechanism; `refinement-probes/clarified-import`, outcome | `same-thread-continuation` → `same-thread`; `continued-selected-behavior` → `continued-selected-behavior`, `same-thread-continuation` | Same-thread continuation that consumes the answer and produces the selected behavior | Full run: same-thread continuation and consumption of the answer passed. |
| Recovery and blockers | `refinement-probes/unreadable-source`, `refinement-probes/infeasible-test`, `refinement-probes/role-repair`, outcomes | `source-blocker` → `source-blocker`; `test-blocker` → `test-blocker`; `repair-history` → `repair-history` | Real missing input or conflicting test, honest limitation, retained attempt history and authorized repair | Full run: missing-input, conflicting-test and authorized same-worker repair checks passed. |
| Delegation | `native/subagent-evidence`, mechanism; `refinement-probes/role-repair`, outcome | `native-worker` → `native-worker`; `initial-worker-inspection` → `initial-worker-inspection`; `same-worker-continuation` → `same-worker-continuation`, `same-native-thread` | Native role/assignment, actual child work, completion, parent consumption and context reuse | Full run: actual ordinary-worker work, result consumption and same-worker continuation passed. |
| Required reviewer unavailable | `refinement-probes/reviewer-unavailable`, outcome | `review-result` → `review-result`; `independence-gap` → `independence-gap`; `review-read-only` → `review-read-only` | Useful primary analysis, explicit unmet independent review and preserved read-only authority | Full run: useful primary review and honest reporting of unmet independence passed; no independent review was fabricated. |
| Configured roles | `role-probes/complex-worker`, `role-probes/critical-reviewer`, `role-probes/deep-critical-reviewer`, mechanisms | `complex-role-invocation`, `critical-role-invocation`, `deep-role-invocation` → same-named checks; accompanying boundary checks | Own-session native assignment and effective context, worker output, completion and role boundary | Full run: both reviewer roles passed. complex_worker assignment and gpt-5.6-sol/high identity are observed, but its native request failed before diagnosis; child boundary remains unknown. |
| Skill mechanisms and routing | Development routing cases; `scan-image-vulnerabilities/1`, outcome with an explicit scanner requirement | `route-answer` where declared; scanner `observed-scanner` → `observed-scanner`, `recorded-targets` → `recorded-targets` | Accepted route alternatives; actual installed bundled-script invocation and fixture target records when requested | Full execution observed; corrected report has 215/216 mechanism cases passed. Scanner log checks are decidable after artifact regrading; complex-worker failure and its unknown boundary check remain. |

## How to interpret observed coverage

Each report separates planned, recorded, unknown and decidable requirement
observations. Diagnostic-only requirements do not qualify a required capability.
Having an execution record, a requested role or a named skill is not sufficient:
the relevant check must be grounded in retained evidence. Native roles and their
effective model/effort are collected from observed records, never inferred from
a model name or the parent's description.

The selected full report is `fe8c331e-4b82-44c1-a2cd-fa346f3d1c59`, following
22-case regrade `86c48b72-91d4-45da-aabd-38b3c862853a` over the same executions.
All ten capability categories have observed, decidable requirement records. The
only unknown core requirement is the failed complex worker's boundary behavior;
the actual child request failed before returning a diagnosis. This remaining
limit is explicit and is not a claim that the role worked successfully.

The [2026-09-14 v2 review](refinement-acceptance.md#native-v2-closeout-review) retains
native v2 and Sol/high. A normal Codex worker outside the harness failed and later
succeeded under that same configuration. The unchanged original case then passed
both checks in targeted v2 run `acd8b700-86c1-4063-a983-b4b21f1bdf36`, supplying
actual completed-worker and boundary evidence for this path. This does not replace
the full baseline's failure/unknown or establish a permanent transport repair.
The exact intermittent cause remains unresolved. V1 and model substitution were
diagnostic experiments only and will not be adopted as the resolution.

The subsequent fixed three-repetition run
`aecc413e-7206-4a51-b728-ae412e174d21` recorded two passed trials and one failed
trial. Its checks are four passed, one failed and one unknown: the second native
child returned the same decryption error before any diagnosis, so its full role
boundary remains unassessable. This confirms both successful v2 behavior and a
continuing reliability gap; it does not qualify stable second-stage comparison of
this path. An earlier incomplete repetition run is retained separately. Its
Promptfoo row-index defect was repaired and covered by a real-scheduler regression;
all three trials were recorded after that fix. The acceptance report retains both
run/report identities, resource measurements and the archived diagnostic location.

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

An independent author and validator initially prepared 6 holdout cases with 10 assertions
and 8 fixtures: one outcome case for each ordinary work family and two mechanism
cases. Static validation, fixture bindings, route sensitivity and candidate-visible
authorization checks passed in the independent context. No holdout model execution
has occurred, and no task contents or diagnostic feedback entered the primary
tuning context.

After whole-branch review, an isolated repair added two explicit authorization
checks to the route-only cases. Current coverage is 6 cases, 12 assertions and
8 unchanged fixtures. Independent re-review verified that the original task data
and checks are unchanged, and that the additions assess actual forbidden actions
without requiring downstream execution or optional process. No holdout model run
was added; this improves assessment coverage without supplying a performance result.

This establishes preparation and assessment readiness for that small collection,
not generalization or runtime preservation. Holdout task details intentionally
remain outside this document. A later frozen candidate comparison requires an
explicit holdout selection and its own observed evidence.
