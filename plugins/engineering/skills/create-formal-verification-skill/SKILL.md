---
name: create-formal-verification-skill
description: Find the property in a repository where a failure would hurt most and tests cover least, check it with a suitable formal or bounded tool, and leave a project skill that rechecks it on later changes. Use it for model checking, proving invariants, or checking concurrency, retries, state machines, parsers or unsafe code.
disable-model-invocation: true
---

# Create formal verification for a project

Read [the shared agreement](../../references/working-agreement.md) and
[verification evidence](../../references/verification-evidence.md). Tests cover the cases someone
thought to write. Formal verification covers every case within a declared scope: all orderings of
steps in a model, all inputs up to a bound, or all inputs. This skill checks one property where that
coverage pays off most. It leaves a project skill that a later agent can run in the middle of a
change, with no prior context and no knowledge of the verification language. Use it for a costly
property with a real gap in test coverage; it is not a required stage of any workflow.

## Pick the property from the code

Let the codebase answer first, and put to the user only the questions the code cannot settle. Start
from any area or bug the user pointed to. A strong candidate is a guarantee the code gives whose
violation hurts users and which tests seldom exercise. Pick the most valuable candidate, not the one
easiest to check. If no candidate is worth the cost, report that and stop.

## Fit the tool to the question

Choose the cheapest tool that answers the question and that the project's developers can install and
run, and explain the choice. Before installing software or adding a project dependency, present the
tool, what it installs and the alternatives, and wait for the user's choice unless they already made
it.

- To ask whether events can occur in a harmful order, run a model checker on a compact model of the
  design. TLA+ with TLC works for code in any language.
- For questions about the code's own behavior on all inputs, such as memory safety, integer overflow
  or an invariant of a data structure, a verifier that runs on the code itself usually fits.
- When the property must hold at every size and no bound is enough, a proof may be needed.
- If the language has no usable verifier, report that, and exercise the real code with generated
  inputs instead of modeling the function by hand. Prefer enumerating every input up to a stated
  bound. Random generation is a sample: report its case count and seed, report a run without
  failures as incomplete, and never call it verified.

## Standards for the check

- **Faithful.** Each part of the model or proof links to code a reviewer can open. A step that cannot
  be interrupted in the check cannot be interrupted in the code. Names come from the repository.
- **Shown to fail.** Show each property failing on a broken version of the code it protects, for
  example with a check removed or two steps swapped. A check that was never seen failing proves
  nothing. Make every temporary break in a scratch copy that includes every uncommitted file, never
  in the user's tree.
- **Findings reported as found.** When the current code violates the property, report the
  counterexample in the code's terms. Keep the property and the model as they are instead of relaxing
  them until the check passes, and change product code only when the user asks. Proof annotations a
  verifier needs inside product files, such as contracts, loop invariants or verifier-only modules,
  count as verification: list every file they touch, and leave runtime behavior unchanged.
- **Scope stated.** Name what the check covers, its bounds and assumptions, and what falls outside
  it. A pass speaks for the model or the bound only, never for the whole system.
- **Plain to read.** State the property in one plain sentence and the harm in another, and tell a
  counterexample as a short list of steps in the code's vocabulary.
- **Cheap to repeat.** One command, a pinned tool version and a runtime short enough to run on every
  relevant change.
- **Tracked against the code.** For each check, list the files and functions it covers and the last
  commit it was confirmed against. If covered files had uncommitted changes, say the commit does not
  include them.

Keep five results apart: a pass with the stated scope fully explored, a counterexample, a timeout or
resource limit, a bound too small for the property, and a tool or modeling error. Only the first is a
pass.

## Write the project skill

Write a project skill, with frontmatter naming the area and when to use it, in the location the host
discovers. With only that skill, a later agent must be able to tell whether a change reaches the
verified code, run the check, read which of the five results it got, separate a defect in the code
from a mistake in the model, and adjust the verification after a deliberate change. The check's
command prints a distinct result and exit status for each result the tool can tell apart, and reports
the bound and whether exploration finished. Include the coverage record, the sync commit and the
counterexample of each open finding. Make the command check each property separately and, where the
tool allows, continue past a known counterexample, so an open finding hides no new failure. Tell the
next agent to advance the sync commit only once it has confirmed that the verification still
matches the code at that commit. Use the repository's real commands, paths and nouns, with no
placeholders.

## Prove the skill before handing off

In a scratch copy that includes every uncommitted file, follow the generated skill once as a later
agent would, on a temporary edit to the real code that violates the property. The check
must report the violation. Remove the temporary edit and confirm the check returns to its earlier
result: a pass, or failure only on the findings you report. A generated skill that never ran is a
draft. If it misses the violation or a step fails to run, change the skill or the verification and
keep the temporary edit as it is until the check reports it. Apply every such repair to the files in
the user's tree.

## Hand off

In the report, cover the verified property, the tool and the reason for it, the bounds, the result in
plain words, the command to rerun it and the gaps in coverage. Suggest a second property only when
you found a strong one nearby. For later drift, point to
[maintain-formal-verification-skill](../maintain-formal-verification-skill/SKILL.md).
