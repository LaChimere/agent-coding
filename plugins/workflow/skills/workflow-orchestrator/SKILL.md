---
name: workflow-orchestrator
description: Resolve a real ambiguity in workflow phase, authorization, or primary worker, or coordinate phases when explicitly requested. Do not use for host-native goal status, clear small tasks, creating one worktree, direct execution of an approved plan, or an already obvious specialist task.
---

# Purpose

Resolve the next phase or worker without owning implementation. The normal path is discussion → design alignment → execution planning → implementation and verification; phases apply only when needed.

Use this skill for unresolved phase, authorization or worker choices, not as a mandatory front door. Clear small changes belong to the primary session; direct specialist requests go to that installed skill.

# References

Read `references/approval-gates.md` when an approval, landing, recovery or verification decision is unclear. Read `references/worker-routing.md` when worker responsibilities or availability are contested. `references/workflow-contract.md` is a navigation index, not required reading.

Project `AGENTS.md` supplies contributor constraints and validation commands, not the portable workflow contract. Templates are bundled under this installed skill's `templates/`; resolve them relative to this skill, never a source checkout.

# Procedure

1. **Inspect relevant evidence.** Classify the next step as discovery, design, plan, execution, recovery, review, docs or direct inspection. Read named files and current approvals before making codebase claims. Report contradictions rather than routing toward a workaround fitted to visible tests.
2. **Use existing planning context.** An accepted native Plan Mode proposal plus explicit revisions is valid input. Do not re-plan or demand a formatted handoff because a file is absent. Reuse an existing `plans/{slug}` for the same scope; choose one short purpose-specific slug only if new records are needed.
3. **Record only what is needed and authorized.** Native Plan Mode owns exploration and the proposed overall plan. Save to `plan.md` only when the host permits writing and the user authorizes it. Save-only requests authorize documents, not implementation. An explicitly approved native plan satisfies Gate 2; writing it adds no gate. Exiting Plan Mode alone is not approval.
4. **Choose the smallest sufficient worker.** Use the table below; add companions only for a distinct need. A native proposal's complete parallel section needs no second plan or interview. Routine allocation details remain execution decisions.
5. **Resolve only material gaps.** Preserve scope and authority already supplied in the conversation. Default landing mode to `working_tree`; implementation never implies commits or external writes. Ask only for missing decisions that materially affect behavior, contracts, architecture, state/concurrency, safety, cost or scope. Once objective, scope, behavior, constraints and observable success criteria are sufficient to plan, and material unknowns are resolved or explicitly bounded, end the questionnaire, state remaining assumptions and continue within existing authority. If a skill rule blocks authorized work, link its file, quote the exact rule, distinguish a requirement from your interpretation, and identify the needed decision.
6. **Continue or hand off.** Convey phase, scope, approval source, landing mode, acceptance, worker and any actual blocker concisely. A structured handoff can help another executor, but is not an entry requirement. Continue authorized work unless the request was coordination-only or an explicit phase/step boundary has been reached.

| Worker | Use when |
|---|---|
| Primary session | A clear, bounded task needs no specialist workflow |
| `execute-plan-loop` | Approved implementation needs verified slices through the requested scope |
| `plan-parallel-work` | Planning simultaneous code changes requires missing isolation, ownership or integration decisions, or the user asks to assess parallel implementation |
| `decompose-feature` | A PR delivery sequence is needed; parallel tasks alone do not imply multiple PRs |
| `ensure-atomic-pr` | Assess or recover boundaries of an existing mixed-purpose diff |
| `refresh-related-docs` | Evidence shows broader Markdown beyond directly coupled docs is stale |
| `pr-review` | General change-set review; use the separately installed plugin, not a chain of community review workflows |
| `scan-image-vulnerabilities` | Standalone read-only container image inspection, without planning artifacts or gates |

`anti-slop` is a signal-driven companion for explicit quality checks, pre-commit readiness, scope growth, test-fitting, fix-on-fix loops or meaningful/high-risk milestones. It does not add another tracker or automatic independent reviewer.

# Planning records

Use `design.md` for behavior, constraints, the proposed solution and consequential trade-offs, including migration or rollout direction when it affects the design's viability. Use `plan.md` for approved scope, delivery steps, acceptance, verification methods and all execution progress/evidence; `research.md` for gathered evidence; `lessons.md` only after a material correction. Create these on demand. Keep the plan's approved content separate from its changing progress section; link existing design instead of repeating full option comparisons.

New tasks have no independent TODO or custom goal file. Do not add old-format detection, compatibility or migration, and do not rewrite or remove historical user task files.

# Native goal boundary

The host's native `/goal` owns persistent lifecycle; the executor owns implementation and verification; the living plan stores scope and evidence. Ordinary tasks do not create goals. Goal intent does not authorize commits, external writes, purchases or destructive operations. Never duplicate host pause/resume, budgets or completion state in a file. If native goal is unavailable, continue an authorized ordinary task but state that automatic cross-turn continuation is unavailable; do not emulate it.

# Missing capabilities

Use the host's native planning mode when available; otherwise discuss the proposal without
implementation until authorized. Resolve skill invocation and delegation through the host's exposed
capabilities, not another harness's command syntax. A synchronous delegated result is completed work;
an asynchronous launch needs a returned live task handle before waiting. Neither a requested role nor
a failed launch is evidence of execution. Keep required independence and approval boundaries intact.

Use installed skills and actually exposed host capabilities. Do not claim a missing invocation occurred or automatically install it. Continue independent authorized work; report what cannot be checked. Optional review coverage can be reported as absent; explicitly required independent review remains incomplete until a real reviewer is available, not satisfied by self-review.
