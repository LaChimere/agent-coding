---
name: no-comments
description: Strip comments that only narrate, repeat or apologize for the code in a change, flag the code they were covering for, and offer to turn stated constraints into types, tests or checks. Use it before a review.
disable-model-invocation: true
---

# No comments

Read [the shared agreement](../../references/working-agreement.md). The scope is the files or diff
the user names; without one, it is the branch's diff against the base branch, working tree included.
For a diff, only the comments the diff adds or changes are judged. Applying edits needs
implementation authority; without it, return the reviewed patch as a proposal.

## Run the comment pass

Start one fresh-context worker through the host's delegation tool. Give it an isolated copy of the
repository, such as a scratch worktree with the uncommitted files copied in, the scope (the files
and, for a diff, the added or changed comment lines it may judge) and the brief below. It returns a
patch, and the real tree stays untouched until you have reviewed that patch. Without a delegation
tool, make the pass yourself in the copy and say it was not independent.

> Delete every comment in scope unless it matches one of these exceptions: a legal or license
> header; a note on behavior that an outside dependency, platform, vendor or protocol forces and the
> project cannot change; a directive that a tool reads, other than the lint and type suppressions
> covered below, such as a formatter directive, a build tag, a compiler or bundler pragma, a
> coverage marker or a shebang; a doc comment that defines a public API contract; a link to an
> issue or RFC that explains a constraint the code cannot express. If you are unsure whether an
> exception applies, delete the comment.
>
> When a comment explains surprising behavior in the project's own code, delete it and flag the
> exact symbol `RESHAPE`, naming the rename, extraction, type or redesign that would make the
> behavior clear without a comment. A lint or type suppression such as `eslint-disable`,
> `@ts-ignore` or `# type: ignore` stays only when the rule it silences is wrong, pedantic or purely
> stylistic. Delete a suppression that hides a correctness or safety problem and flag its symbol
> `RESHAPE`.
>
> Check a comment that asserts a constraint, such as "do not remove", "fine for now" or a long
> justification, before you judge it: read the surrounding code and follow the symbol or call it
> mentions. Keep it only if it matches an exception and its claim holds on a live code path today.
> Delete or keep each comment as it is, without rewording it, and change nothing but comments, only
> in your copy. Return the patch, the files it touches, the number of deletions, one line per
> `RESHAPE` flag and each kept comment with the exception it matches.

These rules hold for comments in every language.

## Review the patch

Read the worker's report and patch. Reject the patch if it changes anything other than comments,
reaches outside the scope or misstates a flag's reason, and run the worker once more with the problem
named. If the second patch is also rejected, report the pass as failed and leave the tree unchanged.
Restore a deleted comment only with exact evidence that it matches an exception. Check every kept
comment the same way, and delete one that matches no exception or that you cannot settle. Apply the
suppression rule to any suppression in scope that the worker missed. In the copy, run the project's
build, lint and tests that cover the scope before and after applying the patch. A new failure from a
deleted suppression that carries a `RESHAPE` flag is expected: keep the deletion and list the
failure with its flag. Restore the comments that any other new failure traces to. Apply the patch to
the real tree once no other new failure remains, and report the failures that existed before.

## Act on the flags

- **Flags with a direct fix,** such as a dead path, an unused parameter or a workaround for an API
  that exists: fix them through [implement-task](../implement-task/SKILL.md). Code that a constraint
  comment protects is not a direct fix; handle it as a constraint comment.
- **Flags that need a new shape:** sketch the shape, offering [arena](../arena/SKILL.md) when the
  shape is disputed, then make the smallest root-cause fix in scope through
  [implement-task](../implement-task/SKILL.md). Report a root cause outside the scope as open.
- **Constraint comments,** such as "do not remove", "kept for a later change" or "ask X before
  changing": offer the cheapest encoding in scope as a type, a runtime check, a test or a lint rule,
  and wait for the user's approval. With approval, encode the constraint and then delete the
  comment. Without it, delete the comment and report the constraint as open.

## Report

Report the number of deletions, restored comments, each flag and its fix, each encoding offer and
its result, the checks you ran and their results, and the open work.
