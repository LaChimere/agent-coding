---
name: create-verification-skill
description: Build and prove a project-local verification skill with real launch, health checks, user actions, evidence, cleanup and a feature map when repeatable verification is missing.
---

# Create project verification

Read [the shared agreement](../../references/working-agreement.md) and
[verification evidence](../../references/verification-evidence.md). Inspect the project before
choosing a tool or asking the user questions the repository can answer.

## Discover the actual project

Identify user surfaces, existing dev/build commands, prerequisite data/authentication, ready-state
signals and existing test/control harnesses. Determine what can observe results: responses, files,
database state, screenshots, logs or performance records. Check isolation of ports, profiles, data
directories and sessions. Keep external credentials as references, never values in the generated skill.

Reuse the documented setup and existing tools. If the project does not run, diagnose the exact
blocker; repair within authority or report it. Do not teach invented steps against a broken base.
Select a discoverable project-local destination for the actual host. Preserve existing skills
and project conventions; material placement ambiguity needs a decision before overwriting anything.

## Generate executable guidance

Write a skill with a discriminating name/description and these grounded sections:

- **Launch:** exact build/start/setup steps, prerequisites, isolated resources and a readiness
  signal showing the app is usable, not merely listening. For short-lived commands, define a
  fresh isolated invocation per journey instead of a nonexistent persistent server.
- **Doctor:** a read-only check of the expected build, process/port ownership, auth and state.
- **Drive:** commands, routes or stable UI selectors for the real user path. Use an existing
  harness first; add a reusable helper only when it removes repeated fragile work.
- **Evidence:** capture the action and resulting state, relevant side effects, exact version and
  where proof survives. Explain when performance or failure/recovery evidence is required.
- **Cleanup:** remove only owned processes and scratch state, including failed attempts, while
  retaining evidence. A dry-run's name does not prove absence of side effects; observe them.

Include every helper's invocation and requirements. Scripts must be runnable, necessary and
grounded in the project rather than placeholder recipes.
Define distinguishable product-failure and tool-error outcomes, including setup, cleanup and
evidence-write failures, using the shared verification evidence contract.

Create a small feature map: an index and entries for representative user-facing features. Each
entry explains the feature, how a user reaches it, prerequisites, real actions and the observable
result that proves it. Start with the most relevant features and state coverage, rather than
claiming a complete product map from a sample. Include alternate entry points when relevant.

## Prove the generated instructions

Follow the generated skill from launch through one representative journey, evidence and cleanup.
After cleanup, confirm evidence still exists. Fix observed harness defects and rerun the affected
path, cleaning failed attempts too. Check actual host discovery when claiming the skill is installed.
A written skill that was not executed is a draft; report its missing prerequisites and coverage.

Return the generated paths, actual command/actions and results, coverage and unverified conditions.
Record any stand-in environment's differences from the intended target. Point future maintenance
to [maintain-verification-skill](../maintain-verification-skill/SKILL.md); scheduling maintenance is
a separate user choice, not an automatic side effect of creation.
