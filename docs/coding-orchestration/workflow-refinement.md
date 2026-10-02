# Personal workflow refinement

The 2026-10-02 repository delivery makes the personal Codex workflow smaller while
retaining useful engineering methods. The harness owns goals, plans, continuation
and execution cadence. Skills do not require a task ledger or a fixed sequence.

Workflow `0.2.1` contains four independent skills: `anti-slop`, `decompose-feature`,
`ensure-atomic-pr` and `refresh-related-docs`. Its package has seven files and
18,429 bytes, compared with 21 files and 72,229 bytes in the captured original.
These are source-package measurements, not prompt-token or latency measurements.
The engineering-design template remains an optional writing aid.

PR Review `0.1.3` accepts explicit change sets and selected review artifacts.
Ordinary feature, compatibility and delivery advice stays in the primary session.
Specialist diff security review applies only to supported Git change sets; a
non-diff artifact keeps ordinary review and an explicit specialist coverage gap.
The security composition omits Daybreak access queries, access-status warnings and
enrollment prompts, retaining technical scan checks and substantive security coverage.
Decomposition and atomicity use commits as their default unit; PR grouping is decided
at submission or when explicitly requested. The public skill invocation names remain.
The personal [configuration](../../config/codex/config.toml) preserves the user's
primary model/provider settings; [instructions](../../config/codex/AGENTS.md)
make simple work direct, delegation conditional, and verification proportionate.

## Reused daily-task evidence

Before the final review repairs, all 35 runtime source files matched the frozen
refined v5 inputs byte for byte. Subsequent security-routing and commit-focused
instruction changes are not covered by that frozen comparison. Four representative
tasks were defined before execution; each ran three times per version:

| Task | Original | Refined |
| --- | --- | --- |
| Diagnose, then repair CSV quoting after authorization | 3/3 passed | 3/3 passed |
| Audit, then synchronize logging documentation | 3/3 passed | 3/3 passed |
| Review persisted expiry across clock domains | 3/3 passed | 3/3 passed |
| Advise on reducing live concurrency | 3/3 passed | 3/3 passed |

All 33 selected checks passed in the twelve refined trials. Isolated Codex
preparation discovered exactly the four workflow skills. The complete ordinary
v5 sample scored 125/132 passed in each version. These observations support
retaining task quality in this sample; they do not prove universal equivalence.
Some other review grades have recorded scope-interpretation disputes. Frozen case
copies, grades and reports remain unchanged, and the former strict comparison's
`improvementAccepted: false` is preserved.

Local validation after the final repairs passed: `bun run check`,
`bun run test:coverage` (301 pass, 0 fail), `bun run build`,
`bun run start -- validate` (338 cases, 1,265 checks), and repository-root
`git diff --check`.
Earlier distribution receipts cover the pre-repair instructions. Fresh native
installation and update checks now cover the final PR Review package, as described
below. Raw comparison evidence is retained under
`evals/out/natural-v5-comparison-20261001/`,
`evals/out/scoring-context-check-20261002/` and
`evals/out/pr-review-entry-refinement-20261001/`.

The active daily corpus now has one maintained version, v5. Nineteen intermediate
case, registry and obsolete fixture files are preserved byte-for-byte under
`evals/out/refinement-history-20261002/`. The original 338 regression cases remain
unchanged. Corpus tests validate current inputs and every bundled fixture, rather
than compare historical draft copies. No old run or grade was rewritten.

Final review repairs strengthen the config parser's unknown-field assertions,
exercise directory-mode restoration under an isolated `0077` umask, and classify
the two artifact reviews as outcome checks with PR Review available, without
claiming skill invocation. Installed guidance reads are explicitly allowed in those
two future task contracts. The default registry remains the 338-case corpus; the
daily-task preset is selected through the existing registry configuration.

The preceding full change review covered 20 modified tracked files and 192 untracked files,
including all 46 new case definitions and their 179 fixture payloads. Framework,
corpus and runtime/documentation reviews used separate read-only task contexts;
the primary reviewed the sources and confirmed findings before correction.
An independent necessity assessment found no additional supported deletion.
All five confirmed findings and a directly coupled README omission were closed
after targeted re-review. Reviewer model and effort were not verified from native
execution evidence, so separate contexts do not imply model-family diversity.

Eight source-reviewed synthetic controls exercised finding correctness and
instruction authority separately through both model-grading paths. All sixteen
verdicts matched their proposed expectations, including the intended unknown
result when message authority was missing. These controls are diagnostic checks,
not owner-confirmed human calibration, candidate trials or evidence of a score
improvement. Their inputs and results remain under
`evals/out/instruction-scope-controls-20261002-v2/`; final framework evidence is
under `evals/out/refinement-final-validation-20261002/`.

Fresh isolated distribution checks installed PR Review `0.1.2` and updated to
`0.1.3` with Codex CLI `0.160.0`, Claude Code `2.1.280` and Copilot CLI `1.0.89`.
Each reported the new version and discovered all three PR Review skills; every
file in the final 16-file package matched the repository source. Copilot's
registered local marketplace uses live source loading, rather than a plugin
cache. Cached `skills` CLI `1.7.0` also produced identical `npx skills add --copy`
snapshots. These are installation and discovery observations; no Claude or
Copilot model-effectiveness claim is made.

One actual Codex artifact review exercised the repaired security routing with
`gpt-6-astra`, effort `xhigh` and read-only permissions. The final report kept the
supplied design target, identified its missing download authorization and marked
explicit specialist security coverage incomplete for that unsupported artifact.
Native records contain a completed independent ordinary-review result, and the
artifact digest stayed unchanged. An initial nested-sandbox attempt could not
read files because of socket-directory permissions; its blocked result remains
separate from the successful host-run check. This bounded regression does not
establish a performance improvement or universal behavioral reliability.

The commit-focused follow-up adds two separate outcome regressions under
`evals/cases/workflow-commit-v1/` and an independent Daybreak-exclusion criterion
to the artifact review. Original regression inputs and frozen run records remain
unchanged. Targeted distribution/corpus tests passed (7 tests, 0 failures), all
three edited skill entrypoints passed structural validation, and both specialist
case roots loaded successfully (2 commit cases with 8 checks; 2 artifact cases
with 5 checks). Independent review found and closed two inherited reference-answer
errors; no other supported finding remained.

Fresh native installation/update and discovery checks covered Workflow `0.2.1`
and PR Review `0.1.3` in all three CLIs, with complete package byte comparisons and
seven matching copy snapshots. Three Codex checks, using `gpt-6-astra`, effort
`xhigh` and read-only permissions, produced the expected commit boundaries,
deferred PR grouping and concrete artifact finding. Recorded primary calls had no
Daybreak query, and the response had no Daybreak status warning or enrollment
instruction. All fixture files remained unchanged. These were bounded behavior
checks, without formal model grades or a repeated full Git security scan; the scan's
technical lifecycle was preserved in source and independently reviewed. Evidence
is retained under `evals/out/commit-first-no-daybreak-20261002/`.

The practical improvement is a smaller instruction package and fewer process
obligations. The reused ordinary sample showed no score reduction for its frozen
inputs; it does not grade the later commit-focused changes. A statistically
demonstrated speed or cost improvement is not established. Further changes should
follow concrete daily-use problems. Repository commits and pull-request publication
do not activate production plugins or overwrite `~/.codex`; local activation is a
separate authorized action.
