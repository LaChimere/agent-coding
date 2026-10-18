# Aggregation and report contract

## Double confirmation

Treat every ordinary reviewer result as a candidate. Before reporting it, the primary agent must:

1. Re-read the cited change and enough supporting code to understand the reachable behavior.
2. Check applicable repository rules, tests, and authoritative specification evidence.
3. Seek counterevidence such as an existing guard, validated caller, invariant, integration test,
   or intentionally documented exception.
4. Confirm that the issue is introduced by or directly relevant to the pinned change set.
5. Keep it, merge it with the same root cause, reclassify it, move it to Questions, or delete it.

When deleting an unreachable candidate, retain in the report when material the theoretical direct input or
path that would fail and the concrete caller, guard, or invariant that makes it unreachable in the
reviewed repository.

A behavior difference is not a finding unless an authoritative specification, repository rule,
caller, test, documentation contract, or established invariant supplies evidence for the expected
behavior. Convention or a plausible broader interpretation alone is unresolved; move it to
Questions or omit it instead of reporting a defect.

Do not require two reviewers to discover the same issue. For a completed Codex Security result,
preserve its validated evidence and independently confirm only scope, location, duplication, and
mapping into this report.

Attach only source labels for aspects that actually ran and materially support the final finding.
Do not use a neighboring label as a synonym for the issue category.

## Finding levels

- **Blocker**: The change cannot safely merge because it creates a near-certain catastrophic or
  fundamental failure, or the review target itself cannot be trusted.
- **Critical**: A severe security, data-integrity, availability, or core-contract defect that must
  normally be fixed before merge.
- **Major**: A concrete functional error, important requirement gap, material regression risk, or
  mandatory repository-rule violation.
- **Minor**: A real but bounded issue that does not normally block merge. It is not merely a style
  preference.
- **Suggestion**: An optional improvement; the current implementation is not necessarily wrong.

Severity describes verified impact, not reviewer confidence. Do not map another reviewer's numeric
score mechanically. A judgement-only smell is normally Minor or Suggestion unless a concrete higher
impact is demonstrated. Missing tests are classified by the regression they could permit.

Questions, Notes, and Praise are not findings and do not count toward severity totals.

## Deliver the review

Start with finding counts and the actionable conclusion; say plainly when no supported defect
remains. For each finding give severity, exact location, trigger, observed evidence, impact and
bounded correction. Keep optional suggestions and unresolved questions separate from defects.

Include the reviewed identity and an applicable-method coverage summary: method, completed or
skipped/incomplete with reason, trusted policy/spec source and actual independent context. Record
revert/mutation/other checks with their commands and outcomes when run, and relevant checks not
run with reasons. A compact clean review needs no empty issue sections or full raw logs.

For repeated review, retain finding identity and disposition through the existing record; do not
create a parallel issue database. Integrate SPAR/Rubber Duck candidates into this report without
pasting competing standalone verdicts. A merge recommendation names the exact reviewed revision
and outstanding CI, specialist and human approval gates. Saving or posting it needs task authority.
