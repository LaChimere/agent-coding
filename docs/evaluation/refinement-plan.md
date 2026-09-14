# Codex Evaluation Refinement Implementation Plan

This is the execution record for the owner-approved plan of 2026-09-13. The
[refinement design](refinement-design.md) defines the assessment contract. Landing
mode is `commits`: after review convergence, the owner explicitly authorized
atomic local commits followed by a fresh full development baseline on 2026-09-13.
Pushes, pull requests and production installation changes remain unauthorized.

## Approved outcome

Refine `evals/` and directly coupled documentation, then establish a fresh
development baseline of unchanged repository-owned Codex configuration, plugins
and skills. Preserve the frozen quality rules, independent Astra/high grading,
native evidence, unknowns and separate quality/time/token/cost accounting.

Use the new case, run and report contracts exclusively. Do not retain old-format
readers, aliases or migration utilities. Archived evidence remains unchanged and
is not an input to the new tools.

## Implementation sequence

1. Select development or holdout before discovery and snapshots. Freeze collection
   identity, membership, provenance and exposure, and guard every CLI reader.
2. Add explicit assessment/work-family metadata and grounded requirement records.
   Refine the complete development corpus using the prior audit; add meaningful
   interaction, blocker, recovery and configured-role evidence.
3. Correct route and evidence checks. Restrict regrading overrides to assertions
   and reference guidance while retaining frozen task obligations and evidence.
4. Report ordinary outcomes, mechanisms and observed capability coverage. Prepare
   representative human calibration labels and independently authored holdouts.
5. Validate the implementation and checks, review the integrated changes, calibrate
   with confirmed labels, then run a fresh full development baseline.

## Interfaces and defaults

- `--collection development|holdout` applies to validate, run, regrade, report,
  view and compare. Development is the default; holdout is explicit acceptance.
- A metadata-only collection registry selects separate case and fixture roots.
  Small run/report scope records are read before full payloads. Calibration is
  separate and does not read either candidate collection.
- Cases declare `assessment`, `workFamily`, provenance and requirement records
  with ID, capability, authority, applicability and observable evidence.
- `regrade --grading FILE` optionally overrides only assertions and
  `metadata.reference`. It cannot introduce new obligations; changed execution
  inputs or insufficient retained evidence require a new trial.
- Full development runs use one repetition and concurrency two. No time or token
  budget caps are added. Probes and extra repetitions are explicit, retained and
  reported separately from the full baseline.

## Parallel execution and ownership

The stable starting commit is `b19309413819690d14a02ffe9ccfe21ca1b29451`.
Pre-existing refinement-document changes are preserved. The primary owns shared
contracts, collection preparation, CLI, regrading, reporting, integration,
dependency state and this progress record. Initial implementation delegates used
isolated local clones and returned owned changes for primary integration. The later
holdout metadata repair used exclusive ownership of one shared-worktree file;
separate review confirmed its bounded change. Commit preparation used only ignored
staging copies. No delegate committed or edited another worker's owned files.

- Corpus delegate: development cases and fixtures only; no runtime source changes.
- Native-evidence delegate: evidence collection, programmatic checks and rubric
  evidence projection, with their directly coupled tests.
- Holdout author/validator: separate context and isolated candidate task roots;
  no contents or diagnostic feedback enter the tuning context.
- Reviewers are read-only. Shared contracts are primary-owned; generated reports
  are produced after integration. No worker maintains a second progress ledger.

## Qualification and completion

Required local gates are `bun run check`, `bun run test:coverage`, `bun run build`
and `bun dist/index.js validate --collection development` from `evals/`. Targeted
tests cover pre-read isolation, immutable provenance, grading restrictions,
native evidence, fair checks, coverage reporting and eligible comparisons.
Known positive, negative, alternative and insufficient-evidence examples test
the assessment itself. Independent correctness, authority/isolation and design
review precede final qualification.

The owner confirms new representative calibration labels before they become
human truth. The original six method-specific confirmations remain valid.
Holdouts are independently prepared and statically validated, not executed to
tune this baseline. Required capabilities need usable observed assessment;
candidate failures and justified unknowns need not be green. Partial evidence
does not qualify an unassessable required capability.

## Execution progress

The owner authorized first-stage closeout on 2026-09-14: preserve and archive the
compatibility diagnostics, consolidate the delivery documentation, execute exactly
three predeclared complex-worker repetitions on unchanged native v2, and commit
the reviewed documentation. The repetition selection is recorded before execution
in `evals/out/refinement-closeout-20260914/repetition-plan.json`; no failed trial
will be replaced with a favorable retry. This does not authorize runtime tuning,
holdout execution, pushes or pull-request changes.

| Slice | Status | Evidence or remaining work |
| --- | --- | --- |
| Collection selection and frozen scope | Complete | Default pre-read exclusion, explicit holdout selection, run/report sidecars, linked-input checks and immutable provenance |
| Cases and fair assessment | Complete | 338 development cases / 1,270 checks; outcome/mechanism metadata, grounded requirements, route alternatives, scanner provenance and meaningful blocker/interaction probes |
| Native evidence and regrading | Complete | Own-session actor metadata, observed effort, actual parent-child identity, ordered conversation, restricted frozen-evidence regrading and compatible corrected comparisons |
| Reporting and coverage | Complete | Separate quality dimensions, ordinary work families and core requirement/check/evidence observations; [coverage map](refinement-coverage.md) |
| Local gates | Passed after whole-branch review fixes | `bun run check`; `bun run test:coverage`: 239 pass, 0 fail, 1,099 expectations across 40 files; `bun run build`; development 338/1,270 valid; independent holdout validation 6/12 valid. |
| Independent review | Converged | Earlier 103-file patch review and later 105-file whole-branch review completed; three confirmed whole-branch findings fixed; targeted round 2 found no new supported issue. |
| Holdout preparation | Statically qualified | Independent author, implementer and reviewer; 6 cases / 12 checks / 8 unchanged fixtures after two added authorization checks; no model run or contents exposed to primary. |
| Expanded calibration | Passed | Owner confirmed all 10 new shared labels for both methods on 2026-09-13; all 26 observations agreed, with no grader errors |
| Fresh full development baseline | Recorded; original limitations retained | Run `40418426-0012-4dfb-b4cc-4d5c4a70f1fb`: 338 executions; corrected report `fe8c331e-4b82-44c1-a2cd-fa346f3d1c59`: 336 passed, 2 failed, no unknown cases. Its complex-worker boundary remains an unknown check after the native request failed; later probes do not rewrite this baseline. |
| Complex-worker closeout | Native behavior observed; stability not qualified | The original case passed in targeted run `acd8b700-86c1-4063-a983-b4b21f1bdf36`, but the fixed three-repetition run reproduced the native decryption failure once. Keep v2 and Sol/high; the transport cause remains unresolved. See [v2 review](refinement-acceptance.md#native-v2-closeout-review). |
| Diagnostic cleanup | Archived and verified | All 86,283 entries moved intact; detailed investigation retained in the archive and current documentation consolidated. |
| Three-repetition closeout check | Executed; stability criterion not accepted | First incomplete attempt retained. `8a93cc6` repairs execution/regrading identity. New run `aecc413e-7206-4a51-b728-ae412e174d21` recorded all three trials: two passed, one failed, with one unknown boundary check. No replacement trials. |

Implementation began on 2026-09-13, preserving the existing refinement-document
changes. Delegates returned owned changes from isolated clones; the primary
integrated them. Dependency installation used Bun 1.4.2 with project-local
TMPDIR/cache after the default temporary directory was not writable. No frozen
configuration or lockfile was changed. Meaningful in-process tests repaired the
coverage gap exposed when newly tested CLI paths entered the frozen coverage gate;
no threshold, exclusion or enforcement was relaxed.

Native probes established actual conversation, ordinary-worker and critical-reviewer
capture. One probe exposed a real assessment defect: a file whitelist was available
to the grader but absent from the candidate prompt. That raw failure is retained
and classified as an invalid assessment, not candidate regression. The prompt now
includes frozen authorization scope; the execution fingerprint includes the delivered
prompt. Independent review passed, and a new native diagnostic execution completed
with all five checks passed; primary protocol/artifact inspection confirmed the
corrected delivery. Probe results, costs and limitations are recorded in the
[acceptance report](refinement-acceptance.md); they are not a baseline.

The primary's anti-slop pass removed redundant outcome aliases and an unnecessary
merge helper, retained the existing scheduler/execution/accounting components, and
added no compatibility or migration layer. The final coverage inventory also
corrected the concrete-review-finding and implementation-scope capability labels.
Candidate sources, frozen tooling, archived evidence and production installs remain
unchanged. Atomic local commits were subsequently authorized; no push or PR action
has occurred.

## Confirmed calibration and interrupted pre-review run

The owner confirmed all ten new sample labels for both methods on 2026-09-13.
`labels.json` now records the complete 13-sample hash and confirmation time; the
original three labels remain unchanged, with their prior record also retained in
`evals/out/calibration-labels-initial.json`. Calibration
`08ff7908-55cd-4f6e-9be7-a9a679ac4a8a` completed: 26/26 label agreements, no
grader errors. The primary inspected every judgment's reason. Wall time was
103,590 ms; recorded total usage was 314,521 tokens (partial), estimated cost
USD 2.070783 (partial), and actual charge remained unknown. Its report is
`evals/out/calibration/08ff7908-55cd-4f6e-9be7-a9a679ac4a8a/calibration.json`.

The owner requested a comprehensive review and refinement of all uncommitted
changes before the full baseline. The running evaluation was interrupted cleanly;
its report is `38e60db6-13ed-4842-bf69-ae7ad28f8756`, with 9 completed executions,
6 passed cases, 1 failed case and 331 unknown/unrecorded cases across the 338
planned trials. All available evidence and consumption remain retained. The fixed
patch was reviewed, confirmed findings were repaired, and validation passed before
another full baseline started. The owner then authorized atomic commits and a fresh
full run. Runtime optimization and
publication remain outside this authorization.

## Comprehensive patch review and corrections

The fixed review target is base `b19309413819690d14a02ffe9ccfe21ca1b29451` versus
all staged, unstaged and nonignored untracked files: 103 paths, including 9 holdout
paths inspected only in an independent context. There were no staged changes or
new commits. Round 1 snapshots, hashes and full reviewer briefs are retained under
`evals/out/full-patch-review/round-1/`.

Code, comments, tests, errors, types and specification aspects were applicable.
Independent reviewers divided input/execution, results/grading, development
corpus/docs and private holdouts; the primary traced integration and confirmed
the findings. SPAR was not requested; a separate Rubber Duck was unnecessary given
the independent contract reviews. The specialist Codex Security workflow remains
excluded under the owner's instruction to avoid Daybreak-dependent requests;
ordinary path/authority correctness review does not claim that scan coverage.

Confirmed corrections:

- Native conversation counters now declare root or all-thread scope. Root counts
  use the main conversation, preventing legitimate worker turns from failing a
  two-turn interaction. Existing sequence and worker-identity checks remain.
- Requirement evidence records now describe observation sources instead of copying
  rubric predicates (1,262 development records and 14 private holdout records).
  Regrading still cannot change task obligations. A regression test removes a
  real diagnostic and verifies that its retired wording is absent from requirement
  metadata and coverage.
- Two explicit security-coverage routing requirements are core. The public route
  remains pr-review; the answer must retain the requested scope or state a required
  capability gap, without executing security tools or inventing availability.
- Two fixture test names no longer reveal the expected clarification/conflict
  diagnosis. Inputs, assertions and conflicting domain facts are preserved.
- The existing grader-entry test now verifies actor identity, role, per-turn
  model/effort, source references, parent-child links and conversation forwarding,
  including absent identity and omitted private context.
- New collection/grading/coverage code has logical steps separated for readability.

Validation after these repairs: `bun run check` passed; `bun run test:coverage`
reported 237 pass, 0 fail, 1,047 expectations across 39 files; `bun run build`
bundled 35 modules; development remained 338/1,270 and holdout remained 6/10.
The model grader implementation, confirmed calibration samples and labels did not
change. Round 2 independently closed the fixes and found no new material issue.
The primary also verified the exact development-case delta: 1,262 observation
descriptions, three count scopes, and two core/rubric/reference corrections; no
unexpected task or authorization changes. The independent holdout validator
confirmed only 14 evidence-field changes and unchanged fixtures.

Review coverage and current qualification hashes are recorded in
`evals/out/full-patch-review/qualification.json`. No confirmed in-scope review
finding remains open. The interrupted run is retained and must not be called a
complete baseline. The owner subsequently authorized the following local commit
sequence before a fresh full baseline.

## Atomic delivery

| Commit | Purpose | Validation of its exported staged tree |
| --- | --- | --- |
| `a533209` | Native actor and conversation evidence | Check/build; 7 tests, 40 expectations |
| `2dfefb2` | Confirmed representative grader calibration | Check/build; 13 tests, 67 expectations |
| `b4aa9f3` | Collection-scoped case/run/report and frozen-regrade contracts | Check/coverage/build; 233 tests, 1,025 expectations; development 330/1,241 and holdout 6/10 |
| `2b06daf` | Separate outcome/mechanism and requirement coverage reports | Check/build; 70 result/regrading tests, 242 expectations |
| `d065376` | Clarification, blocker and worker-repair cases with fixtures | Corpus inventory test; development 335/1,262 |
| `fbd0dc0` | Configured worker/reviewer cases | Corpus inventory test; development 338/1,270 |

The documentation update completes this sequence. Each commit runs the unchanged
Lefthook pre-commit lint gate through a worktree-local hooks directory. Exported
index trees were checked separately from the full working tree, so later uncommitted
changes did not supply missing implementation to an earlier commit. The core
contract commit keeps schema/data/readers/regrading together; report dimensions
and new scenario groups land independently. No temporary compatibility reader or
migration utility was added to the delivered project.

The full development baseline ran from clean commit
`6713d4629ba3e26443ae5870208af8e95c81ace6`: 338 cases, one repetition,
concurrency two, and no time/token caps. Run
`40418426-0012-4dfb-b4cc-4d5c4a70f1fb` completed with all executions and grades
recorded. Its original report is `80e5acab-2e42-4906-928e-0396069c7e00`.

## Baseline assessment corrections

Continuous monitoring and independent evidence review found grading defects and
under-specified boundaries rather than reasons to modify candidate instructions:

- Exact route sets omitted documented direct handling and task-triggered quality
  companions. The final correction keeps these allowances case-specific; focused
  flag/evidence checks and ongoing guards retain their narrow routes.
- The decomposition check incorrectly rejected the parallel-planning companion's
  proposed owners and branches. Actual creation or implementation dispatch remains
  prohibited during planning.
- Seven scanner checks required invocation-log contents unavailable to the text
  grader. They now use the existing artifact grader. Provenance is assessed against
  candidate-visible knowledge, not undisclosed fixture internals.
- The CSV reference now distinguishes raw returned headers from normalized lookup;
  those representations alone do not establish a semantic conflict requiring
  another alignment step.

The correction changes 22 cases and regrades their 107 checks, including previously
passed cases. Task inputs, authority, requirements, core flags, fixtures, candidate
runtime, calibration and frozen tooling remain unchanged. Original execution
versions are preserved; no candidate retry substitutes for a failed trial.
The override and its collection sidecar are
`evals/out/baseline-grading-corrections-40418426.json` and the adjacent
`.collection.json`. Review evidence is under
`evals/out/baseline-correction-review/`; judgment dispositions are in
`evals/out/baseline-assessment-review-40418426.json`.

After the initial correction, `bun run check`, `bun run test:coverage` (237 pass,
0 fail, 1,047 expectations), `bun run build` and development validation (338/1,270)
passed. Targeted route refinement removed two overly broad optional companions
and clarified the direct-route rubric; check and development validation passed
again. Independent targeted round 2 closed the route corrections with no surviving
material finding. Reviewer contexts were independent; their effective model/effort
was not exposed. No specialist security scan or holdout access was required for
these case-guidance corrections.

Regrade `86c48b72-91d4-45da-aabd-38b3c862853a` completed all 22 selected cases and
107 checks with passed judgments and no grader errors. It produced full report
`fe8c331e-4b82-44c1-a2cd-fa346f3d1c59`: 336 passed, 2 failed and no unknown cases.
The original 1,949 manifest, completion, report, trial-result, evidence and grading
records retain identical hashes. No candidate execution was added.

The original `anti-slop/0` reporting failure and complex-worker native transport
failure remain in that full report. Later targeted runs are separate evidence;
no successful rerun replaces an original failure or unknown. Corrections landed
as `7b335fa`, `b478186` and `63d5d40`, with the unchanged pre-commit lint gate.

## First-stage closeout

The owner requires native v2 and Sol/high. The unchanged original complex-worker
case passed both checks in targeted run `acd8b700-86c1-4063-a983-b4b21f1bdf36`,
report `151b3c5d-f6d1-4ac4-b8d2-4aec8ad745e6`. A normal-session worker outside the
harness also failed and later succeeded with the same model/effort/protocol.
Independent and primary review found no encrypted-message rewriting in the
harness. The precise intermittent transport cause remains unresolved.

Compatibility experiments and raw evidence were moved intact to
`evals/out/archives/complex-worker-diagnosis-20260914/`. All 86,283 entries, including
59,486 files, passed the full before/after inventory comparison. The receipt and
inventory are under `evals/out/refinement-closeout-20260914/`; the archived
`documentation-before-closeout/` retains the detailed investigation narrative.
No original main run record or runtime configuration was changed.

The predeclared closeout check uses exactly three repetitions, concurrency one,
with unchanged candidate, v2 model bindings and grading. Its first run,
`73187847-d328-4ea9-b438-12d4bf007a85`, recorded one pass and two unrecorded trials:
`--repeat` exposed incorrect mapping from Promptfoo's expanded row index to a
case. The same lookup affects regrading repeated runs. Repair is scoped to stable
case identity plus the existing candidate/repetition identity, with real-scheduler
regression coverage. No additional fallback or compatibility option is needed.
Commit `8a93cc6` repairs both lookups. A real Promptfoo regression demonstrated
the defect before the fix (four recorded trials out of twelve) and passed after
it (twelve execution identities, then six subset-regrade identities, with original
records unchanged). The test implementer ran
`bun test evals/tests/execution/repetition.test.ts`: the failing result was
`Expected length: 12 / Received length: 4`; after the fix it reported
`1 pass / 0 fail / 46 expect() calls`. The primary subsequently ran the full
frozen gates: 238 tests, 1,093 expectations, no failures; check, build and
development validation also passed.

An independent read-only review covered the six pinned source/test files for
correctness, comments, tests, errors and design alignment. It confirmed the
installed Promptfoo row-index behavior and found no supported issue. The primary
checked the same contracts and accepted the fix. No model call or holdout access
was part of that review. Its scope hashes are retained in the closeout directory.

The fresh three-repetition run `aecc413e-7206-4a51-b728-ae412e174d21` follows
`repetition-plan-after-repair.json`, written before execution. The earlier run
remains evidence of the scheduling defect, not a rejected model outcome. Native
verification uses the reviewed source bytes later committed as `8a93cc6`: all
36 frozen source files match that commit. Report
`f21bf0c4-668c-4ec6-a2ae-f593281a3bc1` records two passed trials and one failed
trial, with four passed checks, one failed invocation/completion check and one
unknown boundary check. The second trial reproduced the original native decryption
error. Its parent reported the unavailable worker result honestly. The other two
workers returned scoped diagnoses; all fixtures remained unchanged.

The check completed, but its stability criterion did not pass. No extra trial
replaces the failure, and no protocol/model substitution is adopted. This run's
wall time is 283,602 ms, recorded usage is 658,618 tokens and estimated cost is
USD 3.3618326; usage/cost coverage is partial and actual charges are unknown.
`repetition-verification.json` retains the checked identities and results.

The full anti-slop check passed for the delivered patch. The two existing lookups
were corrected directly; no helper, fallback, flag or new scheduling abstraction
was added. The real-scheduler test is needed because the existing mocked callbacks
did not reproduce Promptfoo's expanded indices. Historical diagnostic copies are
archived, and their detailed narrative is consolidated into one current acceptance
section. Frozen quality rules and runtime inputs are unchanged. No complexity or
quality-rule exception was taken.

The [acceptance report](refinement-acceptance.md#native-v2-closeout-review) owns the
concise evidence and remaining-limit summary; the [coverage map](refinement-coverage.md)
connects it to required capabilities. Implementation and documentation are separate
atomic local commits. Both run the unchanged Lefthook pre-commit lint gate through
a per-command temporary hooks path; no persistent shared Git setting was changed.
The documented closeout is delivered, while complex-worker stability remains an
unmet prerequisite for using that path in second-stage acceptance. Broader runtime
optimization, holdout execution, pushes and pull-request changes remain outside
this closeout.

## Whole-branch review and refinement

The owner requested a complete branch review followed by prioritized corrections
and re-review. Round 1 pinned `b19309413819690d14a02ffe9ccfe21ca1b29451` through
`9d7cc567cfb150ab86f2eac4dbf4559568d53774`: 12 commits, 105 changed files and an
initially clean working tree. A remote read confirmed the main branch still matched
the base. The exact inventory is `evals/out/branch-review-20260914/scope.json`.

Independent reviewers covered collection/CLI/frozen-input contracts, native
evidence/grading/calibration, results/comparison, the development corpus, and
private holdouts using all six applicable ordinary review methods. A separate
Rubber Duck context checked design cohesion and qualification claims. The primary
traced the shared implementations and checked each candidate against counterevidence;
a second isolated reviewer adjudicated private holdout candidates.

| Confirmed finding | Correction and evidence |
| --- | --- |
| Major: grouped comparisons silently lost reclassified pairs | Include either side's classification in the affected denominator and record the mismatch as an exclusion. The regression constructs valid reports, checks both dimensions and preserves independent all-trial/resource eligibility. |
| Major: required reviewer probe included contradictory capability evidence | Remove only the unavailable-reviewer fixture binding from `role-probes/critical-reviewer`; the fixture remains referenced by its intended cases. |
| Major: two holdout routes omitted their explicit action boundary | Add one authorization requirement and one core artifact check per case using existing grading. All original task data, checks and fixtures remain unchanged. |

Three classes of candidate were rejected rather than expanded into new machinery.
The frozen runtime actually lacks the security specialist, so an honest conditional
unavailability statement is allowed; hypothetical future availability does not
prove a defect in this qualification. Existing outcome artifact checks already
receive original tests, changes, native actions and Git evidence, so the absence
of extra programmatic checks does not establish a false case pass. Reasonable
unmatched scripted questions retain the explicitly accepted incomplete/unknown
state; no incorrect failure or verdict bypass was established. Their possible
limitations are not new requirements for the candidate.

Writes were serialized. The primary owned public source, regression tests, the
development fixture binding and documentation. An ordinary worker then owned only
the holdout case file; it returned aggregate validation without exposing task or
answer contents. Shared contracts and tooling were unchanged. No additional
worktree, plan ledger, schema, helper, scheduler or compatibility layer was needed.

Primary validation:

- `bun test tests/results/compare.test.ts` reproduced the defect: 16 pass, 1 fail;
  the grouped denominator was zero and its exclusion list empty.
- After correction, `bun test tests/results/compare.test.ts tests/corpus/inventory.test.ts`
  reported 18 pass, 0 fail and 62 expectations.
- From `evals/`, `bun run check && bun run test:coverage && bun run build && bun run start -- validate --collection development`
  passed: 239 tests, 1,099 expectations, zero failures; 35 modules bundled;
  development remained 338 cases and 1,270 checks. Frozen coverage and
  warning-as-error enforcement passed without configuration changes.

The holdout implementer ran `bun run start -- validate --collection holdout` and
reported `valid:true`, 6 cases and 12 checks. Its
`bunx biome check --error-on-warnings holdout/cases/holdout.json` checked one file
with no fixes. The isolated reviewer confirmed two changed cases, two added
requirements, two added checks, eight unchanged fixtures, all original fields
preserved and a matching hash in `round-2-scope.json`.

Targeted round 2 covered the four public correction files and the private holdout
delta in separate contexts. No new supported comments survived. The primary
accepted the corrections, checked their integration and completed the full
anti-slop check. Only the demonstrated comparison defect and contradictory or
missing assessment conditions were changed. Remaining additions use existing
contracts and are necessary to keep those judgments honest.

A separate local Codex Security diff workflow completed against the original
branch pin. Capability preflight returned ready; a fresh architecture context and
nine bounded file reviewers covered all 39 source-like inventory entries. The
sealed report under `evals/out/branch-review-20260914/security/` has no reportable
finding. Its source-only static limits are explicit; ordinary review covers tests,
fixtures and prose. The primary checked the later correction for security impact;
it introduces no new privilege boundary. No Daybreak Access request, scan service,
native goal or candidate/grader evaluation was made. Review token usage and effective
reviewer model/effort were not exposed. Independent contexts do not establish
different model families.

Launch recovery preserved assignments: one ordinary-review task name collision
returned no handle and was retried once under a new name; one security shard hit
capacity, then its single retry started after other workers completed. No role
was silently downgraded and no review aspect was replaced by a failed launch.

These corrections do not rerun, overwrite or relabel any native evaluation. The
critical-reviewer fixture change receives a new execution identity; a later native
qualification must use that identity. The v2 decryption limitation remains as
recorded above. This review provides source and local validation, not a replacement
full baseline or a new holdout performance result.

The owner subsequently authorized atomic local commits:

| Commit | Purpose |
| --- | --- |
| `1b29ab6` | Preserve reclassified comparison pairs, with the regression test and usage documentation. |
| `d0e97dc` | Remove the contradictory capability fixture from the required reviewer probe. |
| `466797f` | Add holdout authorization checks with their directly coupled coverage and qualification documentation. |

All three eval commits passed the unchanged Lefthook pre-commit lint gate. The
final documentation commit records the integrated review and validation evidence.
No push or pull-request action was performed.
