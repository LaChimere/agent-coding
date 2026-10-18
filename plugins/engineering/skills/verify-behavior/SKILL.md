---
name: verify-behavior
description: Verify named behavior, failure paths, performance or side effects against a specific code version and environment using executable checks and real user journeys.
---

# Verify behavior

Read [the shared agreement](../../references/working-agreement.md) and
[verification evidence](../../references/verification-evidence.md). Identify the claim to verify,
the exact target/version, environment, prerequisites and required coverage before running checks.

## Select the proof

Inspect the applicable project commands, existing verification skill and feature map. Choose
checks that establish the claim and affected contracts. Use the real entry point and data where
required; compilation and mocked internals cannot establish unexercised interactions.

For a bug fix, seek before/after evidence of the intended failure. For performance, keep the
workload and measurement comparable. For recovery or concurrency, exercise credible ordering and
failure conditions. For documentation-only tasks, source and reference checks may be sufficient.
Add a test or control when coverage is missing within the authorized scope; tests are not quotas.

## Execute and inspect

Confirm the running build and usable state. Perform the named actions, capture the decisive
result and relevant side effects, then inspect the evidence. Health-check unexpected states and
clean owned residue before another attempt. Do not drive another user's instance or let parallel
runs share mutable data unnoticed. Evidence must survive teardown.

Keep failures visible. Determine whether the cause is product behavior, harness drift,
environment, unavailable capability or an incorrect expectation. A verify-only task does not
authorize a product repair; explain the bounded next action. Use
[maintain-verification-skill](../maintain-verification-skill/SKILL.md) for authorized harness/map
corrections, and [implement-task](../implement-task/SKILL.md) when a repair is authorized.

## Report the supported scope

Return target and environment, checked requirements, actual commands/actions and outcomes,
artifact locations, cleanup state and unverified conditions. Separate passing checks from
overall acceptance. A missing or canceled required check is incomplete evidence, not a pass.
If the project lacks a usable verification path, identify what must be supplied or use
[create-verification-skill](../create-verification-skill/SKILL.md) when creation is authorized.
