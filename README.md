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
| `plugins/workflow/skills/workflow-orchestrator/` | Portable workflow coordination contract + planning templates | Conductor |
| `plugins/workflow/skills/` | Seven coordinated skills, distributed together | Specialists |
| `skills/scan-image-vulnerabilities/` | Standalone image inspection | Inspector |

### Core workflow

```
Discover if needed → Design if needed → Plan if needed → Execute → Verify → Review if needed → Lessons if earned
```

```
Fast path (urgent):  Execute → Verify → Lessons (backfill)
```

Clear small tasks run directly in the primary session. `workflow-orchestrator` resolves genuine phase, authorization or worker ambiguity; installing the plugin does not make it a mandatory entrypoint.

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
  skills/
    workflow-orchestrator/             # Shared contract, references and templates
    execute-plan-loop/
    anti-slop/
    decompose-feature/
    plan-parallel-work/                # Embedded Parallel execution template
    ensure-atomic-pr/
    refresh-related-docs/
plugins/pr-review/                     # Separate review plugin, unchanged
  .codex-plugin/plugin.json
  skills/pr-review/
  skills/spar/
  skills/rubber-duck/
skills/scan-image-vulnerabilities/      # Standalone, with bundled script and tests
.agents/plugins/marketplace.json
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

Resolves real phase, authorization or worker ambiguity:

```
resolve phase or approval ambiguity → choose the appropriate worker → retain existing scope and evidence
```

Use when: the next phase, approval or worker is genuinely unresolved, or phase coordination is explicitly requested. Clear tasks and approved native plans do not need a new handoff or planning round.

### execute-plan-loop

Executes approved implementation work in a disciplined long-running loop:

```
pick coherent slice → implement → verify → update living plan → continue approved scope → final audit
```

Use when: the user wants the agent to carry out an approved implementation scope with verified slices and progress updates. A slice is a checkpoint: it continues through the whole approved scope unless the user limited the request to a step/phase or a real blocker remains. It creates commits only when the recorded landing mode is `commits`.

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

### Installing the PR Review plugin

Add this repository as a Codex marketplace, then install the plugin:

```sh
codex plugin marketplace add LaChimere/agent-coding --ref main
codex plugin add pr-review@agent-coding
```

Start a new thread, then invoke `$pr-review` explicitly or ask Codex to review the current PR,
branch diff, commit range, or working-tree changes. The plugin is read-only. It uses the complete
`$codex-security:security-diff-scan` workflow when security review is applicable and that optional
capability is installed; otherwise it reports the missing security coverage according to whether
security was automatic or explicitly required.

`$pr-review` selects the applicable code, comments, tests, errors, types, and specification reviewers;
design is a focus applied through those reviewers rather than a separate public aspect. When no
authoritative specification exists, it skips specification review instead of inferring requirements
from the diff. The primary agent double-confirms and deduplicates candidates, then reports them as
Blocker, Critical, Major, Minor, or Suggestion findings with source and coverage details. This workflow
does not invoke or depend on the separate `$code-review` skill.

For substantial changes, `$pr-review` automatically adds a `$rubber-duck` critic unless the user
excludes it. SPAR is never automatic, but a review request can explicitly include `$spar` to challenge
the design assumptions and trade-offs. Ordinary reviewers use the current session model by default;
the primary agent chooses reasoning effort and retains final judgement. When no eligible different
model family is available for a challenger, the primary model performs a distinct/sequential
same-session pass without launching a same-family subagent; the report states that
limitation.

Use `$spar <idea>` for an explicit, one-shot devil's-advocate analysis of an idea, decision, plan,
design, migration, or optimization. It develops two independent opposing perspectives by default,
adds a third only when that stakeholder changes the decision, and returns a concise synthesis without
implementing the proposal.

Use `$rubber-duck` for an explicit, one-shot critique of a plan, design, implementation, or tests.
It reports only consequential blocking, non-blocking, or optional issues, stays read-only, and leaves
the final decision to the primary agent.

### Installing and using the workflow plugin

For a checkout containing the candidate, register that checkout's marketplace and install:

```sh
codex plugin marketplace add /absolute/path/to/agent-coding
codex plugin add workflow@agent-coding
```

The plugin distributes all seven workflow skills and their bundled resources; it adds no `$workflow` wrapper, MCP server, hook or background service. Invoke the appropriate skill directly. General change-set review uses the separately installed `pr-review` plugin. Missing optional coverage is reported; explicitly required independent review remains incomplete if unavailable, not replaced with self-review or automatic installation.

Candidate verification uses an isolated Codex home and this worktree's marketplace, not remote `main`. Installing skill snapshots through `npx skills add --copy` tests instruction content only, not plugin discovery. CLI discovery, native Plan Mode and native goal lifecycle require their own actual evidence. App UI compatibility remains separately unverified unless exercised; it is not a gate for this repository-only working-tree delivery. A new test thread is a discovery check, not a mandatory work phase for ordinary tasks.

Install `scan-image-vulnerabilities` separately through `npx skills add` when needed; it still requires bash, python3 and Trivy 0.58.0+, with Docker or kubectl only for their respective discovery modes. Runtime execution from the source checkout remains unsupported.

### Switching an existing standalone installation

Formal local switching is separate from repository edits and isolated validation. Do not change the current installation or synchronize global configuration without explicit authorization.

After authorization, resolve the actual installed entries and preserve recoverable copies outside skill discovery paths. Deactivate the seven old standalone entries (`workflow-orchestrator`, `execute-plan-loop`, `anti-slop`, `decompose-feature`, `plan-parallel-work`, `ensure-atomic-pr`, `refresh-related-docs`) and the retired `achieve-goal` entry before enabling the workflow plugin. Do not delete guessed cache directories or migrate historical task files. Leave community skills, standalone image scanning and the separate review plugin unchanged.

Register the reviewed local candidate marketplace and install `workflow@agent-coding` using the commands above. Verify unique skill discovery and bundled resources in fresh CLI and App test sessions where available. If separately authorized, compare `config/codex/AGENTS.md` with the global instruction file before synchronizing it, preserving unrelated changes. If verification fails, restore the recorded installation/configuration from recoverable copies. None of these steps authorizes a commit, push or deployment.

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

- **More strict**: Require Gate 1 for all plan-mode tasks (remove "Design required?" conditional).
- **Less strict**: Use the lightweight path for clear low-risk changes; keep urgent fast path limited to genuine urgency and existing authority.
- **Per-project**: Put project-specific contributor rules in that repo's own `AGENTS.md` / `CLAUDE.md`, while keeping shared workflow coordination in `workflow-orchestrator`.

## Status

Every runtime skill has functional eval definitions and classification metadata in the central `evals/` corpus. The provider-neutral harness evaluates both root and plugin-owned skill content through isolated `npx skills add --copy` snapshot copies. That hermetic behavior check does not validate a plugin manifest, marketplace entry, cache, or Codex discovery. Plugin changes therefore also require the separate marketplace install and installed-copy validation described in `AGENTS.md` and `tools/skill-evals/README.md`. Historical certification is not certification of this workflow candidate. Each result must identify its runtime snapshot, frozen corpus, model/settings and actual execution evidence; unrun, ungraded and failed checks are not passes. Continue refining from real usage evidence rather than adding speculative workflow rules.
