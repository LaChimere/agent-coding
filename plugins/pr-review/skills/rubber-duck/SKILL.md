---
name: rubber-duck
description: "Provide a one-shot, read-only Rubber Duck critique when the user explicitly asks for the rubber-duck skill, a rubber-duck review, an independent critic, or a critique of substantive blind spots in a plan, design, implementation, or tests. Focus on consequential problems and concrete corrections, not cosmetic feedback or implementation work."
---

# Rubber Duck

Critique one supplied work product from an oppositional but constructive perspective. Find
substantive issues that could prevent the work from reaching its stated goal. This is a one-shot,
read-only review.

## Establish context

Pin the work being reviewed and identify its goal, surrounding system, governing requirements,
interfaces, assumptions, and invariants. Inspect supporting files only when they can confirm or
disprove a concern. Do not expand into unrelated pre-existing problems.

## Critique

Look for consequential issues in:

- logic, reachability, state transitions, and failure propagation;
- security boundaries and unsafe assumptions;
- design cohesion, ownership, compatibility, migration, and rollback;
- performance or scalability where the work creates a credible changed-path risk;
- tests that fail to prove the intended contract or omit a material regression path;
- progress toward the stated goal, including work that solves the wrong problem.

For every candidate, identify the exact evidence, affected behavior, impact, counterevidence checked,
and a bounded correction. Recommend a pattern or alternative only when it addresses the demonstrated
risk.

Filter aggressively. Omit style, formatting, naming, grammar, harmless organization preferences,
minor refactors, generic best practices, low-confidence concerns, and unrelated pre-existing issues.
Do not report something merely to produce feedback.

## Model and execution

The primary chooses when critique is needed, its allocation, and a suitable permitted model and
reasoning effort according to the work's complexity and risk. Honor explicit requests and exclusions.

- An independent same-family context is a valid critic path. Consider another eligible family when
  useful and available; family diversity is optional, not a launch gate. Do not hard-code a model,
  personal role or reasoning level.
- When this skill is already running inside a delegated critic, perform the critique directly and do
  not spawn more agents.
- When invoked in the primary session, delegate one isolated critic using the primary's chosen
  configuration when delegation is available. If delegation is unavailable, perform a distinct
  primary-model second pass and disclose that it is not independent review.
- When the user requires an actual different family and none is available, report the capability
  limitation; same-family work cannot satisfy that requirement.

Use the host's actual delegation mechanism. A completed synchronous result needs no handle or wait;
wait for an asynchronous task only after a launch returned a live handle. Recovery preserves the
primary's dispatch choice and read-only constraints; omitted model arguments do not prove inheritance.
Report the returned result, independent context, actual model/effort and family separately, with
execution evidence rather than requested arguments. Mark unknown facts unverified. Record primary
fallback as non-independent and keep any unmet required independence or family coverage incomplete.
Never reveal hidden reasoning.

## Output

Return:

```markdown
# Rubber Duck Critique

## Scope
<the exact work and goal reviewed>

## Blocking Issues
### <issue title>
- Location: <exact artifact anchor>
- Evidence: <what is observed>
- Impact: <why this can prevent success>
- Recommendation: <bounded correction>

## Non-Blocking Issues
<same per-issue fields>

## Suggestions
<only concrete optional improvements with demonstrated value>

## Review Notes
- Counterevidence checked: <...>
- Execution: <independent context or primary fallback; actual model/effort/family and evidence or unverified; unmet coverage>
```

Omit empty issue sections. If no substantive issue survives, say so for the reviewed scope and list
the material evidence checked. Do not decide whether to merge, ship, or proceed. A security concern
is a candidate, not a claim that a comprehensive security audit completed.

Do not edit files, implement corrections, or run commands that change repository or environment
state.
