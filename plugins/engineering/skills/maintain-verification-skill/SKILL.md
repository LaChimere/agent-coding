---
name: maintain-verification-skill
description: Audit an existing project's verification skill and feature map against source and live behavior, correcting documentation or harness drift without hiding product regressions.
---

# Maintain project verification

Read [the shared agreement](../../references/working-agreement.md) and
[verification evidence](../../references/verification-evidence.md). Find the named existing
verification skill and map. Resolve multiple plausible targets before editing; if none exists,
use [create-verification-skill](../create-verification-skill/SKILL.md) only when creation is authorized.

## Establish scope and source coverage

Read the map index and its entries; reconcile missing, duplicate or obsolete links. Inspect the
source and recent changes for each in-scope feature. Explain current behavior, identify likely
drift with source locations and form one concrete user-path recipe per feature. Independent
readers may inspect separate features; they do not concurrently drive a shared app instance.

Include real missing user-facing surfaces only with concrete source evidence. Preserve the
requested scope; a partial feature audit must not be reported as a whole-map audit.

## Run the live coverage

Follow the skill's own launch model and verify every feature for which complete coverage is
claimed. Reconcile recipes into efficient app states without skipping proof. One owner drives
each shared instance; short-lived commands can use fresh isolated sessions per journey.

Recheck runtime and reporter assumptions when the environment changes. Prefer stable observable
results and exit status to incidental console formatting; pin a reporter explicitly when its
format is part of the verification interface. Separate declared supported versions from versions
actually exercised.

Doctor before the first drive and after surprising or failed behavior. Reset a wedged interaction
or relaunch when process health alone cannot establish usable state. Capture actions, results
and side effects. Preserve evidence through cleanup; remove failed-iteration residue and only
the resources the run owns. Record inaccessible routes with their attempted path and concrete
prerequisite, never as passing behavior.

## Classify and correct

- **Documentation drift:** source and intended behavior changed; correct the map or instructions
  with supporting evidence.
- **Harness gap:** behavior works but the control/check path is wrong or missing; repair authorized
  verification assets and re-drive them through the documented invocation.
- **Product regression:** actual behavior violates the supported contract; report it separately.
  Do not redefine expected behavior or change product code as a side effect of maintaining docs.

Missing prerequisites or an ambiguous contract remain explicit gaps. If fixing a harness problem
invalidates a running instance, restart the affected part and rerun its proof before acceptance.

## Report actual coverage

Return the target, source/live feature coverage, proven corrections, product issues, unavailable
paths and evidence locations. Use clean only for the claimed completed scope; distinguish changed
verification assets from blocked/incomplete coverage. Publication needs separate applicable
authority and is handled by [release-and-rollout](../release-and-rollout/SKILL.md). Keep the map useful
for the next unfamiliar agent, without committing unnecessary transient run logs.
