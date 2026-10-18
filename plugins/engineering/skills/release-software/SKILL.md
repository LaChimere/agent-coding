---
name: release-software
description: Prepare or carry out authorized integration, merge, deployment and post-release verification, preserving artifact identity, rollout gates and data recovery requirements.
---

# Release software

Read [the shared agreement](../../references/working-agreement.md). Resolve whether the request
authorizes preparation only, a merge, a deployment or the whole release. Reuse explicit bounded
authorization; stop before uncovered external effects. Skill use alone is not permission to publish.

## Prepare a concrete release

Inspect the current source, reviewed revision, required CI, release mechanism and target environment.
Check the final integrated tree, not just each component's earlier result. Required checks must
finish successfully for the exact accepted head; canceled, superseded, missing or skipped runs
do not establish passing CI. Report relevant failures on the base branch instead of ignoring them.

Identify the build/artifact, configuration, dependency and data-migration prerequisites. Check
compatibility between simultaneously deployed versions when applicable. Define the rollout scope,
health signals, observation window, pause conditions and recovery steps proportionate to risk.
Flags, internal use and staged rollout can reduce exposure; a code revert may not undo data or
external side effects. Required human approvals must come from people, not reviewer agents.

Return a reviewable preparation result before a missing authorization gate, with unresolved
decisions explicit. Do all independent authorized preparation rather than asking on an abstract plan.

Read [Git publication](../../references/git-publication.md) before any Git mutation or recovery,
and [stateful work](../../references/stateful-work.md) before interruption-sensitive deployment.
Before submission, assess commit/PR boundaries with
[change sequencing](../design-solution/references/change-sequence.md).

## Execute within authority

Recheck the head/artifact and approvals immediately before landing. Use a conditional merge that
pins the reviewed head when supported; on GitHub, `gh pr merge --match-head-commit` binds that check.
If identity changed, inspect the delta and rerun affected gates before proceeding.

Use the project's release tooling. Record the actual operation, version, environment and result.
After interruption or ambiguous failure, inspect real state before retrying; prefer idempotent
operations and preserve partial work. Stop or recover under the agreed conditions rather than
automatically widening rollout or weakening gates.

## Verify the running outcome

Use [verify-behavior](../verify-behavior/SKILL.md) against the deployed build and relevant user
paths. Check telemetry and side effects, not only the deployment command's exit code. Keep
ready-to-merge, merged, ready-to-deploy, deployed and behavior-verified distinct. Report precisely
where the process ended and what evidence is still missing.

Update directly affected release/operating knowledge and ownership. Feed confirmed incidents
into tests or [prevent-recurring-mistakes](../prevent-recurring-mistakes/SKILL.md) within scope.
For ongoing observation read [continuous-work](../../references/continuous-work.md); a runbook
does not itself enable an automation or authorize future releases.
