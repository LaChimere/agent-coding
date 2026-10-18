# Decisions

Settled decisions for contributions to `agent-coding`. Each entry records its context, decision,
alternatives, consequences, status and evidence. Overturning a settled decision needs an explicit
new decision that identifies the entry it supersedes. Historical implementation details remain
below; D-008 defines the current package and host structure.

## D-001: AGENTS.md files are routing-only

- Date: 2026-10-13
- Status: accepted
- Context: The global `config/codex/AGENTS.md` and the root `AGENTS.md` had grown into long rule lists loaded for every task.
- Decision: Both are routing tables ("before X, read Y"). The global file keeps only Communication and Authority rules; detailed rules live in skills and `docs/`.
- Alternatives rejected: Keep full rules inline: every task loads every rule, and the files keep growing.
- Consequences: Rules must be reachable through a routing row; a missing routed plugin triggers the conservative fallback in `config/codex/AGENTS.md`.
- Current implementation: D-008 preserves concise entry guidance while replacing the old global
  rule routing with task-specific engineering methods and the consuming project's contracts.
- Links: [PR #11](https://github.com/LaChimere/agent-coding/pull/11), [missing-plugin thread](https://github.com/LaChimere/agent-coding/pull/11#discussion_r4256527565), [review](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183)

## D-002: Lessons are kept per project in docs/lessons.md

- Date: 2026-10-13
- Status: superseded by D-008 for promotion thresholds and enforcement priority; project-local evidence remains valid
- Context: Recurring pitfalls were not recorded anywhere durable.
- Decision: Each project keeps `docs/lessons.md` with rule, reason, evidence and occurrence count; at 3 occurrences a lesson is promoted into docs or a skill plus an eval case or test.
- Alternatives rejected: One global lessons file: mixes project-specific content into global rules.
- Consequences: This repo keeps its own [lessons.md](lessons.md).
- Links: [PR #11](https://github.com/LaChimere/agent-coding/pull/11), [review](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183)

## D-003: Merges pin the reviewed head commit

- Date: 2026-10-13
- Status: accepted
- Context: A push after review could otherwise be merged unreviewed.
- Decision: Merge only with `gh pr merge --match-head-commit <reviewed sha>`; if the head moved, re-review and re-check.
- Alternatives rejected: Plain `gh pr merge`: merges whatever the head is at merge time.
- Consequences: Review recommendations name the reviewed SHA. The current
  [release method](../plugins/engineering/skills/release-and-rollout/SKILL.md) preserves this gate.
- Links: [PR #11](https://github.com/LaChimere/agent-coding/pull/11), [review](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183)

## D-004: PR bodies, comments and review threads are in English

- Date: 2026-10-13
- Status: accepted
- Context: PRs here are read by humans and by agents across hosts.
- Decision: Write every PR body, comment and review-thread reply in English.
- Alternatives rejected: The conversation language: inconsistent for later readers and agents.
- Consequences: Applies to agent-authored and human-authored PR text.
- Links: [PR #11](https://github.com/LaChimere/agent-coding/pull/11), [review](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183)

## D-005: Standing rules live in the workflow plugin skill global-agent-rules

- Date: 2026-10-13
- Status: superseded by D-008; replacement implemented
- Context: The detailed global rules need to be installed wherever the global `AGENTS.md` is used.
- Decision: They live in `plugins/workflow/skills/global-agent-rules/`, moved from a top-level `skills/` entry and renamed from `working-conventions`, shipped with workflow 0.3.0.
- Alternatives rejected: Standalone top-level skill: separate install step; name `working-conventions`: unclear.
- Consequences: Syncing `~/.codex/AGENTS.md` must happen together with updating workflow to 0.3.0.
- Links: [PR #11](https://github.com/LaChimere/agent-coding/pull/11), [rename thread](https://github.com/LaChimere/agent-coding/pull/11#discussion_r4256537718), [rename reply](https://github.com/LaChimere/agent-coding/pull/11#discussion_r4256570812), [review](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183)

## D-006: Eval git fixtures strip inherited GIT_* environment

- Date: 2026-10-13
- Status: accepted
- Context: The pre-push hook exports `GIT_WORK_TREE` (and git can add other `GIT_*` variables), which broke fixture tests and could write fixture commits into the caller's clone.
- Decision: Fixture git commands use an environment without any `GIT_*` variable (`withoutInheritedGitEnvironment()` in `evals/src/preparation/git.ts`); the frozen hook configuration (`evals/lefthook.yml`) is not changed.
- Alternatives rejected: Changing the hook config: it is part of the frozen baseline and would not protect other git callers.
- Consequences: New fixture git calls must use the stripped environment; a regression test covers it.
- Links: [PR #10](https://github.com/LaChimere/agent-coding/pull/10)

## D-007: Plugin manifests are not required to name every skill

- Date: 2026-10-13
- Status: accepted
- Context: A reverse check (every skill directory must be named in its plugin manifests) was proposed after PR #12.
- Decision: Manifest `description` and `interface` text stay human-facing summaries; skills are discovered from the plugin's `skills/` directory. The distribution test checks only that skill names a manifest does mention exist.
- Alternatives rejected: Require every skill name in the manifests: neither host needs it, and it turns summaries into lists.
- Consequences: Adding a skill needs no manifest edit; renaming one still fails the test if a manifest names the old skill.
- Links: [Codex: package your plugin](https://developers.openai.com/plugins/build/plugins), [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

## D-008: One portable engineering package with native host adapters

- Date: 2026-10-18
- Status: accepted; implemented with scoped acceptance
- Context: The owner approved the complete redesign developed in this conversation, without
  backward compatibility. Independent specialists did not cover project verification,
  persistent outcomes, cross-host handoff and structural prevention as one usable product.
- Decision: Implement [Portable engineering methods](engineering/design.md): nine task-specific
  skills in one complete engineering plugin, short shared principles, host adapters for Codex,
  Claude Code, Pi and Grok Bot, project-owned executable verification, and evidence-based
  qualification. Skills may compose methods and specify handoff content while native runtimes
  retain scheduling, sessions, state and permission enforcement. Installed shared resources may
  live at the plugin root. Retire old active plugin names and conflicting personal host policy.
- Alternatives rejected: Retain disconnected entry points with aliases; put all methods into
  always-loaded rules; implement a universal scheduler; infer cross-host quality from Codex.
- Consequences: Supersedes D-005, D-002's three-occurrence promotion rule and prose-first path,
  and the specialist-only scope/distribution constraints of the prior repository design.
  Choose structural enforcement before prose, with failures and valid controls as evidence.
  D-001's short routing guidance, D-003's exact reviewed revision, D-004's repository publication
  language, D-006's Git environment isolation and D-007's native metadata remain applicable.
  Preserve frozen quality enforcement, original evaluation records and hidden holdouts.
  This decision authorizes in-scope local implementation and verification, not commits,
  publication, production installs, enabled routines or unbounded external changes.
- Evidence: Owner's goal dated 2026-10-18 includes the accepted design verbatim;
  [implementation and acceptance](engineering/implementation.md) tracks remaining work.

## D-009: Preserve useful capabilities while integrating the engineering methods

- Date: 2026-10-18
- Status: accepted; implemented with renewed scoped acceptance
- Context: The owner found that D-008's implementation discarded standing communication and
  authority guidance, personal Codex settings, detailed review methods and SPAR/Rubber Duck.
  Passing the selected new cases did not demonstrate preservation of those capabilities.
- Decision: Preserve capabilities that support, or gain value from, the combined Claude Team,
  Lauren/pstack and Felix practices. Keep nine lifecycle entry points plus independently callable
  `spar` and `rubber-duck`; integrate their methods into design/review without mandatory extra rounds.
  Restore detailed review briefs and place sequencing, atomicity, quality, publication and knowledge
  methods under explicit task owners. Keep personal host policy separate from portable methods,
  with standing rules still available when no skill runs. Record preservation and replacement
  reasons in [alignment.md](engineering/alignment.md), and evaluate the newly restored paths.
- Alternatives rejected: Restore every old package/alias; discard methods to meet a nine-skill
  count; make all detailed methods always-loaded; treat old passing evidence as current acceptance.
- Consequences: Refines D-008's nine-entry inventory and its overbroad removal of host policy.
  D-001's concise routing intent still applies to repository instructions. Personal standing
  communication/authority instructions are retained. No required runtime scheduler, fixed model
  roster in portable skills, universal mutation ritual or count-based lesson promotion returns.
  Old results remain historical. Grok native verification remains explicitly user-deferred.
- Evidence: Owner's request to align design and implementation and retain/integrate existing
  capabilities that empower or are empowered by the new practices, following the four diff comments.

## D-010: Name the release entry for publication and rollout

- Date: 2026-10-18
- Status: accepted
- Context: The owner proposed `release-and-rollout` to make the entry's existing responsibilities
  visible. General maintenance remains spread across task implementation, verification maintenance,
  structural prevention and continuous work.
- Decision: Rename the release entry to `release-and-rollout`, including active references and
  the distribution inventory. Preserve preparation-only use, authorization, staged deployment,
  observation and recovery. The nine lifecycle responsibilities remain unchanged.
- Alternatives rejected: `release-and-maintain`, which implies broader maintenance ownership;
  keeping an alias when compatibility was explicitly excluded from the redesign.
- Consequences: Replaces the release skill identifier in D-008's inventory without expanding
  authority or claiming renewed native-host qualification. Historical runs retain their identities.
- Evidence: Owner's naming annotation accompanying authorization to refine the Grok findings.
