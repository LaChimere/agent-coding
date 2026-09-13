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

| Slice | Status | Evidence or remaining work |
| --- | --- | --- |
| Collection selection and frozen scope | Complete | Default pre-read exclusion, explicit holdout selection, run/report sidecars, linked-input checks and immutable provenance |
| Cases and fair assessment | Complete | 338 development cases / 1,270 checks; outcome/mechanism metadata, grounded requirements, route alternatives, scanner provenance and meaningful blocker/interaction probes |
| Native evidence and regrading | Complete | Own-session actor metadata, observed effort, actual parent-child identity, ordered conversation, restricted frozen-evidence regrading and compatible corrected comparisons |
| Reporting and coverage | Complete | Separate quality dimensions, ordinary work families and core requirement/check/evidence observations; [coverage map](refinement-coverage.md) |
| Local gates | Passed after review fixes | `bun run check`; `bun run test:coverage`: 237 pass, 0 fail, 1,047 expectations; `bun run build`; both collection validations |
| Independent review | Converged | Complete round 1 covered 103 uncommitted files; all confirmed findings fixed; targeted round 2 found no new material issue |
| Holdout preparation | Statically qualified | Independent author and validator; 6 cases / 10 checks / 8 fixtures; all 6 authorization scopes checked; no model run or contents exposed to primary |
| Expanded calibration | Passed | Owner confirmed all 10 new shared labels for both methods on 2026-09-13; all 26 observations agreed, with no grader errors |
| Fresh full development baseline | Authorized after atomic commits | The earlier interrupted run remains retained; a fresh full run will use the committed implementation |

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

## Next acceptance step

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
planned trials. All available evidence and consumption remain retained. Review
the fixed current patch, confirm findings, apply bounded repairs, and validate
them before starting another full baseline. The review converged, and the owner
then authorized atomic commits and a fresh full run. Runtime optimization and
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

The next operation is the full development baseline from the clean committed tree:
338 cases, one repetition, concurrency two, no time/token caps. Its run ID and
source commit will be recorded under `evals/out/`; actual results must still be
reviewed before first-stage acceptance.
