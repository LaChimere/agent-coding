# Skill eval harness

`skill_evals.py` is a small, Python-standard-library harness for durable, repository-level Agent Skills evaluation. It is deliberately provider-neutral: a future CLI, API, blind rubric grader, or subagent runner receives a JSON request and returns JSON results; this tool neither invokes a Copilot session nor reads credentials, and it does not introduce a provider adapter.

## uv environment

`tools/skill-evals/` is a standalone, non-package uv project. It requires Python 3.14 or newer, pins the local development interpreter to Python 3.14, and keeps pytest as a development-only dependency. The harness runtime itself remains standard-library-only.

From the repository root:

```sh
uv sync --locked --project tools/skill-evals
uv run --locked --project tools/skill-evals python --version
```

Use `uv run --locked --project tools/skill-evals` for every harness or Python test command so the checked-in `uv.lock` and interpreter constraint are enforced.

### Lint and type diagnostics

The checked-in Ruff and ty rule sets are project policy. Do not weaken them to clear diagnostics;
adjust code or project-path integration instead.

```sh
uv run --locked --project tools/skill-evals \
  ruff check --config tools/skill-evals/ruff.toml tools/skill-evals

uv run --locked --project tools/skill-evals \
  ruff format --check --config tools/skill-evals/ruff.toml tools/skill-evals

uv run --locked --project tools/skill-evals \
  ty check --project tools/skill-evals \
  --config-file tools/skill-evals/ty.toml
```

## Repository layout: skills are distributed, evals are not

```
skills/<skill>/            # standalone runtime skill, distributed by `npx skills add`
plugins/*/skills/<skill>/  # runtime skill bundled in a Codex plugin
evals/<skill>/             # central eval corpus: evals.json, manifest.json, files/ fixtures — never distributed
evals/<skill>/outputs/     # generated grading/run artifacts (git-ignored, excluded from digests and snapshots)
evals/suites/              # cross-skill trigger/composition suites
tools/skill-evals/         # harness implementation, configuration, and tests
.skill-evals/              # git-ignored workspace for generated run requests, snapshots, imports, aggregates
```

Eval material is a **repository-maintenance asset**, not part of a skill. Keeping it out of `skills/` is what makes an installed copy hermetic: a skill installed with `npx skills add` cannot read its own cases, fixtures, expectations, or manifest metadata such as `critical_ids`, so a run cannot be contaminated by its own answer key.

`validate` enforces the split: every runtime skill under `skills/` or `plugins/*/skills/` needs a matching `evals/<skill>/`, every `evals/<skill>/` needs one uniquely named runtime skill, and any surviving in-skill `evals/` directory is rejected. A root skill and plugin skill may not share the same name.

## Corpus validation

```sh
uv run --locked --project tools/skill-evals \
  python tools/skill-evals/skill_evals.py validate --repo .
```

Validation checks every discovered runtime `SKILL.md` frontmatter, referenced bundled `references/`, `templates/`, and `scripts/` files, each `evals/<skill>/evals.json` document, fixture path, and manifest case-ID relation. Fixture paths in `files` are relative to the skill's central eval directory (for example `files/checkout-state.ts` for `evals/execute-plan-loop/files/checkout-state.ts`) and may not escape it; an optional case-level `fixture_prefix` declares the corpus directory to strip when the fixture is written into the case workspace (see below). It also checks every bundled suite under `evals/suites/*.json`; use `--suite path.json` for an additional suite. Existing free-text expectations remain intact as evidence; only `grading` checks are deterministically machine-graded, and expectations are graded by rubric (see below).

Frontmatter rules: `name` must equal the skill's directory name, match `^[a-z0-9]+(-[a-z0-9]+)*$`, and be at most 64 characters; `description` must be non-empty and at most 1024 characters. Frontmatter is parsed by hand (no YAML dependency is added).

**Unknown keys are rejected, not silently ignored.** A case in `evals.json` may only use `id`, `prompt`, `expected_output`, `files`, `expectations`, `grading`, `fixture_prefix`, and `execution`; a `manifest.json` may only use `skill_name`, `default_execution`, `default_category`, `critical_ids`, `behavior_change_ids`, `redundant_ids`, `deterministic_ids`, `critical_expectations`, `behavior_change_rationale`, and `clarification_rationale`. Any other key (for example an `excution` typo) fails validation instead of being silently dropped. `behavior_change_rationale` and `clarification_rationale` both map either a known case id, or a `_`-prefixed meta key documenting something that spans several cases (for example `_scenario_fixtures`), to a non-empty string.

**`deterministic_ids` must actually be deterministically gradable.** A case listed in a manifest's `deterministic_ids` must declare at least one `grading` check; a case with no `grading` checks cannot be scored deterministically, so listing it here is a contract error, not just missing rubric coverage.

## Reproducible run preparation

Use a fresh agent context for every case. Pin a fixed provider/model identifier and all model settings (including temperature) in `--config-json`; never compare a run with mutable settings. Outputs are immutable: preparation/import/aggregation refuse to overwrite existing paths.

```sh
uv run --locked --project tools/skill-evals \
  python tools/skill-evals/skill_evals.py prepare \
  --repo . --role baseline --model provider/model@fixed \
  --config-json '{"temperature":0,"max_tokens":4096}' \
  --agent agent-a --agent agent-b --comparison-key pr-1 \
  --suite evals/suites/trigger-composition.json \
  --output .skill-evals/baseline-run.json

uv run --locked --project tools/skill-evals \
  python tools/skill-evals/skill_evals.py prepare \
  --repo . --role candidate --model provider/model@fixed \
  --config-json '{"temperature":0,"max_tokens":4096}' \
  --agent agent-a --comparison-key pr-1 \
  --suite evals/suites/trigger-composition.json \
  --baseline-run-id baseline-... --output .skill-evals/candidate-run.json
```

### Two identities: runtime skill tree and evaluation corpus

A run has two independent contents, and `prepare` computes, digests, and freezes each one separately:

| Identity | Covers | Digest | Snapshot |
|---|---|---|---|
| Runtime skill tree | distributed root or plugin `skills/<skill>/` content | `repository.selected_skill_tree_digest` (+ per-skill `repository.skill_tree_digests`) | `<run_id>.skills-snapshot/<skill>/` |
| Evaluation corpus | `evals/<skill>/` cases, manifests, fixtures, and the selected suites | `evaluation.corpus_digest` (+ `evaluation.eval_tree_digests`, `evaluation.suite_digests`) | `<run_id>.evaluation-snapshot/skills/<skill>/` and `.../suites/<suite>.json` |

Both digests are folded into `run_id`, so changing a skill *or* changing a case produces a different run identity. `repository.sha` is still recorded for provenance, but neither digest depends on the mutable checkout. Generated artifacts are excluded from the evaluation digest and snapshot, so stale grading output can never change a run identity or leak into a run: a top-level `evals/<skill>/outputs/` directory is excluded entirely (a nested directory that merely happens to be *named* `outputs` deeper inside a skill's eval tree is not, since that is a legitimate fixture name, not a generated-artifact directory), and, matching `.gitignore`'s unanchored patterns, any file named `grading.json`, `timing.json`, `benchmark*.json`, `benchmark*.md`, or `review*.html` is excluded at any depth. A fixture (`files` entry, `path_prepend`, or `executable_files`) that points at a generated-artifact path is rejected by `validate`, since such a path is never present in the frozen evaluation snapshot a case's fixtures are copied from; a fixture reference to a path missing from the snapshot for any other reason also fails with a `ContractError` rather than an unhandled OS error.

`prepare` refuses to run if either snapshot directory already exists, matching the immutable-artifact convention used everywhere else in this harness. If preparation fails partway through (for example, eval material is unexpectedly found in the runtime snapshot), any snapshot directory `prepare` created *during this invocation* is removed before the error propagates, so a fixed and re-run `prepare` is never blocked by a partial directory left behind by the failed attempt. A snapshot directory that already existed before this invocation started (for example, from a colliding `run_id`) is never deleted, whether or not this invocation succeeds.

### Fixtures come from the evaluation snapshot

`evaluation_snapshot` is a plain mapping any adapter can use without knowing this repository's layout:

```json
"evaluation_snapshot": {
  "root": "/abs/.skill-evals/<run_id>.evaluation-snapshot",
  "skills": {"execute-plan-loop": "/abs/.../evaluation-snapshot/skills/execute-plan-loop"},
  "suites": {"trigger-matrix": "/abs/.../evaluation-snapshot/suites/trigger-matrix.json"}
}
```

Every skill case carries `fixture_root` (its frozen eval directory) plus `fixtures`, each entry being `{path, source, sha256, workspace_path}`:

| Field | Meaning |
|---|---|
| `path` | where the fixture lives in the eval corpus (`files/bin/trivy`) |
| `source` | absolute path to copy **from**, always inside the evaluation snapshot |
| `sha256` | digest of the frozen bytes |
| `workspace_path` | where the adapter must write it **to**, relative to the case workspace (`bin/trivy`) |

**An adapter copies `source` to `workspace_path` and never derives a destination itself.** Cases and fixtures never reference the runtime snapshot or the mutable repository, so a runner materializes exactly the bytes the run identity was computed over. Suite cases similarly carry `suite_identity` with `repository_path` (provenance), `snapshot_path` (the frozen copy), and `content_sha256`.

#### `fixture_prefix`: give a case a workspace that looks like a real project

A corpus path such as `files/bin/trivy` is a corpus-layout detail; a case usually wants the workspace to contain `bin/trivy`. An optional case-level `fixture_prefix` states the corpus directory to strip:

```json
{"id": 0, "fixture_prefix": "files", "files": ["files/bin/trivy", "files/cluster/pods-payments.json"]}
```

produces `workspace_path` values `bin/trivy` and `cluster/pods-payments.json`.

- **The default is backward compatible:** with no `fixture_prefix`, `workspace_path` equals `path`, which is exactly the pre-existing contract, so adding the field never moves an existing fixture.
- `validate` requires the prefix to be relative, to stay inside the eval corpus, to exist as a directory there, and for **every** `files` entry to live beneath it — otherwise stripping it could escape the workspace or collide with an unrelated fixture.
- `execution` hints are written in the same workspace coordinates (`path_prepend: ["bin"]`, not `["files/bin"]`) and are resolved back through the prefix during validation.

### Hermetic execution hints: an adapter must honor them or refuse the case

Some skills act on external systems (a container registry, a vulnerability database, a Docker daemon, a Kubernetes cluster). Those cases are only meaningful — and only safe — if the "external system" is a local fixture. A case can therefore declare an optional `execution` block, and a skill manifest can declare a `default_execution` block that applies to every case that does not declare its own (a case-level block replaces the default outright; there is no deep merge):

```json
"execution": {
  "network": "disabled",
  "path_prepend": ["files/bin"],
  "executable_files": ["files/bin/trivy", "files/bin/kubectl", "files/bin/docker"]
}
```

| Field | Meaning for the adapter |
|---|---|
| `network` | `"disabled"` (or `"enabled"`) — the case must run with outbound network access turned off |
| `path_prepend` | workspace-relative directories to prepend to `PATH`, in order, so local fixture binaries win over any host binary of the same name |
| `executable_files` | workspace-relative fixture files that must be executable after materialization (a plain file copy usually drops the mode bit) |

Both path fields use the case's `workspace_path` coordinates — the same paths the adapter just wrote — so a case with `fixture_prefix: "files"` names `bin/trivy`, not `files/bin/trivy`.

The hints are provider-neutral: they state a requirement, never a mechanism. No container image, sandbox flag, or CLI is named, so any adapter can satisfy them however it isolates work.

**An adapter MUST honor every hint on a case, or refuse to run that case.** Silently ignoring `network: disabled`, skipping a `path_prepend` directory, or leaving `executable_files` non-executable makes the case reach whatever real registry, database, daemon, or cluster the host can see; the resulting result is not a valid observation of the skill and must not be imported or compared. Refusing the case (and reporting it as not run) is always the correct fallback.

**A case with an `execution` hint must prove it was honored, or refuse.** `import-results` requires one of two things for such a case's result: either `execution_honored`, deep-equal to the case's resolved `execution` block, confirming exactly which hints the adapter applied; or `status: "not_run"` together with a non-empty string `refusal_reason` explaining why the adapter declined to run the case rather than risk touching a real external system. A result that neither honors the hint nor explains a refusal is rejected outright, so a runner can never silently skip enforcing a hint and still have the result imported as if it had.

`prepare` resolves each case's effective hints and writes them into the run request as `execution` plus `execution_source` (`"case"` or `"manifest_default"`), so an adapter never needs to read `manifest.json` — which deliberately stays out of every snapshot an agent can see.

`validate` enforces that the hints are real rather than aspirational:

- `path_prepend` and `executable_files` entries must be relative and non-escaping, and must exist in the eval corpus once resolved back through the case's `fixture_prefix`.
- Every `path_prepend` directory must contain at least one of the case's own `files` fixtures, and every `executable_files` entry must itself be listed in `files` — otherwise the runner would never materialize the shim and the case would fall back to a host binary.
- Every `executable_files` entry must already be executable in the corpus, so the mode bit is committed rather than assumed.
- `network` must be a known mode, and unknown `execution` keys are rejected.


### Installed copies stay hermetic

`installed_copy_steps` are derived **only** from the runtime snapshot:

```sh
npx skills add /abs/path/to/<run_id>.skills-snapshot/<skill> --agent <agent> --copy --yes
```

This is intentionally a skill-content evaluation boundary. A plugin-owned skill uses the same
standalone snapshot-copy step as a root skill, so the run can evaluate its instructions without
depending on mutable plugin state. It does **not** prove that the owning plugin manifest,
marketplace entry, Codex cache, or skill discovery works. Validate those separately by installing
the plugin through its marketplace, checking the installed cache against the release candidate,
and invoking it from a new Codex thread.

Because the eval corpus lives outside `skills/`, the runtime snapshot contains no `evals/` directory, no `evals.json`, and no `manifest.json`; `prepare` asserts this after materializing the snapshot and fails loudly if any eval material is present. The tests execute the recorded `installed_copy_steps` against a fake `npx` on `PATH` and re-assert that the installed copy carries no eval material.

Each `installed_copy_steps` entry also has a matching, same-index `install_requirements` entry: a declarative `{agent, skill_name, package_manager, package, action, source, options}` description of the identical install intent, for an adapter that cannot or does not want to shell out to the recorded `argv`. `installed_copy_steps[i]["argv"]` remains unchanged and is still the source of truth for any adapter that does shell out; `install_requirements` is purely additive, so existing adapters that only read `installed_copy_steps` are unaffected.

### Trigger/composition suites are runnable, not just validated

`--suite path.json` is repeatable. Applicable suite cases are expanded into the run's `cases` list, namespaced as `skill_name = "suite:<suite_name>"`, and each carries a `suite_identity` (`suite_name`, `repository_path`, `snapshot_path`, `content_sha256`); that identity also contributes to `run_id`. The full list of suites used is also recorded at `request.suites`. Suite cases flow through the exact same case/result/grade/aggregate pipeline as skill cases — a runner answers them like any other case, and they group separately in `aggregate` output under their `suite:<suite_name>` pseudo-skill name.

For a narrowed `--skill` run, `prepare` keeps only cases whose complete positive route is installed, plus negative cases that forbid at least one selected skill. Composition cases requiring an unselected skill and negatives aimed only at unselected skills are omitted rather than turned into guaranteed failures. Suite schema validation still uses the full repository skill universe.

**Installed-copy selection is unaffected by suites**: `installed_copy_steps` is always derived only from the real `--skill` selection (or all skills, by default), never from suite cases' `expected_skills`/`related_skills`/`forbidden_skills`.

### `--suite-only`: prepare a suite run without the real skills' behavior cases

`--suite-only` skips loading each selected real skill's `evals/<skill>/evals.json` behavior cases so a trigger/composition suite can be prepared and run on its own — for example, to iterate quickly on routing behavior without re-running the full behavior corpus every time. It requires at least one `--suite`; `prepare` refuses with `ContractError` otherwise. The selected real skills (via `--skill`, or all skills by default) are still validated, snapshotted, and given `installed_copy_steps` exactly as a full run would — only the behavior cases themselves are omitted from `request.cases`.

```sh
uv run --locked --project tools/skill-evals \
  python tools/skill-evals/skill_evals.py prepare \
  --repo . --role baseline --model provider/model@fixed \
  --config-json '{"temperature":0,"max_tokens":4096}' \
  --agent agent-a --comparison-key trigger-iter-1 \
  --suite evals/suites/trigger-matrix.json --suite-only \
  --output .skill-evals/trigger-matrix-baseline.json
```

A request contains its `repository` (path, sha, runtime tree digests), its `evaluation` corpus identity, both immutable snapshots, exact `cases` (skill and suite), fixed `model.settings`, a canonical-content SHA, and runner-neutral installed-copy steps. Each requested target agent gets one directly executable, non-interactive step per selected skill:

```sh
npx skills add /abs/path/to/<run_id>.skills-snapshot/<skill> --agent <agent> --copy --yes
```

The harness does not run installation and does not require network access. Keep generated run artifacts in the ignored `.skill-evals/` workspace; do not commit them.

## JSON contracts

### Run request (`skill-evals/run-request-v1`)

`prepare` emits `{schema, run_id, role, repository:{path,sha,selected_skill_tree_digest,skill_tree_digests}, evaluation:{corpus_root,corpus_digest,eval_tree_digests,suite_digests}, model:{id,settings,config_id}, agents, snapshot:{root,skills}, evaluation_snapshot:{root,skills,suites}, installed_copy_steps, install_requirements, comparison_key, baseline_run_id, suites, cases, content_sha256}`. `cases` preserve `skill_name`, `case_id`, prompt, `files`, `fixture_root`/`fixtures` resolved into the evaluation snapshot, expectations, optional deterministic `grading` checks, the optional `fixture_prefix`, an optional `rubric_required` (defaults to `true` when absent; suite cases set it to `false`, see below), and resolved hermetic `execution`/`execution_source` hints when the case declares them or inherits them from its manifest (plus `suite_identity` for suite cases). The runner imports the request, installs the snapshot copies if applicable, and executes each case in a fresh context.

### Runner result (`skill-evals/run-result-v1`)

A runner supplies every requested agent/case pair (skill and suite cases alike). The five `metrics` fields are required non-negative numbers; use `0` when an adapter made no calls of that kind. `status` is one of `"completed"`, `"failed"`, or `"not_run"`.

`"not_run"` reports a case the adapter deliberately did not exercise -- most commonly a hermetic-execution refusal (see above), but also any other case an adapter cannot safely or meaningfully attempt. A `not_run` result is **coverage-preserving**: it still counts as one of the run's cases (`summary`'s `cases` total includes it) so it is never silently dropped from a report, but it can never be counted as a deterministic or rubric pass or fail. `grade` forces any `exit_status` check to fail outright and forces the overall deterministic status to `"ungraded"`; `combine_grade` forces the case's final `status` to `"ungraded"` regardless of what any deterministic check or submitted rubric reports (guarding against a stale or inconsistent rubric submission claiming a verdict for a case that never ran); and `summary`/`aggregate` tally `not_run` in its own counter, disjoint from `ungraded`, `passed`, and `failed`, so a report never conflates "not run" with "ran but inconclusive."

`activated_skills` is an optional field: a unique list of skill names the agent adapter actually activated or read while answering the case. It is **required** for any case graded with a deterministic `skill_selection` check (every trigger-suite case) and otherwise optional. The harness makes no assumption about *how* an adapter determines this list — no provider event format, log shape, or tool-call convention is assumed. It is entirely the adapter's responsibility to observe and report which skills it actually consulted (for example, by tracking which `SKILL.md` files were read or which skill directories were touched during the case), the same way it is the adapter's responsibility to run the case at all.

```json
{
  "schema": "skill-evals/run-result-v1",
  "run_id": "...",
  "results": [{
    "agent": "agent-a", "skill_name": "example", "case_id": "1", "status": "completed",
    "exit_status": 0, "response_text": "...",
    "response_json": {"route": "example"}, "artifacts": {"out.txt": {}},
    "activated_skills": ["example"],
    "metrics": {"input_tokens": 10, "output_tokens": 20, "duration_ms": 30,
                "tool_calls": 1, "subagent_calls": 0}
  }]
}
```

`import-results` validates case identity and metric types, grades it, and writes immutable `skill-evals/imported-results-v1` output:

```sh
uv run --locked --project tools/skill-evals \
  python tools/skill-evals/skill_evals.py import-results \
  --run .skill-evals/baseline-run.json --input runner-results.json \
  --rubric rubric-grades.json \
  --output .skill-evals/baseline-imported.json
```

### Deterministic grading

A case can define ordered checks: `exit_status` (`equals` or `not_equals`), `file_exists` (`path` in runner-provided `artifacts`), `text_contains` (`value`), `text_regex` (`pattern`), `json_shape` (`path`, `required`), and `skill_selection` (`expected`, `forbidden`, `universe`). `required` recursively describes keys/types/literals (`"string"`, `"number"`, `"boolean"`, `"object"`, `"array"`). All checks pass => deterministic `passed`; any failure => `failed`; no checks => not applicable.

**`skill_selection`** is the provider-neutral trigger-activation check: `universe` is the closed, non-empty list of real skill names this check scores over (the run's selected skills); `expected` is either exactly `["none"]` or a non-empty list of real skill names (never mixed); `forbidden` is a list of real skill names or explicitly allowlisted external capabilities that must not activate (may be empty). All three arrays must be internally duplicate-free, every name must be valid, and `expected`/`forbidden` must never overlap. Grading intersects runner-reported `activated_skills` with `universe` for the expected route, so unrelated globally installed skills do not affect it. Explicit forbidden names are checked against the raw activation list even outside `universe`, so a case that forbids `security-review` fails if that capability activates. `expected == ["none"]` passes only when no universe skill activated.

### Rubric grading (`skill-evals/rubric-input-v1`)

Free-text `expectations` are provider-neutral gradable evidence, not just documentation: an external or blind grader (human or a separate model reviewer, comparing baseline/candidate outputs blind to role/model) submits a rubric verdict per case with `--rubric` (repeatable):

```json
{
  "schema": "skill-evals/rubric-input-v1",
  "run_id": "...",
  "rubrics": [{
    "agent": "agent-a", "skill_name": "example", "case_id": "1",
    "expectations": [
      {"text": "Names example.", "passed": true, "evidence": "quoted or described proof"},
      {"text": "Flags a conflict, only when the tool reports one.", "applicable": false, "evidence": "no conflict was reported, so this expectation did not apply"}
    ],
    "status": "passed"
  }]
}
```

`expectations` is validated strictly: it must list exactly as many entries as the case's `expectations`, in order, and each `text` must exactly match the case's expectation text (count and wording). Each entry needs non-empty `evidence`. An expectation is applicable by default (the legacy `{text, passed, evidence}` shape, or an explicit `"applicable": true`) and then needs a boolean `passed`. A conditional expectation that did not apply to this case's run is submitted as `{"text": ..., "applicable": false, "evidence": ...}` and must *not* include `passed` (submitting `passed` alongside `"applicable": false` is rejected). The submitted overall `status` must be consistent with the per-expectation verdicts, counting only applicable expectations: `failed` if any applicable expectation failed, `passed` if every applicable expectation passed and at least one expectation is applicable, and `ungraded` when none of the expectations are applicable (including the case where the case has no expectations at all).

### Combined final grade

Each imported result's `grade` is `{status, deterministic, rubric}`:

- **Any explicit failure fails the case**: a failed deterministic check or a failed rubric verdict makes `status` `"failed"`, regardless of the other part.
- **Passing requires every declared required part to pass**: if the case has `grading` checks, they must all pass; if the case has `expectations` *and* requires a rubric, a rubric must have been submitted and passed. Only then is `status` `"passed"`.
- **A missing required rubric is `"ungraded"`**: a case with `expectations` but no submitted rubric (and no failing deterministic check) is `"ungraded"`, not silently passed or failed.
- **A submitted rubric with no applicable expectations is also `"ungraded"`**: if every expectation was N/A for that run (rubric `status: "ungraded"`), the case has no applicable verdict to pass or fail on, so it stays `"ungraded"` (and does not silently pass) even though a rubric was submitted.
- **`rubric_required: false` opts a case's `expectations` out of the rubric requirement entirely.** A case defaults to `rubric_required: true` when the field is absent, so every existing behavior case is unaffected: `expectations` still demand a submitted, passing rubric. Trigger-suite cases set `rubric_required: false` (see below): their `expectations` remain in the run request as documentation of intent, but the case's final status is decided purely by its deterministic `grading` (typically a `skill_selection` check), with or without a submitted rubric. `rubric_required: false` never lets a behavior case (one whose `grading` is empty or absent) pass just because a rubric is skipped -- with no deterministic checks to pass, such a case still has nothing to decide `"passed"` on and stays `"ungraded"`.
- **A `not_run` result's final status is always `"ungraded"`**, regardless of `rubric_required`, any deterministic check outcome, or any submitted rubric: a case the adapter never actually exercised can never be reported as passed or failed.
- A case with neither `grading` nor a rubric-required `expectations` is `"ungraded"`.

This keeps deterministic evidence and rubric evidence both first-class without conflating them, and it makes an incomplete rubric visibly incomplete rather than defaulting to a pass -- while still letting a case explicitly declare that its free-text expectations are documentation-only and should never block on a rubric that will never be submitted.

### Aggregate (`skill-evals/aggregate-v1`)

```sh
uv run --locked --project tools/skill-evals \
  python tools/skill-evals/skill_evals.py aggregate \
  --input .skill-evals/baseline-imported.json \
  --input .skill-evals/candidate-imported.json \
  --output .skill-evals/aggregate.json
```

Aggregation groups by skill (or `suite:<suite_name>`), target agent, model, fixed config ID, and role; it reports passed/failed/ungraded counts, pass rate (over graded cases only), input/output tokens, duration, tool calls, and subagent calls.

A candidate declaring an imported `baseline_run_id` also gets a paired comparison. Pairing rejects mismatched agent/case coverage, role, comparison key, model, or fixed settings, and reports:

- `matched_cases`: every case present in both baseline and candidate results.
- `graded_pairs`: the subset of `matched_cases` where **both** sides reached a final `passed`/`failed` status (excludes any pair where either side is `ungraded`).
- `pass_delta` / `pass_rate_delta`: computed only over `graded_pairs`; `pass_rate_delta` is `null` when there are no graded pairs.
- `metric_deltas`: token/duration/tool-call/subagent-call deltas over all `matched_cases` (metrics are runner-reported facts, not grading-dependent).
- `critical_gate_passed`: true when no classified critical outcome regresses and no candidate critical result is `not_run` or `ungraded`.
- `critical_checks` / `critical_candidate_failures` / `critical_regressions`: evidence for every critical candidate outcome, candidate critical failures, and the subset that regressed. Each check includes paired `expectation_statuses` and `expectation_regressions`; a baseline-passing critical expectation becoming failed, missing, or N/A is a regression. Conditional branches that cannot be compared across runs must therefore stay out of `critical_expectations`. `not_run` and `ungraded` never satisfy the gate even though ordinary pass deltas exclude them.

**Pairing requires an identical evaluation corpus, not an identical runtime tree.** A candidate and its baseline must report the same `evaluation.corpus_digest` and the same `evaluation.suite_digests`; otherwise the two sides were graded against different cases, fixtures, or suites and the delta is meaningless. The runtime skill tree digest is deliberately *allowed* to differ — changing skills is exactly what a candidate run measures. Imported runs without an evaluation corpus identity (artifacts produced before the corpus moved out of `skills/`) are rejected and must be re-run.

Run the full matrix (all skills, supported agents, and fixed configurations) for durable baselines and release confidence. During flagship iteration, use an explicitly selected skill/case subset, then return to the full matrix before accepting a new baseline.

## Trigger/composition suites

`evals/suites/trigger-composition.json` is the original compact, reviewable seed corpus for routing/composition behavior: orchestrator versus a direct worker, goal versus executor, decomposition versus atomic/parallel work, direct versus broad documentation refresh, and image CVE scanning versus source-security review.

`evals/suites/trigger-matrix.json` is the full baseline-coverage suite that followed those seeds: 16 cases per runtime skill (8 `should_trigger` plus 8 `should_not_trigger`), covering root skills and plugin-owned skills. Each `should_not_trigger` case is a difficult, realistic near miss against a specific adjacent skill (or, when no skill applies, the literal route `"none"`) rather than an unrelated trivial negative, and the suite explicitly exercises every pairing called out above (orchestrator/direct worker, goal/executor, decompose/atomic/parallel, docs direct/broad, image/source security, and anti-slop as a companion versus each primary workflow skill).

Both suites share the same `skill-evals/trigger-suite-v1` schema. Every case's `expected_skills` names the actual correct route and is never empty — even a `should_not_trigger` case must say what *should* happen, either a real, plausible competing skill or `"none"` — so a near miss is exactly as gradeable as a hit. `forbidden_skills` names the skill(s) that must not fire (required for `should_not_trigger` cases), `related_skills` documents plausible-but-ungraded neighbors for context, and an optional `direction` (`should_trigger` / `should_not_trigger`) makes the case's intent explicit and self-checking: `validate` rejects `expected_skills` and `forbidden_skills` overlapping on the same case, a `should_trigger` case whose only expectation is `"none"`, or a `should_not_trigger` case with no `forbidden_skills`. Every case still requires its own deterministic `grading` (typically a `json_shape` check that `response_json.route` equals the expected route) and non-empty free-text `expectations`, kept in the source suite file as reviewable documentation of intent.

**A suite's skill names are checked against the full repository skill universe**, not against any run's narrower `--skill` selection: `validate` (and `prepare`'s own suite revalidation) requires every `expected_skills` entry to be `"none"` or the name of a discovered runtime skill, whether it is rooted in `skills/` or bundled under `plugins/*/skills/`. Every `forbidden_skills` entry must be a discovered runtime skill name or a name in the explicit `EXTERNAL_FORBIDDEN_CAPABILITIES` allowlist (currently `code-review` and `security-review`, external review capabilities rather than skills distributed by this repository). `expected_skills` never accepts an allowlisted name -- a suite can only *expect* a real skill to activate -- while `forbidden_skills` can name either a real skill or an external capability, since both are things a case can legitimately require to not fire. This full-universe check is deliberately independent of which subset of skills a particular run selects: a suite document's own correctness cannot depend on run flags. The `universe` a case is actually *graded* against at run time (see below) is the narrower, run-selected set.

**How a trigger case is actually scored at run time** is different from that source-file `grading`, and is entirely provider-neutral: `prepare --suite` (via `collect_suite_cases`) first filters the suite to cases observable with the run-selected skills or an explicit external forbidden capability, then discards each retained case's hand-authored `grading` and replaces it with a single synthesized `skill_selection` check built from that case's own `expected_skills`, `forbidden_skills`, and `universe` set to the run's selected real skills (`--skill`, or all skills by default). The case also gets `rubric_required: false`, so its `expectations` stay in the run request purely as documentation — the case's final grade comes only from whether the runner-reported `activated_skills` (see "Runner result" above) satisfy that `skill_selection` check. **The source suite JSON files on disk are never modified** by this normalization; it happens only to the in-memory case copy that goes into the run request.

**Adapter responsibility**: nothing in this harness assumes a specific provider's tool-call log, event stream, or routing-decision format. It is the runner adapter's job to determine, for each trigger case, exactly which skills it activated (read, loaded, or otherwise consulted while producing its response) and report that list as `activated_skills` on the result. A trigger case's result *must* include `activated_skills`, or `import-results` rejects it outright.

Pass either suite to `validate --suite` for standalone schema checking, or to `prepare --suite` (optionally with `--suite-only`, see above) to make it part of a runnable, gradable run.

## Tests

```sh
uv run --locked --project tools/skill-evals \
  pytest tools/skill-evals/tests skills/achieve-goal/tests -v
```

The suite covers the central-corpus contract directly: repository validation of root and plugin runtime skills against `evals/`, duplicate runtime-name rejection, rejection of an in-skill eval corpus and of an orphaned `evals/<skill>/`, separate runtime and evaluation digests/snapshots, fixture sources resolving inside the evaluation snapshot, aggregate rejection of a baseline/candidate pair whose evaluation corpora differ (while still pairing runs whose runtime trees differ), and an installed-copy smoke test that executes the recorded `installed_copy_steps` with a fake `npx` on `PATH` and asserts the installed copy contains no eval material. It also covers hermetic execution hints end to end: rejection of unsafe, unknown, non-materialized, or non-executable hints, manifest-default inheritance and case-level override in the run request, `fixture_prefix` validation (relative, non-escaping, existing, and containing every `files` entry) together with the `workspace_path` it produces and the unchanged no-prefix default, a corpus check that every `scan-image-vulnerabilities` case runs with `network: disabled` and only local `files/bin` shims, and a live execution of those shims proving they answer from fixture data alone (a guessed tag fails instead of returning a clean result, and no Docker daemon exists). That live execution also invokes the shims with credential-shaped flags (`--password`, `--token`, `--registry-token`, `--username`, `--kubeconfig`, both space-separated and `--flag=value`) and asserts the raw secret values never reach `trivy.log`/`kubectl.log`/`docker.log` while a redacted placeholder does, validating the shims' own `log_invocation` redaction (the shims write their per-invocation call log to `.scan-fixture-calls/`, which is git-ignored). It also covers trigger-activation grading directly: `skill_selection` check validation (array/name/non-overlap rules), deterministic pass/fail/`"none"`-route scoring with universe filtering of out-of-scope activated skills, `activated_skills` result-field validation (uniqueness, type, and the requirement that it be present whenever a case is graded by `skill_selection`), that `prepare --suite` replaces a suite case's `grading` with one `skill_selection` check and sets `rubric_required: false` without ever mutating the source suite file, that such a case gets a final deterministic `passed`/`failed` verdict on import even without a submitted rubric, and that `rubric_required` defaults to `true` so an ordinary behavior case's rubric requirement is unchanged.

It further covers the reviewed harness hardening: `deterministic_ids` rejecting a case with no `grading` checks; a `not_run` result's coverage-preserving, always-`ungraded`, separately-counted behavior through `grade`, `combine_grade`, and `summary`, including that `exit_status` checks never pass a `not_run` result; the `execution_honored` deep-equal requirement and the `not_run`-with-`refusal_reason` escape hatch for any case with a resolved `execution` hint; that a fixture or execution-hint path pointing into a top-level `outputs/` directory or matching a generated-artifact filename glob is rejected, while a same-named nested directory that is not top-level is not; that a missing snapshot fixture raises `ContractError` rather than an unhandled `OSError`; suite `expected_skills`/`forbidden_skills` validation against the full repository universe, including the `"none"` route and the `EXTERNAL_FORBIDDEN_CAPABILITIES` allowlist; unknown-key rejection for both case and manifest documents (including an `execution` typo and the recognized `clarification_rationale`/`default_category`/meta-key exceptions); that a `prepare` failure cleans up only the snapshot directories it created itself, not a pre-existing one; and that `install_requirements` is emitted alongside `installed_copy_steps` with matching entries, without changing the existing `argv` contract. Run the real installer at least once when changing snapshot or install behavior:

```sh
HOME="$PWD/.skill-evals/install-smoke-home" \
  npx skills add /abs/path/to/<run_id>.skills-snapshot/<skill> --agent copilot --copy --yes
```

## Static context footprints

`footprint` measures a named, reviewable set of UTF-8 text files without invoking a provider CLI or tokenizer. It reports lines, whitespace-delimited words, bytes, and SHA-256 for every file; profiles add totals and a content SHA-256, while the immutable report has an overall content digest. These are **static context proxy metrics, not exact model token counts**: tokenization, system context, tools, and provider behavior vary.

The bundled provider-neutral configuration is `tools/skill-evals/footprint-profiles.json`. Its `skill-evals/footprint-profiles-v1` schema is simply a unique profile `name` and an explicit non-empty list of repository-relative `files`, so any Agent Skills repository can supply its own profile document.

```sh
uv run --locked --project tools/skill-evals \
  python tools/skill-evals/skill_evals.py footprint \
  --repo . --profiles tools/skill-evals/footprint-profiles.json \
  --output .skill-evals/footprint-baseline.json
```

Use `--profile name` repeatedly to measure selected profiles. Profile paths are resolved and must remain inside `--repo` and exist; output paths are immutable and cannot be overwritten. For a baseline/candidate comparison, create two separately named reports from the same profile configuration, compare each profile's totals and `sha256`, and use a changed SHA to identify the exact file-level content difference. Keep the same file set when comparing sizes; a smaller static footprint is not by itself evidence of better behavior or lower runtime token use.
