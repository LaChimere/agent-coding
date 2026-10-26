---
name: design-solution
description: Design a solution when behavior, interfaces, state ownership or maintenance trade-offs need a decision; use source-grounded alternatives and targeted prototypes before implementation.
---

# Design a solution

Read [the shared agreement](../../references/working-agreement.md) and
[change quality](../../references/change-quality.md). Produce a decision-ready design, not
implementation unless the request also authorizes it. Preserve selected product constraints.

## Understand the surrounding system

Establish the desired user/system outcome, scope, constraints and observable acceptance. Trace
the relevant existing responsibilities, callers, data, lifecycle and failure paths. Use
[understand-codebase](../understand-codebase/SKILL.md) when this evidence is missing; do not force
a second full investigation when the current context already supplies it.

Consider whether the requested mechanism serves the actual outcome. Identify useful perspectives
or expert methods the initial request omitted. Surface a materially different outcome as an option;
greater ambition does not override the user's scope. Keep the investigation proportionate.

## Examine existing solutions

When a key mechanism is unfamiliar or the available evidence does not support a design choice,
inspect existing repository implementations, current dependencies and official documentation
before designing it from scratch. If a material gap remains, make a focused search for comparable
open-source projects on GitHub or other primary sources, within the task's access boundaries.
Reuse sufficient evidence already available; routine changes need no external survey.

Compare relevant source, tests and issue records against this project's constraints. Consider
applicability, dependency and maintenance costs, known limitations and maintenance status;
popularity or recent commits alone do not establish quality. Prefer applicable designs supported
by evidence. Distinguish borrowing a design from adding a dependency or copying code: before
either of the latter, verify provenance, license compatibility and required attribution, and
resolve material adoption choices under the existing authority rules.

Stop when the evidence supports explaining the viable choice and its trade-offs, with remaining
uncertainties and project-specific validation identified. Cite the decisive sources and inspected
versions where available; no fixed project count or separate research report is required. If
access is unavailable or no suitable precedent is found, state the gap and continue supported
analysis without claiming external validation. Existing projects do not prove behavior here.

## Make the design concrete

Start with caller usage and observable behavior. Specify the types/data shape, ownership,
interfaces, error/cancellation behavior and relevant operational constraints. Prefer designs
whose ordinary usage preserves invariants, with clear boundary validation and few hidden caller
obligations. Account for affected consumers and mixed deployed versions when relevant.

Compare genuinely viable alternatives when they differ materially. Explain consequences using
evidence rather than architecture labels. For empirical uncertainty, build the smallest authorized
prototype or experiment that distinguishes the options, with a measurable question and outside
check. A clear small change needs neither multiple prototypes nor a separate design document.
Keep prototype shortcuts explicit and separate from production readiness.

Before using measured performance to choose between alternatives, including design-only
prototypes, read [performance evidence](../../references/performance-evidence.md). When a design
depends on a material unresolved fact, use [assumption checking](../../references/assumption-checking.md).
Existing sufficient evidence may resolve either question without another experiment.

## Challenge and sequence when useful

Use [SPAR](../spar/SKILL.md) for an explicitly requested opposing-perspective analysis, and
[Rubber Duck](../rubber-duck/SKILL.md) for a requested or risk-justified critique of the concrete
shape. Integrate their evidence without letting an advisor settle the user's material choices.

When asked to plan commits, assess atomicity, or sequence work beyond one coherent change, read
[change sequencing and atomicity](references/change-sequence.md). Preserve valid intermediate
states, coupling tests/docs to behavior and treating deployment compatibility separately. The
[design template](references/templates/DESIGN.md) is optional; use only sections the task needs.

## Settle and hand off

Return the proposed shape, rationale, alternatives, affected contracts, verification approach,
rollout/recovery needs and unresolved choices. Use project terminology and an explanation a future
maintainer can understand without this chat. Reuse the project's decision record when warranted.

Ask only for choices the evidence and existing authority cannot settle. If implementation is
already authorized within the selected approach, continue rather than request ceremonial approval.
If implementation repeatedly demands the same workaround or escape hatch, revisit the design
with that evidence instead of hiding deviations behind additional layers.
