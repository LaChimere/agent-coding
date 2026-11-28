---
name: create-formal-verification-skill
description: Find the property in a repository where a bug costs the most and tests reach the least, verify it with a fitting formal or bounded tool, and leave a project-local skill that checks future changes against it. User-invoked for model checking, proving invariants or verifying concurrency, retries, state machines, parsers or unsafe code.
disable-model-invocation: true
---

# Create a formal verification skill

Read [the shared agreement](../../references/working-agreement.md) and
[verification evidence](../../references/verification-evidence.md). A test checks the cases
someone wrote. Formal verification checks every case in a stated scope: every step order in a
model, every input up to a bound, or every input. This skill verifies one property of the code
where that matters most and leaves a project-local skill that the next agent can run cold,
mid-change, without learning the verification language. Formal verification is a conditional
method for a costly property with a real coverage gap, not a required stage.

## Choose the target from the code

Answer from the codebase and ask the user only what the code cannot show. Start where the user
points, if they named an area or a bug. A good target is a promise the code makes whose failure
harms users and that tests rarely reach. Choose the strongest such target, not the easiest one to
verify. When no target justifies the cost, report that outcome and stop.

## Let the question pick the tool

Pick the cheapest tool that answers the question and that the project's developers can install
and run, and say why you chose it.

- Whether events can happen in a bad order usually suits a model checker over a small model of
  the design; TLA+ with TLC is a good default in any language.
- Whether the code itself behaves for every input, such as memory safety, overflow or a
  data-structure invariant, usually suits a verifier that runs on the code.
- A property that must hold at every size, where a bound is not enough, can need a proof.
- When no verifier runs on the language, say so and test the real code with generated inputs
  rather than a hand-written model of the function.

## Hold the verification to these standards

- **True to the code.** Every part of the model or proof points to code a reviewer can open. A
  step that is indivisible in the verification is indivisible in the code. Names come from the
  repository.
- **Able to fail.** Show each property failing on a broken variant of the code it guards, such as
  a removed check or a reordered step. A check never seen failing proves nothing.
- **Findings stay findings.** When the current code breaks the property, report the
  counterexample in the code's terms. Never weaken the property or the model to make the check
  pass, and change product code only on the user's request.
- **Honest scope.** State what is verified, under which bounds and assumptions, and what is left
  out. A pass covers the model or the bound, not the whole system.
- **Readable without the tool.** State the property and the harm in one plain sentence each, and
  tell a counterexample as a short sequence of steps in the code's words.
- **Cheap to rerun.** One command, a pinned tool version and a run short enough for every relevant
  change.
- **Kept in step.** Record which files and functions each check covers and the commit at which the
  verification last matched them.

Distinguish a counterexample from a timeout, an inadequate bound and a tool or modeling error;
none of these becomes a pass.

## Generate the project skill

Write a project-local skill with frontmatter naming the area and when to use it, in the location
the host discovers. From that skill alone, the next agent must be able to tell whether a change
touches the verified code, run the check, tell a real bug from a modeling error and update the
verification when a change is intended. Include the coverage record and the sync commit, and tell
the next agent to move the sync commit only after confirming the verification describes the code
at the new commit. Use the repository's real commands, paths and nouns, with no placeholders.

For a TLA+ model, the pstack `statechart` skill can turn checker results into Mermaid state charts
with shortest bug paths. It is an optional external capability: name it in the generated skill
only as optional, copy none of its commands, and give the plain TLC command as the default path.

## Prove it before handing off

Follow the generated skill once as the next agent would, on a scratch change that breaks the
property in the real code. The check must catch it. Then drop the scratch change and confirm the
check is back where it started: passing, or failing only on the findings you report. A generated
skill that was never run is a draft. If it misses the break or a step does not run, fix the skill
or the verification, not the scratch change.

## Hand off

Report what you verified, the tool and why, the bounds, what the check found in plain words, how
to run it and what it does not cover. Suggest a second target only when you found a close one.
For later drift, point to
[maintain-formal-verification-skill](../maintain-formal-verification-skill/SKILL.md).
