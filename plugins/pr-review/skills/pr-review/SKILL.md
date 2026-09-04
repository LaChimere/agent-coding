---
name: pr-review
description: "Default general review entrypoint for a pull request, branch diff, commit range, working-tree change set, or requests phrased as review since X. Use applicable code, comment, test, error, type, spec, independent challenge, and optional security review, then aggregate only double-confirmed findings. Use this as the primary change-set review workflow; do not compose it with the separate code-review skill. Do not use for implementing fixes, repository-wide security audits, container-image CVEs, or PR atomicity analysis."
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

Make applicability decisions from the index alone. Do not open a reviewer file to decide whether
its aspect applies, and do not read or dispatch reviewer files for aspects recorded as skipped.

If the user asks to review a design, treat design as a focus for the applicable `code`, `comments`,
and `spec` reviewers rather than inventing a separate public aspect.

## Dispatch

The primary agent coordinates the review.

- For each selected ordinary aspect, read only the reviewer file linked from
  [references/reviewers/index.md](references/reviewers/index.md). Launch reviewers in waves within the
  available concurrency. Give each the same pinned target, changed-file inventory, relevant diff,
  repository guidance, authoritative spec, and the complete selected reviewer brief. Reviewers are
  read-only and must not spawn more agents. Launch ordinary reviewers without a model override by
  default so they use the current session model; the primary chooses reasoning effort according to
  the aspect's scope, complexity, and risk.
- Track every selected aspect until it is `completed` or `skipped` with an explicit reason. An aspect
  not attempted because capacity is full belongs in a later wave; it is not a failed launch.
- Enter wait/collect only for returned live handles. When delegation is available but a launch
  returns no live handle, retry that aspect once after capacity is available, without an explicit
  model override so it uses the current session's inherited/default model. If that retry still
  returns no handle, or a launched reviewer later fails, run that brief sequentially in the primary
  agent and record the fallback. When delegation itself is unavailable, skip retry and use the same
  primary-agent fallback immediately. Never retry an aspect more than once or wait without a live
  handle.
- Let each reviewer use the report shape natural to its domain. Its output is a set of candidates,
  not final findings.

## Independent challenge

The primary session model must perform its own review and make the final judgement. Independent
challenge adds a separate adversarial perspective; it never replaces ordinary review or primary
double confirmation.

- Run `$spar` only when the user explicitly asks for SPAR, devil's-advocate analysis, or an
  assumptions/trade-offs challenge. Never add it automatically or treat it as a public review aspect.
- Run `$rubber-duck` when the user explicitly requests it, or automatically when the pinned change is
  substantial: it materially affects security, persisted data, a public interface, compatibility,
  migration, concurrency, cross-component behavior, complex state transitions, or a plan/design/test
  whose failure would have major consequences. File count alone does not make a change substantial.
  Honor an explicit request to exclude Rubber Duck.
- Give challengers the same pinned target, relevant context, repository guidance, and authoritative
  specification, but not ordinary reviewer candidates or each other's output. The primary coordinates
  challenger agents; a challenger must not spawn more agents.
- Prefer an eligible model from a different user-, repository-, and host-allowed family for each
  challenger. Do not hard-code a model or reasoning level. The primary chooses reasoning effort based
  on the challenge's complexity and risk.
- If no eligible different family is available, use the primary model in an isolated challenger
  context. If delegation is unavailable, perform a distinct primary-model second pass. If the user
  requires an actual different family and none exists, report the capability limitation. Never call a
  primary-model fallback cross-model.
- Apply the ordinary live-handle, wave, single-retry, and primary fallback rules to challenger
  dispatch. Track SPAR and Rubber Duck separately until completed, excluded, skipped with reason, or
  blocked by an explicitly required unavailable capability.
- Treat challenger output as candidates. A SPAR challenge normally remains a Question unless evidence
  establishes a defect. Map a verified Rubber Duck candidate to the existing aspect labels and five
  severity levels; do not mechanically convert its standalone categories.
- Record whether each pass was cross-model or primary-model fallback and the model/family when known.
  Do not expose hidden reasoning. A Rubber Duck security concern does not complete the security aspect.

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

When the user or repository guidance names an exact command or bounded command set, execute only
those commands. Do not add a broader, substitute, or supplemental test/build/lint/typecheck command
unless the user or the same guidance separately requires it.

Before claiming that an executed command proves tests passed, inspect the command definition or
configured script and identify the tests or assertions it actually ran. A command that only prints
success is passing command evidence, not passing test evidence.

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
source labels, spec/review/challenge coverage, and a natural-language Recommended Action.

## Boundaries

- Review only. Do not edit files, implement fixes, simplify code, commit, push, or write externally.
- Do not invoke or depend on the separate `$code-review` skill; this workflow owns repository
  standards and specification review internally.
- Do not invoke or reproduce a code-simplifier.
- Do not claim security coverage when the complete security workflow did not finish.
- Do not convert source review into container-image CVE scanning, PR decomposition, or atomicity
  analysis; route those requests to their dedicated capabilities.
