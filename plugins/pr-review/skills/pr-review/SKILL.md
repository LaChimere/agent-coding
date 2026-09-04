---
name: pr-review
description: "Default general review entrypoint for a pull request, branch diff, commit range, working-tree change set, or requests phrased as review since X. Use applicable code, comment, test, error, type, spec, and optional security reviewers, then aggregate only double-confirmed findings. Do not use for implementing fixes, repository-wide security audits, container-image CVEs, or PR atomicity analysis."
---

# PR Review

Review one fixed change set without modifying it. The public entrypoint is `$pr-review`;
review aspects are internal workers, not separate public skills.

## Scope

Resolve the review target from the user's words and current repository state. Accept natural
language rather than requiring a command grammar.

- An explicit range, branch, commit, PR, file set, or working-tree request wins.
- Otherwise inspect the current branch, working tree, and available PR context. Ask only when two
  materially different targets remain plausible.
- Before dispatching reviewers, record the exact base/head or local-patch definition, commit list,
  changed-file inventory, and whether staged, unstaged, untracked, and deleted files are included.
- Keep that target unchanged for the whole review. Stop early when it resolves to no changes.
- Read unchanged supporting code only when needed to confirm or disprove behavior introduced by the
  change; do not expand into a repository-wide audit.

## Context

Read the repository guidance that governs the changed paths, including applicable `AGENTS.md`,
`CLAUDE.md`, `CONTRIBUTING.md`, style guides, and equivalent local instructions.

Use only an authoritative specification supplied by the user or present in the repository. When no
such source is available, skip `spec` without asking or reconstructing requirements from the diff.
Record the source or skip reason in the final coverage section.

## Select review aspects

Read [references/reviewers/index.md](references/reviewers/index.md) before dispatch. By default run
every applicable aspect. Honor requests to add or exclude an aspect; when the user says "only",
limit the review to the named aspects plus the scope work needed to run them safely. `all` means all
applicable aspects, not every aspect regardless of evidence.

Before launching workers, make an explicit applicability decision for each canonical aspect and
retain its reason for Review Coverage. Apply the aspect criteria as written: for example, a changed
`catch`, fallback, retry, or failure default requires `errors`; do not substitute a neighboring
aspect merely because it can notice the same code.

If the user asks to review a design, treat design as a focus for the applicable `code`, `comments`,
and `spec` reviewers rather than inventing a separate public aspect.

## Dispatch

The primary agent coordinates the review.

- For each selected ordinary aspect, read only the reviewer file linked from
  [references/reviewers/index.md](references/reviewers/index.md). Launch those reviewers in parallel
  when concurrency is available. Give each the same pinned target, changed-file inventory, relevant
  diff, repository guidance, authoritative spec, and the complete selected reviewer brief.
  Reviewers are read-only and must not spawn more agents.
- If delegation is unavailable, run the same applicable briefs sequentially in the primary agent
  and record that limitation. Do not wait for agents or handles that were never created.
- Let each reviewer use the report shape natural to its domain. Its output is a set of candidates,
  not final findings.
- Keep security separate from ordinary reviewers. When security is applicable and
  `$codex-security:security-diff-scan` is available, invoke that complete workflow from the primary
  agent against the same pinned target. Do not copy or weaken its threat-model, validation,
  attack-path, coverage, report, or SARIF lifecycle.
- If security was selected automatically but the capability is unavailable, continue and record
  that it was not run. If the user explicitly required security, stop and report the missing
  capability rather than substituting a lightweight scan.

## Tests and commands

The `tests` aspect reviews behavioral coverage and test quality; it does not run tests by default.
Run test, build, lint, or typecheck commands only when the user explicitly requests execution or
applicable repository guidance requires it. Keep command/result evidence separate from reviewer
judgement, and never present an unrun check as passing.

A rule requiring tests or coverage to exist does not by itself require command execution. Treat
repository guidance as an execution requirement only when it explicitly says to run a check or
names a command that must be executed.

## Aggregate

Read [references/report-format.md](references/report-format.md). The primary agent must independently
double-confirm every candidate against the diff, supporting code, tests, specification, and
repository rules. Search for counterevidence such as existing guards, caller validation, invariants,
or coverage. Delete disproved candidates, merge a shared root cause, and move unresolved concerns
to Questions.

Return one human- and agent-readable Markdown report sorted by the agreed severity levels, with
source labels, spec/review coverage, and a natural-language Recommended Action.

## Boundaries

- Review only. Do not edit files, implement fixes, simplify code, commit, push, or write externally.
- Do not invoke or reproduce a code-simplifier.
- Do not claim security coverage when the complete security workflow did not finish.
- Do not convert source review into container-image CVE scanning, PR decomposition, or atomicity
  analysis; route those requests to their dedicated capabilities.
