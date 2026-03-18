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
plans/                                            # Created per-task by agent (plans/{slug}/)
```

## Skills

### decompose-feature

Splits a large feature into a sequence of small, mergeable PRs:

```
Base PR (contracts/flags) → Implementation PR(s) → Integration PR(s) → Cleanup PR
```

Use when: feature is too large for one PR, stacked PRs needed, staged rollout desired.

### plan-parallel-work

Defines safe parallel execution boundaries for multiple agents:

```
        ┌── Agent A (owns: backend/)
Base PR ─┼── Agent B (owns: frontend/)
        └── Agent C (owns: tests/)
```

Use when: multiple agents need to work simultaneously, branch/path ownership must be explicit.

### ensure-atomic-pr

Evaluates whether a diff is atomic enough and proposes splits:

```
mechanical-only → preparatory refactor → behavioral change → tests → docs/cleanup
```

Use when: a PR is too large, mixes concerns, or needs post-hoc recovery.

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
```

Add routing rules to the "Skill routing" section of `AGENTS.md`.

### Adjusting strictness

- **More strict**: Require Gate 1 for all plan-mode tasks (remove "Design required?" conditional).
- **Less strict**: Use the fast path more broadly, or skip Gate 2 for low-risk planned changes.
- **Per-project**: Override validation commands and trigger tables in `AGENTS.md`.

## Status

**v1.0** — Framework is complete and internally consistent. Not yet validated through real-world usage. Expect iteration after first production use.
