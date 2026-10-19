# Check a decisive assumption

Use this method when a choice or correctness argument depends on a material unresolved fact:
dependency side effects, asynchronous ordering, ownership during cancellation, or a value read
by another consumer. Do not force every change into a single-assumption story or a new report.

## Identify the fact and its authority

State what must be true and what would fail if it were false. Separate selected requirements
from empirical assumptions. Recover product semantics from authoritative contracts and the user;
an experiment can show what cancellation does, not decide what it should mean.

Inspect existing evidence first. A current contract, source path or relevant check may already
resolve the question. Do not repeat an investigation or demand a stronger check merely because
another method is available.

## Follow the real boundary

Trace the actual version, state owner, execution order and consumer. Go beyond symbol references
when the claim crosses a wire format, persisted value, dependency implementation, teardown step
or other lifecycle boundary. Check pinned dependency versions and relevant local patches.
Do not invent a caller or broader input domain to make a theoretical risk seem reachable.

Choose the smallest sufficient evidence: source/reachability analysis, an existing test, a
focused probe against real code, or a real user-path reproduction. Use independent consumers
or known failing and valid controls when a checker could share the implementation's mistaken
assumption. A handwritten replacement for the implementation does not establish its behavior.

Use [verification evidence](verification-evidence.md) for permitted experiments, failure
attribution, retained proof and cleanup. Isolate any authorized mutation and restore owned
state. A read-only review does not authorize project changes, installations or external work;
report an unavailable check and continue independent work within scope.

## Resolve or retain the uncertainty

Distinguish confirmed facts, disproved risks and unresolved assumptions. Show the evidence and
its effect on the design or acceptance. An unproven consequential fact cannot become a passing
claim. If it requires a product decision, return that choice rather than treating a technical
experiment as authorization. If evidence establishes safety, clear the concern without adding
an unnecessary guard, abstraction or redesign.
