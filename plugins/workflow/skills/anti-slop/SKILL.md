---
name: anti-slop
description: Inspect implementation changes for unnecessary scope, unsupported correctness, test-fitting, duplication and avoidable complexity. Use for requested or ongoing anti-slop guarding, change-readiness questions, visible-test hard-coding, scope growth, repeated additions or fixes, and substantial changes needing a necessity and simplicity assessment.
---

# Purpose

Find plausible-looking changes that do not solve the requested problem, lack correctness
evidence or create avoidable maintenance cost. Polished names, tidy code and passing tests
alone do not establish that a change is necessary or correct.

# Ground the assessment

Read the request, selected decisions and named change. Inspect affected callers, contracts and
relevant verification. State what behavior the change should produce and why it is needed;
judge additions against that outcome and its required implementation constraints. Check whether
a similar-looking result substitutes for the requested behavior or method. Expand inspection when
a concrete dependency or proof gap requires it, keeping unrelated work outside the assessment.

For ongoing work, use related changes and prior failed fixes when they explain accumulating
complexity or a mistaken assumption. Missing context is a limitation to report, not a reason
to invent requirements.

# Challenge the engineering

## Necessity and scope

Connect new validation, options, flags, abstractions, dependencies, compatibility, retries and
fallback behavior to an actual requirement or credible failure mode and consequence. Hypothetical
future consumers do not justify extension points. Distinguish validation at an external boundary
from redundant checks on values already guaranteed by an internal contract.

For ongoing implementation, check whether the smallest complete path from the actual entry point
to a usable result has been exercised, or whether infrastructure and hypothetical safeguards are
delaying it. Recommend an authorized representative run or a bounded correction at the blocked
step. Preserve required safety, data integrity and repository gates; a working slice does not
complete a larger approved outcome.

Identify unrelated cleanup and changes to shared consumers beyond the requested scope. Recommend
the smallest coherent correction that preserves selected behavior and necessary safeguards.

## Correctness and test-fitting

Trace representative inputs through the changed execution path to the observable result.
Check whether verification exercises that path and preserves the affected existing contracts.
Compilation or a mock-only result does not establish runtime behavior it never exercised.

Inspect suspicious constants, special cases, test-name checks and fixture-shaped branches.
Determine whether they follow the product contract or merely reproduce visible examples;
a contractually fixed value is not automatically hard-coding. Check that tests establish expected
behavior rather than mirror the implementation or assert states the interface cannot produce.
Changing expectations, suppressing errors or skipping a check requires its own justification;
a green result alone cannot justify weakening the behavior being checked.

For changed tests, identify the protected contract, credible regression, gap in existing coverage
and any production interface introduced only for testing. Inspect expectations derived from the
subject under test, mocks that supply the behavior being asserted and negative cases that pass
because a different guard rejects the input. For bug fixes, inspect available evidence of failure
on pre-fix code for the intended reason and success after repair; missing evidence is a verification
gap, not proof that the fix is wrong.

Before recommending consolidation or deletion, identify the independent proof that remains for
each distinct risk. Source checks, call ordering and test seams can protect real public, protocol,
security or architecture contracts; prove redundancy rather than deleting by pattern, speed or
line count. Prefer exercising existing production boundaries over adding test-only scaffolding.

## Reuse and complexity

Look for existing behavior and local patterns before adding a parallel implementation. Compare
responsibilities and contracts before consolidating similar code: syntactic resemblance alone
does not justify coupling separate components. An abstraction should reduce caller obligations,
isolate fragile behavior or serve demonstrated reuse.

For generated duplication, check the maintained source and how the output is regenerated and
verified. For temporary compatibility code, check its applicability, validation and removal
condition. Separate justified repetition from divergent copies that must be maintained together.

Look for concrete removable complexity: dead scaffolding, obsolete branches, overlapping
helpers and indirection that hides simple behavior. Account for the risk and impact of a proposed
simplification; fewer lines or a preferred style are not sufficient reasons to change code.

## Accumulating additions and fixes

An add-only diff is not itself a defect. Inspect related additions for duplicated paths,
abandoned scaffolding, missed consolidation and increasing caller obligations. When additions
remain necessary, explain why; do not manufacture deletions to balance the diff.

When fixes repeatedly create new failures, trace which assumption, contract or ownership boundary
is wrong. Explain a correction at that cause and identify dependent patches that would become
unnecessary, rather than recommending another compensating layer.

# Findings and evidence

Check counterevidence before reporting a finding. Remove disproved claims, combine findings
with the same cause, and distinguish confirmed defects or unnecessary complexity from optional
preferences and verification gaps. Each finding should identify the location, concrete consequence,
supporting evidence and a bounded correction; do not force a quota of findings or suggestions.

Report the actual validation command and decisive result when relevant, with the checked scope
and remaining uncertainty. Count only checks and reviews that actually completed. Stale records
alone are not a correctness failure. Scale the assessment to the requested use, distinguishing
prototype findings from claims about an intended delivery environment.
A clean result can be concise; unsupported required correctness, safety or review remains an
explicit gap rather than a verified or ready claim.

Assessment requests are read-only. Apply corrections as part of already authorized implementation;
findings do not authorize edits, commits or publication. Preserve unrelated user work.
