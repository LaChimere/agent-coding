# Aggregation and report contract

## Double confirmation

Treat every ordinary reviewer result as a candidate. Before reporting it, the primary agent must:

1. Re-read the cited change and enough supporting code to understand the reachable behavior.
2. Check applicable repository rules, tests, and authoritative specification evidence.
3. Seek counterevidence such as an existing guard, validated caller, invariant, integration test,
   or intentionally documented exception.
4. Confirm that the issue is introduced by or directly relevant to the pinned change set.
5. Keep it, merge it with the same root cause, reclassify it, move it to Questions, or delete it.

When deleting an unreachable candidate, the final report must state the theoretical direct input or
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

## Finding identity

Assign IDs after deduplication, in report order:

- `BLOCKER-01`
- `CRITICAL-01`
- `MAJOR-01`
- `MINOR-01`
- `SUGGESTION-01`

IDs are unique only within the current report. Continue naturally beyond `99` if needed; do not add
hashes or a persistent finding registry.

## Output

Use this stable Markdown shape. Omit empty severity sections, but include all zero counts in Summary.

```markdown
# PR Review

## Scope
- Change set: <exact pinned definition>
- Files reviewed: <count and relevant coverage note>
- Repository guidance: <sources or none>
- Specification: <source or skipped reason>

## Summary
- Blocker: <count>
- Critical: <count>
- Major: <count>
- Minor: <count>
- Suggestion: <count>

## <Non-empty severity>

### [<LEVEL-NN>] <concise title>
- Sources: <code|comments|tests|errors|types|spec|security>[, ...]
- Location: <path:line or exact artifact anchor>
- Evidence: <specific observed evidence>
- Impact: <observable consequence>
- Recommendation: <bounded correction direction>

## Spec Coverage
- <implemented, partial, missing, unrequested, or skipped with reason>

## Review Coverage
- Ran: <aspects>
- Skipped: <aspect and reason>
- Independent Challenge:
  - SPAR: <completed cross-model, completed primary-model fallback, excluded, not requested, or unavailable>
  - Rubber Duck: <completed cross-model, completed primary-model fallback, excluded, not applicable, or unavailable>
- Commands executed: <exact command and decisive result, or none>
- Security: <completed, incomplete, not applicable, or unavailable>

## Questions
- <only unresolved questions; write none when empty>

## Recommended Action
<short natural-language merge/rework recommendation citing finding IDs and coverage limits>
```

Do not output a mechanical PASS/FAIL. "No findings" means only that the completed coverage found no
reportable issue; state material skipped or incomplete coverage in Recommended Action.
