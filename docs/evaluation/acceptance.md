# Codex Evaluation Acceptance

Updated 2026-09-12. The framework is accepted for local atomic-commit delivery against
[the design](design.md). Current local verification is complete. Native results
below belong to their recorded, pre-cleanup inputs; they are not a full model
rerun of the current case names and definitions.

A case defines a task and checks. A trial is one fresh candidate execution.
A grading operation assesses retained evidence and does not create another trial.

## Current implementation and local verification

The maintained project contains 330 cases, 1,234 checks and 253 referenced
fixtures. Cases and fixtures use current skill/suite names. Tests follow source
domains, with CLI/distribution checks at the test root. Unused source archives,
import metadata and archive-dependent tests have been removed. No transition
alias or duplicate corpus manifest remains.

The latest full implementation gate was run from `evals/`:

```sh
bun run check && bun run test:coverage && bun run build && bun dist/index.js validate
```

| Check | Recorded result |
| --- | --- |
| TypeScript and Biome | Passed; 96 files checked with warnings treated as errors |
| Bun tests | 198 passed, zero failed; 860 expectations across 31 test files |
| Imported-source line coverage | 96.40%; every imported source file met the unchanged 80% threshold |
| Build | 32 modules bundled |
| Built corpus validation | `{"valid":true,"cases":330,"checks":1234}` |
| Diff formatting | `git diff --check` passed |

After removing unused source archives,
`bun test tests/corpus/inventory.test.ts tests/distribution.test.ts && bun run start -- validate`
passed four tests with zero failures and confirmed the same corpus counts.
These local checks do not run model evaluations. Subprocess/native qualifications
are separate from the imported-source coverage percentage.

Lefthook configuration and explicit pre-commit/pre-push execution passed during
implementation. Hooks still run the unchanged lint, check and local-test commands;
the earlier qualification is not counted as another run of the current test suite.
Runtime `config/`, `plugins/`, `skills/` and marketplace files, and the frozen
TypeScript/Bun/Biome/Lefthook rules, are unchanged.

After acceptance, the owner authorized local atomic commits of the implementation
and coupled documentation. Remote publication, merging and pipeline execution
remain outside the delivery scope. Usage is documented in
[the evaluation guide](../../evals/README.md).

## Delivered capabilities

- TypeScript/Bun CLI: `validate`, `calibrate`, `run`, `regrade`, `report`, `compare`
  and `view`. Promptfoo 0.123.0 owns scheduling and assertions. Each batch uses
  its own SQLite file for native exports; project records and original evidence
  are authoritative.
- Native Codex App Server preparation, isolated installation/discovery,
  same-thread scripted interaction, declared approval boundaries, subagent
  evidence, interruption and refusal before candidate launch when prerequisites
  cannot be established. Candidate and framework inputs are frozen before use.
- Programmatic checks, text grading and independent read-only artifact grading.
  Model graders use gpt-6-astra/high. Execution state, quality, time, token usage
  and cost remain separate; missing measurements are not invented zeros.
- Immutable reports, retained artifacts, explicit grading versions, selected-case
  regrading and metric-specific A/B eligibility. Reports include failed and
  superseded operations in the declared accounting scope.
- Dated reference prices frozen into new runs and calibrations. Reports/regrades
  use frozen prices; explicit report overrides produce new reports. Actual
  charge evidence is accounted for separately.
- Codex-only model-effectiveness evaluation. Local distribution tests check shared
  Codex/Claude/Copilot metadata and packaged resource containment; they do not
  establish live Claude/Copilot behavior.

## Corpus cleanup and evidence identity

The cleanup retained every case and check while renaming 14 case files, 326 case
IDs and 250 referenced fixture paths. Three unused payloads were removed; the
three native fixtures bring the current total to 253. All moved file modes were
preserved. Of the moved payloads, 242 were byte-identical and eight received
consistent identifier or wording changes. Fifteen unused origin tags were removed.

All check methods, core flags, executable rules and approval declarations stayed
unchanged. Exactly 130 execution versions changed because of task/authorization
wording or fixture names. The 196 routing and four native execution versions were
unchanged. Earlier IDs and report records remain immutable; there is no
compatibility mapping. Regrading requires the same case identities and execution
inputs as the original run.

The current inventory test loads the real corpus and rejects unused fixture
payloads. No historical corpus, import map or migration helper is needed to run
the framework or its local tests.

## Native qualifications before corpus cleanup

Paths below are relative to the repository. Generated evidence stays in the
existing ignored `evals/out/` and `evals/.cache/` directories.

| Requirement | Decisive result | Evidence |
| --- | --- | --- |
| Human-confirmed grading boundaries | Six planned text/artifact judgments agreed with all six owner-confirmed labels: complete success, complete failure and missing capture | `evals/calibration/labels.json`; `evals/out/calibration/3717c0e6-e2e9-4894-b370-46e44203efb9/calibration.json` |
| Same-thread scripted conversation | Two native turns in one thread; exact final label `Atlas 2.3 beta`; both checks passed | Run `cdb4c8e5-eab4-422e-96fc-c13227e9a6f0`, report `49ebaeef-778f-4710-9125-6a794c2a517a.json` |
| Actual repair and independent verification | General arithmetic repair, unchanged test/API, actual test invocation and five independent numeric checks | Run `303ce147-ecdd-49e1-9a9a-201e910d68fa`, case `native/verified-fix` |
| Implicit review and subagent evidence | Actual read-only bug review; separate ordinary_worker reads fixture data and returns it to the parent | Same run, cases `native/implicit-review` and `native/subagent-evidence`; all three cases and seven checks passed |
| Native approval boundary | Explicit isolated user-reviewer profile accepted or declined one exact command; only acceptance created the file | `evals/.cache/native-approval-yOAzG6/` |
| Interruption | Native parent and worker interrupted; owned shell/sleep processes exited with `survivors: []`; partial usage retained | `evals/.cache/native-interruption-N14CtK/qualification.json`; command-only qualification `evals/.cache/command-interruption-JWUtcW/` |
| Regrading preserves execution/history | All 14 previously hashed files unchanged; candidate count stayed at three; later report retained failed and superseded operations | `evals/.cache/regrade-acceptance/`; run `303ce147-ecdd-49e1-9a9a-201e910d68fa`, report `ed0a2f24-3696-4b7e-9eed-dce8063ee21b.json` |
| Controlled A/B comparison | One eligible quality/time/token pair, both passed; unknown cost excluded; no condition mismatch | `evals/out/comparisons/130c25fe-5bae-4cfa-823e-e47e7dad3ce0.json` |
| Fixture executable precedence | Explicit native shell-policy PATH passed actual preparation probes and the previously refused local case | `evals/.cache/fixture-path-rGok0V/`; run `7455c2e8-0c8e-474a-b87d-3621560a8575` |

The A/B sample establishes the comparison workflow, not a statistically supported
performance advantage. The calibration set establishes the basic three-state
distinction, not universal domain-rubric accuracy.

The current 330-case default corpus does not force a native approval prompt: its
approval lists are empty. Approval handling was qualified separately with the
explicit isolated user-reviewer profile above; it is not recurring default-suite
approval coverage. Local interaction tests cover matching and decline behavior.

## Historical full-suite observations

The original default command `bun run start -- run` produced all 330 planned
results: 322 completed executions, eight preparation refusals, no execution
errors/incomplete trials, and no grader errors. Its original quality report has
289 passed, 30 failed and 11 unknown cases. The immutable report is
[`a5167a5f-89e7-42a5-8ffe-a5c374d46f3f.json`](../../evals/out/runs/35be1cb7-24fc-4b6c-8bf3-0a911ac6f22d/reports/a5167a5f-89e7-42a5-8ffe-a5c374d46f3f.json).

The [checkpoint input-coverage record](../../evals/out/acceptance/6a88406a-2c0e-49fe-b67a-52e6f2142817.json)
checks all 330 case execution versions and confirms identical candidate runtime
and profile content across the explicitly selected runs. The
[acceptance evidence selection](../../evals/out/acceptance/f1f60c91-7350-440b-a494-d3a1ee0707f1.json)
then binds each case to its exact execution, source report and grading records.
Its checkpoint case view is **303 passed, 24 failed and 3 unknown**. Replacements
follow the declared input/preparation corrections and rubric/evidence corrections,
never the most favorable verdict. This is an acceptance view across several
explicit runs, not a pooled performance comparison or a new candidate sample.

Completed supplements are explicit observations, not an all-pass replacement
selected after seeing outcomes:

| Scope | Execution | Quality | Report |
| --- | --- | --- | --- |
| Seven previously refused offline fixtures; three regraded with corrected definitions | 7/7 completed | 7 passed | `e56df287-1f16-49f1-83aa-7968b2b2671e/reports/9050a1e1-e354-4a76-9550-672b5c155e0b.json` |
| Eleven corrected task inputs | 11/11 completed | 8 passed, 1 failed, 2 unknown | `9a106a7c-45b9-4b4e-9a84-f60347caa6d1/reports/8610a8da-48f7-4ab6-9aef-538666f420a8.json` |
| Three empty-route classifications, saved evidence only | No new candidate execution | All three passed after rubric correction | `35be1cb7-24fc-4b6c-8bf3-0a911ac6f22d/reports/e44f24ff-99a9-4e0a-a907-e1ccb9cfa4f3.json` |
| Native goal setup, saved evidence only | No new candidate execution | All four checks passed after retained tool records were supplied | `35be1cb7-24fc-4b6c-8bf3-0a911ac6f22d/reports/badc622b-55b9-47b0-9236-5d490276e236.json` |

Report paths in this table are relative to `evals/out/runs/`. The eleven-input
run took 632,283 ms of elapsed wall time. Its observed token aggregate is
4,170,147 with partial coverage because parent/child inclusion is not established;
it is not an exact chargeable total or a guaranteed lower bound. Both monetary
cost fields remain unknown.

The retained failure is `legacy/execute-plan-loop/9`: the candidate recommended
replanning but did not record or require the concrete two-attempt failure handoff.
The two unknowns are conditional branches absent from the supplied scenario:
failure to inspect source in case 0, and an incorrect/infeasible test in case 1.
The successful repair paths do not prove those different branches.

The third remaining unknown, `legacy/ensure-atomic-pr/2`, concerns proportionate
validation in a description-only atomicity task. Its evidence does not establish
that behavior. Remaining candidate failures include incorrect skill routing,
omitted handling rationale, missing repair handoffs, ownership-planning scope
overreach and unmet review/output requirements. Every retained check and reason
is present in the acceptance evidence selection; runtime skills/configuration
were not changed to make these results pass.

The native goal result was initially unknown because its grader saw only the
earlier event projection. Regrading used retained native tool records showing
actual `create_goal` and `get_goal` calls. It confirmed the setup-only boundary
without creating another goal or execution during regrading.

The original full run uses an earlier frozen implementation. Its eight fixture
PATH refusals remain historical `not-run` records. They are supplemented by the
explicit pr-review run above and run `e56df287-1f16-49f1-83aa-7968b2b2671e` for
the seven offline scanner fixtures. New evidence does not rewrite those refusals.

Ten execute-plan-loop prompts lacked a named output directory, and one parallel
planning case lacked a stable starting-ref premise. Their corrected inputs are
new executions. Three generated-file checks now accept the helper's supported
generated directory. An offline scanner rubric now assesses actual invocation
options rather than demanding an external scan. Three routing cases whose
expected route is empty no longer demand a nonexistent downstream specialist.
Those grading-only corrections reuse saved candidate evidence.

## Measured resources

The original full run's elapsed wall time was **8,107,026 ms**, approximately
**135.1 minutes**, at two concurrent cases. It recorded 1,887 operations. These
figures describe that run, excluding later supplements/regrades and development
qualification work; they are not a total project-development bill.

| Phase | Sum of recorded operation duration (ms) | Observed total tokens | Token coverage |
| --- | ---: | ---: | --- |
| Preparation | 346,957 | 0 | Complete; model-free |
| Candidate execution | 9,411,597 | 22,175,315 | Partial |
| Programmatic verification | 406 | 0 | Complete; model-free |
| Model grading | 13,853,238 | 13,126,853 | Partial |
| All recorded work in the original run | 23,612,198 | 35,302,168 | Partial |

Operations overlap, so their duration sums do not equal elapsed wall time. Model
grading is a material part of measured duration and token use; preparation is
small by comparison. These observations provide a baseline for later efficiency
decisions. No time/token limit, unrequested response reuse or hidden retry was
introduced. The original report predates the repository price book and retains
unknown monetary fields. The later priced report below records a separate
accounting cutoff and reference estimate; actual charges remain unknown.

## Reference pricing qualification

Reference-price accounting is implemented and qualified. New runs and calibrations
freeze the repository price book. Reports and regrades use that frozen version;
explicit report overrides create new records. These estimates do not change the
original reports or establish actual gateway charges.

The [price snapshot](../../evals/pricing/openai-standard.json) records the official
OpenAI Standard text-token rates checked on 2026-09-12:

| Model | Input / 1M | Cached input / 1M | Output / 1M | Source |
| --- | ---: | ---: | ---: | --- |
| gpt-6-astra | USD 10.00 | USD 1.00 | USD 50.00 | [Official model page](https://developers.openai.com/api/docs/models/gpt-6-astra) |
| gpt-5.6-sol | USD 4.00 | USD 0.40 | USD 20.00 | [Official model page](https://developers.openai.com/api/docs/models/gpt-5.6-sol) |
| gpt-5.6-luna | USD 0.20 | USD 0.02 | USD 1.20 | [Official model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna) |

The reference calculation prices noncached input as `input - cachedInput`,
prices cached reads separately, and includes reasoning in output rather than
charging for it again. It maps each attributable actor's observed model. Unknown
models stay unknown; no family-name approximation is used.

The pages also describe long-context premiums, cache-write pricing and service
mode adjustments. Normalized records do not establish every billing condition,
so the default book declares its Standard/base-context assumptions and keeps the
estimate partial. Inspection of this full run found 1,064 native usage events
with last-request input counts (maximum 65,073) and direct API input counts up to
62,832. Those observed requests are below the long-context threshold; cumulative
thread input is never treated as a single prompt. Unobserved adjustments and
unestablished parent/child inclusion still prevent a complete invoice claim.

The [new priced report](../../evals/out/runs/35be1cb7-24fc-4b6c-8bf3-0a911ac6f22d/reports/0ec326f4-41e0-4491-b37f-e5a272f36010.json)
includes all 1,900 operations available in that run, including prior regrades.
Its Standard reference estimate is **USD 248.13**: candidate execution **USD
102.47**, grading **USD 145.66**, each with partial coverage. Actual charges
remain unknown. This is a new report with a later accounting cutoff, not a
modification of the original 1,887-operation report.

`bun .cache/qualify-pricing.ts` verified unchanged hashes for 4,138 existing
manifest, trial result/evidence/protocol, grade, operation and report files.
Candidate operation count remained 322. The proof is
`evals/.cache/price-acceptance-v2/result.json`; no model was called to reprice data.

New-run integration was exercised with `bun dist/index.js run --case
native/scripted-context`. Run `9e534097-176c-4b18-b864-6adf02014137` completed and
passed both checks, froze the 2026-09-12 book, recorded 32,956 tokens, and produced
a partial USD 0.193041 estimate. Local tests separately cover frozen-price
precedence, explicit overrides, unknown/prototype identifiers, model-specific
arithmetic, and calibration's two grader operations without inventing human labels.

## Review

Independent integration reviews and affected-area follow-ups corrected confirmed
issues and returned no surviving actionable findings. Separate runtime, grading,
accounting and corpus/design contexts covered the ordinary code, errors, types,
tests, comments and specification aspects. A focused cleanup review and the full
anti-slop check confirmed that the implementation needs no migration archive,
alias table or duplicate manifest. The primary verified the findings and made
the final acceptance judgment.

The owner's renewed comprehensive review converged after three fixed-snapshot
rounds (`evals/.cache/review-2026-09-12/round-3/` through `round-5/`). Seven
confirmed problems were corrected with regressions, including cancellation
completion, consistent ledger reads, preparation recovery, record identity,
artifact-only regrading, diagnostic pairing and prototype-safe check selection.
The [implementation plan](plan.md#current-review-and-refinement) records their
dispositions and scope. No actionable finding remains in the completed coverage.
The latest gates above are primary-executed local checks; no real model suite was
run during this review. Historical native qualifications remain separate.

The contexts were independent GPT-family tasks. Review roles were configured as
gpt-6-astra/high or gpt-5.6-luna/max; individual runtime model/effort telemetry was
not separately returned. No cross-family review or completed Daybreak-dependent
security scan is claimed. The owner-excluded specialized workflow is not a
requirement for running the delivered CLI.

## Qualified limits

- The exercised native environment is macOS, Bun 1.4.2 and Codex CLI 0.154.0.
  Machine executable paths, tools and authentication references are explicit in
  `evals/profiles/default/runtime.json`; moving machines requires reviewing them.
- The default gateway's automatic approval model did not support its requested
  Responses route during the approval probe. The explicit isolated user-reviewer
  qualification passed; production/default configuration was not changed.
- Parent/child token inclusion is not always established by native observations.
  Such totals retain their observed values with partial coverage.
- The repository price book supplies reference estimates with explicit assumptions
  and partial coverage. Attributable billing evidence has not been supplied, so
  actual charges remain unknown.
- Candidate failures and genuine evidence gaps are valid eval outcomes. There is
  no all-cases-pass delivery threshold, implicit task timeout, token cap or hidden
  retry. An interrupted trial is preserved, not automatically resumed.
- No full model suite was rerun after the naming cleanup. Historical verdicts
  retain their original case IDs and execution/grading definitions.
