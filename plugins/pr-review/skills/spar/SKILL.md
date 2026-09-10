---
name: spar
description: "Produce a one-shot SPAR analysis when the user explicitly asks for the spar skill, a SPAR, devil's-advocate analysis, or adversarial pressure-testing of an idea, decision, plan, design, migration, or optimization. Challenge assumptions and trade-offs without implementing the proposal or turning the request into a multi-round interview."
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

- Select suitable available and permitted models for independent role contexts. Same-family models
  are valid; consider another family when useful and available as an optional enhancement. Do not
  hard-code a model, personal runtime role or reasoning level.
- Give each role the same subject and relevant evidence, but not another role's output. Each role
  makes the strongest credible case from its assigned perspective and must not spawn more agents.
- Launch roles through the host's actual delegation mechanism, in parallel when capacity permits,
  otherwise in waves. A synchronous call returning a completed role result needs no handle or wait.
  For asynchronous launches, apply a live-handle gate
  immediately before every wait call: the receiver set must contain at least one live handle returned
  by a completed launch call. A tool error, `no thread`, or other no-handle outcome without a completed result means no delegated
  role exists to collect and cannot later produce a result. Continue with the required primary
  perspectives when the receiver set is empty. If a launch returns no handle because capacity is
  full, defer it to a later wave; otherwise
  retry one no-handle launch once after capacity is available, preserving the primary's model, effort
  and read-only dispatch decision, then use the primary fallback. Omitted arguments do not prove
  inheritance; verify any authorized alternative against the primary's choice. If a
  launched role fails, use the primary fallback without repeatedly relaunching it.
- Treat `no thread` and an unavailable collaboration tool as delegation unavailable for that
  invocation and use the primary perspectives immediately.
- If delegation is unavailable, the primary performs the perspectives sequentially as distinct
  passes and reports them as non-independent. An unmet required independent assessment remains incomplete.
- When the user explicitly requires an actual different model family and none is available, report
  the capability limitation instead of calling a same-model analysis cross-model.

Record context independence, actual model/effort and family separately with returned results and
execution evidence. Requested model arguments, role prompts, intended launches, and failed calls are
not execution evidence. Mark unknown configuration as unverified and primary fallback as
non-independent. Keep unmet required independence or family coverage incomplete. If completed threads
still occupy capacity, preserve their results and useful context, close them through supported host
controls, confirm released capacity, and continue pending perspectives. Do not reveal hidden reasoning.

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
<independent contexts or primary fallback; actual model/effort/family and evidence or unverified; unmet coverage>
```

Do not implement the idea, edit files, assign PR severities, or continue into a multi-round interview.
