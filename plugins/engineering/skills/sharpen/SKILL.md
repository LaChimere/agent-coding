---
name: sharpen
description: Make a task deeper rather than bigger by asking what a leading practitioner would do, then rewrite the request to ask for that. User-invoked before starting work.
disable-model-invocation: true
---

# Sharpen

Make the task deeper, not bigger. This skill returns a rewritten request; the user decides
whether to run it.

1. **Restate.** Say in your own words what the user wants and the problem behind it, from the
   conversation and the relevant files.
2. **Deepen.** Answer four questions about the task:
   - What would a leading practitioner in this field do here that the request leaves out?
   - Which raw material would they start from, instead of the digested version the request
     supplies?
   - Which specific methods and tools would they use?
   - What evidence outside the agent and the user would show the result is right?
3. **Rewrite.** Rewrite the request to ask for that depth within the same scope. The rewritten
   request asks the agent to prototype any choice an experiment can settle and to recommend an
   option from what it observed. Product and preference choices that no experiment can settle
   stay with the user.

Return the restatement, the four answers and the rewritten request, then stop.
