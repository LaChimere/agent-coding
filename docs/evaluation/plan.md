# Codex Evaluation Implementation Plan

Updated 2026-09-12. Implementation, local acceptance and the owner's renewed
comprehensive review and refinement are complete.
Delivery uses local atomic commits on `lachimere/refactor-eval`, authorized by
the owner after acceptance. The contract is in
[design.md](design.md), commands are in [the evaluation guide](../../evals/README.md),
and measured results and their limits are in [acceptance.md](acceptance.md).

## Current review and refinement

The owner requested a new comprehensive PR Review of all current changes and
correction of confirmed findings until the review converges. The fixed target
includes base `71b742d0e93a51051ac14ac7e2fcf5bc88e19073` through HEAD
`e04bcff581fe65a6d56b840544268d95b4e9d404`, plus staged, unstaged, untracked and
deleted working-tree paths. The branch commits are `1c96a70`, `1afe0c2` and
`e04bcff`; generated outputs and caches are excluded by existing ignores.

The first snapshot for this request is `evals/.cache/review-2026-09-12/round-3/`.
Its manifest records the exact path inventory, hashes, modes and commit list.
Review inputs remain fixed until comments are consolidated; the primary owns
refinements, integration and final acceptance. Working-tree delivery and all
existing scope, readability and frozen-tooling constraints remain in effect.

All six ordinary aspects apply: code (new framework behavior), comments (guides
and contracts), tests (regression coverage), errors (failure/cleanup boundaries),
types (persisted records and state invariants), and spec (the design and owner's
latest decisions). Independent read-only review is split across runtime/preparation,
grading/Promptfoo, results/accounting, and corpus/docs/distribution. The primary
reviews CLI and cross-module data flow and double-confirms every finding.

Security boundaries are relevant, but the owner-excluded Daybreak-dependent
specialized workflow remains excluded. Ordinary boundary inspection does not
claim a completed security scan. SPAR was not requested; the independent domain
contexts provide challenge without an additional duplicate Rubber Duck task.

Status: converged after three rounds for this request, preserved as snapshots
`round-3`, `round-4` and `round-5`. The final snapshot covers 659 changed paths:
369 present files and 290 deletions. Source and test hashes matched that snapshot
after the final gates. Only acceptance text and this progress record were then
refreshed. No actionable finding remains: Blocker 0, Critical 0, Major 0, Minor 0,
Suggestion 0. No unresolved design decision remains.

| Confirmed problem | Correction and regression evidence |
| --- | --- |
| Interrupted Promptfoo scheduling finalized before running graders | Owned cancellation is separate from scheduler completion; the real Promptfoo regression retains both delayed grader operations and all six native rows |
| Live ledger reads omitted newly published work | Two publication inventories bracket the read; an unstable read is refused, and report cutoff, completion state and export links use the same snapshot |
| Unfinished candidates lost preparation duration | Recovery uses both start markers and retains the known preparation interval |
| Stored records could be attributed to another path or trial | File identities, manifest membership and result/grade operation references are checked before reporting |
| Missing native evidence blocked valid artifact regrading | Each check establishes its own evidence sufficiency; frozen artifacts can be graded independently |
| Missing diagnostic grades excluded decidable core-quality pairs | Selected grader compatibility constrains core checks; declared diagnostic definitions remain comparison conditions |
| Valid check names collided with JavaScript prototype properties | Selection maps have no prototype and missing selections use own-property checks; serialization and judgment tests cover both identifier forms |

The default corpus's separate native-approval qualification is explicit in
acceptance; no additional native approval case or profile was introduced.

The second review closed the other findings and identified a remaining live-read
window in operation accounting. The refined read now brackets immutable records
with two filename inventories, refuses changing inventories and carries the
observed cutoff and publication set into reporting. The existing atomic JSON
publisher also publishes rubric records after redaction. This avoids locks,
automatic retries, synthetic operations and a new persistence service. Targeted
tests cover both final-result and candidate-start publication during reading.
The third review independently closed this final consistency issue and the
atomic rubric-publishing change. Reviewers read fixed snapshots and did not run
tests or model evaluations; the primary ran the checks below and made final
acceptance. The full anti-slop check found no further removal needed: the added
inventory checks and regressions address demonstrated defects using the existing
record publisher and report contracts, without a new service, lock or retry loop.

## Approved scope

Implement and verify repository-owned Codex evaluation: native execution,
independent grading, retained evidence, comparisons, resource accounting and
official model-token price estimates. The owner's cleanup instructions require
current case/fixture names and removal of unused payloads, migration machinery
and superseded source archives.

Implementation belongs in `evals/`; directly coupled repository documentation is
maintained with it. Runtime `config/`, `plugins/`, `skills/` and marketplace sources
are read-only inputs. The baseline was imported once from the owner's global
Codex configuration; subsequent runs use repository profiles and explicit
machine/authentication references.

Landing mode is `commits`. The owner's 2026-09-12 follow-up authorizes staging
and local atomic commits of the accepted changes. Pushes, pull requests, merging
and remote pipelines remain outside that authorization.

The commit sequence first removes the unused source archives, then follows actual
dependencies: Promptfoo batches; quality and resource accounting; native transport
and evidence; isolated preparation; cases and deterministic checks; reports and
comparisons; independent grading and calibration; the CLI and complete corpus.
Each implementation stays with its direct tests. Intermediate trees are checked
with the frozen local gates before committing; no source rollback or rewrite of
the three existing branch commits is needed.

## Design constraints

- TypeScript and Bun, with Promptfoo 0.123.0 and the pinned skills 1.5.25 installer.
  Preserve the [frozen quality baseline](../../evals/AGENTS.md#frozen-quality-baseline),
  including warnings as errors, checked scope, coverage and Git hooks.
- Promptfoo owns scheduling, assertions and native JSON/HTML exports. Each batch
  has a separate local SQLite file for export support; project JSON records and
  original evidence remain authoritative.
- A thin adapter drives native Codex App Server. Codex owns the agent loop,
  tools and threads. Scripted user replies reuse a thread only within its trial.
- Only Codex receives model-effectiveness evaluation. Claude Code and Copilot CLI
  retain distribution/adaptation checks without an effectiveness guarantee.
- `run` defaults to the current candidate, the complete suite, one trial per case
  and concurrency 2. Subsets, repetitions and A/B comparisons are explicit.
  Time and token use are measured without task budgets or hidden whole-case retries.
- Execution state, quality and measurement coverage remain separate. Core checks
  determine `passed`, `failed` or `unknown`; there is no all-cases-pass delivery gate.
- Grading combines programmatic checks, text rubrics and read-only artifact
  rubrics. Model graders use gpt-6-astra/high in independent contexts.
- Reports and original evidence are immutable. Regrading adds judgments and
  incurred operations without adding candidate trials. Comparisons require
  explicit pairs and metric-specific eligibility.
- Prices are dated local snapshots with explicit model mappings and assumptions.
  Reference estimates are separate from attributable actual charges.
- Cases declare their own requirements and fixture bindings. There is no import
  map, archive dependency, transition alias or replacement corpus manifest.
  Tests use current fixtures and source domains.

## Delivery slices

| Slice | Status | Delivered behavior and acceptance |
| --- | --- | --- |
| Framework integration | Complete | Public Promptfoo API, fresh batch processes, disabled response reuse, independent export databases and retained project records |
| Native execution | Complete | Frozen inputs, isolated installation/discovery, declared prerequisites, scripted turns, approval boundaries, subagent evidence and interruption handling |
| Grading and reporting | Complete | Three grading methods, owner-confirmed calibration, separate execution/quality states, immutable reports, selected-case regrading and controlled A/B |
| Current corpus | Complete | 330 cases, 1,234 checks and 253 referenced fixtures; current skill/suite names and domain-organized tests; unused payloads and old tooling removed |
| Resource accounting | Complete | Phase duration, elapsed time, actor/model tokens, coverage, frozen reference prices and separate actual-charge evidence |
| Review and delivery | Complete | Confirmed findings corrected, affected areas re-reviewed, local gates passed, native evidence retained and English documentation aligned |

Native qualifications exercised the recorded implementation versions. The later
naming cleanup retained the scenarios and executable checks, but 130 execution
versions changed because task/authorization wording or fixture names changed.
The 196 routing and four native execution versions were unchanged. Historical
verdicts retain their original IDs and definitions; there was no full native
rerun after the cleanup.

## Verification

The latest full implementation gate was run from `evals/`:

```sh
bun run check && bun run test:coverage && bun run build && bun dist/index.js validate
```

It passed TypeScript and warning-as-error Biome checks, 198 tests with zero
failures and 860 expectations across 31 test files, and 96.40% imported-source
line coverage. Every imported source file met the unchanged 80% threshold.
The build bundled 32 modules; executable validation returned
`{"valid":true,"cases":330,"checks":1234}`.

The final consistency correction first passed
`bun test tests/execution/ledger.test.ts`: 12 tests, zero failures and 31
expectations. The full gate then covered the affected grading, regrading,
comparison and lifecycle paths as well. This review ran no real model suite;
the cancellation regression uses real Promptfoo scheduling with simulated graders.

After removing the unused source archives, this narrower check also passed:

```sh
bun test tests/corpus/inventory.test.ts tests/distribution.test.ts && bun run start -- validate
```

It passed four tests with zero failures and confirmed the same corpus counts.
The inventory check establishes that every shipped fixture is referenced and
that all current case definitions load successfully. These local checks do not
run model evaluations. `git diff --check` passed.

Lefthook configuration and explicit pre-commit/pre-push execution were qualified
during implementation. Hook configuration and package scripts remain unchanged;
hook installation does not run automatically during dependency setup.

## Review and refinements

Independent read-only contexts covered runtime, grading, accounting and
corpus/design, with the primary retaining integration and final judgment.
Corrections preserve known native evidence when auxiliary logs are damaged,
allow local grading without model credentials, surface run-level errors, validate
rules before regrading, and preserve report/accounting identity and history.
Affected-area re-review returned no surviving actionable findings.

The cleanup retained all 1,234 check methods, core flags, executable rules and
approval declarations. All 250 moved fixture modes were preserved; 242 payloads
were byte-identical and eight received consistent identifier/wording changes.
Three unused payloads and two archive-dependent tests were removed. One small
current-inventory test replaced those tests. Fifteen unused origin tags were
removed from assertion configuration.

Source and test readability was then aligned with the owner's reference style:
braced control flow, logical phase separation and distinct test setup/action/assertion
groups. Seventy of 72 TypeScript files changed. A syntax-tree comparison accepted
only equivalent control-body blocks and formatting; strings, operations and test
assertions were preserved. The same 183 tests and 815 expectations passed.
Expanded statements changed the line-based coverage denominator; the current
percentage above still exceeds every unchanged per-file threshold. The conventions
are recorded in [the local guide](../../evals/AGENTS.md#code-readability).

The full anti-slop check rejected keeping migration data in another directory.
The final implementation has no migration archive, alias table or duplicate
manifest. A separate read-only cleanup review found no actionable defect; the
primary verified its evidence and accepted the changes.

Review contexts were independent GPT-family tasks. Roles were configured as
gpt-6-astra/high for critical reviews and gpt-5.6-luna/max for bounded reviews;
individual runtime model/effort telemetry was not separately returned. The
owner-excluded Daybreak-dependent security workflow is not claimed as completed.

## Acceptance boundary

[The acceptance record](acceptance.md) identifies native qualification runs,
owner-confirmed calibration labels, controlled comparison/regrading evidence,
historical full-suite verdicts and resource measurements. Candidate failures and
insufficient evidence remain visible evaluation outcomes. Reference costs retain
their assumptions and partial coverage; actual gateway charges remain unknown.

The implementation and renewed review are complete. Future runtime-skill changes,
new model evaluations or publication are separate tasks. Generated evidence stays
in ignored output directories; this plan records current scope and completion
without obsolete worker assignments or intermediate pending checklists.
