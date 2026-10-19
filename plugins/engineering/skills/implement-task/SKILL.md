---
name: implement-task
description: Implement an authorized feature, bug fix, refactor or performance improvement through a complete user path, with proportionate tests, runtime evidence and related documentation.
---

# Implement an engineering task

Read [the shared agreement](../../references/working-agreement.md),
[change quality](../../references/change-quality.md) and
[verification evidence](../../references/verification-evidence.md).

## Establish the target

Recover the user's goal, approved choices, scope, existing behavior and acceptance. Inspect the
actual entry point, affected callers/state and project instructions. Check the current worktree
and preserve unrelated edits. Solve factual unknowns through source or bounded experiments;
return unresolved material product or contract choices before dependent implementation.

Use [design-solution](../design-solution/SKILL.md) for a consequential unresolved design, not
for every small edit. Identify a complete runnable slice early. Maintain the whole objective
while sequencing useful slices; a working slice does not complete a larger authorized task.

## Choose the relevant method

- **Feature:** derive scenarios from the desired behavior and constraints, then implement through
  the real entry point. Cover meaningful boundaries and affected existing contracts.
- **Repair:** reproduce the original failure where feasible, trace its cause, make a focused fix,
  and prove the same case now works. Preserve ruled-out hypotheses. Missing reproduction remains
  an evidence gap; do not suppress the symptom to claim success.
- **Refactor:** state which behavior must stay invariant and which structural property improves.
  Exercise the existing boundary before/after; remove the replaced path when within scope.
- **Performance:** establish comparable workload and measurements, inspect traces or other raw
  evidence, change a supported bottleneck and remeasure without sacrificing correctness or merely
  changing the benchmark. Before planning from a measured baseline or reporting a conclusion,
  use [performance evidence](../../references/performance-evidence.md).

Use existing build and verification tools. If the project cannot be driven reliably, use
[create-verification-skill](../create-verification-skill/SKILL.md) within the authorized project
scope. Do not turn every task into infrastructure work when a useful check already exists.

## Implement and integrate

Keep responsibilities and state ownership clear; favor the ordinary correct path over extra
caller rules. Validate changed behavior continuously. Changes to test expectations, skipped checks
or removed coverage need a contract-based reason and retained proof of distinct risks.

Parallelize only stable, separable work with explicit ownership and isolated mutable resources.
Inspect returned diffs and outputs, resolve integration issues, and check the final combination.
Classify tool/environment failures separately from reasoning failures. Reassess fixes that repeat
without new evidence or grow beyond the approved approach; preserve valid partial work.

For multi-step state changes vulnerable to interruption, use
[stateful work](../../references/stateful-work.md). For commit-boundary planning or mixed-diff
recovery, use [change sequencing](../design-solution/references/change-sequence.md); this is not
permission to stage or rewrite history.

## Finish the requested outcome

Run relevant project checks and [verify-behavior](../verify-behavior/SKILL.md) for material user
paths. Use [code-review](../code-review/SKILL.md) when requested or justified by risk, with actual
independence when required. Fix confirmed in-scope issues and record legitimate unresolved limits.

Update directly affected documentation, feature maps and architecture explanations following
[project knowledge](../../references/project-knowledge.md). Report what
changed, why, exact validation and remaining gaps. Keep ready-to-merge distinct from merged or
released; use [release-and-rollout](../release-and-rollout/SKILL.md) only within publication authority.
When a real repeat failure surfaced, consider [prevent-recurring-mistakes](../prevent-recurring-mistakes/SKILL.md)
within scope; do not manufacture a lesson or enlarge the task to create one.
