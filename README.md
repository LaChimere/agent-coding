# Agent Coding Skills

A repository of reusable workflow skills for disciplined AI coding. The portable coordination layer now lives inside `skills/workflow-orchestrator/`; the repo-root `AGENTS.md` is only for maintaining this repository.

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
| `skills/workflow-orchestrator/` | Portable workflow coordination contract + planning templates | Conductor |
| Other `skills/` | Specialized worker workflows for specific scenarios | Specialists |

### Core workflow

```
Discover if needed → Design if needed → Plan if needed → Execute → Verify → Review if needed → Lessons if earned
```

```
Fast path (urgent):  Execute → Verify → Lessons (backfill)
```

`workflow-orchestrator` decides which conditional phase applies, which installed worker owns the next step, and whether a companion or direct read-only inspection skill should also run.

### Approval gates

| Gate | When | What gets reviewed |
|---|---|---|
| **Gate 1** | After research + design | Is the direction right? Is the approach sound? |
| **Gate 2** | After plan + todo | Are the execution steps reasonable? |
| **Gate 3** | After execution for high-risk changes, plan deviations, or explicit reviewer request | Does the actual diff match the plan? |
| **Fast path** | Production down / urgent | Skip gates, still verify, backfill lessons |

### Acceptance criteria

Every planned step or PR defines concrete acceptance criteria. Before proposing completion, the agent must demonstrate them with evidence. Implementation authorization and commit authorization are separate; the active landing mode is either `working_tree` or `commits`.

### Verification levels

| Level | Scope | Used for |
|---|---|---|
| **L1** | Lint + typecheck + unit tests | Refactors, no behavior change |
| **L2** | Integration tests or before/after proof | Bug fixes, behavior changes |
| **L3** | E2E / staging validation | Infra, security, data migration |

No evidence = not done.

## Project structure

```
AGENTS.md                                         # Repo-specific maintainer guidance for this repository
skills/                                           # Specialized workflows
  workflow-orchestrator/                         #   Portable coordination layer + bundled planning templates
    SKILL.md
    references/workflow-contract.md
    templates/
    evals/
  decompose-feature/                              #   Split large features into small PRs
    SKILL.md
    templates/feature-plan-template.md
  plan-parallel-work/                             #   Coordinate multi-agent parallel work
    SKILL.md
    templates/parallel-task-plan-template.md
  ensure-atomic-pr/                               #   Assess and fix PR atomicity
    SKILL.md
    templates/atomic-pr-checklist.md
  execute-plan-loop/                              #   Execute approved work in atomic long-loop increments
    SKILL.md
  anti-slop/                                      #   Quality guard that keeps code changes free of AI slop
    SKILL.md
    templates/pre-commit-slop-gate.md
    references/agents-md-block.md
  refresh-related-docs/                            #   Refresh stale docs after code changes
    SKILL.md
  scan-image-vulnerabilities/                     #   Scan container images for vulnerabilities
    SKILL.md
    scripts/trivy_latest_scan.sh
    tests/test_trivy_latest_scan.sh
    evals/
  achieve-goal/                                   #   Persist and pursue long-running goals
    SKILL.md
plans/                                            # Planning/execution artifacts for changes to this repo
```

Every distributed skill also carries an `evals/` directory with functional cases and a classification manifest.

## Skills

### decompose-feature

Splits a large feature into a sequence of small, mergeable PRs:

```
Vertical slice A → Vertical slice B → Vertical slice C
        or, when a real shared dependency exists:
Shared base → independent fan-out slices → required cleanup
```

Use when: evidence shows the work is too large for one reviewable PR, stacked PRs are requested, or staged rollout is needed. Advisory requests can stay inline; workflow artifacts are materialized only when delivery begins.

### plan-parallel-work

Defines safe parallel execution boundaries for multiple agents:

```
        ┌── Task A (isolated working copy, owned paths)
Base ref ─┼── Task B (isolated working copy, owned paths)
        └── Task C (isolated working copy, owned paths)
```

Use when: multiple agents need to work simultaneously, branch/path ownership must be explicit, or the PR sequence already exists. It pins a base ref, task acceptance, handoff payloads, merge order, and final convergence validation.

### ensure-atomic-pr

Evaluates whether a diff is atomic enough and proposes splits:

```
purpose A (preparation + behavior + tests/docs) → purpose B (preparation + behavior + tests/docs)
```

Use when: a PR is too large, mixes concerns, or needs post-hoc recovery.

### workflow-orchestrator

Acts as the workflow front door and coordinates the worker skills:

```
classify request → derive slug → create/update plans/{slug} → choose next worker skill → keep state aligned
```

Use when: the user wants one skill to decide how work should proceed end-to-end, wants the right slug docs created before execution, or wants the existing workflow skills to cooperate as one system. This skill decides **which phase applies next and which worker skill should take over**.

### execute-plan-loop

Executes approved implementation work in a disciplined long-running loop:

```
pick next atomic slice → implement → update status → run checks → land or report → milestone review
```

Use when: the user wants the agent to carry out an approved implementation scope with verified slices and progress updates. It creates commits only when the recorded landing mode is `commits`.

### anti-slop

Keeps code changes free of AI slop — output that looks polished but is unnecessary, wrong, or hard to maintain:

```
explain it → support correctness claims → only what's needed → justify duplication → inspect complexity → milestone review
```

Use when: writing, changing, refactoring, or extending code. It runs **alongside** the primary execution skill, checks necessity and evidence, permits only bounded justified exceptions, and reuses the executor's milestone review rather than creating a second loop.

### achieve-goal

Persists a user-provided long-running goal and keeps working toward it until a stop condition:

```
register goal -> re-anchor -> execute one verified slice -> update state -> continue or stop
```

Use when: the user explicitly creates a persistent objective with `/goal`, continues an existing active goal, or wants pause/resume/clear and cross-phase completion auditing. Generic execution continuation routes to `execute-plan-loop`.

### refresh-related-docs

Refreshes documentation that has become stale after code changes:

```
detect evidence of staleness → discover documentation authority → use named approvals / ask for expanded scope → update minimally → report
```

Use when confirmed behavior, configuration, interfaces, or maintenance workflow make Markdown stale. Explicitly named targets are already approved; newly discovered or expanded scope still requires approval.

### scan-image-vulnerabilities

Scans container images with Trivy using the latest vulnerability database:

```
refresh DB → scan image(s) → summarize findings by severity
```

Use when: the user asks about container image vulnerabilities, exact cluster workload images, or Trivy. The bundled installed script preserves partial artifacts but returns nonzero if any requested image fails.

## Key design principles

- **Evidence over speculation** — don't implement until the problem is understood
- **Gates over trust** — human approval at critical decision points
- **Small over large** — one PR = one purpose
- **Simple over clever** — solve the stated problem, not imagined future ones
- **Explicit over implicit** — boundaries, ownership, and acceptance criteria must be stated

## Usage

### Using the workflow in another repo

1. Install skills through `npx skills add`; source-checkout execution is unsupported.
2. Install `workflow-orchestrator` with each workflow-managed worker combination you intend to use.
3. Install standalone inspection skills independently when needed.
4. Use the target repo's own `AGENTS.md` only for project-specific rules.
5. Keep every installed skill's bundled references, templates, and scripts intact.

### Working on this repo

1. Repo-root `AGENTS.md` applies only to this repository.
2. If you change cross-skill workflow behavior, update `workflow-orchestrator` first.
3. If you change a worker skill, keep it aligned with the `workflow-orchestrator` contract.
4. Put repo-change planning artifacts under `plans/{slug}/`.

### What the agent does at runtime

1. Uses `workflow-orchestrator` as the front door for workflow-managed skills when the next workflow phase is not already obvious.
2. Lets `workflow-orchestrator` classify the task, derive the slug, and create/update the needed `plans/{slug}` artifacts from its bundled templates.
3. Hands off to a narrower worker skill when the phase is clear (`decompose-feature`, `plan-parallel-work`, `execute-plan-loop`, and so on).
4. A workflow-managed worker consumes an existing installed `workflow-orchestrator` handoff or invokes that skill when phase or approval is unresolved. Read-only inspection skills can remain outside this contract when their operating context says so.
5. Verifies the resulting work at the appropriate level before proposing completion.

## Customization

### Adding a new skill

Create a directory under `skills/` with a `SKILL.md`:

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
- **Config persistence**: If a skill needs setup info (credentials, project IDs), store it in a `config.json` within the skill directory so the agent does not re-ask every session.
- **Description field**: This is a trigger mechanism, not a summary. Be explicit about when the skill should activate, including edge cases and alternative phrasings.

### On-demand safety hooks

Some agent platforms support on-demand hooks — temporary guards that activate only when a specific skill is invoked and last for the duration of the session. These can add safety rails during execution without burdening normal development. Examples:

- Block destructive commands (`rm -rf`, `DROP TABLE`, force-push) during production-adjacent work
- Restrict file edits to a specific directory during focused debugging
- Require confirmation before any `git push` during stabilization

If your agent platform supports hooks, consider adding them to high-risk skills or infrastructure operations. Define hooks in the skill's `SKILL.md` frontmatter or a companion configuration file per your platform's conventions.

### Adjusting strictness

- **More strict**: Require Gate 1 for all plan-mode tasks (remove "Design required?" conditional).
- **Less strict**: Use the fast path more broadly, or skip Gate 2 for low-risk planned changes.
- **Per-project**: Put project-specific contributor rules in that repo's own `AGENTS.md` / `CLAUDE.md`, while keeping shared workflow coordination in `workflow-orchestrator`.

## Status

Every distributed skill has functional eval definitions and classification metadata, and the scanner has hermetic installed-copy validation. Continue refining from real usage evidence rather than adding speculative workflow rules.
