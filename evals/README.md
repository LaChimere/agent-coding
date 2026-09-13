# Codex evaluations

Evaluate this repository's skills, complete plugins, and `config/codex` through
native Codex. Promptfoo schedules cases and runs assertions; project records keep
execution, quality, time, token usage, and cost separate. Claude Code and Copilot
CLI are distribution targets, not model-effectiveness targets.

A case specifies a task and its checks. A trial is one fresh Codex execution of
that case; fixture files establish its starting workspace. Regrading adds a new
judgment of saved evidence, not another trial.

The [design](../docs/evaluation/design.md) defines the contract. The
[implementation plan](../docs/evaluation/plan.md) records acceptance progress.
The [acceptance report](../docs/evaluation/acceptance.md) records qualifications,
explicit execution/regrading selections, observed quality and measured resources.

## Setup

Run these commands from this directory with Bun 1.4.2:

```sh
bun install --frozen-lockfile
bun run start -- validate
bun run start -- run --case native/scripted-context
```

The [frozen quality baseline](AGENTS.md#frozen-quality-baseline) requires the
repository owner's explicit approval before any validation or code-style rule is
weakened or bypassed.

The versioned `profiles/default/` baseline was imported from the owner's global
Codex configuration. Runs never reread global instructions or installed personal
skills. `runtime.json` declares the local Codex executable, required tools and
their code-library read paths, and credential references. Inspect these explicit
machine dependencies when moving to another workstation. The qualified platform
is macOS with Codex CLI 0.154.0; unsupported native capabilities cause preparation
to refuse the trial before a model turn.

The default provider is the existing gateway at `http://127.0.0.1:4141/v1`.
`GITHUB_COPILOT_API_KEY` takes precedence over the explicit local JSON-file
reference in `runtime.json`. Credential values remain in memory and the owned
child environment; do not place credentials in profiles or case files. Tool
commands use controlled HOME, CODEX_HOME, TMPDIR and PATH. Machine Git config is
disabled. Native Codex must be able to apply its sandbox; nesting it under another
Seatbelt sandbox can fail during preparation.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Run the entry point in watch mode. |
| `bun run start` | Display evaluation CLI help. |
| `bun run start -- validate` | Validate the development collection and programmatic rules without model calls. |
| `bun run start -- run` | Evaluate the current candidate on development cases, once each, at concurrency 2. |
| `bun run start -- calibrate` | Check both grader methods against the owner-confirmed calibration labels. |
| `bun run start -- regrade RUN [--case ID ...] [--grading FILE]` | Grade frozen evidence with frozen criteria or explicit corrections; create a new report. |
| `bun run start -- report RUN` | Build an immutable report from the run's original criterion definitions. |
| `bun run start -- compare LEFT.json RIGHT.json` | Pair explicitly executed runs by case ID and repetition. |
| `bun run start -- view REPORT.json` | Locate the project report and open its native Promptfoo export. |
| `bun run build` | Rebuild `dist/index.js` for Bun. |
| `bun run check` | Run TypeScript checking and Biome checking. |
| `bun run lint` | Check formatting, imports, and lint rules; warnings fail. |
| `bun run lint:fix` | Apply Biome's safe fixes; remaining warnings fail. |
| `bun run test` | Run local tests under `tests/`. |
| `bun run test:coverage` | Run those tests with coverage reporting. |

Framework tests follow the source domains under `tests/codex/`, `tests/corpus/`,
`tests/execution/`, `tests/grading/`, `tests/preparation/`, `tests/promptfoo/` and
`tests/results/`. CLI lifecycle and repository distribution checks remain at the
test root; fake native processes and subprocess runners live in `tests/fixtures/`.
Run a domain directly with, for example, `bun test tests/grading/`.

Case fixtures are inert `.fixture` data and are restored to their execution
filenames inside each trial. The frozen Bun test configuration requires at least
80% line coverage for each imported file. Local tests use fake native child
processes and deterministic provider responses; real native/model acceptance is
recorded separately. The build requires the pinned installed
Promptfoo package at runtime; it is not a dependency-free executable.

## Collections and access

`collections.json` selects separate development and holdout case/fixture roots.
Development is the default for `validate`, `run`, `regrade`, `report`, `view` and
`compare`. Use `--collection holdout` explicitly for holdout acceptance. Calibration
is independent and accepts no collection selection.

Selection precedes discovery and snapshots. Default operations do not inspect
holdout task contents or copy their fixtures. A saved run has `collection.json`;
a saved report has an adjacent `REPORT.json.collection.json`. These small scope
records must match before the full payload is read. Preserve the sidecar when
copying a report. Run and report schemas are `codex-evals/run-v2` and
`codex-evals/report-v2`; the CLI does not read previous formats or migrate archives.

Frozen membership, version, source grouping and known exposure describe the
selection at that time. Do not rewrite a completed run when the live collection
changes. Tasks exposed to tuning move to future development use, with their
history retained; replacement holdouts must use new problem structures. Separate
authoring/validation contexts can prepare holdouts without disclosing their
contents or diagnostic feedback to the tuning context. These records document
known exposure, not a guarantee about model training data.

## Running and comparing

```sh
# Explicit subset or repeated samples
bun run start -- run --case native/verified-fix --repeat 3 --concurrency 2

# A separate candidate checkout; each invocation freezes a fresh run
bun run start -- run --candidate /absolute/path/to/candidate --case native/verified-fix

# Supply explicit pricing or attributable charges when available
bun run start -- report out/runs/RUN_ID --prices /path/to/prices.json --charges /path/to/charges.json
```

Use `--profile NAME` for another versioned profile and `--codex PATH` for an
explicit native executable. Candidate TOML tables recursively overlay the
baseline, arrays replace, and type conflicts are rejected. Candidate AGENTS.md
and the agents directory replace those baseline units completely.

There is no task time or token cap and no response reuse or silent whole-case
retry. Control requests and isolation probes have separate error-detection
timeouts. Ctrl-C interrupts owned work and prevents queued rows from starting
candidate or grader work. Running callbacks finish their cleanup and persist
records before Promptfoo exports and project resource totals are finalized.
A connection failure does not prove
that the last request never executed; this version does not resume a crashed
candidate trial automatically.

A comparison uses fixed case/repetition pairs, without selecting outcomes. Each
metric reports eligible pairs and exclusions. Different case execution inputs,
grading definitions, collection membership, runtime tools, or framework conditions can make a pair
ineligible. Candidate model, roles, and permissions may be the experiment's
intended variables. Single trials describe observations, not reliability estimates.
Core quality comparisons require matching selected core-grader configurations;
an absent or different diagnostic grade does not exclude a decidable core result.

## Cases and judgments

Each JSON file in the selected case root contains Promptfoo cases with `vars.task`,
repository metadata and JavaScript assertions. Metadata declares:

- `assessment`: ordinary task `outcome` or skill `mechanism`.
- `workFamily`: `planning`, `implementation`, `review` or `documentation`; it may
  be null for a pure mechanism case.
- `provenance`: the task source and source/fixture/solution grouping.
- `requirements`: records with `id`, `capability`, `authority`, `appliesWhen` and
  observable `evidence`; assertions reference their IDs.
- Fixture bindings, execution conditions, scripted replies and authorization.

The rubric and `metadata.reference` are grading guidance, not new candidate
obligations. A valid alternative or concise result can pass. Optional skill
omission does not fail an ordinary outcome; explicitly required processes remain
part of its task contract.

Requirement `evidence` describes stable observation sources, such as native actions
or immutable artifacts. Keep scoring conditions only in assertions/reference;
copying a rubric into a frozen requirement leaves stale guidance after regrading.

The candidate receives `vars.task` followed by `metadata.authorization.scope`.
Promptfoo displays that same composed prompt, and the execution fingerprint
includes it. Future scripted replies, approval decisions, requirements, references
and assertions are not included in the initial candidate prompt.
Every requirement maps to a core or diagnostic assertion. See
[`native-interaction.json`](cases/native-interaction.json) for runnable examples.
Use [`refinement-probes.json`](cases/refinement-probes.json) for clarification,
blockers and same-worker repair scenarios. Configured worker/reviewer invocations
are covered by [`role-probes.json`](cases/role-probes.json).
Cases use their current skill or suite names, and fixture bindings resolve
under the selected collection's fixture root. The corpus inventory test validates the actual case
files and rejects unreferenced fixture payloads.
Programmatic rules are validated by the shared case parser, including explicit
grading corrections, before a runnable grading batch is published. Grader modules
live under shared `src/`; collection-specific answers and checks stay in the
selected private case data, not shared framework code.

Use `programmatic` checks for file existence, exact text, route classification,
native conversation evidence, or a trusted offline verification command. Commands
run without a model or provider credentials against a separate writable artifact
copy. Use `text-rubric` for semantic judgment over supplied evidence and
`artifact-rubric` when an independent, read-only Codex judge must inspect files.
Both model graders use gpt-6-astra/high and record observed identity. Candidate
files are grader data; their instructions do not configure the judge.
Only model grading resolves provider credentials. Missing model authentication
creates an explicit unknown/error grading record; local programmatic regrading
continues to work without those credentials.

`native-conversation` rules declare `countScope: "root"` or `"all"`. Root counts
use the main conversation's observed messages, so valid worker threads do not
inflate a two-turn user interaction. All counts include the captured thread/turn
set. An optional ordered `sequence` follows the root conversation in either mode;
missing required message capture remains unknown. Worker identity and context
reuse require their separate native-evidence checks.

For generated filenames whose directory is intentionally unspecified, a
`file-pattern` rule (for example `{"type":"file-pattern","pattern":"**/result.json"}`)
matches regular-file paths in the frozen inventory. It does not follow symbolic
links. Model graders also receive original fixture content and declared execution
conditions, so local fixture evidence is not confused with a real external service.

Quality is `passed`, `failed`, or `unknown`. A failed core check fails the case;
otherwise missing core evidence makes it unknown. Diagnostic checks cannot fail
an otherwise successful case. Execution and grader errors remain separate.
Decidable pass rate uses passed / (passed + failed), while decision coverage uses
(passed + failed) / planned. There is no suite-wide all-pass gate or weighted score.

Reports separate ordinary outcomes from skill mechanisms and summarize planning,
implementation, review and documentation. Requirement coverage links checks to
observed evidence; diagnostic-only checks do not qualify a required capability.

The owner-confirmed calibration examples cover complete and missing capture,
concise correct results, wrong routes, valid alternatives, authority boundaries,
worker evidence and unsupported completion claims across both model methods.
Agreement on this finite set does not establish accuracy for every domain rubric.
Review disagreements and add representative human-labeled examples as criteria evolve.
Each calibration run freezes its price snapshot and records grader time, tokens
and estimated cost. Calibration does not add candidate execution samples.

Each human confirmation covers both grader methods and the exact sample hash.
Calibration rejects mismatched or incomplete confirmations; proposed labels do
not count as confirmed human judgments.

## Evidence and resource accounting

Each `out/runs/RUN_ID/` contains frozen private framework/case/profile inputs,
candidate runtime inputs, per-trial native protocol and artifacts, append-only
grading/operation records, immutable JSON/Markdown reports, and native Promptfoo
JSON/HTML exports. A private SQLite file supports those native exports; it is not
the authoritative result store. Generated records and caches stay ignored.

Native evidence retains root/worker conversations, observed role assignments,
parent-child source references and per-turn model/effort. Missing identity stays
null; a message recipient alone does not establish a child worker.

An operation records one preparation, execution, verification or grading attempt.
Run-level status, failure cause and the completion-record link appear in the
project report, including errors before the first trial or during batch export.
An absent completion record is unknown, not proof that a process is still running.
Auxiliary session-log damage remains an evidence limitation while usable native
protocol output, identities and token counters are retained.
Ledger loading validates record identities and trial-operation references. It
reads results and grades before their operation records, matching the writer's
operation-before-result publication order. Unfinished trial reconstruction keeps
the completed preparation interval when a candidate-start marker exists.
Two inventories of immutable published records bound the read. If publication
changes that inventory, reporting refuses the unstable read; run `report` again
to observe the newer records. This never repeats candidate execution. A stable
read fixes the accounting cutoff, completion state and available export links.

Saved reports select one grading record per check using the latest matching
attempt by start time, then stable ID. Regrading appends records and consumption
without adding candidate trials or changing old report bytes. A later `report`
command uses original run definitions; the report produced by `regrade` explicitly
selects its revised definitions. Without `--grading`, regrading uses the original
frozen case definitions and never discovers the current corpus. `--case ID`
selects cases within that frozen run; other trial definitions remain unchanged
in the full project report. The native Promptfoo export covers only the selected
regrading trials. All recorded attempts remain in resource accounting.

An explicit correction file has schema `codex-evals/grading-v1`, the original
`collection` object, and `cases` entries containing `caseId`, optional `assert`,
and optional `metadata: { reference }`. Its adjacent `FILE.collection.json` holds
the same original collection record and is checked before the correction payload.
No other fields may be overridden. Assertion requirement IDs must already exist.
A correction must preserve the original obligations even when its fields pass
validation; changing task inputs, authority, required evidence or interactions
requires a new execution. Review the semantic correction before applying it to
both sides of a comparison. An increase caused by grader repair is not candidate
improvement.

Evidence sufficiency is decided per check: an unavailable native transcript does
not prevent an artifact check from using an intact frozen artifact inventory.

Project JSON is authoritative for unknown states and resource scope. Promptfoo's
native boolean pass percentage does not implement the project's denominator rules.
Raw protocol, observed actor context and original artifacts remain available.
Skill-path reads are marked as inferred use; missing reads do not prove non-use.

Time is recorded in milliseconds for preparation, queueing, execution, verification and grading.
Parallel operation durations do not equal elapsed wall time. Cumulative usage is
deduplicated; cached input and reasoning output are subsets, not extra tokens.
Interrupted usage and unestablished parent/child overlap remain partial.
When later regrades are included, wall time spans the first included operation
through the last, including time between invocations; phase durations describe
the recorded work itself.

New runs freeze [`pricing/openai-standard.json`](pricing/openai-standard.json)
with the private inputs and copy its contents into the manifest. Reports and
regrades use that frozen snapshot unless `report --prices FILE` explicitly supplies
another book. Existing reports and usage records remain unchanged; loading prices
makes no network/model request.

The supplied book uses official OpenAI Standard text-token reference rates for
the configured Astra, Sol and Luna models, with dated source links and explicit
model mappings. These are estimates under stated conditions, not gateway or
subscription charges. Per-request service tier, long-context adjustments and
cache writes are not fully established by normalized usage; the default estimate
therefore stays `partial`. A cumulative thread total is never used as a request's
context length. Unknown models or absent token categories retain their own reasons.
The report's **Estimate basis** section lists the assumptions and uncertainties.

A custom price book has `source`, `version`, `currency`, `rates` per million tokens,
and `modelMapping`; rate entries have `input`, `output`, and `cachedInput` values
or explicit nulls. Optional `references`, `assumptions`, and `uncertainties` are
string arrays; declared pricing uncertainties keep a numerical estimate partial.
Update the repository price snapshot from its linked official pages when choosing
a new reference date, then run local checks. There is no live-price auto-refresh
that could silently change historical estimates. Actual charges need unique `id`,
`operationId`, `amount`, `currency`, `source`, `attributable`, and `reason` fields.
Unavailable pricing components or actual-charge allocation remain unknown, not zero. Reports retain
failed and superseded operation consumption as well as selected successful grades.

## Git hooks

`lefthook.yml` lives in this directory. The `hooks` package script sets
`LEFTHOOK_CONFIG` relative to the Git root so no root-level configuration is needed.
The launcher preserves the Git worktree root before entering the package directory.
Pre-commit runs `lint` when staged files affect `evals/`. Pre-push runs `check`
and local `test` in parallel when outgoing changes affect `evals/`. Hooks do not
modify or stage files, run model evaluations, or access a model provider.

To install the hooks explicitly:

```sh
bun run hooks install
```

Git worktrees share hooks by default. In a linked worktree, configure a
[worktree-specific hooks path](https://git-scm.com/docs/git-worktree#_configuration_file)
such as `evals/.cache/git-hooks`, preserving any existing hooks. Once
`core.hooksPath` is set, use `bun run hooks install --force` to install into that
selected directory. Installation is explicit rather than a package setup script.

To check the hook configuration and run its commands without installing hooks:

```sh
bun run hooks validate
bun run hooks run pre-commit --no-auto-install --file evals/src/index.ts
bun run hooks run pre-push --no-auto-install --file evals/src/index.ts
```
