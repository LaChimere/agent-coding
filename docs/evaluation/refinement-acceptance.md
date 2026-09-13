# Codex Evaluation Refinement Acceptance

Status on 2026-09-13: implementation, local qualification and expanded human
calibration are complete. The owner interrupted the full baseline to request
another comprehensive review and refinement of all uncommitted changes. That
review has now converged after two rounds. The owner then authorized atomic local
commits followed by a fresh full baseline. The first stage is not yet accepted.
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
| `bun run check` | TypeScript passed; Biome checked 112 files with no fixes and warning-as-error enforcement |
| `bun run test:coverage` | 237 pass, 0 fail, 1,047 expectations across 39 files after the full patch review fixes; frozen coverage gate passed |
| `bun run build` | 35 modules bundled successfully |
| `bun dist/index.js validate --collection development` | 338 cases, 1,270 checks, valid |
| `bun dist/index.js validate --collection holdout` | 6 cases, 10 checks, valid; aggregate output only |
| `git diff --check` from the worktree root | Exit 0 |

Targeted tests establish pre-read holdout exclusion, linked-input refusal,
immutable collection records, restricted grading overrides, comparison eligibility,
candidate prompt delivery, ordered conversation evidence, native actor identity,
diagnostic coverage exclusion and positive/negative/unknown assessment behavior.
Scanner checks additionally reject prose-only claims, absent targets and unrelated
target records, while accepting valid target order changes.

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
Reviewers did not run models or the complete test suite; the command results above
were produced by the primary.

The primary also completed the anti-slop check. Additions are limited to the
approved collection, requirement, evidence, reporting and qualification needs.
Existing execution, scheduling, accounting and assertion components are reused.
Redundant outcome aliases and a needless merge helper were removed; previous-format
fallbacks were removed instead of extended. No complexity or quality-rule exception
was taken. Review contexts were independent; their effective model/effort was not
independently exposed and is not claimed. This was not a full security scan.

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

Independent authoring and validation produced 6 cases, 10 assertions and 8 uniquely
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
unchanged. Current hashes and qualification are in
`evals/out/full-patch-review/qualification.json`; the earlier qualification file
retains its original revision's meaning.

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

The patch review and its fixes are complete. A fresh full run is authorized after
the atomic commit sequence; the earlier interrupted run remains unchanged. Required
capability coverage, failures, unknowns and resource limitations still need review
before stage acceptance. Until then, ordinary
planning, documentation, recovery and remaining role paths lack fresh qualified
baseline observations. Runtime optimization that depends on this measurement
foundation has not started.
