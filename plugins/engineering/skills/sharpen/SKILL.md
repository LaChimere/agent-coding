---
name: sharpen
description: Make a request deeper instead of larger by asking what a top practitioner would do differently, then rewrite the request to ask for that. Use it before starting a task.
disable-model-invocation: true
---

# Sharpen

Deepen the task without widening it. The output is a rewritten request, and the user decides whether
to run it.

1. **Restate.** From the conversation and the relevant files, say in your own words what the user
   wants and which problem sits behind it.
2. **Deepen.** Answer four questions:
   - What would a top practitioner of this field do here that the request omits?
   - What raw material would they work from, rather than the processed version the request
     provides?
   - Which concrete methods and tools would they reach for?
   - Which evidence, independent of the agent and the user, would show that the result is correct?
3. **Rewrite.** Rewrite the request so it asks for that depth inside the same scope. The rewritten
   request tells the agent to answer with a prototype any question an experiment can answer, and to
   recommend an option based on what it observed. Product and preference choices that no experiment
   can settle remain the user's.

Return the restatement, the four answers and the rewritten request, then stop.
