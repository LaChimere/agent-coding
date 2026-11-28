---
name: maintain-formal-verification-skill
description: Realign a project's formal verification with code that has changed, rerun it, and decide for each failure whether the verification drifted or the code has a bug. Use it after merges or refactors that touched verified code and skipped its check.
disable-model-invocation: true
---

# Maintain formal verification

Read [the shared agreement](../../references/working-agreement.md) and
[verification evidence](../../references/verification-evidence.md). A formal check proves a property
of the thing it models. If the code moves on and the verification stays behind, the check can go on
passing against code that is gone, and that pass still looks like proof. This skill repairs a
project skill that runs a model checker, prover, code-level verifier or generated-input check
against named code, such as one written with
[create-formal-verification-skill](../create-formal-verification-skill/SKILL.md). It catches up on
changes that bypassed that skill: merges, edits made without it and drift over many commits.

## Outcomes

Give each check one outcome, or the one pair noted below:

- **In sync.** No change since the last sync affects what the check models, and the check passes.
- **Updated.** After a code change, the verification was revised to model the new code, and the
  check passes.
- **Bug.** The verification matches the current code, which violates the property. That is a defect
  in the code, not drift.
- **Blocked.** The check could not be realigned or could not finish because of a timeout, a resource
  limit, incomplete exploration, a bound reported as too small, a tool error or no usable sync
  commit or history. Give the exact cause.

A check is both updated and bug when realigning it with the code makes the property fail.

## What you may edit

Your edits are limited to the verification: models, harnesses, property files and the project skill.
Product code changes only when the user asks; the one exception is a temporary break in a scratch
copy that includes the uncommitted verification files, as in step 5. When the current code fails a property, keep the property and the model as they
are and report the failure. Correcting a verification that does not describe the code repairs drift;
it does not relax the property.

## Steps

1. **Collect the checks.** Find the project skills that run a model checker, prover, verifier or
   generated-input check against named code, or take the one the user names. For each, note the
   property, the covered code, the bounds and assumptions, the command, the sync commit and the open
   findings. Without such a skill, stop and point to `create-formal-verification-skill`. If no sync
   commit was recorded, or the recorded one is not in the history, fall back to the most recent
   commit that touched the verification files, and say so. If that history is unavailable, as in a
   shallow clone, the check is blocked.
2. **Run it unchanged.** Run each check once before editing anything, and record the result. A pass
   at this point only shows that the old model still holds; step 5 decides whether a failure is
   drift or a bug.
3. **Read each change to covered code.** Diff the covered files between the sync commit and the
   current commit, and read each commit message. Include moved code, such as a covered function that
   was renamed, split or moved to another file, and new code that reaches the protected state. If
   covered files have uncommitted changes, include them and say the sync commit does not cover them.
   Classify each change:
   - **No effect.** Nothing the verification models has changed. Confirm this against the model or
     harness, not the commit message.
   - **Structure changed.** For example, one uninterruptible step was split in two, a branch appeared
     or disappeared, a guard moved, the protected state gained a new path, or a range of values
     changed. The model or harness must change.
   - **Guarantee changed on purpose.** Something in the change, such as a doc comment, a test, a
     changelog entry or a commit message, says the guarantee changed. The property must change,
     citing that evidence.
   - **Guarantee possibly broken.** The code changed and nothing says the guarantee did. A later
     failure is a bug candidate.
4. **Update from the code first.** Edit the model or harness so every changed part again links to
   code a reviewer can open, and uninterruptible steps stay uninterruptible. Derive the update from
   the code, before any rerun. Change a property only for a guarantee changed on purpose, and write
   down the property before and after with the evidence for the change. Leave the bounds alone
   unless the change invalidates them, and report any bound you lowered.
5. **Rerun and decide.** Make breaks and runs on older commits only in a scratch copy that includes
   the uncommitted verification files, never in the user's tree, and apply every repair to the files
   in the user's tree.
   - **Pass with full exploration:** break the new code in the way the property protects against,
     for example by removing a new check or swapping two new steps, and confirm that the check
     reports it. If it does not, the verification is too weak: repair it and repeat this step. Then
     discard the break.
   - **Counterexample:** replay it step by step against the real code. A step the code cannot take
     means the verification is wrong: correct it, say what was wrong and repeat this step. If each
     step is possible, the code has a bug: say whether it matches a recorded open finding, find the
     commit that introduced it, describe the counterexample in the code's vocabulary and state the
     harm in one sentence. A cheap reproduction
     against the real code can go into the report as evidence, but not into product code.
   - **Timeout, resource limit, incomplete exploration, a bound reported as too small or a tool
     error:** the check is blocked. Report the cause.
6. **Update the project skill.** Update the covered code, commands, bounds, assumptions, open
   findings and sync commit, setting the sync commit to the commit you checked. Keep a distinct
   result and exit status for each outcome the tool can tell apart, as
   `create-formal-verification-skill` requires. A blocked check keeps its old sync
   commit; say so. Then follow the project skill once as a later agent would.

## Report

For each check, give the outcome and the commits you read; each verification edit with its reason
and, for a changed guarantee, its evidence; the rerun result and the break that showed the updated
check can still fail; each bug as steps in the code's vocabulary, with its harm and the commit that
introduced it; and what the verification still leaves out. Say which failures were drift and which
were bugs. When a check passed before the update and fails after it, say that the earlier pass was
against an outdated model. Keep verification updates in a separate change from any product fix.
