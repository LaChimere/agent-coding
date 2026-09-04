---
name: spar
description: "Produce a one-shot SPAR analysis when the user explicitly asks for `$spar`, a SPAR, devil's-advocate analysis, or adversarial pressure-testing of an idea, decision, plan, design, migration, or optimization. Challenge assumptions and trade-offs without implementing the proposal or turning the request into a multi-round interview."
---

# SPAR

Pressure-test one supplied idea through independent opposing perspectives, then synthesize the
decision-relevant result. This is a one-shot, read-only analysis.

## Establish the subject

Restate the idea or decision being tested and read only the context needed to understand its goal,
constraints, assumptions, and affected actors. Ask one concise clarification only when the subject
cannot be identified; do not begin a broad requirements interview.

## Frame the conflict

Identify the core tension: the two actors whose incentives, responsibilities, or worldviews most
naturally collide. Do not substitute generic pros and cons.

Use two roles by default. Add a third only when an independently motivated stakeholder changes the
decision rather than repeating one side. Never use more than three roles.

## Develop independent perspectives

The primary agent coordinates the analysis and chooses reasoning effort according to the decision's
complexity and risk.

- Prefer an eligible model from a different user-, repository-, and host-allowed family for the role
  perspectives. Do not hard-code a model or reasoning level.
- Give each role the same subject and relevant evidence, but not another role's output. Each role
  makes the strongest credible case from its assigned perspective and must not spawn more agents.
- Launch roles in parallel when capacity permits, otherwise use waves. Treat the returned launcher
  result as the execution ledger: only a returned live handle proves that a delegated role started.
  Build the wait set from those handles alone; when it is empty, continue with the required primary
  perspectives without calling wait. If a launch returns no handle because capacity is full, defer it
  to a later wave; otherwise
  retry one no-handle launch once after capacity is available, then use the primary fallback. If a
  launched role fails, use the primary fallback without repeatedly relaunching it.
- If no eligible different family is available, use the primary model in isolated role contexts. If
  delegation is unavailable, the primary performs the perspectives sequentially.
- When the user explicitly requires an actual different model family and none is available, report
  the capability limitation instead of calling a same-model analysis cross-model.

Record cross-model analysis only when the execution ledger contains a returned live handle and the
collected role result confirms a known eligible different model family. Requested model arguments,
role prompts, and intended launches are not execution evidence. Otherwise record the actual
primary-model fallback. Do not reveal hidden reasoning.

## Synthesize

Test each perspective against the supplied evidence. Preserve the strongest unresolved conflict;
do not manufacture consensus or reward the most theatrical role. Separate unsupported assumptions
from established facts, and recommend an experiment or evidence request when the decision cannot yet
be resolved.

## Output

Return exactly these sections:

```markdown
# SPAR Analysis

## Conflict framing
<one or two sentences>

## Roles
- <role>: <why this perspective matters>

## Perspective: <role>
<the strongest concise case from this role>

## Synthesis
- What holds up: <...>
- What breaks down: <...>
- What is probably underestimated: <...>
- What would need to be true: <...>

## The open question
<one question exposing the most important unresolved tension>

## Execution
<cross-model with known model/family, or primary-model fallback and its limitation>
```

Do not implement the idea, edit files, assign PR severities, or continue into a multi-round interview.
