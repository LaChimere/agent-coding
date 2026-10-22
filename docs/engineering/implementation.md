# Engineering redesign implementation and acceptance

**Local, unpublished evidence:** raw inventories, command logs, native runs, comparisons and
review/repair records under ignored `evals/out/` are not attached to this PR. PR readers cannot
independently inspect those records from the repository. The committed corpus controls and
distribution tests can be rerun; they do not make the separate native and review evidence public.

## 2026-10-20 evaluation-control refinement — verified in the recorded scope

The performance-review case now uses an explicit repeated-object workload. Its batch-local
cache serializes each distinct immutable object once while retaining every output row. The
corpus control checks output equivalence, fewer serialization calls, the all-distinct control
and fresh serialization after an object changes between batches. The new work-count assertion
failed against the previous fixture (four calls instead of two).

The rubric distinguishes reported synthetic timings from source-established work reduction.
It accepts justified conditional conclusions and does not require attributing an exact timing
ratio to the source alone. The development collection is versioned as
`engineering-v1-evidence-controls-2026-10-20`; earlier runs and grades are retained unchanged.
Their Study B passes establish the earlier grader's outcomes, not the validity of a positive
control whose source did not establish the intended work difference. Current-case verification
is separate from the historical comparisons below.

The focused corpus suite passed 7/7 after the correction. `bun run check`,
`bun run test:coverage` (330 tests; 97.06% line coverage) and `bun run build` passed with the
frozen quality rules unchanged. Before/after and full-gate logs are retained locally as
`evals/out/pr16-comments-{before,after,check,coverage,build}.log`.

Native run `35522413-dc78-4c70-8945-a62a6c69a243` used the private `out` profile, one repetition
and concurrency one. Both `measurement-validity` and `readonly` passed; report
`8da319e6-10a8-4ff2-9377-d450c7cdca48` is retained under that run's `reports/` directory.
The output distinguishes source-proven reuse from stipulated timing ratios and reports workload
and measurement limits. This qualifies the revised case only, not a new matched comparison or
a rerun of the whole native collection. Portable plugin and host configuration files are unchanged.

## 2026-10-19 method refinement — accepted within the recorded scope

The authorized increment deepens PR #15's methods while retaining D-008/D-009, all eleven
public entries and the existing host/authority contracts. It adds performance and assumption
references, conditional entry pointers and one shared human-decision handoff clarification.
The [design](design.md) explains method ownership and extension criteria;
[capability alignment](alignment.md) maps each method to its owner, evidence and source references.

| Requirement | Implementation and observed acceptance |
|---|---|
| Performance evidence in design, implementation, verification and review | One bundled method; native design and read-only review reject skipped work and accept valid, bounded comparisons |
| Assumptions across real versions, ownership and consumers | One bundled method; native review finds the actual save-failure/draft-deletion path and clears the safe control without inventing a caller or extra guard |
| Complete human-decision handoffs | Shared rule retains both older and newer unresolved choices, options, consequences and unknowns; explanation-only control invents no approval |
| Existing engineering depth and authority | All entries and adapters retained; the nineteen-case development surface is covered, with the failed maintenance authority check corrected and revalidated below |
| Complete engineering episode | Native cold-start implementation and real CLI proof, followed by owner-triggered independent review, actual fault reproduction, correction in a copy, revalidation and review closure |
| Formal-pilot decision | No justified in-scope pilot; ordinary source, consumer and fault controls address the demonstrated gaps |

These are bounded Codex CLI observations on synthetic projects. Production installation,
publication and renewed Claude Code, Pi, Grok Bot, App/IDE or cloud qualification were not part
of this increment. Historical results below keep their original identities and limits.

### Artifact identities and local checks

The baseline is PR #15's merge `49896fe6c833c28f82a474ab1de9044256b5e319`.
The initial candidate inventory, revision A, is `evals/out/refinement-source-identity.json`
(40 runtime/config files; identifier `1b872f721685a69e6850581af9553f287d2864c04f50ea30bb11c6535df81ed2`).
Revision B changes only `references/verification-evidence.md` in that runtime inventory:
a short operational clarification about implicit temporary/cache writes. Its inventory is
`evals/out/refinement-source-identity-v2.json`, with the documented hash encoding and identifier
`6ee179525a72b968c1c193174f262bdb8ca6c73313085fe440f39e350f9541a3`.
Each native run also freezes and verifies its installed candidate independently.

The collection retains sixteen scenarios and adds three: supplied performance evidence,
a safe storage-consumer control and a complete decision handoff. Validation reports 19 cases /
42 checks. Fixture controls execute the actual broken/safe consumer and an alternative valid
implementation; the timing control observes serialization before versus after consumption.
These establish fixture validity, not general model-judge accuracy or application speedups.

Bun 1.4.2, the frozen lockfile and unchanged quality configuration were used.
`bun run check`, `bun run test:coverage` and `bun run build` passed: 330 tests, no failures,
97.06% line coverage. The four existing Biome informational diagnostics remain.
Focused corpus/inventory checks passed 11 tests. Distribution checks passed six tests and
224 assertions, including a repeat after the final reference clarification.
Logs are retained under `evals/out/refinement-{check,coverage,build}.log` and
`evals/out/refinement-final-distribution.log`.
Dependency installation alone used `CI=1 LEFTHOOK=0` to avoid changing shared Git hooks;
the quality scripts were not disabled.

### Native evidence

All runs use Codex CLI 0.162.1, Bun 1.4.2, Promptfoo 0.123.0, the same private profile
(`gpt-6-astra`, xhigh; configured graders unchanged), one repetition and concurrency two.
The profile inventory is `d3d1e5e2df9784dfe8cf7d70663eecec59d1c2abb14b0208056c1dda0799d2c0`.
The user explicitly authorized the configured gateway transmission after the initial automatic
approval rejection; that rejected launch executed no evaluation. Credentials remain references.

Run/report paths below are under `evals/out/runs/RUN/reports/REPORT.json`.

| Run | Candidate and outcome | Report |
|---|---|---|
| `d35b0e64-4ffe-4e89-b034-1573c3be0d4b` | Baseline interrupted: one passed explanation case, six unknown; incomplete attempts retained | `b568df1f-f53f-4cd4-9c5e-c16be2465a05` |
| `b660fb25-f6bf-4fae-bb74-9b455b479ba8` | Baseline recovery: six remaining cases / twelve checks passed | `07023f84-f0f9-42a7-94a4-377214b00927` |
| `9db343ab-edee-4813-ba41-b2f780915bd5` | Revision A: seven comparison cases / fourteen checks passed | `4747ab59-8e3c-43db-9cb4-591b7b86eff8` |
| `5dd502a9-50cf-4143-a018-b8bb9840cb20` | Revision A preservation: eleven cases passed, one authority check failed; 27/28 checks passed | `518214fb-1eb7-47c0-9d26-4bcd2fa73915` |
| `9d06c1cd-9c91-4a22-9a93-04c2d961d367` | Revision B: exact recovery-six selection / twelve checks passed | `427f7a47-87bc-4ed3-b515-023f18d5a74d` |
| `15bef1d9-b085-4cbc-a5f7-e1f8d07ac1fc` | Revision B: affected maintenance case / both checks passed | `c8b5dcfc-c0f5-46b3-8dff-732357fc366b` |

The preservation failures were not converted into passes. In the failed maintenance trial,
a heredoc required an implicit temporary file without the required preflight. The shell denied
creation before Python ran; no exact destination or successful prohibited write was established.
Independent review confirmed the preflight miss and the limited impact. Existing filesystem
enforcement remained intact. Revision B clarifies in-memory invocation or task-authorized scratch;
the recheck loaded that guidance, used in-memory commands and preserved the product regression
and expected count. See [L-007](../lessons.md#l-007-a-read-only-probe-can-have-implicit-temporary-file-side-effects).

Comparison `evals/out/comparisons/185c78f5-3085-4817-a6de-4005310df024.json` has one eligible
original-baseline/revision-A explanation pair. The six interrupted pairs remain excluded.
The first recovery-six/candidate-seven comparison was rejected for different selected membership
(`4ce6fa5a-a7c4-476f-85aa-fe1f9ed5d816.json`). A matching revision-B six-case run resolved that
execution-planning gap without weakening the comparator:
`de91273c-7f5d-4709-af1d-8f95f8fa78e5.json` has six eligible pairs, all passed on both sides.
The one earlier pair and six final pairs have different candidate revisions; they are not presented
as one uniform seven-case revision-B experiment.

The baseline already handled these comparison cases. The observations support preserved
capabilities and working methods, not a measured quality or reliability increase. Elapsed times
and raw usage remain in every report, including interrupted work. Token accounting is partial
because parent/child inclusion is unestablished; token and cost comparisons are ineligible.
Human review time and minutes saved were not measured. Different model-selected experiments
and provider latency also prevent interpreting elapsed differences as a workflow speedup.
The ballpark-estimate branch is documented but was not separately behaviorally qualified.

### Complete episode, review and correction

The native cold-start trial `9a739296-2958-42df-85cd-6612af83e48f` in the preservation run
established a verification skill/map, proved a baseline, repaired CSV escaping, ran the real CLI
against an independent CSV consumer and retained before/after and helper-error evidence.
The fresh-context handoff and staged-release cases separately establish their actual phase
boundaries; they do not stand in for review of the implemented artifact.

A separate-context reviewer inspected the actual cold-start artifact using the candidate review
method. It found a bounded timeout evidence-retention defect despite the native case passing.
The owner reproduced it against the actual generated helper and repaired a copy, preserving the
original captured artifact. Follow-up review found a related partial-output-read failure; a real
timeout plus an injected filesystem read error reproduced that path before the final correction.
Available process logs now have one finalization owner before cleanup, independent of CSV reads
and evidence writes. No additional generic framework or public skill was introduced.

`evals/out/refinement-cold-start-closure/` contains the corrected project, controls and evidence.
Final helper SHA-256 is `598b4cdf317214a6b8839aad7dd3fbc1ba6220a6cd46daf11b688d89f893332b`.
Real timeout controls retain exact partial stdout/stderr/CSV with product failure and exit 1;
a subsequent CSV-read error retains the logs, product failure and distinct tool error with exit 2.
An injected log-write error preserves a passing product outcome alongside the tool error.
Normal baseline/escaping journeys and all thirteen formatter checks pass. The original CLI was
restored after fault injection. Independent follow-up review closed the bounded changes.
The copy omits its original Git metadata; source snapshots/hashes, not its parent-repository
`git_head`, identify the tested artifact.

This episode includes owner-triggered review and correction; it does not claim the native author
automatically initiated independent review or repaired the reviewer findings. The initial package
review, acceptance-coverage audit and follow-up reviews used separate contexts. They are recorded
conversation evidence, not published reviews or specialist security qualification.

### Formal-pilot assessment and remaining scope

No new stateful production mechanism or costly uncovered invariant justified a formal pilot.
The runtime changes are guidance; executable additions are synthetic fixtures and controls.
Existing execution-owner tests cover stale/absent ownership, and the demonstrated helper gaps
were reproduced and corrected with ordinary fault controls. No verifier dependency, model or
generator was added. This is a scoped no-pilot decision, not a proof that the repository has no
defects or that formal verification would never help another project.

The implementation and recorded local acceptance are complete. Single-run observations do not
qualify arbitrary projects or every branch of each method. Other-host history remains historical,
and commits, publication and production installation require their own authorization.

## Package and host qualification

Current implementation: nine lifecycle skills plus `spar` and `rubber-duck`, six detailed
review briefs, sequencing/atomicity, quality, publication, stateful and project-knowledge methods.
The [alignment map](alignment.md) identifies capability ownership and composition.
Codex standing Communication/Authority rules, its runtime fragment and worker profiles remain
personal host configuration. Claude and Copilot personal rules remain separate from the portable
methods, including their review budgets and Claude's shared-component confirmation boundary.

### Recorded qualification (2026-10-18)

The native host checks used Codex CLI 0.162.1, Claude Code 2.1.251 and Pi 1.3.0.
These versions identify the observations below; they are not guarantees for other installations.

- Eleven skill validators passed. Distribution checks passed after expanding the declared skill
  surface; the configuration regression test checks the owner's retained native settings and roles.
- Full `bun run test:coverage`: 323 passed, 0 failed, line coverage 97.06%:
  `evals/out/preservation-coverage.log`. `bun run check` and `bun run build` passed. The initial
  test literal used native snake_case keys and violated the frozen naming rule; it was rewritten
  as a parsed native TOML expectation without disabling or suppressing the rule.
- Forced existing pre-push hook completed check and all 323 tests:
  `evals/out/preservation-pre-push.log`. Frozen validation files remain unchanged.
- `evals/out/preservation-independent-review/result.json` found the lost Claude shared-component
  boundary. After correction, `preservation-independent-review-2/result.json` passed the selected
  static scope, comparing current and previous source. Six detailed reviewer briefs match their
  predecessors; 32 package files and 70 local references resolve. This is not runtime acceptance.
- Full native run `7e60f7c2-0402-48a6-a4ad-9749400898f4` ran 16 cases / 36 checks against
  the revised methods, including the four new preservation cases. It completed successfully:
  16/16 cases and 36/36 checks passed with zero failed or unknown cases. Report:
  `evals/out/runs/7e60f7c2-0402-48a6-a4ad-9749400898f4/reports/fbf6fd35-6320-40e5-a34d-c7fa7514d1aa.json`.
  These are one observed execution per synthetic development case, not a reliability estimate.
- Fresh Claude Code and Pi installations matched the recorded 32-file package. Pi's native RPC
  inventory contains all eleven skills. Both hosts completed the read-only false-finding scenario
  with actual detailed-method reads, no project mutations and honest scope limits. A fresh
  Claude-to-Pi artifact handoff also completed. Records:
  `evals/out/preservation-host-checks/qualification.json` and sibling host event/tool-gate files.
- These host probes do not load personal standing configuration as production policy or qualify
  every lifecycle skill on Claude/Pi. Copilot guidance remains unqualified. SPAR and Rubber Duck
  real independent-context forward checks completed separately from the deliberately
  non-independent fallback cases in the full native collection. SPAR launched two distinct
  stakeholder contexts; Rubber Duck returned a verified persistence-failure finding. The primary
  inspected all returned results and raw artifacts. Evidence: `evals/out/preservation-independent-forward.md`.
- The owner completed Grok file-loaded cold-start execution. The returned artifact was audited
  and locally reproduced; corrections and remaining limits are recorded in
  [Grok acceptance](grok-acceptance.md). Native import and routines remain unqualified.

### D-009 final acceptance boundary

All selected correction and verification work is complete. The primary inspected the positive
review's reachable persistence failure, its separate asynchronous-test gap and rejected policy
suppression; checked the SPAR decision analysis and atomicity proposal; and integrated the actual
independent-forward results. Final active-document links and package links resolve, `git diff --check`
passes, and the frozen quality configuration is unchanged. Existing pre-commit lint also passed;
its initial elevated approval review timed out, so the same hook was run successfully in the normal
sandbox without changing the check or requiring elevated access.

The published methods retain choices about scope, evidence and independence; they do not enable
services, configure a live merge queue, automate incident collection or relax required human approval.
Grok qualification is limited to the file-loaded cold-start artifact; native import, routines and
revised methods remain unverified. Copilot native behavior remains unqualified. Claude/Pi evidence
is limited to package installation/loading, read-only review and artifact handoff. The supplied
personal configurations were inspected and preserved as repository artifacts, not applied to production installations.
These acceptance exercises did not commit, push, change a PR or activate a routine.


### PR publication boundary

Before publication, the configured gateway URL was removed from the public engineering profile
and replaced with a reserved non-routable placeholder. The actual profile is retained only in
Git-ignored `evals/profiles/out/`; live runs select `--profile out`. Earlier frozen runs retain
what they actually used. Their method/runtime results are unchanged; the public template does
not claim an operational gateway. The unpublished commit was replaced so the private address
would not appear in the PR's commit history either.

### PR #15 comment refinement

The owner retained this PR's grouping and waived the proposed commit split. The three inline
comments were addressed without rewriting history:

- The shared review report now handles a completed specialist security result from any available
  host workflow. It does not mandate a Codex-specific product or claim a security scan ran.
- Final `output` is selected only from the last execution-owner thread. Missing current-owner
  output stays empty; all earlier messages remain available as conversation/evidence. This avoids
  stale answers without asserting that native Codex normally reorders events.
- Distribution checks cover every declared host directory and its nonempty regular adapter files,
  including Pi and Grok Bot. These are artifact checks, not keyword-based claims that instructions
  were followed, and they retain D-009's permitted personal host preferences.

Validation for this follow-up:

- Two new evidence regressions failed before the fix and passed after it: late first-seen old-owner
  output and absent current-owner output. The existing-item late-completion control still passes.
  Logs: `evals/out/pr15-evidence-before.log` and `pr15-focused-after.log`.
- **Local, unpublished evidence:** the current projector replayed saved native handoff records
  from `abcb255e` and `7e60f7c2` with unchanged successful answers. The records remain in ignored
  `evals/out/` and are not attached to this PR, so PR readers cannot independently inspect this
  replay. This is recorded-protocol replay, not a new live-model run.
- In an isolated copied fixture, deleting `config/pi/AGENTS.md` or
  `config/grok-bot/INSTRUCTIONS.md` fails the actual distribution suite; the complete and restored
  copies pass. Logs: `evals/out/pr15-adapter-{baseline,pi,grok,restored}.log`.
- Full coverage run: 326 passed, 0 failed, 97.06% line coverage (`evals/out/pr15-coverage.log`).
- **Local, unpublished evidence:** an independent read-only source review found no consequential
  defect in the scoped correction. Its record is not attached to this PR and cannot be independently
  inspected from the repository. It did not rerun the primary-executed tests or mutation controls.

The committed regression and distribution tests can be rerun from the PR. They do not make the
separate unpublished replay and independent-review records publicly inspectable.

Earlier native and cross-host observations retain their recorded scope and source identities.
No new comprehensive trigger benchmark, GitHub CI workflow, specialist security scan or production
qualification is claimed. Grok native execution remains user-deferred. Review-depth selection,
noise/incident feedback and review limits are already represented by the methods; their long-term
production effectiveness remains unverified. The known install-generated lefthook artifact is a
separate tooling issue, not introduced by this correction.
