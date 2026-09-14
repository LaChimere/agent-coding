# Codex Evaluation Refinement Acceptance

Status on 2026-09-14: the refined full baseline and confirmed calibration are
recorded. Native v2 and Sol/high remain the runtime contract. A targeted v2
recheck passed both complex-worker checks without changing runtime configuration.
Closeout implementation, archival and verification are complete, but native
stability is not qualified: after repairing a repeated-row scheduling defect,
the fixed three-trial run passed twice and reproduced the decryption failure once.
The subsequent whole-branch review corrected three assessment/reporting defects
and converged after targeted re-review. Local qualification is current below;
no new model run or replacement baseline was produced by that review.
This report covers delivery on `lachimere/refine-harness`, based on
`b19309413819690d14a02ffe9ccfe21ca1b29451`.

The [refinement design](refinement-design.md) defines acceptance. The
[implementation plan](refinement-plan.md) is the single progress record, and the
[coverage map](refinement-coverage.md) connects required capabilities to cases,
checks and observed evidence. The original [framework acceptance](acceptance.md)
remains a historical record.

## Delivered behavior

- Collection selection happens before discovery or copying. Development is the
  default; holdout access requires `--collection holdout`. Saved run/report scope
  records are checked before their full payloads are read.
- Cases declare outcome versus mechanism assessment, ordinary work families,
  provenance and grounded requirements. Reports preserve both quality dimensions
  and the required case/check/evidence coverage.
- The candidate receives its task and authorization scope. Grading guidance,
  references, checks and future scripted replies are not included in that prompt.
  The delivered prompt is part of execution identity.
- Routes accept explicit valid alternatives and optional companions while
  rejecting arbitrary extras. Native checks use actual conversation ordering and
  actor/assignment evidence. Correct concise answers and valid methods do not
  lose credit for omitting unrelated process narration.
- Regrading uses frozen tasks and retained evidence. Explicit overrides may
  change assertions and reference guidance only. Comparisons permit a common
  corrected grading standard without rewriting either original run.
- Time, token usage and cost remain separate from quality. Missing resource data
  and undecidable assessments retain their explicit coverage and reasons.

There are no new compatibility readers, migration tools, automatic prompt
optimization, evaluation services, budget caps or alternative CLI effectiveness
runs. Candidate runtime content and the frozen tooling rules are unchanged.

## Local validation

Commands ran from `evals/` unless stated otherwise. These are framework tests and
structural checks; they are not a model-performance baseline.

| Command | Decisive result |
| --- | --- |
| `bun run check` | TypeScript passed; Biome checked 114 files with no fixes, no warnings or errors, and two informational index-access suggestions; warning-as-error enforcement retained |
| `bun run test:coverage` | 239 pass, 0 fail, 1,099 expectations across 40 files after whole-branch review fixes; frozen coverage gate passed |
| `bun run build` | 35 modules bundled successfully |
| `bun run start -- validate --collection development` | 338 cases, 1,270 checks, valid |
| `bun run start -- validate --collection holdout` | Independent implementer reported valid, 6 cases and 12 checks; aggregate output only |
| `git diff --check` from the worktree root | Exit 0 |

Targeted tests establish pre-read holdout exclusion, linked-input refusal,
immutable collection records, restricted grading overrides, comparison eligibility,
candidate prompt delivery, ordered conversation evidence, native actor identity,
diagnostic coverage exclusion and positive/negative/unknown assessment behavior.
Scanner checks additionally reject prose-only claims, absent targets and unrelated
target records, while accepting valid target order changes.

The repeated-trial regression uses the installed Promptfoo scheduler, two cases
with identical task text, two candidates and three repetitions. It verifies all
12 execution identities and grades, then six subset-regrade identities and new
grades while preserving the original result and grading bytes. Only native
candidate execution is mocked; this regression makes no model requests. Bracket
access to Promptfoo's metadata index signature follows the frozen TypeScript
rule; Biome's two informational suggestions are not warnings or waived checks.

`git diff --quiet` over `config/codex`, `plugins`, `skills`, marketplace files and
the frozen eval configuration returned exit 0. A root example `lefthook.yml`
generated during dependency installation was removed; the real
`evals/lefthook.yml` remains unchanged. The subsequently authorized atomic local
commits are recorded in the implementation plan. No pushes, pull requests or
production installation changes were made.

## Independent review

The owner-requested complete patch review covered 103 uncommitted paths, including
9 private holdout paths reviewed in an independent context. All six ordinary PR
Review aspects were covered. Confirmed fixes corrected root/worker conversation
counts, stale copied grading guidance, dropped explicit routing scope, diagnostic
fixture names and worker-evidence forwarding coverage; directly related readability
issues were also corrected. Targeted round 2 found no new material issue. The
[implementation plan](refinement-plan.md#comprehensive-patch-review-and-corrections)
records the corrections and validation. No confirmed review finding remains open.

Independent contexts reviewed native evidence, collection boundaries, regrading,
reporting/comparison, corpus requirements and directly coupled documentation.
The primary verified the findings and applied the surviving corrections.

Material corrections included attributing child session metadata only to that
child, reading observed Codex effort correctly, not inferring parent/child links
from message recipients, and comparing common final grades independently of
original grading history. Corpus review corrected capability labels, unsupported
rubric demands and gaps in scanner invocation/provenance evidence.

The final bounded prompt-delivery review covered seven pinned implementation/test
files and found no material issue. It verified that only task and authorization
scope enter the initial prompt, that native delivery and execution identity use
the same constructor, and that the new unit tests restore their module mocks.
Reviewers did not run models or the complete test suite. The primary ran the
framework gates; independent holdout validation is attributed separately above.

The closeout scheduling fix received a separate read-only review of six pinned
source/test files against `63d5d40`, covering code, comments, tests, error handling
and specification alignment. The reviewer checked the installed Promptfoo
implementation and returned no supported finding; the primary independently
checked the routing and retained-evidence behavior. The `critical_reviewer` role
was requested with its declared Astra/high binding; effective model/effort was
not independently exposed. No new public type or security boundary required an
additional specialist review. Review scope hashes are retained at
`evals/out/refinement-closeout-20260914/repeat-review-scope.json`.

The primary also completed the anti-slop check. Additions are limited to the
approved collection, requirement, evidence, reporting and qualification needs.
Existing execution, scheduling, accounting and assertion components are reused.
Redundant outcome aliases and a needless merge helper were removed; previous-format
fallbacks were removed instead of extended. No complexity or quality-rule exception
was taken. Review contexts were independent; their effective model/effort was not
independently exposed and is not claimed. This was not a full security scan.

## Whole-branch review and refinement

The subsequent review pinned `b193094..9d7cc56`: 12 commits and 105 changed files,
with no initial working-tree changes. Code, comments, tests, errors, types and
specification aspects all completed, with an independent Rubber Duck critique.
Holdout contents stayed in separate authoring/review contexts. Three confirmed
findings were corrected:

- Paired cases with different assessment classifications disappeared from both
  grouped denominators. Each affected dimension now retains and explicitly excludes
  the pair; all-trial and resource eligibility keep their existing conditions.
- The required critical-reviewer probe mounted a contradictory unavailable-reviewer
  fixture. That binding was removed; the fixture remains used by its intended cases.
- Two holdout routing cases could pass without checking their forbidden-action
  boundary. Existing artifact grading now checks that separate core obligation.

Targeted independent round 2 and primary integration review found no new supported
comment. The comparison regression failed before the correction and passed after
it. The full local gates above passed. The holdout re-review confirmed exactly two
added requirements and checks, with all original case data and fixtures unchanged.
The repair adds no scheduler, helper abstraction, dependency, compatibility path or
quality-rule exception.

The complete local Codex Security workflow reviewed the pinned branch's 39
source-like files, with independent architecture and file-review contexts. Its
sealed [local report](../../evals/out/branch-review-20260914/security/report.md) records
zero reportable security findings and the static coverage limits. Tests, fixtures
and prose were covered by the ordinary review. The small subsequent correction
was checked for security impact by the primary; it adds no privilege boundary.
The sealed scan remains an observation of its original pin. No Daybreak Access
request, candidate/grader evaluation or native permission probe was made by this scan.
Reviewer contexts were independent; their effective model/effort was not exposed,
and no model-family diversity or measured review-token total is claimed.

Review scope and correction identities are retained under
`evals/out/branch-review-20260914/`. No model evaluation was rerun for these fixes.
The changed critical-reviewer fixture has a new execution identity; its earlier
native evidence remains attributed to the old case. Existing baseline, calibration
and v2-failure records remain unchanged and do not become a new complete baseline.

## Native diagnostic executions

Native Codex 0.154.0 executed through the existing gateway. The independent grader
remained `gpt-6-astra/high`. These diagnostic runs test particular harness paths;
they do not replace confirmed calibration or the full development baseline.

| Run | Scope and result | Wall time and resources |
| --- | --- | --- |
| `a7997695-2cb4-41fc-8478-31a7e8a8f12c` | `native/scripted-context`: preparation refused, no candidate turn; quality unknown | Zero model tokens; the outer macOS sandbox prevented native sandbox setup |
| `62c15d0c-f9a3-48fa-89bf-1a678db7f646` | `native/scripted-context`: completed, three checks passed | 23,528 ms; 38,504 tokens, complete; estimated USD 0.25671, partial; actual cost unknown |
| `30978033-b060-490e-9e5c-12fddde9b322` | Three completed trials: native worker and critical reviewer checks passed; clarified-import exposed the invalid assessment described below | 173,116 ms; 1,016,441 tokens, partial; estimated USD 6.49379444, partial; actual cost unknown |
| `4777fda9-27c0-4a49-b43a-41a553ec29d4` | Fresh clarified-import execution with visible authorization: completed, all five checks passed | 114,506 ms; 456,122 tokens, partial; estimated USD 2.593145, partial; actual cost unknown |

Partial token accounting in the delegated batch reflects unestablished parent/child
inclusion, rather than an invented exact sum. Estimated cost retains the price
snapshot and its uncertainty; it is not a provider invoice.

The nested sandbox failure was `sandbox-exec: sandbox_apply: Operation not
permitted` (exit 71). The subsequent approved execution ran outside the host's
outer sandbox so Codex could apply its own native isolation. Candidate isolation
was not disabled, and no credential values were printed or copied to fixtures.

The clarified-import probe's raw scope failure is **not a candidate regression**.
The grader enforced an exact file whitelist stored in metadata, but the candidate
had received neither that whitelist nor an equivalent restriction. The unchanged
raw report and evidence remain in their run. An assessment finding at
`evals/out/assessment-findings.json` records the invalid judgment and its cause.
Sending the frozen authorization scope fixes the input contract; the resulting
execution identity changes and requires a fresh trial. The follow-up report is
`25456fd1-081a-4864-9070-a35710345e37` in run
`4777fda9-27c0-4a49-b43a-41a553ec29d4`. All five checks passed. Primary inspection
confirmed that protocol line 60 delivers the scope without the grading reference,
lines 176/186 capture clarification and answer, lines 233/248 record the two
authorized patches, and line 239 records the candidate test result: 2 passed,
0 failed, exit 0. The test and contract files retain their original hashes.
This supports the delivery fix; it is not an improvement comparison between
unchanged candidate instructions.

## Holdout qualification

Initial independent authoring and validation produced 6 cases, 10 assertions and 8 uniquely
bound fixtures: four ordinary outcomes, one per work family, and two mechanisms.
The validator used the actual parser, checked fixture consistency, and exercised
valid, invalid-extra and insufficient-evidence route assessments. All passed.

A follow-up inspected all six candidate-visible authorization scopes: 6/6 matched
their task boundaries; no reference, rubric or assertion leakage was found.
No holdout model execution occurred. The primary did not inspect task contents or
private diagnostic feedback. Aggregate qualification and file hashes are retained
at `evals/out/holdout-review/qualification.json`. This is bounded static readiness,
not demonstrated generalization.

The patch review subsequently replaced 14 copied grading descriptions with stable
observation sources. A different worker performed this bounded repair; independent
re-review confirmed that only those fields changed and all eight fixtures remained
unchanged. That revision's hashes and qualification are in
`evals/out/full-patch-review/qualification.json`; the earlier qualification file
retains its original revision's meaning.

The whole-branch review later found that two route-only cases lacked a check for
their explicitly forbidden actions. An isolated repair added one authorization
requirement and one core artifact check to each case, using the existing grader.
The current holdout therefore contains 6 cases, 12 assertions and the same 8
fixtures. Independent re-review confirmed all original task data, requirements,
checks, fixtures and exposure records were preserved. The checks permit allowed
read-only skill inspection, require no downstream work, and retain unknown when
decisive evidence is absent. This is a static assessment repair, not demonstrated
holdout performance. Its pinned identity is in
`evals/out/branch-review-20260914/round-2-scope.json`.

## Human calibration

The original three sample labels and their six method-specific confirmations
remain intact. The owner confirmed all ten new shared examples in
`evals/calibration/samples.json` on 2026-09-13 for both text and artifact methods.
The complete calibration contains 26 observations over 13 examples.

| Sample | Confirmed judgment | Decisive distinction |
| --- | --- | --- |
| `concise-correct-routing` | passed | Correct requested route without unrelated procedure narration |
| `elaborate-wrong-routing` | failed | Long explanation selects the wrong capability |
| `valid-direct-alternative` | passed | Direct authorized work is valid when the skill is optional |
| `review-only-edit-violation` | failed | Useful output does not authorize editing during review |
| `material-clarification` | passed | A missing domain rule requires a question |
| `template-compatible-question` | passed | The required template permits a section after the question |
| `unsupported-completion` | failed | Actual test failure contradicts the success claim |
| `observed-worker-result` | passed | Native child work, completion and result use are captured |
| `missing-worker-capture` | unknown | The parent claim lacks the needed child evidence |
| `fixture-live-claim` | failed | Fixture output is falsely described as fresh live evidence |

`bun dist/index.js calibrate` completed with 26 graded observations, 26 agreements
and no grader errors. The primary inspected every judgment's reason. The report is
`evals/out/calibration/08ff7908-55cd-4f6e-9be7-a9a679ac4a8a/calibration.json`.
Its sample hash is
`35950407c93693dada1ceccdf6b6549de899e570cd5cca0a4a1c85d28d4a90e0`, matching the
confirmed label record. Wall time was 103,590 ms; recorded total usage was 314,521
tokens (partial), estimated cost USD 2.070783 (partial), and actual cost unknown.
Agreement on this finite set qualifies these representative boundaries; it does
not establish the accuracy of every domain judgment.

## Full development baseline

`bun dist/index.js run` started run `e9509ba3-e18c-485e-8440-7c0699e94c0a`
over all 338 development cases, with one repetition, concurrency two and no
time/token caps. It uses the frozen current corpus and unchanged repository
candidate. The log is `evals/out/refinement-baseline-20260913.log`.

The owner requested interruption before a renewed complete patch review. The
framework stopped cleanly and saved report `38e60db6-13ed-4842-bf69-ae7ad28f8756`
with status `interrupted`: 9 completed executions, 6 passed cases, 1 failed case
and 331 unknown/unrecorded cases. Wall time was 408,763 ms; recorded usage was
3,030,469 tokens (partial), estimated cost USD 21.34566342 (partial), and actual
cost unknown. These observations remain preserved and do not qualify a baseline.

The fresh committed run is `40418426-0012-4dfb-b4cc-4d5c4a70f1fb`, from clean
source commit `6713d4629ba3e26443ae5870208af8e95c81ace6`. It completed all 338
executions and 1,270 checks. Original report
`80e5acab-2e42-4906-928e-0396069c7e00` records 323 passed, 12 failed and 3 unknown
cases, with no top-level execution or grader errors. The log is
`evals/out/refinement-baseline-committed-20260913.log`.

Wall time was 8,202,705 ms (136 minutes 43 seconds). Recorded usage was 53,249,502
tokens, partial; estimated cost was USD 411.18127376, partial; actual charge was
unknown. Candidate operations account for 24,897,814 tokens and estimated
USD 111.98483476; grading accounts for 28,351,688 tokens and estimated
USD 299.196439. Parent/child usage inclusion and price conditions remain qualified
in the saved report. These figures are reference estimates, not provider invoices.

All failed and unknown cases received primary and independent evidence review.
The review identified missing valid route alternatives, an incorrectly restricted
composed planning workflow, scanner evidence unavailable to the selected grader,
and a CSV contract interpretation that was not established by the supplied sources.
The [implementation plan](refinement-plan.md#baseline-assessment-corrections)
records the bounded corrections. They cover 22 cases / 107 checks, including prior
passes, and preserve the original candidate executions and report.

Two observations remain supported without changing their grading:

- `anti-slop/0` did not state why the helper was needed, as its applicable full
  check requires. This is a bounded candidate reporting failure.
- `role-probes/complex-worker` invoked the configured `gpt-5.6-sol/high` child,
  but both child turns failed with `invalid_request_body: Encrypted function output
  content could not be decrypted or decoded.` The parent honestly reported the
  missing worker diagnosis. Invocation/completion fails; the child boundary check
  remains unknown. Native role and model identity are observed, but completed
  worker behavior is not established. That baseline error alone does not identify
  the exact upstream cause. The later diagnosis below preserves this failure;
  no shared gateway or repository runtime configuration was changed.

Fresh observations support ordered clarification, scope preservation, missing-input
and conflicting-test handling, honest unavailable-reviewer reporting, actual child
work and same-worker authorized repair. `critical_reviewer` and
`deep_critical_reviewer` cases completed and passed. This does not establish that
the failed complex-worker path is preserved or that the candidate generalizes to
holdouts. Runtime optimization has not started.

## Corrected baseline and qualification

Regrade `86c48b72-91d4-45da-aabd-38b3c862853a` used the same saved candidate
executions and existing grader implementations. All 22 selected cases / 107 checks
passed, with no grader errors. It produced full report
`fe8c331e-4b82-44c1-a2cd-fa346f3d1c59` in the original run's `reports/` directory.
The native Promptfoo export covers the 22 regraded cases; the project report
preserves all 338 planned trials and their selected grading definitions.

| Assessment | Passed | Failed | Unknown cases |
| --- | ---: | ---: | ---: |
| All trials | 336 | 2 | 0 |
| Ordinary outcomes | 121 | 1 | 0 |
| Skill mechanisms | 215 | 1 | 0 |
| Planning outcomes | 45 | 0 | 0 |
| Implementation outcomes | 27 | 0 | 0 |
| Review outcomes | 40 | 1 | 0 |
| Documentation outcomes | 9 | 0 | 0 |

Decidable pass rate is 99.41%, with 100% case-level decision coverage. The failed
complex-worker case still contains one unknown core check,
`complex-role-boundary`; no unknown case does not mean every check was decidable.
Every agreed capability category has observed, decidable evidence. No preservation
claim is made for the failed complex-worker execution path.

This score change is an assessment correction, not a candidate improvement.
Original and corrected definitions, grades and reports remain available; 1,949
original manifest, completion, report, trial-result, evidence and grading records
were checked byte-for-byte by SHA-256 and remained unchanged. No task, authority,
fixture, runtime configuration, calibration label or core flag changed.

Regrading took 363,065 ms (6 minutes 3 seconds), with 3,745,988 recorded tokens and
estimated USD 31.480511; both resource totals have partial coverage. The corrected
report accounts for every original and regrading operation: 56,995,490 tokens and
estimated USD 442.66178476, partial; actual charges remain unknown. Its 9,240,469 ms
wall span includes the interval between the original run and regrading, so it is
not a second candidate-run duration. Neither interrupted runs nor earlier probes
are pooled into these totals.

The corrective patch passed independent review, targeted re-review, the frozen
local gates and the actual regrade. It changes case guidance and grader selection,
using existing framework contracts. No confirmed material assessment defect remains
for this baseline. The justified candidate failure and native-request failure do
not invalidate the measurement, but neither is silently converted into success.
New-task generalization and improvements to the candidate remain unverified until
a later authorized runtime comparison and holdout acceptance.

## Native v2 closeout review

The runtime remains Codex CLI 0.154.0, native v2, an Astra/xhigh parent and a
Sol/high complex_worker. No model substitution, protocol downgrade or decryption
workaround was adopted. The harness sends task text to native Codex; it does not
create, rewrite or replay encrypted inter-agent messages.

A direct normal-session Sol/high/v2 worker outside the harness failed with the
same decryption error and later completed work in the same thread. Historical
normal sessions also contain successful v2 delegation and failed continuations.
Later message replays passed with and without message ID or internal metadata,
and through both streaming and non-streaming requests. These observations do not
establish a missing-field defect or permanent Astra-to-Sol v2 incompatibility.

The unchanged original case passed in run
`acd8b700-86c1-4063-a983-b4b21f1bdf36`, report
`151b3c5d-f6d1-4ac4-b8d2-4aec8ad745e6`. Both `complex-role-invocation` and
`complex-role-boundary` passed, with actual Sol/high/v2 work, parent use of the
result and unchanged fixture bytes. Framework, candidate, profile, case, grader,
CLI version, price book and environment fingerprint matched failed reproduction
`ed1b41c1-7ff6-4405-a715-1ef8fc8a3673`. No implementation patch caused that recovery.
This separate recheck took 90,824 ms, recorded 219,173 tokens and estimated
USD 1.1341048; usage and estimated cost are partial, and actual cost is unknown.

### Predeclared repetition check

The owner authorized exactly three repetitions before their outcomes were known:

```sh
bun dist/index.js run --case role-probes/complex-worker --repeat 3 --concurrency 1
```

Selection and retention rules are saved in
`evals/out/refinement-closeout-20260914/repetition-plan.json`. The first attempt,
run `73187847-d328-4ea9-b438-12d4bf007a85`, report
`f44486cd-4994-43e3-a3cf-071162e6c269`, recorded one passed trial and two unrecorded
trials. Promptfoo's expanded repetition row indices were incorrectly used as
original case indices. This is a scheduling defect, separate from the v2
decryption failure. That incomplete run remains intact. Commit `8a93cc6` corrects
execution and regrading to use stable case ID with candidate and repetition ID.
Its real-scheduler regression and independent review passed.

The new fixed-size run was declared in `repetition-plan-after-repair.json` before
execution. Run `aecc413e-7206-4a51-b728-ae412e174d21`, report
`f21bf0c4-668c-4ec6-a2ae-f593281a3bc1`, recorded all three executions and all six
grades:

| Repetition | `complex-role-invocation` | `complex-role-boundary` | Observation |
| --- | --- | --- | --- |
| 1 | Passed | Passed | Actual configured worker read the three files, returned its diagnosis, and stayed within scope. |
| 2 | Failed | Unknown | The native child failed with `Encrypted function output content could not be decrypted or decoded.` No completed worker diagnosis or boundary evidence was available. |
| 3 | Passed | Passed | Actual configured worker read the three files, returned its diagnosis, and stayed within scope. |

Case totals are two passed, one failed and zero unknown; check totals are four
passed, one failed and one unknown. The second parent execution completed by
honestly reporting the child failure; completed execution does not mean passed
quality. The candidate made one follow-up in the same failed child thread within
that trial. No replacement evaluation trials were added after the outcomes.

Primary inspection confirmed native v2 task-path assignments, Astra/xhigh parents,
Sol/high complex workers and unchanged fixtures in all three trials. Candidate,
profile, case, CLI version, price book and environment fingerprint match the prior
targeted recheck. All 36 frozen source files match commit `8a93cc6`; the framework
hash changed with the scheduling repair, while grading rules and implementations
remained unchanged. Source-hash-derived judge IDs consequently differ from the
earlier run; this is a separate verification, not a paired improvement claim.

This run took 283,602 ms (4 minutes 44 seconds), recorded 658,618 tokens and
estimated USD 3.3618326. Usage and estimated cost have partial coverage; actual
charges remain unknown. These resources belong to this three-trial run only.
The checked identities, results and resources are recorded in
`evals/out/refinement-closeout-20260914/repetition-verification.json`.

The scheduling repair is accepted; the native stability criterion is not.
The fixed-size sample proves the failure still occurs and does not establish a
long-term failure rate or its exact cause.

### Archived diagnostics

Temporary proxies, model/protocol experiments, copied project sources and their
raw evidence are archived at
`evals/out/archives/complex-worker-diagnosis-20260914/`. The archive also retains
the detailed documentation before consolidation. It contains 86,283 entries and
59,486 files; all relative paths, file bytes, modes and symlink targets matched
before and after the same-filesystem move. Verification records are:

- `evals/out/refinement-closeout-20260914/diagnostic-archive.json`
- `evals/out/refinement-closeout-20260914/diagnostic-archive-inventory.json`

The original run directories under `evals/out/runs/` were not moved or rewritten.
Absolute paths inside archived records remain original; the archive receipt maps
the former directory prefix to its archive location. Archived prototypes are
historical evidence, not supported project commands or compatibility modules.
The useful v2 comparison summary is `v2-review-summary.json` in that archive.

### Remaining limits

The full baseline and later probes remain separate. The baseline's original
complex-worker failure/unknown is not replaced by a successful later execution.
The actual cause of intermittent decryption failure remains open, and the fixed
repetition check reproduced it. Stable complex-worker comparisons cannot yet be
used for second-stage acceptance. Resolve and qualify this path under the retained
v2/Sol/high contract before relying on it; do not silently retry or change the
model, protocol or grading to obtain passing results.

`anti-slop/0` remains a real candidate reporting failure for runtime optimization.
The non-core `ensure-atomic-pr/2` validation check remains unknown because its
case contains a description rather than an executable change. Partial token/cost
coverage and unknown actual charges remain explicit. None should be converted
into an artificial pass or zero. Holdouts remain unexposed and unexecuted; later
runtime acceptance still requires matched comparisons, full regression and
explicit holdout evaluation.
