# Engineering redesign implementation and acceptance

**D-009 refinement complete within the recorded scope:** standing policy and useful review,
challenge and engineering methods are preserved and integrated. The revised native run passed
16/16 cases and 36/36 checks; independent static and actual-context forward checks passed.
See [alignment](alignment.md) and the D-009 section below. Earlier results remain historical.
Grok remains user-deferred; cross-host qualification limits remain explicit.

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
