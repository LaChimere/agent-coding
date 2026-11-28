# Agent Coding

Portable engineering methods for Antigravity, Grok Bot, Codex, Claude Code and Pi. Use one tool or combine
several: the same methods preserve goals, authority and evidence while the host runs the work.

The `engineering` plugin covers understanding a project, designing and implementing tasks,
real verification, review, release and prevention of recurring mistakes. Its nine lifecycle skills and two challenge skills are
entry points, not a mandatory nine-stage pipeline. Small tasks remain small; persistent goals
use the host's existing scheduling and state. A further set of user-invoked skills, adapted from
pstack, runs only when you call it by name.

## Skills

| Skill | Result |
|---|---|
| `understand-codebase` | Source-backed explanations, behavioral traces, rationale and diagnosis |
| `design-solution` | Interfaces, ownership, trade-offs, targeted prototypes and acceptance criteria |
| `implement-task` | Authorized features, repairs, refactors and performance work with evidence |
| `create-verification-skill` | Project-local launch/doctor/drive/evidence/cleanup tools and a feature map, actually exercised |
| `verify-behavior` | Observed behavior, failure paths, performance and side effects for a named version/environment |
| `code-review` | Verified findings, counterevidence, review coverage and bounded re-review |
| `release-and-rollout` | Authorized integration/publication with exact artifacts, staged rollout and recovery |
| `prevent-recurring-mistakes` | Structural or executable prevention proved against an actual prior error |
| `maintain-verification-skill` | Proven map/harness corrections, separated from product regressions |
| `spar` | Evidence-based opposing perspectives on an explicitly selected decision |
| `rubber-duck` | Independent constructive critique of a concrete work product |

User-invoked skills (call them by name, for example `/engineering:arena` in Claude Code or
`$engineering:arena` in Codex):

| Skill | Result |
|---|---|
| `arena` | Several independent candidates for one artifact, judged by rubric and synthesized |
| `swarm` | Parallel workers over slices or racing attempts, reported with evidence and gaps |
| `interrogate` | Adversarial attempts to break a change, kept only when a rerun reproduces them |
| `optimize-metric` | A metric driven toward a target by measured, kept-or-reverted experiments |
| `figure-it-out` | An auditable workflow for large, ambiguous or unattended work |
| `resume-work` | A pause checkpoint, a resume point or a recall of recent work |
| `reframe` | Expert vocabulary, neighboring fields and a rewritten problem description |
| `sharpen` | A deeper rewrite of a task request within the same scope |
| `teach` | An explanation of a subsystem or change, built up at your pace |
| `reflect` | Proposed edits to skills and guidance from the current session's lessons |
| `no-comments` | Narrating comments removed from a diff and the code they excused flagged |
| `unslop` | English or Chinese text without AI writing patterns |
| `technical-writing` | Documents, PR descriptions and commit messages in English or Chinese |
| `create-formal-verification-skill` | A proved project-local formal verification skill for a costly property |
| `maintain-formal-verification-skill` | Formal verification brought back in line with changed code |

Install the complete package even when using one skill. Shared resources stay inside the plugin;
skill use does not grant permission to modify files, publish or create automations. A review or
design request stays within its requested scope. Required missing evidence remains incomplete.

## Use it

- **Understand:** ask how a subsystem works or why a design exists; request source evidence.
- **Build:** describe the outcome, constraints and observable acceptance. The agent chooses the
  relevant method and runs proportionate checks rather than loading every skill.
- **Verify:** ask it to operate the real user path and return actions, outcomes and retained proof.
- **Review:** select the actual artifact or revision; distinguish findings from runtime evidence.
- **Continue:** retain the goal, authority, actual state, evidence and next action across tools.
- **Improve:** turn real repeat mistakes into structure, types or checks before more prose.

For concrete host setup see [installation and host boundaries](docs/engineering/hosts.md).
Native command names differ; natural-language task requests are supported too. Personal models,
providers and credentials remain outside the portable methods.

## Repository layout

```text
plugins/engineering/     # Lifecycle, challenge and user-invoked skills, bundled methods and native metadata
config/antigravity/      # Personal standing rules, plugin registration template and Git guard hook
config/codex/            # Personal standing rules, runtime settings and worker profiles
config/claude/           # Personal standing rules, method routing, reviewer subagent and Git guard hook
config/pi/              # Pi entry instructions
config/copilot/          # Retained personal policy and method routing
config/grok-bot/         # Bot instructions and optional, inactive routine templates
skills/                 # Independent specialist capabilities (currently image scanning)
evals/                  # Isolated execution, behavior cases, immutable evidence and checks
docs/                   # Contributor guidance, design decisions and qualification evidence
```

`AGENTS.md` governs contributions to this repository, not downstream task execution. Evaluation
criteria and fixture answers are never distributed to executing agents.

## Status and evidence

The breaking engineering redesign is implemented with representative local acceptance.
Capability-preservation runs, later method refinement and targeted rechecks cover the recorded
revisions. Matched baseline/final-candidate comparisons passed on both sides, without establishing
an overall quality or reliability gain. The [acceptance record](docs/engineering/implementation.md)
retains the exact run scope, results, failed attempts, corrections and version-specific limits.
The [evaluation guide](evals/README.md) explains how to validate the selected collection.
The owner's [Grok file-loaded cold-start result](docs/engineering/grok-acceptance.md) has been
audited and locally reproduced, with bounded verifier corrections; native import remains unverified.
Claude Code and Pi currently have scoped
read-only review evidence, not full workflow parity. Antigravity currently has live package
validation, GitHub CLI install, CLI/App discovery, global-rule/skill invocation and `git-guard`
hook checks, not full multi-skill workflow parity.
See [the accepted design](docs/engineering/design.md)
and [implementation and qualification](docs/engineering/implementation.md).

Package validity, installation, discovery, invocation and successful outcomes are distinct
claims. Support for one host does not prove another host or a mixed handoff. Installation
instructions describe the intended path; the acceptance record states what has actually run.

## Maintaining this project

Read [the contributor docs](docs/README.md), including the frozen evaluation quality baseline.
Use behavior cases and real episodes to decide whether instructions help. Preserve raw evidence,
failed attempts and unknown results; do not score verbosity, worker counts or PR volume as quality.
