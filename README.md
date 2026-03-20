# Agent Coding Skills

An engineering governance framework for AI coding agents. It defines rules, workflows, and document templates that constrain agents to deliver code through small, reviewable, evidence-backed PRs — instead of uncontrolled end-to-end changes.

## Problem

AI coding agents commonly fail in predictable ways:

- Ship one giant PR that mixes multiple concerns
- Start implementing before understanding the problem
- Bury architecture decisions inside code without explicit review
- Step on each other's files when working in parallel
- Claim "done" without verification evidence
- Repeat the same mistakes across tasks

This framework turns each of those failure modes into an enforceable rule.

## How it works

### Two layers

| Layer | Role | Analogy |
|---|---|---|
| `AGENTS.md` | Universal operating rules for the agent | Constitution |
| `skills/` | Specialized workflows for specific scenarios | Playbooks |

### Core workflow

```
Research → Design → [Gate 1: Human Approve] → Plan + Todo → [Gate 2: Human Approve] → Execute → Verify → [Gate 3: Post-exec Review (high-risk only)] → Lessons
```

```
Fast path (urgent):  Execute → Verify → Lessons (backfill)
```

Every non-trivial task flows through structured phases with human approval gates. Trivial tasks skip directly to execution.

### Approval gates

| Gate | When | What gets reviewed |
|---|---|---|
| **Gate 1** | After research + design | Is the direction right? Is the approach sound? |
| **Gate 2** | After plan + todo | Are the execution steps reasonable? |
| **Gate 3** | After execution (high-risk only) | Does the actual diff match the plan? |
| **Fast path** | Production down / urgent | Skip gates, still verify, backfill lessons |

### Acceptance criteria

Every plan defines concrete acceptance criteria per step/PR. Before proposing a PR, the agent must demonstrate all criteria are met with evidence. If they're not met, a 4-level recovery flow kicks in: fix → update plan → update design → escalate to human.

### Verification levels

| Level | Scope | Used for |
|---|---|---|
| **L1** | Lint + typecheck + unit tests | Refactors, no behavior change |
| **L2** | Integration tests or before/after proof | Bug fixes, behavior changes |
| **L3** | E2E / staging validation | Infra, security, data migration |

No evidence = not done.

## Project structure

```
AGENTS.md                                         # Universal agent operating rules
templates/                                        # Document templates
  RESEARCH.md                                     #   Evidence collection
  DESIGN.md                                       #   Solution design + trade-offs
  PLAN.md                                         #   Execution plan + acceptance criteria
  TODO.md                                         #   Checklist + acceptance gate
  LESSONS.md                                      #   Post-incident learnings
skills/                                           # Specialized workflows
  decompose-feature/                              #   Split large features into small PRs
    SKILL.md
    templates/feature-plan-template.md
  plan-parallel-work/                             #   Coordinate multi-agent parallel work
    SKILL.md
    templates/parallel-task-plan-template.md
  ensure-atomic-pr/                               #   Assess and fix PR atomicity
    SKILL.md
    templates/atomic-pr-checklist.md
  refresh-related-docs/                            #   Refresh stale docs after code changes
    SKILL.md
  scan-image-vulnerabilities/                     #   Scan container images for vulnerabilities
    SKILL.md
    scripts/trivy_latest_scan.sh
plans/                                            # Created per-task by agent (plans/{slug}/)
```

## Skills

### decompose-feature

Splits a large feature into a sequence of small, mergeable PRs:

```
Base PR (contracts/flags) → Implementation PR(s) → Integration PR(s) → Cleanup PR
```

Use when: feature is too large for one PR, stacked PRs needed, or staged rollout desired. This skill decides **what PRs should exist**. If you also need branch/worktree/path ownership for multiple agents, follow up with `plan-parallel-work`.

### plan-parallel-work

Defines safe parallel execution boundaries for multiple agents:

```
        ┌── Agent A (owns: backend/)
Base PR ─┼── Agent B (owns: frontend/)
        └── Agent C (owns: tests/)
```

Use when: multiple agents need to work simultaneously, branch/path ownership must be explicit, or the PR sequence already exists and now needs a safe execution topology. This skill decides **who works where and in what order**, not how to split the feature into PRs.

### ensure-atomic-pr

Evaluates whether a diff is atomic enough and proposes splits:

```
mechanical-only → preparatory refactor → behavioral change → tests → docs/cleanup
```

Use when: a PR is too large, mixes concerns, or needs post-hoc recovery.

### refresh-related-docs

Refreshes documentation that has become stale after code changes:

```
detect doc-worthy changes → find related docs → ask user approval → update with style preservation → report
```

Use when: a milestone or feature is completed, behavior or configuration changes, or API surface changes. Always asks for explicit user approval before editing any doc.

### scan-image-vulnerabilities

Scans container images with Trivy using the latest vulnerability database:

```
refresh DB → scan image(s) → summarize findings by severity
```

Use when: the user asks about image vulnerabilities, wants a CVE scan, mentions Trivy, or asks to check images running in a Kubernetes cluster.

## Key design principles

- **Evidence over speculation** — don't implement until the problem is understood
- **Gates over trust** — human approval at critical decision points
- **Small over large** — one PR = one purpose
- **Simple over clever** — solve the stated problem, not imagined future ones
- **Explicit over implicit** — boundaries, ownership, and acceptance criteria must be stated

## Usage

### For a new project

1. Copy `AGENTS.md`, `templates/`, and `skills/` into your repository.
2. Customize `AGENTS.md`:
   - Update preferred validation commands (`make lint`, `make test`, etc.) to match your project.
   - Adjust the mode switching trigger table if needed.
3. The agent will read `AGENTS.md` at the start of each task and follow the rules.

### For an existing project

Same as above. The framework is additive — it doesn't require changes to your existing code, CI, or tooling.

### What the agent does at runtime

1. Reads `AGENTS.md` to understand the operating rules.
2. Evaluates the task against the mode switching trigger table.
3. If plan mode: creates `plans/{slug}/` and produces artifacts using `templates/`.
4. Stops at approval gates for human review.
5. Executes only after approval, verifies against acceptance criteria.
6. Proposes a PR only when all criteria are met with evidence.

## Customization

### Adding a new skill

Create a directory under `skills/` with a `SKILL.md`:

```
skills/
  your-new-skill/
    SKILL.md           # Must include: name, description, operating context, workflow
    templates/         # Optional templates
    references/        # Optional detailed docs loaded on demand
    scripts/           # Optional helper scripts
```

Add routing rules to the "Skill routing" section of `AGENTS.md`.

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
- **Per-project**: Override validation commands and trigger tables in `AGENTS.md`.

## Status

**v1.0** — Framework is complete and internally consistent. Not yet validated through real-world usage. Expect iteration after first production use.
