# Engineering specialists and harness boundaries v0.2

Updated 2026-10-02. This is the current design; [validation.md](validation.md) retains historical
checks and their limits. Earlier results do not qualify this revision or its role/model mapping.
This revision covers engineering methods and instruction ownership. Formal behavioral evaluation
and local activation are separate work; environment diagnostics are not final acceptance.

## Ownership

The agent harness owns goal and plan handling, execution, continuation and conversation state.
Plugin instructions do not select, require, prohibit or emulate these mechanisms, or define
their creation, format, update or completion rules.

The primary agent owns requirements, material decisions, authorization, integration, verification
and final acceptance. It reasons about dependencies and asks about unresolved consequential
choices in the conversation. Progress records do not expand commit, external-write or
destructive-action authority, and completion claims require actual verification evidence.

The workflow plugin supplies engineering methods for change quality, commit structure and related
documentation. Commit sequences and engineering designs are task outputs; they do not
govern the harness's task state or execution cadence. The optional design-document template
is bundled with `decompose-feature`, with depth and sections adapted to the requested proposal.
Group commits into PRs when preparing submission or explicitly asked.

## Four independent specialists

| Skill | Question answered |
|---|---|
| `anti-slop` | Is this change necessary, supported by evidence and suitably simple? |
| `decompose-feature` | What coherent commit sequence has genuine prerequisites and valid intermediate code states? |
| `ensure-atomic-pr` | Does each proposed or existing commit have one purpose, and which edits form recoverable units? |
| `refresh-related-docs` | Which facts are stale, and how can they be corrected while preserving accepted decisions and history? |

Each skill is independently usable from its installed package. General change-set review uses
the separate `pr-review` plugin when needed. Missing required capabilities remain explicit gaps;
no automatic installation or imitation.

`anti-slop` challenges necessity, behavioral evidence and maintenance cost. `pr-review` covers
the requested change-set review aspects and independent scrutiny. Either can identify correctness
issues; overlapping findings with the same cause are combined. A focused assessment does not
establish full PR or specialist security coverage, and neither plugin automatically invokes the other.

## Instruction ownership

| Source | Owns |
|---|---|
| [Personal AGENTS copy](../../config/codex/AGENTS.md) | Common authority, Git safety, verification, primary delegation and final judgment |
| [Runtime fragment](../../config/codex/config.toml) | Worker capacity and ordinary fallback configuration |
| [Agent TOMLs](../../config/codex/agents/) | Role-specific conduct, model/effort bindings, permissions and result requirements |
| Installed skill | Engineering methods for its specific task, with self-contained scope and authority boundaries |
| Consuming project's guidance | That project's own contracts and practices |
| Agent harness | Goal and plan handling, execution state and continuation |

This document describes the sources; it is not a second runtime rulebook or a shared loader.
Global policy selects and integrates roles; role files remain usable with a bounded assignment
without depending on another role's instructions. Repeating essential scope and read-only
boundaries in a self-contained role is intentional, unlike maintaining competing policy versions.

Repair and review budgets mean only limits explicitly supplied by the user, harness or bounded
assignment. No default attempt or review-round count is introduced. Attempt history and validation
evidence remain relevant even when no limit is supplied. The model and effort mappings are retained;
this refinement does not tune them or establish that they are optimal.

Project environment-entry work is excluded from this refinement. No project feed, CI reproduction,
image rebuild or version-association files are added or changed.

## Personal Codex configuration

`config/codex` contains the personal instruction copy, mergeable runtime fragment and four roles.
It does not replace provider configuration or credentials, or switch production installs.
The primary model and effort remain user-selected. Current worker bindings were copied from the
local configuration on 2026-09-30:

| Role | Model | Effort | Purpose |
|---|---|---|---|
| `ordinary_worker` | `gpt-6-luna` | `max` | Bounded ordinary execution, investigation and review |
| `complex_worker` | `gpt-6.1-sol` | `high` | Complex execution and evidence-backed takeover |
| `critical_reviewer` | `gpt-6.1-sol` | `xhigh` | Read-only critical correctness, security and design analysis |
| `deep_critical_reviewer` | `gpt-6-astra` | `xhigh` | A concrete critical question unresolved by preceding analysis |

The configured ceiling remains six worker threads, excluding the primary; it is not a quota or
measured optimum. Roles and model policy belong to personal configuration, not portable plugins.
Model plus effort must be evaluated together; levels are not a universal capability ladder.

## Distribution and acceptance

Workflow `0.2.0` intentionally removes three public skills; no aliases or compatibility shims are
added. Codex, Claude Code and Copilot CLI retain native manifests and marketplace identities.
Validate isolated installation/update, source identity and discovery in each supported CLI.
Behavioral effectiveness uses Codex; distribution checks do not establish model effectiveness.
Preserve outcome, authority and evidence checks when retiring mechanism-only cases. Frozen profiles,
quality rules, holdouts and completed evidence are not rewritten to fit the candidate.
