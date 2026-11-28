---
name: no-comments
description: Remove comments that only narrate, restate or excuse code in a diff, flag the code those comments were compensating for, and offer to encode stated constraints as types, tests or checks. User-invoked before review.
disable-model-invocation: true
---

# No comments

Read [the shared agreement](../../references/working-agreement.md). The scope is the files or
diff the user names; otherwise the branch diff against the base branch, including the working
tree. Editing needs implementation authority; without it, return the pass as proposals.

## Run the comment pass

Launch one fresh-context worker through the host's delegation mechanism with the scope and the
brief below. Without delegation, run the pass yourself and say it was not independent.

> Remove every comment in scope except these keeps: legal or license headers; notes on behavior
> forced by an external dependency, platform, vendor or protocol the project cannot change;
> formatter directives such as `prettier-ignore`; doc comments that define a public API contract;
> issue or RFC links that explain a constraint code cannot express. When unsure whether a keep
> applies, remove the comment.
>
> A comment that explains a surprise in the project's own code is removed, and its exact symbol
> is flagged `RESHAPE` with the rename, extraction, type or redesign that would make the behavior
> obvious without prose. A lint or type suppression such as `eslint-disable`, `@ts-ignore` or
> `# type: ignore` stays only when its rule is faulty, pedantic or style-only. A suppression
> that hides a correctness or safety problem is removed and its symbol flagged `RESHAPE`.
>
> Before judging a comment that claims a constraint, such as "do not remove", "fine for now" or
> a long justification, read the nearby code and trace the symbol or call it names. It stays only
> when it is a keep proven true on a live path today. Edit comments only. Report the touched files,
> the deletion count, each `RESHAPE` flag in one line and the comments you kept with their keep.

The same rules apply to comments in any language.

## Review the pass

Inspect the worker's report and diff. A report fails review when it edits code that is not a
comment, edits outside the scope, deletes a genuine keep or misstates a flag's reason. Revert a
failed report and run the worker once more with the failure named; a second failure is reported
as open and the pass ends as failed. Restore a comment only with exact proof that it meets a keep.
Check every comment the worker kept: it stays only with proof that it describes something the
project cannot change, and a refuted or still ambiguous keep is deleted. Check the scope for
suppressions the worker missed.

## Act on the flags

- **Trivial flags,** such as a dead path, an unused parameter or a workaround for an API that
  exists: fix them directly within implementation authority.
- **Flags that need a new shape:** sketch the shape, using [arena](../arena/SKILL.md) when it is
  contested, then implement the smallest root-cause fix in scope through
  [implement-task](../implement-task/SKILL.md). Report a root cause outside the scope as open.
- **Constraint comments,** such as "do not remove" or "ask X before changing": offer the cheapest
  in-scope encoding as a type, runtime check, test or lint, and wait for the user's approval.
  With approval, encode the constraint and then delete the comment. Without it, delete the
  comment and report the constraint as open.

## Report

Report the deletion count, restored comments, each flag and its fix, the encoding offers and
their outcome, the checks you reran and the open work.
