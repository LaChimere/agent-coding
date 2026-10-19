# Engineering redesign implementation and acceptance

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

## PR-15 acceptance history

**D-009 refinement complete within the recorded scope:** standing policy and useful review,
challenge and engineering methods are preserved and integrated. The revised native run passed
16/16 cases and 36/36 checks; independent static and actual-context forward checks passed.
See [alignment](alignment.md) and the D-009 section below. Earlier results remain historical.
The later [Grok acceptance and refinement](grok-acceptance.md) records the owner's returned
artifact, independent local checks and remaining host limits. Earlier deferred statuses below
describe their frozen runs, not the current file-loaded Grok evidence.

## Initial frozen candidate, before D-009

The nine-skill engineering package and four host adapters were implemented. The 12 selected Codex
behavior cases pass all 28 checks across two frozen runs. Claude Code and Pi pass scoped read-only
review and handoff checks. Grok Bot native acceptance is deferred by the owner; other host limits
remain explicit below. These are representative single-run observations, not a reliability rate
for arbitrary projects or proof that every skill works on every host.
This implements the user-approved [design](design.md). It does not authorize commits,
publication, production installation, live routines or production deployment.

## Required outcomes

| ID | Requirement | Status | Acceptance evidence |
|---|---|---|---|
| E01 | Nine concrete engineering skills, one packaged source | Implemented; representative outcomes passed | Nine skill validators; four distribution tests; native cases below |
| E02 | Short shared principles and host-native task/handoff ownership | Implemented; read-only mixed handoff verified | Bundled references; Claude-to-Pi artifact handoff |
| E03 | Cold-start project verification, feature map, real drive, evidence and cleanup | Representative Codex episode passed | `abcb255e` cold-start trial; real CLI oracle and artifact rubric |
| E04 | Maintenance distinguishes drift, harness gaps and product regressions | Regression and verification-repair cases passed | Actual product regression preserved; stale map and runner repaired and executed in `fdec2db0` |
| E05 | Verified review findings, counterevidence and bounded re-review | False-positive case passed on three hosts | Codex, Claude Code and Pi reject the invalid-input claim using source evidence |
| E06 | Authorized release, exact artifacts, staged rollout and recovery | Local preparation/deploy/verify episode passed | Stale-head case passed; local deployment oracle controls passed; no production qualification |
| E07 | Continuous objectives, freshness, deduplication and recovery | Stale-state and actual fresh-thread episodes passed | Native current-state inspection; persisted handoff support |
| E08 | Structural prevention catches an actual prior error | Native structural-prevention case passed | Registry duplication scenario and executable valid/failing controls |
| E09 | Independent and mixed Codex, Claude Code, Pi and Grok Bot use | Scoped host evidence; Grok deferred by user | Host matrix below; no inference of cross-host feature parity |
| E10 | Retire old runtime entry points without aliases | Implemented | Old plugin roots, Copilot config and fixed Codex roles removed; catalogs name engineering only |
| E11 | AGENTS and related docs match product and evidence | Updated; active-reference audit passed | Root routing, usage, decisions, contribution, validation and host boundaries |
| E12 | Complete installed resources, no evaluation data in runtime | Passed | Distribution tests; Claude installed tree and Pi package match source |
| E13 | Frozen quality enforcement and history retained | Final local gates passed | 322 tests, line coverage 97.06%; forced pre-push check/test pass; frozen files unchanged |
| E14 | Outcome evaluations and complete episodes with honest claims | Passed in selected scope | 12 cases / 28 checks passed; native run records below |

## Runtime and evidence boundaries

Acceptance uses isolated candidate installations, Codex CLI 0.162.1, Claude Code 2.1.251 and
Pi 1.3.0. All native model checks use the owner's configured gateway and `gpt-6-astra`; these
are host integration observations, not comparisons of different model families. The owner
identified `~/.codex/config.toml` as the current gateway source. Only the new engineering eval
profile follows it; the legacy default profile remains unchanged. Authentication resolves the
named environment variable from the explicitly declared `~/.codex/.env` when necessary; values
are neither embedded in portable guidance nor copied to evidence or production config.

| Host | Observed support | Unverified scope |
|---|---|---|
| Codex | Real plugin installation/discovery; 12 passing cases including cold-start, design, review, maintenance, structural prevention, fresh-thread continuation and local release | App/IDE/cloud surfaces, broad projects and production release |
| Claude Code | Isolated native plugin install with matching bytes; `/engineering:code-review` executes through the native SDK engine and rejects the false finding | Other engineering skills, write workflows and complete cold-start episode |
| Pi | Isolated package registration and explicit native discovery of all nine skills; `/skill:code-review` reads the actual package and rejects the false finding | Automatic discovery with conflicting personal skills; other engineering skills and write workflows |
| Claude Code → Pi | Actual completed Claude review becomes a bounded handoff artifact; a fresh Pi process rereads the current source and contract before reaching its verdict | Multi-host implementation/release; no runtime execution in this read-only handoff |
| Grok Bot | Complete self-validation bundle prepared and hash checked | **Native use unverified and explicitly deferred to the user. No Computer Use, imports or routines were performed.** |

The readonly host checks constrain available tools and validate real paths against the exact
fixture/package roots. Input hashes remain unchanged. Pi honestly reports that it did not
recompute handoff hashes itself; the outer harness checks them before and after. The SDK/CLI
hosts report usage, but Pi's zero model price metadata and Claude's unknown proxy cost basis
are not evidence that gateway usage was free.

Grok self-validation bundle: `evals/out/engineering-host-checks/grok-cold-start.zip` (25 files),
SHA-256 `093dbde68cdf8c44b953bd82bb914bcc5f1513a85fc8260241c4b4e8baba2a8f`.
It contains the complete plugin, a synthetic CLI project, `START.md`, a public task and file
hashes. It excludes grading rules, answers, credentials and personal files. The user will ask
Grok Bot to execute it independently. This deferral does not qualify Grok behavior.

## Native runs

All paths in this section are repository-relative. Execution and grading are distinct states;
a completed candidate turn alone is not a behavioral pass. Logs under `evals/out/` are local
ignored artifacts and must be explicitly preserved when sharing results.

| Run | Outcome and reason |
|---|---|
| `26e9d35d-a83c-4276-98f6-abc80ff753f1` | Not run: npm needed the exact read-only OpenSSL 4 configuration path during native preparation |
| `ca0aa9dd-8261-4b38-82c9-dc4c447d4f8f` | Stopped after preparation: obsolete localhost gateway refused connections; no candidate behavior |
| `1cd3c426-f0cf-4c4d-a00b-c95991f6b3db` | Stopped: current gateway rejected obsolete JSON credential provenance with HTTP 401 |
| `ba3829a1-2565-4c23-8403-a013f6cbcb79` | Cold-start quality failed: real CSV fix/proof/scope passed, but protected project skill destination was not written; retain this failure |
| `abcb255e-4d92-41f5-8446-b2b39fe3d051` | Completed: 11/11 cases and 25/25 checks passed; report `fd5e2c38-b2dd-4507-8d5c-e1e5a607cf93` |
| `fdec2db0-2730-40e9-a5f9-4c646042bf8b` | Completed: additional maintenance case and all 3 checks passed; report `0bb1d6e8-449a-4487-99d0-13bff6cb4d61` |

The native permission repair declares exact writable project-skill directories, proves a child
write and parent denial before any model turn, and allows only explicitly supplied project
skills in discovery. The `.agents` parent remains protected. Read-only sessions retain read-only
permissions across handoffs; caller mutations cannot alter the captured initial thread settings.
Direct native preflights for cold-start and maintenance passed under
`evals/out/project-skill-native-probe/`. No isolation check was disabled.

Host records are under `evals/out/engineering-host-checks/`:

- `package-identity.json`, `pi-commands.json` and `pi-isolated-commands.json`: installed bytes and
  native inventory; the first Pi inventory exposed a real personal-skill collision.
- `claude-review/`: initial incomplete SDK attempt. Missing absolute task paths led to denied
  reads and an honest request for paths; this is not a passed review.
- `claude-review-2/`: completed review with the Claude Code system preset and explicit paths;
  six allowed reads, no denied operation, successful result, source-based rejection.
- `pi-review/`: standalone read-only review, exit 0 and unchanged inputs; exact package reads
  and successful rejection are recorded separately from process status.
- `pi-handoff/`: fresh Pi continuation from the actual Claude result, with explicit ownership,
  authority, identities, evidence, unknowns and next action; current files reread successfully.

## Framework and independent review

- Nine skill frontmatter validators passed. Four distribution tests passed (117 assertions).
- `bun run test:coverage`: 322 tests passed, zero failed; line coverage 97.06%.
  Final log: `evals/out/engineering-final-coverage-12cases.log`, including the added maintenance case.
- Final `bun run check` and `bun run build` passed. The case formatter complaint was corrected
  using the existing configuration. Existing Biome informational literal-key diagnostics were
  not disabled. Log: `evals/out/engineering-final-check.log`.
- Existing pre-commit/pre-push hooks were invoked. With no staged/push files they skipped, so
  pre-push was rerun with `--force --no-auto-install`: actual check and all 322 tests passed.
  Forced pre-commit lint also passed after the final case-format correction. Logs:
  `evals/out/engineering-final-pre-push-forced.log`, `engineering-final-pre-commit-forced.log`
  and corresponding unforced logs. The final full coverage run and check also passed afterward.
- Corpus validation: 12 cases / 28 checks. The original 338-case selection is preserved in
  `collections.legacy-v1.json`; original fixtures, holdout boundary and `profiles/default` remain.
- The CSV oracle rejects the original bug and accepts a different valid all-fields-quoted
  implementation. The local-release oracle rejects missing deployment, missing post-deploy
  execution and corrupted artifacts, and accepts correct idempotent deployment plus verification.
- Initial delegated workers produced encrypted-output decoding errors and no usable evidence.
  Independent review instead used a fresh native read-only artifact judge over frozen source.
  `evals/out/engineering-independent-review/result.json` found two valid defects: handoff could
  upgrade read-only permission, and supplied project skills were rejected by native discovery.
  Both were repaired with regression tests and real preparation probes.
- `evals/out/engineering-independent-review-2/result.json`: independent follow-up passed with no
  supported consequential defects in the selected snapshot. It inspected code/tests, not runtime
  outcomes. The additional maintenance evaluation inputs independently passed static review in
  `evals/out/engineering-independent-review-3/result.json`. Its actual native outcome passed
  separately. The control run rejects a broken runner and incorrect product count while accepting
  the repaired runner: `evals/out/engineering-maintenance-controls.json`.
- The dependency installer generated an unrelated root `lefthook.yml` and prepare-commit-msg
  hook. Exact generated files were backed up under `/private/tmp/agent-coding-toolchain/install-generated/`
  and removed; frozen validation configuration and existing hooks remain enforced.

## Completion audit and retained limits

- All fourteen requirements have an implemented owner and the scoped acceptance evidence above.
  Active-document relative links were checked in 13 entry/design/contribution files; none were
  broken. Native distribution checks cover bundled runtime links separately.
- The complete engineering package's 16 files match the Claude installation, Pi package and Grok
  bundle byte for byte. Synthetic host inputs remained unchanged. The machine-readable record is
  `evals/out/engineering-host-checks/qualification.json`.
- The fresh-thread Codex episode records two distinct owner thread IDs in `handoffs.jsonl` and
  completed turn evidence from both. The new session uses retained artifacts, repairs the actual
  CSV implementation and reruns the CLI; native grading verifies the phase and authority boundary.
- Reports retain execution, grading, partial usage and pricing uncertainty. Gateway charges are
  unknown without attributable billing evidence; reported estimates are not an invoice. Earlier
  failures and preparation refusals remain recorded and are not replaced by successful reruns.
- This is a local implementation with representative acceptance. No repository commit, push, PR,
  production installation, enabled routine, production rollout or migration recovery was performed.
  There is no claim of cross-host feature parity, a model comparison or statistical improvement
  against a matched old-package baseline. Historical evaluations use a different task population.
- Grok Bot remains **user-deferred and unverified**. Its self-validation package is the handoff for
  the owner's Bot; reviewing that Bot's actual actions and returned artifacts is separate follow-up.
  No other implementation or selected local acceptance work remains pending.

## D-009 capability-preservation revision (2026-10-18)

Current implementation: nine lifecycle skills plus `spar` and `rubber-duck`, six restored detailed
review briefs, sequencing/atomicity, quality, publication, stateful and project-knowledge methods.
The [alignment map](alignment.md) identifies preservation, composition and intentional replacements.
Codex standing Communication/Authority text is retained (only the obsolete Git-reference sentence
is rerouted); its runtime fragment and four worker profiles retain the previous selected settings.
Claude and Copilot personal rules remain separate from the portable methods. Claude's explicit
shared-component confirmation boundary was restored after independent review identified its loss.
The existing Claude/Copilot three-round review budget is also retained in host guidance; the
primary checked that bounded policy against the previous files after the static review. No
production configuration was changed.

### Current checks

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
- Fresh Claude Code and Pi installations match the current 32-file package. Pi's native RPC
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
- Updated Grok self-validation input only: `evals/out/preservation-host-checks/grok-cold-start.zip`,
  41 files, SHA-256 `f3780c78de751612983802bd0b0dbf9a3ef57043acd9adcb506fa434e4001789`.
  It retains the complete package and public synthetic task, without grader data or credentials.
  Grok execution remains explicitly deferred to the owner; no computer access or routine was used.

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
Grok and Copilot native behavior remain unverified. Claude/Pi evidence is limited to current package
installation/loading, read-only review and artifact handoff. The supplied personal configurations
were inspected and preserved as repository artifacts, not applied to production installations.
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
