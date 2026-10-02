# Agent Coding Skills

Reusable engineering specialists for AI-assisted coding: change quality, PR structure, documentation and review. Repo-root `AGENTS.md` governs contributions here.

## Problem

AI coding agents commonly fail in predictable ways:

- Ship one giant PR that mixes multiple concerns
- Start implementing before understanding the problem
- Bury architecture decisions inside code without explicit review
- Step on each other's files when working in parallel
- Claim "done" without verification evidence
- Repeat the same mistakes across tasks

The skills address these problems without a second task-management or execution layer.

## How it works

Each plugin provides methods for a specific engineering task. The consuming agent harness owns
goal and plan handling, execution, continuation and conversation state. Plugins do not define
how those mechanisms are created, formatted, updated or completed.

| Owner | Responsibility |
|---|---|
| Agent harness | Goal and plan handling, execution, continuation and conversation state |
| Primary agent and caller instructions | Scope, decisions, authorization, delegation and final judgment |
| `plugins/workflow/skills/` | Four independent quality, PR-structure and documentation specialists |
| `plugins/pr-review/skills/` | Change-set review and independent critique methods |
| Repository `AGENTS.md` | Contributor rules for this repository |

Specialists operate within the caller's scope and authorization. Their outputs are engineering
findings, proposals and corrections, supported by relevant evidence.

## Project structure

```text
AGENTS.md                              # Contributor guidance for this repo
plugins/workflow/
  .codex-plugin/plugin.json            # Distribution only, no wrapper entrypoint
  .claude-plugin/plugin.json           # Claude Code + Copilot CLI; same skills
  skills/
    anti-slop/
    decompose-feature/
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
evals/                                # Bun/TypeScript Codex evaluation project
  calibration/                        # Samples and owner-confirmed grader labels
  cases/                              # Central cases and checks
  fixtures/                           # Inert fixture data, never distributed
  pricing/                            # Dated model-token reference prices
  profiles/                           # Versioned baseline and runtime references
  src/
  tests/                              # Framework tests grouped by source domain
  out/                                # Ignored run evidence and reports
.skill-evals/                          # Historical ignored evidence
```

**Evals are repository-maintenance assets, not skill content.** The central corpus covers standalone and plugin-owned skills. Native Codex runs receive isolated runtime installations and case fixtures; grading definitions and reference answers remain private. Promptfoo schedules cases and provides native exports, with project records for passed/failed/unknown quality, time, tokens and cost. See [the evaluation guide](evals/README.md) for commands and [the design](docs/evaluation/design.md) for the contract.

## Skills

| Skill | Use when | Result |
|---|---|---|
| `anti-slop` | Change-readiness or ongoing quality assessment, scope growth, test-fitting or compounding fixes | Supported necessity, correctness, reuse and complexity findings |
| `decompose-feature` | A feature or migration needs staged PR delivery | End-to-end slices, genuine prerequisites, compatibility and acceptance |
| `ensure-atomic-pr` | A diff, commit or PR may mix independent concerns | Atomicity assessment and concrete recovery boundaries |
| `refresh-related-docs` | Established behavior makes related Markdown stale | Evidence-backed corrections that preserve accepted decisions and history |
| `scan-image-vulnerabilities` | Exact images or workload images need Trivy inspection | Fresh-database findings for the actual target images |

The first four are independent skills in the workflow plugin. Image scanning is standalone and
bundles its scanner script. Assessment requests are read-only; implementation requests authorize
only their stated changes. None of these skills grants commit or external-action authority.

`decompose-feature` designs a delivery sequence; `ensure-atomic-pr` checks the boundaries of a
change already under discussion and maps mixed concerns to specific edits. Neither needs the
other to be usable.

`anti-slop` provides a focused necessity, correctness and maintenance-cost assessment. `pr-review`
is the general change-set review entrypoint, with applicable code, tests, comments, error handling,
types, specification and independent review methods. Their correctness checks can overlap;
combine supported findings with the same cause rather than count them twice. Using one does not
automatically invoke the other, and a focused quality assessment is not a claim that a full PR
or security review completed.

The optional [design document template](plugins/workflow/skills/decompose-feature/templates/DESIGN.md)
is retained as a writing aid for engineering proposals. Adapt its depth and sections to the request.

## Key design principles

- Native execution, task-specific specialists, no shared coordinator.
- One purpose per change; healthy intermediate states when splitting delivery.
- Actual behavior and evidence over appearance, bookkeeping or process completion.
- Preserve user choices, write boundaries and separate publication authority.
- Keep skills self-contained and evaluation data outside distributed packages.

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
`$workflow:anti-slop` (short names work when unambiguous). Claude Code
uses `/pr-review:pr-review` and `/workflow:anti-slop`. In Copilot, use `/skills` or
`copilot skill list --json` to inspect the discovered names, then explicitly ask to use the
`pr-review` or `anti-slop` skill. Natural-language requests remain supported.

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

The complete Codex Security workflow remains an optional external dependency: report missing automatic coverage;
if the user explicitly requires it, report the review incomplete rather than substitute a lighter scan.
Installation does not grant permissions or install optional dependencies.

Plugin-owned skills are supported as complete plugin combinations, not arbitrary standalone subsets.
In particular, `pr-review` composes sibling `spar` and `rubber-duck` skills. `npx skills add` snapshot
checks validate skill content, not native plugin installation or independent operation of each sibling.

#### Compatibility evidence

Current candidate validation, including the Codex orchestration checks and the latest full-branch
review, is recorded in [coding-orchestration validation](docs/coding-orchestration/validation.md).
The following installation and publication observations are historical evidence for `0.1.1`.

Local candidate verification on 2026-09-07:

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
branch diff, commit range, or working-tree changes. The plugin is read-only. For a supported Git
change-set target, it uses the complete `$codex-security:security-diff-scan` workflow when security
review is applicable and that optional capability is installed. For a non-diff artifact it keeps
the selected ordinary review aspects and reports specialist security coverage as not run;
explicitly requested security coverage remains incomplete. It does not synthesize or substitute
a diff to make an artifact scannable.

PR Review omits Daybreak access queries, access-status warnings and enrollment prompts,
including advisories in the composed scan workflow. Technical scan checks and substantive
security coverage remain required; account membership is not a review prerequisite.

An explicitly selected design file or patch can also be the review target. Ordinary feature,
compatibility and delivery advice stays in the primary session; implementation files supplied as
background do not automatically select PR Review. Design is a focus within a selected review.

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
and invoke the relevant specialist directly. Workflow `0.2.0` supplies `anti-slop`,
`decompose-feature`, `ensure-atomic-pr` and `refresh-related-docs`. Its skills provide engineering
methods, with an optional engineering-design template. General change-set review uses `pr-review`
when needed; neither plugin is mandatory for ordinary native work.

### Personal Codex orchestration

[config/codex](config/codex/) contains a mergeable configuration fragment and four custom agent TOMLs,
separate from portable plugin behavior. The primary model and effort remain user-selected. The
common authority, verification and delegation policy lives in [the personal AGENTS copy](config/codex/AGENTS.md).
[config.toml](config/codex/config.toml) declares the six-worker ceiling and ordinary fallback;
the [agent TOMLs](config/codex/agents/) own each role's model, effort, permissions and conduct.
The [design](docs/coding-orchestration/design.md) explains those boundaries rather than supplying
another instruction contract. Roles remain self-contained; no shared instruction loader is added.
Complex work and takeover after an ordinary reasoning limitation both use `complex_worker`
(GPT-6.1 Sol/high). These are policy choices, not measured optima. Repair and review budgets mean
limits explicitly supplied by the user, harness or bounded assignment; there is no default round count.
Changes in this repository do not update the real `~/.codex` configuration or switch production plugins.
Historical Codex `0.154.0` checks found that reviewer role files did not enforce read-only
permissions under a writable primary. A declared TOML permission is not proof of effective
runtime isolation; that observation remains historical, not qualification of the current candidate.
See [validation](docs/coding-orchestration/validation.md) for the earlier repository delivery,
full-branch review, recorded failures and coverage limits. Those results predate the current role
bindings; the A/B results establish no adoption advantage.

Candidate verification uses isolated configurations for each supported CLI and this worktree's marketplace, not remote `main`. Behavioral evaluation and orchestration-effectiveness acceptance are scoped to Codex. Claude Code and Copilot CLI retain manifest, installation/update, source-identity and discovery checks, without a workflow-effectiveness guarantee. Installing skill snapshots through `npx skills add --copy` tests instruction content only, not plugin discovery. CLI discovery requires its own actual evidence. App UI compatibility remains separately unverified unless exercised; it is not a gate for this repository-only working-tree delivery. A new test thread is a discovery check, not a mandatory work phase for ordinary tasks.

Install `scan-image-vulnerabilities` separately through `npx skills add` when needed; it still requires bash, python3 and Trivy 0.58.0+, with Docker or kubectl only for their respective discovery modes. Manually invoking skills from an unregistered source checkout remains unsupported.

### Updating an existing installation

Repository edits and isolated validation do not change production installations or global
configuration. Update them only with explicit authorization, using the native plugin manager.
Version `0.2.0` retires `workflow-orchestrator`, `execute-plan-loop` and `plan-parallel-work`;
there are no aliases or compatibility shims. Resolve actual installed sources before removing
obsolete standalone copies or links, and preserve unrelated skills and user documents.

Verify the four current skills and absence of retired entries in a fresh host process. Shared
standalone copies may shadow plugin skills or serve other clients; account for those consumers
before removal. Retain recoverable installation evidence, and do not rewrite old task files or
completed evaluation records. Updating an installation grants no commit, push or deployment authority.

### Working on this repo

Follow repo-root `AGENTS.md`; it governs this repository only. Keep each specialist independently
usable and update directly affected references and cases. Maintenance scope stays in the authorized
conversation, with generated evaluation evidence in `evals/out/`. Add cases and inert fixtures under
`evals/cases/` and `evals/fixtures/`, preserving the frozen rules in `evals/AGENTS.md` and historical
evidence. Runtime packages contain no evaluation corpus or task-management artifacts.

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

Keep the new skill independently usable, state any task-specific dependency, and update this README. Avoid adding a shared coordinator or task lifecycle.

### Skill types worth considering

This repository supplies focused coding specialists. When adopting it for a real project, consider adding skills in these categories based on your team's needs:

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

Set project-specific authority, isolation and verification requirements in that repository's
`AGENTS.md` or equivalent contributor guidance. Scale checks and independent review to actual
risk and preserve the user's stated constraints.

## Status

Workflow `0.2.0` is the repository candidate with four engineering specialists and an optional
design template. Content refinement and behavioral qualification are separate: formal evaluation
and local activation remain deferred, and repository edits do not update existing installations.

The central `evals/` project evaluates Codex with frozen inputs, native installation and discovery, actual task execution, independent grading, and resource records. Claude Code and Copilot CLI retain distribution/adaptation checks without model-effectiveness evaluation. See [the evaluation guide](evals/README.md) and [the acceptance report](docs/evaluation/acceptance.md). Historical certification is not certification of a new candidate. Each result identifies its runtime snapshot, frozen corpus, model/settings and actual execution evidence; unrun, ungraded and failed checks are not passes.
