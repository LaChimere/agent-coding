# Agent Coding Skills

A repository of reusable workflow skills for disciplined AI coding. The portable coordination layer now lives inside `plugins/workflow/skills/workflow-orchestrator/`; the repo-root `AGENTS.md` is only for maintaining this repository.

## Problem

AI coding agents commonly fail in predictable ways:

- Ship one giant PR that mixes multiple concerns
- Start implementing before understanding the problem
- Bury architecture decisions inside code without explicit review
- Step on each other's files when working in parallel
- Claim "done" without verification evidence
- Repeat the same mistakes across tasks

This repository turns those failure modes into reusable skills and a portable orchestration layer.

## How it works

### Three layers

| Layer | Role | Analogy |
|---|---|---|
| `AGENTS.md` | Repo-specific contributor guidance for this repository | Maintainer guide |
| `plugins/workflow/skills/workflow-orchestrator/` | Portable process methods and coordination constraints + planning templates | Process guide |
| `plugins/workflow/skills/` | Seven coordinated skills, distributed together | Specialists |
| `skills/scan-image-vulnerabilities/` | Standalone image inspection | Inspector |

### Core workflow

```
Discover if needed → Design if needed → Plan if needed → Execute → Verify → Review if needed → Lessons if earned
```

```
Fast path (urgent):  Execute → Verify → Lessons (backfill)
```

Clear small tasks run directly in the primary session. `workflow-orchestrator` resolves genuine phase, authorization or process-skill ambiguity; installing the plugin does not make it a mandatory entrypoint. A skill supplies methods and constraints, while a runtime worker is a bounded delegate. The primary selects execution roles and models, coordinates work and owns final acceptance.

Native Plan Mode owns exploration and the overall proposal. An approved proposal plus explicit revisions can pass straight to execution; save it to a living `plan.md` when authorized and permitted by the host. Saving adds no approval gate. `plan.md` is the only execution progress source, with approved scope separate from changing status and evidence. Optional `design.md`, `research.md` and `lessons.md` serve design decisions, gathered evidence and earned lessons. New tasks have no independent TODO or custom goal file; historical task files are left alone.

### Approval gates

| Gate | When | What gets reviewed |
|---|---|---|
| **Gate 1** | When consequential design needs alignment | Approve direction and further planning, not implementation |
| **Gate 2** | When implementation scope needs approval | Approve the overall plan, including any parallel section; an explicitly approved native proposal suffices |
| **Gate 3** | After execution for high-risk changes, plan deviations, or explicit reviewer request | Does the actual diff match the plan? |
| **Lightweight path** | Clear, low-risk task | Direct authorized work and relevant checks, no mandatory artifacts |
| **Fast path** | Genuinely urgent, authorized repair | Shorten discussion, still verify; urgency grants no extra authority |

### Acceptance criteria

Every planned step or PR defines concrete acceptance criteria. Before proposing completion, the agent must demonstrate them with evidence. Implementation authorization and commit authorization are separate; the active landing mode is either `working_tree` or `commits`.

### Verification levels

| Level | Scope | Used for |
|---|---|---|
| **L1** | Relevant local/static/unit checks | Low-risk changes; docs use consistency review |
| **L2** | Integration tests or before/after proof | Bug fixes, behavior changes |
| **L3** | E2E / production-like validation where needed and feasible | High-impact behavior |

No evidence = not done.

## Project structure

```text
AGENTS.md                              # Contributor guidance for this repo
plugins/workflow/
  .codex-plugin/plugin.json            # Distribution only, no wrapper entrypoint
  .claude-plugin/plugin.json           # Claude Code + Copilot CLI; same skills
  skills/
    workflow-orchestrator/             # Shared contract, references and templates
    execute-plan-loop/
    anti-slop/
    decompose-feature/
    plan-parallel-work/                # Embedded Parallel execution template
    ensure-atomic-pr/
    refresh-related-docs/
plugins/pr-review/                     # Separate review plugin
  .codex-plugin/plugin.json
  .claude-plugin/plugin.json
  skills/pr-review/
  skills/spar/
  skills/rubber-duck/
skills/scan-image-vulnerabilities/      # Standalone, with bundled script and tests
.agents/plugins/marketplace.json
.claude-plugin/marketplace.json        # Claude Code + Copilot CLI marketplace
evals/<skill>/                         # Central cases, manifests, fixtures; never distributed
evals/suites/
tools/skill-evals/                     # Existing provider-neutral harness
.skill-evals/                          # Ignored immutable evaluation evidence
```

**Evals are repository-maintenance assets, not skill content.** Every root or plugin runtime skill has a matching `evals/<skill>/` directory with functional cases, fixtures, and a classification manifest, but that material lives outside runtime skill directories and is never distributed. An installed skill or plugin therefore cannot read its own cases or expected answers. See `tools/skill-evals/README.md` for validation, run preparation, and grading.

## Skills

### decompose-feature

Splits a large feature into a sequence of small, mergeable PRs:

```
Vertical slice A → Vertical slice B → Vertical slice C
        or, when a real shared dependency exists:
Shared base → independent fan-out slices → required cleanup
```

Use when: evidence shows the work is too large for one reviewable PR, stacked PRs are requested, or staged rollout is needed. Advisory requests can stay inline; save planning artifacts only when authorized and permitted by the host. Saving a plan does not begin implementation.

### plan-parallel-work

Defines safe parallel execution boundaries for multiple agents:

```
        ┌── Task A (isolated working copy, owned paths)
Base ref ─┼── Task B (isolated working copy, owned paths)
        └── Task C (isolated working copy, owned paths)
```

Use when preparing concurrent code edits requires ownership/isolation decisions, or when the user explicitly requests parallel implementation planning. It fills only gaps in the overall native proposal's `Parallel execution` section, then the same `plan.md` when writing is allowed. Existing stable refs suffice; tasks need not become multiple PRs. Parallel research/review, one worktree, or one sequential implementer do not trigger it. Planning describes intended roles; worktree creation and dispatch belong to execution.

### ensure-atomic-pr

Evaluates whether a diff is atomic enough and proposes splits:

```
purpose A (preparation + behavior + tests/docs) → purpose B (preparation + behavior + tests/docs)
```

Use when: a PR is too large, mixes concerns, or needs post-hoc recovery.

### workflow-orchestrator

Resolves real phase, authorization or process-skill ambiguity:

```
resolve phase or approval ambiguity → choose the appropriate process skill → retain existing scope and evidence
```

Use when: the next phase, approval or process skill is genuinely unresolved, or phase coordination is explicitly requested. Clear tasks and approved native plans do not need a new handoff or planning round. Skill selection does not select a runtime worker, model or reasoning effort.

### execute-plan-loop

Executes approved implementation work in a disciplined long-running loop:

```
pick coherent slice → implement → verify → update living plan → continue approved scope → final audit
```

Use when: the user wants the primary to carry out an approved implementation scope with verified slices and progress updates. The primary continues through the whole scope unless the user limited the request to a step/phase or a real blocker remains. A delegated worker completes only its assigned slice and returns evidence and repair history; the primary integrates, updates the single progress source and selects the next action. Caller policy supplies any repair limit and model choice. It creates commits only when the recorded landing mode is `commits`.

### anti-slop

Keeps code changes free of AI slop — output that looks polished but is unnecessary, wrong, or hard to maintain:

```
explain it → support correctness claims → only what's needed → justify duplication → inspect complexity → milestone review
```

Use for explicit or ongoing anti-slop guarding, pre-commit readiness, visible-test hard-coding, scope/add-only/fix-on-fix signals, or meaningful/high-risk milestones. Routine edits keep compact quality invariants in the executor instead of loading a second review loop. Read-only review never writes files. A full anti-slop check does not automatically add an independent reviewer or restart for each commit.

### Native goal lifecycle

Use the host's native `/goal` only for an explicit persistent objective. The host owns continuation, pause/resume, budgets and completion; the executor implements and verifies, and the living plan records scope and evidence. Goals do not expand commit, external-write, purchase or destructive-action authority. A host without native goal support can still execute ordinary tasks but cannot promise automatic cross-turn continuation. The retired `achieve-goal` skill and lifecycle script are no longer distributed.

### refresh-related-docs

Refreshes documentation that has become stale after code changes:

```
detect evidence of staleness → discover documentation authority → refresh related docs directly → verify consistency → report
```

Use when confirmed behavior, configuration, interfaces, or maintenance workflow make Markdown stale. Refresh related files directly, including newly discovered documents and repository `AGENTS.md`, without per-file approval. Preserve explicit file/section exclusions and read-only requests; do not invent new policy or synchronize global configuration as part of a repository refresh.

### scan-image-vulnerabilities

Scans container images with Trivy using freshly downloaded vulnerability and Java databases:

```
refresh DBs → comprehensive OS/library scan → summarize active/suppressed findings and package coverage
```

Use when: the user asks about container image vulnerabilities, exact cluster workload images, or Trivy. The scan includes all package relationships, every severity, unfixed and suppressed findings, and a full package inventory. The bundled installed script preserves partial artifacts but returns nonzero if any requested image fails.

## Key design principles

- **Evidence over speculation** — don't implement until the problem is understood
- **Gates over trust** — human approval at critical decision points
- **Small over large** — one PR = one purpose
- **Simple over clever** — solve the stated problem, not imagined future ones
- **Explicit over implicit** — boundaries, ownership, and acceptance criteria must be stated

## Usage

### Native plugin installation

The supported CLI targets are Codex, Claude Code and GitHub Copilot CLI. Each host installs
the same complete plugin skill trees through its own plugin manager. The Claude-format manifests
are shared by Claude Code and Copilot CLI; Codex keeps its own manifests and marketplace.
This does not imply support for every host's App, IDE extension or cloud agent.

For a checkout containing this candidate, register its absolute path in place of
`LaChimere/agent-coding` below. The GitHub commands require a revision containing the corresponding
marketplace and plugin manifests; local candidate verification does not publish that revision.

**Codex CLI** (terminal):

```sh
codex plugin marketplace add LaChimere/agent-coding --ref main
codex plugin add pr-review@agent-coding
codex plugin add workflow@agent-coding
```

**Claude Code** (terminal):

```sh
claude plugin marketplace add LaChimere/agent-coding
claude plugin install pr-review@agent-coding --scope user
claude plugin install workflow@agent-coding --scope user
```

**GitHub Copilot CLI** (terminal):

```sh
copilot plugin marketplace add LaChimere/agent-coding
copilot plugin install pr-review@agent-coding
copilot plugin install workflow@agent-coding
```

Start a fresh session after installation or updates. Codex accepts `$pr-review:pr-review` and
`$workflow:execute-plan-loop` (the existing short names still work when unambiguous). Claude Code
uses `/pr-review:pr-review` and `/workflow:execute-plan-loop`. In Copilot, use `/skills` or
`copilot skill list --json` to inspect the discovered names, then explicitly ask to use the
`pr-review` or `execute-plan-loop` skill. Natural-language requests remain supported.

For updates, Codex uses `codex plugin marketplace upgrade agent-coding` for Git marketplace
snapshots, then `codex plugin add <plugin>@agent-coding`. Claude uses
`claude plugin marketplace update agent-coding`, then
`claude plugin update <plugin>@agent-coding --scope user`. Copilot uses
`copilot plugin marketplace update agent-coding`, then `copilot plugin update <plugin>@agent-coding`.
Repeat the plugin update for each installed plugin. Release changes bump both native manifests of
the affected plugin together; re-open a session and verify the installed version.

For Codex local development, use an isolated candidate copy and configuration. Confirm with
`codex plugin list` that the selected marketplace points to that local candidate, not a Git
snapshot or another checkout. If that explicit local marketplace is not registered, run
`codex plugin marketplace add <absolute-candidate-repo-root>` in the isolated configuration first.
From the installed `plugin-creator` skill directory, run:

```sh
python3 scripts/read_marketplace_name.py --marketplace-path <absolute-candidate-repo-root>/.agents/plugins/marketplace.json
python3 scripts/update_plugin_cachebuster.py <absolute-candidate-repo-root>/plugins/workflow
```

Stop if either helper fails. Reinstall using `codex plugin add workflow@<validated-marketplace-name>`
in the same isolated configuration, then start a fresh thread and verify the installed version.
The cachebuster is a `+codex.<timestamp>` version suffix that refreshes the development cache;
use the helper's default rather than bumping release numbers or hand-editing marketplace/config files.
Keep that suffix in the disposable Codex candidate only; published native manifests retain matching
release versions. Do not switch production installations or copy credentials for this check.

#### Capability boundaries

Skills describe actions, not a universal tool API. Use the host's actual invocation, delegation,
planning and permission mechanisms. Synchronous reviewer results are complete when returned;
asynchronous tasks need real handles before waiting. Report independent context, actual model/effort
and model-family diversity separately from execution evidence. Requested arguments alone do not
establish effective configuration, including after a failed launch.

Native Plan Mode and `/goal` are optional host capabilities. Without them, explicit chat approval
can authorize ordinary work, but there is no promised automatic cross-turn continuation. The complete
Codex Security workflow remains an optional external dependency: report missing automatic coverage;
if the user explicitly requires it, report the review incomplete rather than substitute a lighter scan.
Installation does not grant permissions or install optional dependencies.

Plugin-owned skills are supported as complete plugin combinations, not arbitrary standalone subsets.
In particular, `pr-review` composes sibling `spar` and `rubber-duck` skills. `npx skills add` snapshot
checks validate skill content, not native plugin installation or independent operation of each sibling.

#### Compatibility evidence

Local `0.1.1` candidate verification on 2026-09-07:

| CLI tested | Native installation and discovery | Actual invocation |
|---|---|---|
| Codex CLI 0.153.4 | Both plugins installed; 3 review + 7 workflow skills in the fresh prompt inventory | Read-only review and approved two-label execution passed |
| Claude Code 2.1.263 | Both plugins registered; 3 + 7 skills in plugin details and session inventory | Read-only review and approved two-label execution passed |
| Copilot CLI 1.0.83 | Both plugins registered; 3 + 7 plugin skills in the fresh catalog | Read-only review and approved two-label execution passed |

All invocation checks used the existing local gateway with its available `gpt-6-astra` model,
not native provider login flows or multiple model families. The previously configured Claude model
was rejected with `model_not_supported`; changing only the isolated test configuration resolved it.
Review fixtures remained unchanged by the agents; host-generated state is recorded separately.
Execution checks preserve exports and unchanged tests, and limit edits to the labels and existing plan.
Copilot's initial execution correctly reported blocked tests when the probe used an unsupported
permission pattern; a fresh run with its supported `shell(node)` permission completed both checks.

Codex read its installed cache. Claude and Copilot resolved local-marketplace skills to the registered
candidate directory; Copilot explicitly reports live loading with nothing copied. This supported
native-manager path is distinct from manually invoking an unregistered source checkout. Same-version
update/re-add paths were exercised: Codex re-added the plugins, Claude reported latest `0.1.1`, and
Copilot reported live loading with nothing to update. This candidate phase used isolated configurations
and did not test remote Git fetches or changed-release upgrades.

After publication on 2026-09-07, all three CLIs installed the GitHub release at commit
`de2b214d08fc2f163920b0b618d247aeb921beb8`. All six installed plugin trees matched the published
content. Codex was upgraded from `0.1.0` to `0.1.1`; Claude and Copilot received fresh `0.1.1`
installations, not cross-version upgrade tests. Removing the eight old standalone skills and their
all-host installation records resolved Copilot's old-skill shadowing. Unrelated plugin state was
preserved. These publication checks establish remote installation and package identity; the actual
invocation evidence above remains from the isolated candidate tests.

The copied-package checks, 10-skill `npx skills add --copy` installation and targeted behavioral
replays are separate evidence. No native cross-model delegation, complete Codex Security scan,
Plan Mode/goal lifecycle, or App/IDE/cloud compatibility is claimed. Raw local commands and results
are retained in `.skill-evals/harness-compatibility/`; that ignored evidence is not distributed.

### Using PR Review in Codex

Install the plugin through the [native installation instructions](#native-plugin-installation).
The examples in this section use Codex invocation syntax.

Start a new thread, then invoke `$pr-review` explicitly or ask Codex to review the current PR,
branch diff, commit range, or working-tree changes. The plugin is read-only. It uses the complete
`$codex-security:security-diff-scan` workflow when security review is applicable and that optional
capability is installed; otherwise it reports the missing security coverage according to whether
security was automatic or explicitly required.

The primary uses `$pr-review` to select necessary code, comments, tests, errors, types, and specification
aspects. It can combine several aspects in one reviewer while retaining each method and its evidence;
design is a focus applied through those aspects rather than a separate public aspect. When no
authoritative specification exists, it skips specification review instead of inferring requirements
from the diff. The primary agent double-confirms and deduplicates candidates, then reports them as
Blocker, Critical, Major, Minor, or Suggestion findings with source and coverage details. This workflow
does not invoke or depend on the separate `$code-review` skill.

The primary decides whether `$rubber-duck` adds useful critique, honoring explicit requests,
exclusions and necessary independent risk coverage. SPAR is never automatic, but a review request
can explicitly include `$spar` to challenge assumptions and trade-offs. Dispatch and launch recovery
follow the primary's model/effort choice; omitted arguments do not guarantee inheritance. An
independent same-family critic is valid. Another eligible family is optional unless explicitly
required. A primary fallback remains non-independent and cannot satisfy an unmet independent review.

Use `$spar <idea>` for an explicit, one-shot devil's-advocate analysis of an idea, decision, plan,
design, migration, or optimization. It develops two independent opposing perspectives by default,
adds a third only when that stakeholder changes the decision, and returns a concise synthesis without
implementing the proposal.

Use `$rubber-duck` for an explicit, one-shot critique of a plan, design, implementation, or tests.
It reports only consequential blocking, non-blocking, or optional issues, stays read-only, and leaves
the final decision to the primary agent.

### Using the workflow plugin

Install the complete plugin through the [native installation instructions](#native-plugin-installation)
and use the invocation syntax for your host.

The plugin distributes all seven workflow skills and their bundled resources; it adds no `$workflow` wrapper, MCP server, hook or background service. Invoke the appropriate skill directly. General change-set review uses the separately installed `pr-review` plugin when needed. Dependencies are on demand: ordinary native work does not require either plugin, and neither plugin requires personal role configuration or loading the other at startup. Missing required capabilities remain incomplete; continue unaffected work without recreating the missing workflow or automatically installing it.

### Personal Codex orchestration

[config/codex](config/codex/) contains a mergeable configuration fragment and five custom agent TOMLs,
separate from portable plugin behavior. The primary model and effort remain user-selected. The
initial worker mappings, four-open-worker limit, repair policy and permission boundaries are defined
in the [design](docs/coding-orchestration/design.md). These are initial choices, not measured optima.
Repository delivery does not activate them in real `~/.codex` or switch production plugins.
On the tested Codex `0.154.0`, reviewer role files do not enforce read-only permissions under a
writable primary. Read-only acceptance reuses existing subagent evals that check file modifications;
this platform limitation does not require client changes or additional tests for this delivery.
See [validation](docs/coding-orchestration/validation.md) for the completed repository delivery,
recorded failures and coverage limits. The A/B results establish no adoption advantage.

Candidate verification uses isolated configurations for each supported CLI and this worktree's marketplace, not remote `main`. Behavioral evaluation and orchestration-effectiveness acceptance are scoped to Codex. Claude Code and Copilot CLI retain manifest, installation/update, source-identity and discovery checks, without a workflow-effectiveness guarantee. Installing skill snapshots through `npx skills add --copy` tests instruction content only, not plugin discovery. CLI discovery, native Plan Mode and native goal lifecycle require their own actual evidence. App UI compatibility remains separately unverified unless exercised; it is not a gate for this repository-only working-tree delivery. A new test thread is a discovery check, not a mandatory work phase for ordinary tasks.

Install `scan-image-vulnerabilities` separately through `npx skills add` when needed; it still requires bash, python3 and Trivy 0.58.0+, with Docker or kubectl only for their respective discovery modes. Manually invoking skills from an unregistered source checkout remains unsupported.

### Switching an existing standalone installation

Formal local switching is separate from repository edits and isolated validation. Do not change the current installation or synchronize global configuration without explicit authorization.

After authorization, resolve the actual installed entries and preserve recoverable copies outside
skill discovery paths. Replace the seven old standalone entries (`workflow-orchestrator`,
`execute-plan-loop`, `anti-slop`, `decompose-feature`, `plan-parallel-work`, `ensure-atomic-pr`,
`refresh-related-docs`) and remove the retired `achieve-goal` entry. Confirm their installation
records identify this repository before removing them. Leave community skills, standalone image
scanning and the separate review plugin unchanged; do not delete guessed caches or migrate task files.

Shared copies under `~/.agents/skills/` can take precedence over plugin skills. Removing links for
selected agents may leave that shared directory and its installation record intact because other
harnesses still use it. Resolve those consumers and obtain approval for the all-host impact before
removing the shared installation. With that approval, use the native skills manager to remove only
the eight named skills and their links; never use an all-skills removal option. Verify both directory
removal and the actual discovered skill sources, not just the removal command's success message.

Use the GitHub marketplace in the [native installation instructions](#native-plugin-installation)
for the formal switch, then verify that `workflow@agent-coding` supplies the seven skills without
old standalone shadowing in each target CLI. A local candidate marketplace is only for explicitly
requested development/testing. Check installed versions and bundled resources in fresh processes;
App compatibility still needs separate evidence. Synchronizing global instruction files requires
separate authorization. If verification fails, restore the recorded installation from its backup.
None of these steps authorizes a commit, push or deployment.

### Working on this repo

1. Repo-root `AGENTS.md` applies only to this repository.
2. If you change cross-skill workflow behavior, update `workflow-orchestrator` first.
3. If you change a worker skill, keep it aligned with the `workflow-orchestrator` contract.
4. Keep repository-maintenance scope in the approved conversation; do not create a root `plans/` directory or task slugs. Generated evaluation evidence belongs in `.skill-evals/`. The optional downstream living-plan templates and their fixtures remain supported.
5. Add or change eval cases under `evals/<skill>/`, never inside a runtime skill directory; validate with
   `uv run --locked --project tools/skill-evals python tools/skill-evals/skill_evals.py validate --repo .`.
6. Keep generated eval run artifacts in the ignored `.skill-evals/` workspace.

### What the agent does at runtime

1. Uses the user's request, native proposal and explicit revisions or existing plan to resolve scope and authority.
2. Chooses direct work or the relevant installed specialist. Orchestration is only for real ambiguity.
3. Saves only authorized, necessary records when the host permits writing. Save-only does not begin implementation.
4. Executes the approved boundary, fixing ordinary implementation-caused check failures and recording evidence in the living plan.
5. Re-aligns material behavior, contract, architecture, state, risk, cost or scope changes, not routine progress edits.
6. Audits original requirements, deviations and evidence at completion. Missing required verification is reported as incomplete.

## Customization

### Adding a new skill

For standalone skills, create a directory under `skills/` with a `SKILL.md`; workflow-plugin skills belong under `plugins/workflow/skills/` with the same bundled-resource layout:

```
skills/
  your-new-skill/
    SKILL.md           # Must include: name, description, operating context, workflow
    templates/         # Optional templates owned by this skill
    references/        # Optional detailed docs loaded on demand
    scripts/           # Optional helper scripts
```

If the new skill should participate in the shared workflow, document that relationship in `workflow-orchestrator` and update this README.

### Skill types worth considering

This framework ships with governance and CI/CD skills. When adopting it for a real project, consider adding skills in these categories based on your team's needs:

| Type | Purpose | Example |
|---|---|---|
| **Library & API reference** | Teach the agent how to correctly use an internal library or SDK, including edge cases and gotchas | `billing-lib` — your internal billing library with footguns documented |
| **Product verification** | Describe how to test or verify that code works, often paired with browser automation or CLI drivers | `signup-flow-driver` — headless browser test of the full signup flow |
| **Data fetching & analysis** | Connect to monitoring, analytics, or data stacks with credentials and common query patterns | `grafana` — datasource UIDs, cluster names, problem-to-dashboard lookup |
| **Code scaffolding** | Generate framework boilerplate with your auth, logging, and config pre-wired | `new-migration` — your migration file template plus common gotchas |
| **Runbooks** | Map symptoms to investigation steps and produce structured reports | `oncall-runner` — fetch alert, check usual suspects, format findings |

### Skill authoring tips

- **Gotchas section**: The highest-signal content in any skill. Build it up from real failure patterns over time.
- **Progressive disclosure**: Keep `SKILL.md` focused on decision logic. Put detailed reference material (CLI commands, API signatures, examples) in `references/` files.
- **Config persistence**: Keep non-secret project settings in the consuming project's documented configuration. Store credentials in the host credential store or environment, never inside a distributed skill or committed fixture.
- **Description field**: This is a trigger mechanism, not a summary. Be explicit about when the skill should activate, including edge cases and alternative phrasings.

### On-demand safety hooks

Some agent platforms support on-demand hooks — temporary guards that activate only when a specific skill is invoked and last for the duration of the session. These can add safety rails during execution without burdening normal development. Examples:

- Block destructive commands (`rm -rf`, `DROP TABLE`, force-push) during production-adjacent work
- Restrict file edits to a specific directory during focused debugging
- Require confirmation before any `git push` during stabilization

If your agent platform supports hooks, consider adding them to high-risk skills or infrastructure operations. Define hooks in the skill's `SKILL.md` frontmatter or a companion configuration file per your platform's conventions.

### Adjusting strictness

- **More strict**: Add a project-specific rule requiring Gate 1 design alignment for every planned task, rather than only consequential design decisions. This is an opt-in override of the default conditional gate.
- **Less strict**: Use the lightweight path for clear low-risk changes; keep urgent fast path limited to genuine urgency and existing authority.
- **Per-project**: Put project-specific contributor rules in that repo's own `AGENTS.md` / `CLAUDE.md`, while keeping shared workflow coordination in `workflow-orchestrator`.

## Status

Every runtime skill has functional eval definitions and classification metadata in the central `evals/` corpus. The provider-neutral harness evaluates both root and plugin-owned skill content through isolated `npx skills add --copy` snapshot copies. That hermetic behavior check does not validate a plugin manifest, marketplace entry, cache, or Codex discovery. Plugin changes therefore also require the separate marketplace install and installed-copy validation described in `AGENTS.md` and `tools/skill-evals/README.md`. Historical certification is not certification of this workflow candidate. Each result must identify its runtime snapshot, frozen corpus, model/settings and actual execution evidence; unrun, ungraded and failed checks are not passes. Continue refining from real usage evidence rather than adding speculative workflow rules.
