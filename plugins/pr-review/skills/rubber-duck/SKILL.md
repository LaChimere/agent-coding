---
name: rubber-duck
description: "Provide a one-shot, read-only Rubber Duck critique when the user explicitly asks for `$rubber-duck`, a rubber-duck review, an independent critic, or a critique of substantive blind spots in a plan, design, implementation, or tests. Focus on consequential problems and concrete corrections, not cosmetic feedback or implementation work."
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

The primary agent chooses reasoning effort according to the work's complexity and risk.

- Prefer one eligible model from a different user-, repository-, and host-allowed family for the
  critic pass. Do not hard-code a model or reasoning level.
- Establish a specific eligible different-family model before launching the critic. When none is
  positively known, perform a distinct second pass in the primary agent; same-family subagents are
  not the fallback.
- When this skill is already running inside a delegated critic, perform the critique directly and do
  not spawn more agents.
- When invoked in the primary session, delegate one isolated critic when a suitable different-family
  model and worker are available. If no eligible different family exists or delegation is
  unavailable, perform a distinct primary-model second pass.
- When the user requires an actual different family and none is available, report the capability
  limitation rather than calling the fallback cross-model.

Record cross-model or primary-model fallback in the output. Never reveal hidden reasoning.

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
- Execution: <cross-model with known model/family, or primary-model fallback>
```

Omit empty issue sections. If no substantive issue survives, say so for the reviewed scope and list
the material evidence checked. Do not decide whether to merge, ship, or proceed. A security concern
is a candidate, not a claim that a comprehensive security audit completed.

Do not edit files, implement corrections, or run commands that change repository or environment
state.
