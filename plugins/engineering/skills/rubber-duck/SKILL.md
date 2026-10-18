---
name: rubber-duck
description: Give a bounded constructive critique of a plan, design, implementation or tests when an independent critic is requested or substantive blind spots warrant a separate pass. Review-only; no fixes or merge decision.
---

# Rubber Duck: challenge a work product

Read [the agreement](../../references/working-agreement.md). Pin the artifact and its goal,
authoritative requirements, surrounding interfaces and invariants. Inspect supporting evidence
only where it can establish or disprove a concern. Respect explicit exclusions and read boundaries.

## Critique the work

Trace consequential risks in logic, reachability, state transitions, failure propagation, security,
data ownership, compatibility, migrations, recovery and changed-path performance. Check whether
tests establish the intended contract and whether the proposed work solves the actual problem.
Use [change quality](../../references/change-quality.md) for scope, necessity and test-fitting.

For each candidate state the location, triggering condition, consequence, violated expectation,
counterevidence checked and a bounded correction. Filter cosmetic preferences, generic best
practices and unsupported suspicions. Recommend another architecture only when it addresses an
established risk. A security concern does not establish completion of a specialist security scan.

## Obtain an outside perspective

When invoked in the main session, use one independent critic if available, following
[independent execution](../../references/independent-review.md). If already running as the critic,
perform the critique directly. Share the pinned artifact and criteria without other findings.
Disclose a primary-only fallback; keep required independence unmet when it cannot be obtained.

## Return and integrate

Return the scope, supported blocking/non-blocking issues, material optional improvements and
coverage limits. Omit empty sections and do not invent findings. Report actual checks and independent
execution. The task owner verifies candidates before integrating them into design or review; this
critic does not decide to merge, ship or implement. An explicit request for only named review
aspects excludes this optional pass unless the user also requested it.
