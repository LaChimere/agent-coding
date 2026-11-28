---
name: interrogate
description: Send adversaries to break a change or design and keep only the failures a run against the real code reproduces. User-invoked for an adversarial review, stress test or blind-spot hunt; reports findings without fixing them.
disable-model-invocation: true
---

# Interrogate

Read [the shared agreement](../../references/working-agreement.md). The target stays read-only:
adversaries reproduce failures in isolated copies, and this skill reports findings without
applying fixes. Repairs go through [implement-task](../implement-task/SKILL.md) when authorized.

## Frame

The scope is what the user names. Otherwise it is the branch diff from its merge base with the
base branch, including uncommitted changes. Record the base, head and whether the working tree is
included.

State the intent in your own words from the user's message, the commits and the PR description:
what the change must do and what it must keep working. Ask the user only when the intent cannot
be recovered from those sources.

## Fan out

Launch two to four adversaries, normally three, in one wave through the host's delegation
mechanism. Give each its own isolated copy of the scope, uncommitted changes included, in a
worktree or scratch copy. Use the models the host offers; a different model family can help but
is not required. Record which models actually ran. Give each adversary the scope, the intent and
this brief:

> Break this change. Prove each finding with a run against the real code: a failing test, a
> reproduction script, or command output that shows the wrong behavior. For a design or plan,
> run a prototype or probe the current tree. Keep reproductions in your own copy. Report each
> finding with a title, the exact command, the output it printed and the output the intent
> requires. Report only what you ran; style, naming, structure and risks that need a future
> change to matter are out of scope. No findings is a valid result.

## Verify

Rerun each finding's command yourself in an isolated copy. Keep a finding when the output shows
the failure and the failure breaks the stated intent; drop the rest with the reason. Merge
findings that share a root cause. Keep every verified finding from every adversary, because
adversaries find different failures and no single list wins.

## Report

- **Intent:** the restatement.
- **Findings:** for each verified finding, the command, its output, how it breaks the intent and
  which adversaries found it. Write "no verified findings" when none survive.
- **Dropped:** for each adversary, the number of dropped findings and why.
- **Coverage:** adversaries launched, models used and dropouts.

For a full review across code, tests, errors, types and specification, use
[code-review](../code-review/SKILL.md); this skill answers only whether the change can be broken.
