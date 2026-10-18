---
name: prevent-recurring-mistakes
description: Turn evidenced repeated mistakes or a consequential preventable failure into structural constraints, types or executable checks, proving the original error is caught before adding prose rules.
---

# Prevent recurring engineering mistakes

Read [the shared agreement](../../references/working-agreement.md). Establish whether the request
is analysis, a proposal or authorized correction. Keep the requested projects, sources and time
window bounded; access to history is not permission to mine unrelated conversations or accounts.

## Find the underlying failure

Inspect relevant corrections, incidents, reverts, review comments and current code. Group examples
by actual cause, not similar wording. Check whether the problem remains and whether an existing
guard already addresses it. Counts support prioritization; a serious first failure can warrant
prevention, while unrelated symptoms should remain separate. Do not invent a recurring pattern.

Rank classes by consequence, recurrence and cost of prevention. For each, state the concrete
trigger, affected behavior, evidence and the current path that makes the mistake easy to repeat.

## Choose the strongest useful intervention

1. **Ownership and structure:** one owner for state/lifecycle, one authoritative representation,
   interfaces that hide fragile coordination and removal of obsolete examples callers copy.
2. **Types and boundaries:** represent valid states, parse external data and restrict invalid
   dependencies. Check bypass paths before claiming the mistake is impossible.
3. **Executable enforcement:** a lint, script, test or CI check with an actionable failure.
   Where justified, prevent new occurrences while explicitly tracking existing debt.
4. **Judgment guidance:** concise rationale and a failure example for what cannot be enforced.

Choose the smallest intervention with a real benefit. Explain why a higher layer does not fit;
avoid rewriting a whole architecture from one local symptom. Use
[design-solution](../design-solution/SKILL.md) for material choices and
[implement-task](../implement-task/SKILL.md) for authorized correction.

## Prove and preserve the lesson

Demonstrate that the new constraint catches a real prior error and accepts a valid control.
Exercise the actual enforcement path; a rule description does not prove it runs. Preserve the
relevant existing contracts and checks. Record the evidence, enforcement owner and any residual
bypass or risk in the project's existing knowledge structure. Update obsolete guidance rather
than accumulating duplicate rules. Exceptions need their real scope, reason and review/removal
condition under project policy.

Apply this to agent infrastructure too: package completeness, valid references, host-policy
drift, false completion and ineffective skill invocation. Structural checks cover machine facts;
behavioral evaluations cover judgment. Return corrected classes and evidence, or a supported
no-change result when no intervention is warranted.
