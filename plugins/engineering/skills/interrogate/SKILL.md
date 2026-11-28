---
name: interrogate
description: Point adversarial workers at a change or design to make it fail, and report as findings only the failures you rerun and see against the real code. Use it for an adversarial review, a stress test or a hunt for blind spots; it reports and does not fix.
disable-model-invocation: true
---

# Interrogate

Read [the shared agreement](../../references/working-agreement.md). The target is never modified:
adversaries reproduce failures in isolated copies, and this skill only reports. Fixes go through
[implement-task](../implement-task/SKILL.md) when they are authorized.

## Set the target

Use the scope the user gives. Without one, use the branch's diff from its merge base with the base
branch, plus uncommitted and untracked files. Record the base, the head and whether the working tree
is part of the scope.

Write down in your own words what the change is meant to achieve and what must keep working, drawing
on the user's request, the commit messages and the PR description. Only if these leave the purpose
unclear, ask the user.

## Launch the adversaries

Start two to four adversaries, three by default, together through the host's delegation tool. Each
gets its own copy of the scope, with the uncommitted and untracked files, in a worktree or scratch
copy. Any model the host offers may run an adversary, and mixing model families is optional. Record
the models that actually ran. Send each one the scope, the stated purpose and this brief:

> Try to make this change fail. Back every finding with something you ran against the real code: a
> failing test, a script that reproduces the problem, or command output showing the bad behavior.
> When the target is a design or a plan, build a prototype or probe the current tree. Run everything
> in your own copy, and make no commits, pushes, branch changes or writes to outside services. For
> each finding give a title, the exact command, what it printed and what the stated purpose requires
> instead. Report only failures you ran. Style, naming, structure and risks that would need a later
> change to matter are out of scope. Finding nothing is an acceptable result; then list what you
> ran, and if you could not build or run the code, say so.

An adversary with no report by the deadline you set at launch, after one status check, is stopped
and counted as missing, and so is one that could not run the code. Without a delegation tool, take
the adversary role yourself in a separate copy and label the result as not independent.

## Confirm

Read each finding's command, and any script it runs, before you run it. Rerun it yourself in a
fresh copy of the target that contains only the finding's own test or script, and only when its
effects stay inside that copy and within the task's authority. List any other finding as not rerun,
with the reason, apart from the dropped ones. Keep a finding when the rerun shows the failure and
the failure contradicts the stated purpose; drop the rest and say why. Merge findings that share a
root cause. Keep confirmed findings from every adversary, since each one tends to find different
failures.

## Report

- **Purpose:** your restatement.
- **Findings:** for each confirmed finding, the command, its output, how it contradicts the purpose
  and which adversaries found it. Write "no confirmed findings" when none remain.
- **Not rerun:** each finding you did not rerun, with the reason.
- **Dropped:** for each adversary, how many findings were dropped and why.
- **Coverage:** adversaries started, models used and missing adversaries. If no adversary reported,
  the run failed; say that instead of reporting no findings.

Copy the reproduction scripts and outputs the report cites to a location you name, then remove the
copies you made, after a failed run as well; leave branches for the user to delete. For a complete
review across code, tests, errors, types and specification, use [code-review](../code-review/SKILL.md);
this skill answers only whether the change can be made to fail.
