---
name: anti-slop
description: Reviews implementation work for unnecessary scope, unsupported correctness, test-fitting, duplication, and removable complexity. Use for pre-commit readiness ("ready/about to/should I commit?"), explicit or ongoing anti-slop guarding, visible-test hard-coding, scope creep, repeated add-only growth, fix-on-fix loops, or meaningful/high-risk milestones; it remains a companion and does not own planning or execution cadence.
---

# Purpose

This companion prevents plausible-looking code that is unnecessary, wrong, duplicated, or harder to maintain. Looking correct is not proof that a change is correct or needed.

It does not choose the plan, cadence, review schedule, landing mode, or commit. Those belong to the user and primary executor.

Readiness assessments and questions about what to do next are read-only unless the user has already authorized implementation within that scope. Inspect and recommend the next action inline without editing code, plans, evidence files, or commit messages. A failing gate identifies work to propose; it does not authorize that work. Only an authorized implementation task may apply fixes or refresh its existing `plan.md` evidence. This skill never creates a parallel tracker.

## Default and full modes

For routine edits, the primary executor carries compact quality invariants: make only the requested change, reuse local patterns, run relevant validation, and do not claim success without evidence. Do not load a separate anti-slop loop or reviewer for every ordinary edit.

Run the **full anti-slop check** when:

- the user explicitly asks for it;
- the user explicitly asks to keep guarding against overbuilding during ongoing implementation;
- the agent is ready or about to land a change, or asks whether it should commit;
- a visible test is inviting hard-coded or fixture-fitted behavior instead of a general solution;
- scope starts growing beyond the request, the work is repeatedly add-only, or a fix causes more fixes;
- a meaningful or high-risk milestone is reached.

Use the bundled `templates/pre-commit-slop-gate.md` only for that full check. A full check does not automatically require an independent reviewer. Several commits may share a verified slice; do not restart the full check for each commit without changed code or a new risk signal.

## Hard gate before landing

For a full check, state in plain language what the change does and why it is needed, plus the command and result from the narrowest relevant validation. Use checks that demonstrate the completion claim; documentation-only changes need consistency review, not invented runtime tests. Report unavailable or unrun validation as such. In read-only review, report this evidence inline. During authorized implementation, record it in the existing living plan or final response; a commit body is an option only when committing is separately authorized.

Stale bookkeeping alone is not a correctness failure. Report it in read-only review; refresh it during authorized implementation without asking again.

Do not call a change landing-ready when its correctness, safety, or requested scope is unsupported. Report findings in review; fix in-scope problems when implementation is authorized. Compilation, tidy code, and a green test fitted to a single visible value are not sufficient evidence of behavioral correctness.

## Challenge the change

Ask questions that can change the outcome:

- **Necessary?** Build the task at hand, not options, flags, plugins, or abstractions imagined for later.
- **Reusable?** Look for an existing helper or pattern before adding another path. Generated output or temporary compatibility code may repeat structure only when its source, bounds, verification, and removal condition are explicit.
- **Simpler?** Identify concrete unnecessary complexity and recommend removal or consolidation; apply it only within authorized implementation. Do not delete merely to meet a quota.

An add-only diff is not automatically wrong. Across several slices, it signals an inspection for duplication, dead scaffolding, missed consolidation, and reader clarity; record why remaining additions are necessary if nothing can be removed. If fixes keep creating fixes, stop and reconsider the approach instead of patching the patches.

## Independent challenge

The user's request or applicable review policy determines whether independent review is required; the full anti-slop checklist does not add that requirement. Use the installed `pr-review` for general change-set review when available, without chaining a community review workflow. Ask an independent reviewer to find what is wrong, missing, unnecessary, or duplicated rather than to approve appearances. A dedicated reviewer, separately prompted model, or human can be independent; vendor and model count alone do not establish it.

Before delegation, identify the concrete review target and an actually callable independent reviewer. Treat repository capability notes as claims to verify, not as live tools or returned reviews. If either prerequisite is missing, report that review has not started and name the missing target or capability; continue your own bounded assessment separately.

Use a completed synchronous reviewer result directly; an asynchronous reviewer needs a real returned task handle before waiting or collecting. Until that reviewer returns an assessment of the target, report the review as pending or incomplete. A successful wait with no reviewer result supplies no review evidence. Summarize only findings you actually received; identify their launch/result source in the inline report or existing checkpoint. An intention to launch, an empty wait, or a local self-check cannot supply that source. Do not automatically install a reviewer to fill the gap.

Check each received finding against the implementation before marking the independent review complete. For each confirmed finding, state a concrete recommended correction or an explicit reason to defer or escalate it. In read-only review, recommend that action without applying it; during authorized execution, carry out the in-scope action. Missing required review prevents a reviewed/ready claim, not safe unrelated work.

## Overrides and boundaries

The user may change cadence and review mechanism. A confirmed throwaway that will not land may use a lighter process, but must not be described as landing-ready. Unsupported correctness, safety, or scope for landed work cannot be waived.

The primary executor's normal verification, atomicity, error handling, planning, and cadence rules remain its responsibility. This companion adds necessity, reuse, complexity, and evidence checks only.

## Embedding the baseline

`references/agents-md-block.md` is a short block for a repository's local agent guidance. It carries the routine invariants; this skill supplies the full, signal-driven check when needed.
