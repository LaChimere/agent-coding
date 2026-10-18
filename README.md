# Agent Coding

Portable engineering methods for Grok Bot, Codex, Claude Code and Pi. Use one tool or combine
several: the same methods preserve goals, authority and evidence while the host runs the work.

The `engineering` plugin covers understanding a project, designing and implementing tasks,
real verification, review, release and prevention of recurring mistakes. Its nine lifecycle skills and two challenge skills are
entry points, not a mandatory nine-stage pipeline. Small tasks remain small; persistent goals
use the host's existing scheduling and state.

## Skills

| Skill | Result |
|---|---|
| `understand-codebase` | Source-backed explanations, behavioral traces, rationale and diagnosis |
| `design-solution` | Interfaces, ownership, trade-offs, targeted prototypes and acceptance criteria |
| `implement-task` | Authorized features, repairs, refactors and performance work with evidence |
| `create-verification-skill` | Project-local launch/doctor/drive/evidence/cleanup tools and a feature map, actually exercised |
| `verify-behavior` | Observed behavior, failure paths, performance and side effects for a named version/environment |
| `code-review` | Verified findings, counterevidence, review coverage and bounded re-review |
| `release-software` | Authorized integration/publication with exact artifacts, staged rollout and recovery |
| `prevent-recurring-mistakes` | Structural or executable prevention proved against an actual prior error |
| `maintain-verification-skill` | Proven map/harness corrections, separated from product regressions |
| `spar` | Evidence-based opposing perspectives on an explicitly selected decision |
| `rubber-duck` | Independent constructive critique of a concrete work product |

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
plugins/engineering/     # Lifecycle and challenge skills, bundled methods and native metadata
config/codex/            # Personal standing rules, runtime settings and worker profiles
config/claude/           # Personal standing rules and Claude Code method routing
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
Capability-preservation refinements passed renewed scoped acceptance; the 16 native development
cases passed all 36 checks. Prior reports still apply only to their frozen versions. Grok Bot native validation is deferred to the owner; Claude Code and Pi currently have scoped
read-only review evidence, not full workflow parity. Old workflow/pr-review package names are
retired without aliases; useful methods and personal host policy are preserved under D-009.
See [the accepted design](docs/engineering/design.md)
and [requirement-by-requirement acceptance](docs/engineering/implementation.md).

Package validity, installation, discovery, invocation and successful outcomes are distinct
claims. Support for one host does not prove another host or a mixed handoff. Installation
instructions describe the intended path; the acceptance record states what has actually run.
Historical evaluation records remain historical and do not qualify the new package.

## Maintaining this project

Read [the contributor docs](docs/README.md), including the frozen evaluation quality baseline.
Use behavior cases and real episodes to decide whether instructions help. Preserve raw evidence,
failed attempts and unknown results; do not score verbosity, worker counts or PR volume as quality.
