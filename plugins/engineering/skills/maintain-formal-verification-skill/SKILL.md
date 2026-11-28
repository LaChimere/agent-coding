---
name: maintain-formal-verification-skill
description: Bring a project's formal verification back in line with changed code, rerun it and classify each failure as verification drift or a code bug. User-invoked after merges or refactors that touched verified code without rechecking it.
disable-model-invocation: true
---

# Maintain a formal verification skill

Read [the shared agreement](../../references/working-agreement.md). A formal check proves a
property of what it describes. When the code changes and the verification does not, the check can
keep passing on code that no longer exists, and that pass looks like a proof. This skill is the
upkeep pass for a project-local skill that runs a model checker, prover or code-level verifier
against named code, such as one made by
[create-formal-verification-skill](../create-formal-verification-skill/SKILL.md). It handles the
changes that skipped that skill: merges, edits made without it and drift across many commits.

## Outcomes

Give each check one or two of these outcomes:

- **In sync:** no change since the last sync alters what the check describes, and it passes.
- **Updated:** the code changed, the verification now describes the new code, and it passes.
- **Bug:** the verification describes the current code, and the code breaks the property. This is
  a finding about the code, not drift.
- **Blocked:** the check could not be brought back in line or could not run; say exactly why.

A check can be both updated and bug when the update makes it describe the code again and the
property then fails.

## Edit scope

Edit only the verification: models, harnesses, property files and the verify skill. Product code
changes only on the user's request. When a property fails on the current code, never weaken the
property or the model to make the check pass; report the failure. Fixing a verification that
does not describe the code, as in step 5, is drift repair, not weakening.

## Run the pass

1. **Find the checks.** Look for project skills that run a model checker, prover or verifier
   against named code, or use the one the user names. For each check, collect the property, the
   covered code, the bounds and assumptions, the command and the sync commit. Without a verify
   skill, stop and point to `create-formal-verification-skill`. Without a recorded sync commit,
   use the last commit that changed the verification files and say so.
2. **Run it as it is.** Run each check once before changing anything and record the result. A pass
   here only shows the old description still holds; a failure can be drift or a bug, decided in
   step 5.
3. **Read every change to covered code.** Diff the covered files from the sync commit to the
   current commit and read each commit message. Include moved code, such as a covered function
   renamed, split or moved to another file, and new code that touches the guarded state. Classify
   each change:
   - **No effect:** it alters nothing the verification describes. Check this against the model
     or harness, not the commit message.
   - **Shape changed:** an indivisible step became two, a branch appeared or vanished, a check
     moved, a new path reaches the guarded state or a value range changed. The model or harness
     must change.
   - **Promise changed on purpose:** evidence in the change, such as a doc comment, test,
     changelog or commit message, says the promise changed. The property must change, citing that
     evidence.
   - **Promise may be broken:** the code changed and no evidence says the promise did. A later
     failure is a bug candidate.
4. **Update from the code, not from the result.** Change the model or harness so each changed part
   again points to code a reviewer can open, keeping indivisible steps indivisible. Write the
   update from the code before rerunning. Change a property only for a promise changed on purpose,
   recording the old wording, the new wording and the evidence. Keep the bounds unless the change
   makes them wrong, and report any reduction.
5. **Rerun and judge.**
   - **Pass:** break the new code the way the property guards against, such as removing a new
     check or reordering a new step, and confirm the check catches it. Then drop the break.
   - **Fail:** replay the counterexample against the real code step by step. If a step cannot
     happen in the code, the verification is wrong; fix it and say what was wrong. If every step
     can happen, it is a bug: name the commit that introduced it, tell the counterexample in the
     code's words and state the harm in one sentence. A cheap reproduction against the real code
     can join the report as evidence; it stays out of product code.
6. **Update the verify skill.** Update the covered code, commands, bounds, assumptions and sync
   commit, setting the sync commit to the commit you checked. A blocked check keeps its old sync
   commit; say so. Then follow the verify skill once as the next agent would.

## Report

For each check, give the outcome and the commits you read; what changed in the verification and
why, with the evidence for any changed promise; the rerun result and the break that showed the
updated check can still fail; each bug as steps in the code's words, its harm and the commit that
introduced it; and what the verification still does not cover. Say which failures were drift and
which were bugs, and when a check passed before the update and fails after, say the old pass was
on a stale description. Keep verification updates in a change separate from any product fix.
