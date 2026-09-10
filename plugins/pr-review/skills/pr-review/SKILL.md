---
name: pr-review
description: "Default general review entrypoint for a pull request, branch diff, commit range, working-tree change set, or requests phrased as review since X. Use applicable code, comment, test, error, type, spec, independent challenge, and optional security review, then aggregate only double-confirmed findings. Use this as the primary change-set review workflow; do not compose it with the separate code-review skill. Do not use for implementing fixes, repository-wide security audits, container-image CVEs, or PR atomicity analysis."
---

# PR Review

Review one fixed change set without modifying it. The public entrypoint is the `pr-review` skill;
review aspects are checking perspectives, not agent counts or separate public skills. SPAR and Rubber Duck are plugin
skills that this workflow composes when selected; they can also be invoked directly.

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

Read [references/reviewers/index.md](references/reviewers/index.md) before dispatch. The primary selects
the necessary aspects from the target's actual risks and the index criteria. Honor requests to add or exclude an aspect; when the user says "only",
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

The primary agent owns review timing, scope, aspects, worker allocation, models, effort, findings and
final judgment. Portable review methods do not require personal roles or a particular model policy.

- For each selected ordinary aspect, read only the reviewer file linked from
  [references/reviewers/index.md](references/reviewers/index.md). The primary can assign several aspects
  to one reviewer or split them among reviewers. Give each the same pinned target, changed-file
  inventory, relevant diff, repository guidance, authoritative spec, and every assigned aspect's
  complete brief. Require evidence and a coverage status for each aspect; combining workers does not
  omit a checking method. Reviewers are read-only and must not spawn more agents.
- Dispatch using the host-supported mechanism that implements the primary's selected role, model,
  effort and read-only constraints. Omitted arguments may use global defaults or role overrides;
  they do not prove primary-model inheritance. Verify effective configuration from execution evidence
  when it matters; report unavailable evidence rather than inferring it from a requested argument.
- Track every selected aspect as completed, pending, incomplete, or skipped with an explicit reason.
  Launch in waves within actual capacity. An aspect deferred for capacity is not a failed launch.
  If completed threads still occupy slots, preserve their results and useful context, close them as
  needed through supported lifecycle controls, confirm capacity release, then dispatch pending work.
- When continuing from an authoritative recorded launcher state, preserve its execution facts in
  Review Coverage: capacity-deferred aspects, returned handles, each single retry, whether the retry
  followed the primary's dispatch decision, effective configuration evidence, and every primary fallback.
- Use the host's actual delegation mechanism. A synchronous call that returns a completed reviewer
  result needs no task handle or later wait; record the returned result as execution evidence.
  For asynchronous launches, apply a live-handle gate before every wait/collect call: the receiver set must contain
  at least one live handle returned by a completed launch call. A tool error, `no thread`, or other
  no-handle outcome without a completed result means no delegated work exists to collect and cannot later produce a result.
  Continue with the required primary fallback when the receiver set is empty. Requested roles, model
  arguments, intended launches, and failed launch calls are not execution evidence.
- When delegation is available but an asynchronous launch returns neither a live handle nor a
  completed result, retry the affected assignment once after capacity is available, preserving the
  primary's dispatch decision. Any authorized alternative must be explicitly selected by the primary
  and verified for effective model, effort and read-only constraints; dropping an override is not a
  recovery policy. If the retry still returns no handle, or a launched reviewer later fails, run the
  brief sequentially in the primary and record the fallback. When delegation itself is unavailable,
  skip retry and use that fallback immediately. Treat `no thread` and an unavailable collaboration
  tool as delegation unavailable for that invocation. Never retry an assignment more than once.
  Primary inspection cannot complete an unmet independent-review requirement; keep it incomplete
  and continue unaffected authorized work.
- Let each reviewer use the report shape natural to its domain. Its output is a set of candidates,
  not final findings.

## Independent challenge

The primary session model must perform its own review and make the final judgement. Independent
challenge adds a separate adversarial perspective; it never replaces ordinary review or primary
double confirmation.

- Run `spar` only when the user explicitly asks for SPAR, devil's-advocate analysis, or an
  assumptions/trade-offs challenge. When selected, read and follow the complete
  [SPAR skill](../spar/SKILL.md). Never add it automatically or treat it as a public review aspect.
- The primary decides whether to use `rubber-duck` and who performs it. Honor an explicit request
  or exclusion, and suppress optional Rubber Duck for `only` named aspects unless also requested.
  Consider substantive risks in security, persisted data, public contracts, compatibility, migration,
  concurrency, cross-component behavior and complex state transitions. Preserve necessary risk
  coverage and any required independent review, whether supplied by selected aspect reviewers or a
  critic; optional critique is not a mandatory extra stage. When selected, read and follow the complete
  [Rubber Duck skill](../rubber-duck/SKILL.md). File count alone does not establish the need.
- Give challengers the same pinned target, relevant context, repository guidance, and authoritative
  specification, but not ordinary reviewer candidates or each other's output. The primary coordinates
  challenger agents; a challenger must not spawn more agents.
- The primary selects a suitable available, permitted model and effort. An independent same-family
  context is a valid critic path. Another family is an optional enhancement when useful and available,
  not a prerequisite or an automatic extra round. Do not hard-code models or reasoning levels.
- If delegation is unavailable, perform a distinct primary-model second pass and disclose the lack
  of independence. If the user requires an actual different family and none exists, report that
  requirement unmet; same-family work may inform the review but cannot satisfy it.
- Apply the ordinary live-handle, wave, single-retry, and primary fallback rules to challenger
  dispatch. Track SPAR and Rubber Duck separately until completed, excluded, skipped with reason, or
  blocked by an explicitly required unavailable capability.
- Treat challenger output as candidates. A SPAR challenge normally remains a Question unless evidence
  establishes a defect. Map a verified Rubber Duck candidate to the existing aspect labels and five
  severity levels; do not mechanically convert its standalone categories. Do not append a standalone
  SPAR or Rubber Duck report to the final response; integrate only confirmed findings, unresolved
  questions, and challenge coverage into the single PR Review report.
- Report context independence, actual model and effort, and model-family diversity separately, using
  returned results and execution evidence. Different roles do not prove different models or families.
  Mark unknown configuration as unverified and primary fallback as non-independent; it cannot satisfy
  pending independent coverage. Do not expose hidden reasoning.
  A Rubber Duck security concern does not complete the security aspect.

- Keep security separate from ordinary reviewers. When security is applicable and
  `codex-security:security-diff-scan` is available, invoke that complete workflow using the host's
  supported skill invocation from the primary
  agent against the same pinned target. Do not copy or weaken its threat-model, validation,
  attack-path, coverage, report, or SARIF lifecycle.
- If security was selected automatically but the capability is unavailable, continue and record
  that it was not run. If the user explicitly required security, stop and report the missing
  capability rather than substituting a lightweight scan.
- Decide security applicability before capability availability. When security is not applicable,
  report `not applicable`; do not report it as unavailable merely because the workflow is not exposed.

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
to Questions. When a candidate is disproved as unreachable, state both the theoretical failing input
or path and the concrete caller, guard, or invariant that excludes it.

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
