---
name: anti-slop
description: Reviews implementation work for unnecessary scope, unsupported correctness, test-fitting, duplication, and removable complexity. Use for pre-commit readiness ("ready/about to/should I commit?"), explicit or ongoing anti-slop guarding, visible-test hard-coding, scope creep, repeated add-only growth, fix-on-fix loops, or meaningful/high-risk milestones; it remains a companion and does not own planning or execution cadence.
---

# Purpose

This companion prevents plausible-looking code that is unnecessary, wrong, duplicated, or harder to maintain. Looking correct is not proof that a change is correct or needed.

It does not choose the plan, cadence, review schedule, landing mode, or commit. Those belong to the user and primary executor.

## Default and full modes

For routine edits, the primary executor carries compact quality invariants: make only the requested change, reuse local patterns, run relevant validation, and do not claim success without evidence. Do not load a separate anti-slop loop or reviewer for every ordinary edit.

Run the **full anti-slop check** when:

- the user explicitly asks for it;
- the user explicitly asks to keep guarding against overbuilding during ongoing implementation;
- the agent is ready or about to land a change, or asks whether it should commit;
- a visible test is inviting hard-coded or fixture-fitted behavior instead of a general solution;
- scope starts growing beyond the request, the work is repeatedly add-only, or a fix causes more fixes;
- a meaningful or high-risk milestone is reached.

Use the bundled `templates/pre-commit-slop-gate.md` only for that full check. It records evidence on the workflow's existing status or evidence surface; this skill never creates a parallel tracker.

## Hard gate before landing

For a full check, the agent must be able to state in plain language what the change does and why it is needed. That purpose, plus the command and result from the narrowest runnable external validation that demonstrates the behavior, must be recorded on the existing status/evidence surface (or commit body if none exists).

If that surface exists but is stale, update it with the evidence just obtained before deciding readiness. Do not report a change as unready solely because the record has not yet been refreshed.

Do not land a change when its correctness, safety, or requested scope is unsupported. Fix it or stop. Compilation, tidy code, and a green test fitted to a single visible value are not sufficient evidence.

## Challenge the change

Ask questions that can change the outcome:

- **Necessary?** Build the task at hand, not options, flags, plugins, or abstractions imagined for later.
- **Reusable?** Look for an existing helper or pattern before adding another path. Generated output or temporary compatibility code may repeat structure only when its source, bounds, verification, and removal condition are explicit.
- **Simpler?** Remove or consolidate concrete unnecessary complexity when evidence supports it. Do not delete merely to meet a quota.

An add-only diff is not automatically wrong. Across several slices, it signals an inspection for duplication, dead scaffolding, missed consolidation, and reader clarity; record why remaining additions are necessary if nothing can be removed. If fixes keep creating fixes, stop and reconsider the approach instead of patching the patches.

## Independent challenge

Request an independent, adversarial review only for an explicit request or a meaningful/high-risk milestone—not every normal change. Ask it to find what is wrong, missing, unnecessary, or duplicated, rather than to approve appearances. A dedicated reviewer, separately prompted model, or human can be independent; vendor and model count alone do not establish it.

Check each finding, then fix it, split it into follow-up work, or escalate it with evidence. If no independent perspective is available, perform adversarial self-review and record that limitation without calling it independent review.

## Overrides and boundaries

The user may change cadence and review mechanism. A confirmed throwaway that will not land may use a lighter process, but must not be described as landing-ready. Unsupported correctness, safety, or scope for landed work cannot be waived.

The primary executor's normal verification, atomicity, error handling, planning, and cadence rules remain its responsibility. This companion adds necessity, reuse, complexity, and evidence checks only.

## Embedding the baseline

`references/agents-md-block.md` is a short block for a repository's local agent guidance. It carries the routine invariants; this skill supplies the full, signal-driven check when needed.
