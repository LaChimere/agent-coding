# Decisions

Settled decisions for contributions to `agent-coding`. Each entry records its context, decision,
alternatives, consequences, status and evidence. Overturning a settled decision needs an explicit
new decision that identifies the entry it supersedes. Only applicable decisions are listed;
D-008, D-009 and D-014 define the current package and host structure.

## D-001: AGENTS.md files are routing-only

- Date: 2026-10-13
- Status: accepted
- Context: The global `config/codex/AGENTS.md` and the root `AGENTS.md` had grown into long rule lists loaded for every task.
- Decision: Keep repository instructions as routing tables ("before X, read Y"). Personal host
  instructions keep standing Communication and Authority rules and route to engineering methods;
  detailed repository rules live in `docs/`.
- Alternatives rejected: Keep full rules inline: every task loads every rule, and the files keep growing.
- Consequences: Rules must be reachable through a routing row. Missing required methods remain
  an explicit coverage gap; agents continue unaffected authorized work without inventing a replacement.
- Current implementation: D-008 preserves concise entry guidance while replacing the old global
  rule routing with task-specific engineering methods and the consuming project's contracts.
- Links: [PR #11](https://github.com/LaChimere/agent-coding/pull/11), [missing-plugin thread](https://github.com/LaChimere/agent-coding/pull/11#discussion_r4256527565), [review](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183)

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
- Decision: Implement [Portable engineering methods](engineering/design.md): task-specific
  lifecycle and challenge skills in one complete engineering plugin, short shared principles, host adapters for Codex,
  Claude Code, Pi and Grok Bot, project-owned executable verification, and evidence-based
  qualification. Skills may compose methods and specify handoff content while native runtimes
  retain scheduling, sessions, state and permission enforcement. Installed shared resources may
  live at the plugin root.
- Alternatives rejected: Retain disconnected entry points with aliases; put all methods into
  always-loaded rules; implement a universal scheduler; infer cross-host quality from Codex.
- Consequences: Keep project-local lessons in [lessons.md](lessons.md). Choose structural
  enforcement before prose, with failures and valid controls as evidence; occurrence counts
  are evidence, not a waiting threshold for consequential failures.
  D-001's short routing guidance, D-003's exact reviewed revision, D-004's repository publication
  language, D-006's Git environment isolation and D-007's native metadata remain applicable.
  Preserve frozen quality enforcement, original evaluation records and hidden holdouts.
  This decision authorizes in-scope local implementation and verification, not commits,
  publication, production installs, enabled routines or unbounded external changes.
- Evidence: Owner's goal dated 2026-10-18 includes the accepted design verbatim;
  [implementation and acceptance](engineering/implementation.md) records the observed scope and limits.

## D-009: Preserve useful capabilities while integrating the engineering methods

- Date: 2026-10-18
- Status: accepted; implemented with renewed scoped acceptance
- Context: The owner found that D-008's implementation discarded standing communication and
  authority guidance, personal Codex settings, detailed review methods and SPAR/Rubber Duck.
  Passing the selected new cases did not demonstrate preservation of those capabilities.
- Decision: Preserve capabilities that support, or gain value from, the combined Claude Team,
  Lauren Tan's and Felix's practices. Keep nine lifecycle entry points plus independently callable
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
  Host qualification remains bounded by actual loading and behavior evidence in
  [implementation and acceptance](engineering/implementation.md).
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

## D-011: Claude Code personal guidance mirrors the Codex standing rules

- Date: 2026-11-09
- Status: accepted
- Context: The owner started using Claude Code and found `config/claude/CLAUDE.md` diverged from
  the Codex `AGENTS.md` they actually work under.
- Decision: `config/claude/CLAUDE.md` mirrors `config/codex/AGENTS.md`, adapting only
  host-specific names. `config/claude/agents/` supplies only a read-only `reviewer`. Built-in
  Claude Code subagents, with a per-call model choice, cover the Codex worker roles.
- Alternatives rejected: Keep the Claude-only rules alongside the Codex rules: the owner chose
  strict alignment. Port the Codex worker profiles, including a fixed Sonnet `worker`: built-in
  subagents and per-call model selection already cover them.
- Consequences: Supersedes D-009's retention of the Claude-only shared-component confirmation,
  three-round review budget, `fable` exclusion and review-tool distinction. Copilot's rules are
  unchanged. Git staging and recovery rules remain in the engineering Git reference.
- Evidence: Owner's selections in the 2026-11-09 Claude Code setup conversation;
  [acceptance record](engineering/implementation.md).

## D-012: Claude Code asks before broad or irreversible Git commands with a hook

- Date: 2026-11-11 (revised 2026-11-12)
- Status: accepted
- Context: The engineering Git reference forbids broad staging and work-discarding commands and
  requires authorization for force-pushes and branch deletion, but Claude Code relied on
  instructions only.
- Decision: `config/claude/` adds `settings.json` with one Bash `PreToolUse` hook, `git-guard.py`,
  which returns `ask` for the covered Git commands. The owner merges the `hooks` key into user
  settings. The hook guards against mistakes, not deliberate evasion: when it cannot tell whether
  a command containing `git` is safe, it asks rather than passes.
- Alternatives rejected: `deny` for the Git commands: it would block a command the owner
  explicitly asked for, which the standing rules allow. Permission prefix rules alone: variants
  such as `git -C . add --all` bypass them. A second hook denying non-allowlisted Bash commands
  in the `reviewer` subagent: the reviewer already declined writes from its instructions in live
  runs, while a lexical allowlist both missed writing forms and blocked read-only checks that
  `agents/reviewer.md` permits. Enforced read-only review would need an OS-level sandbox instead.
- Consequences: Refines D-011: `config/claude/` now also carries Claude-only enforcement with no
  Codex counterpart file, while the standing rules stay aligned. In `claude -p` the covered Git
  commands are denied because nobody can confirm them. Detection is lexical: commands inside quoted
  strings (`bash -c '...'`), `eval`, scripts or aliases pass through, and a commented-out Git
  command still asks.
- Evidence: `evals/tests/claude-hooks.test.ts`; live `claude -p` runs recorded in
  [implementation.md](engineering/implementation.md) (2026-11-11 section).

## D-013: Antigravity uses a native plugin manifest and mirrors Codex/Claude standing rules and git-guard

- Date: 2026-11-27 (revised 2026-11-28)
- Status: accepted
- Context: The owner wanted to use the `engineering` plugin, standing personal guidance and Git
  guard on Antigravity without duplicating the skills or letting the Git guard logic drift from
  Claude Code. Live testing with `agy 1.5.18` also showed that Antigravity's default sandbox
  auto-approves sandboxed `run_command` calls under `PreToolUse` `"ask"`, bypassing the guard, and
  confirmed that [Antigravity's hooks documentation](https://antigravity.google/docs/hooks)
  requires a `decision` field where `"allow"` delegates to the next hook or default policy
  (distinct from `"auto_approve"`).
- Decision: Add `plugins/engineering/.antigravity-plugin/plugin.json` so Antigravity installs and
  discovers the existing single-source `plugins/engineering/` package natively via
  `agy plugin install https://github.com/LaChimere/agent-coding` (or `plugins.json` for local
  checkouts). Add `config/antigravity/` with `AGENTS.md` (mirroring `config/codex/AGENTS.md` and
  `config/claude/CLAUDE.md`, adapting only host-specific names and subagent routing; installed at
  `~/.gemini/AGENTS.md` for App/CLI/IDE coverage), `plugins.json`, `hooks.json` and
  `hooks/git-guard.py`. Keep `config/claude/hooks/git-guard.py` and
  `config/antigravity/hooks/git-guard.py` as one identical dual-protocol script verified
  byte-for-byte in tests: Claude Code emits `"ask"` / empty stdout (D-012), while Antigravity emits
  `"force_ask"` for guarded Git commands (matching Claude's effective prompt/deny gate) and
  `{"decision": "allow"}` for non-guarded `run_command` calls. Omit a static `agents/reviewer.md`:
  Antigravity's built-in read-only `research` subagent and `define_subagent` (`EnableWriteTools: false`)
  already cover independent read-only review.
- Alternatives rejected: Placing `plugin.json` at `plugins/engineering/` root (less symmetrical
  with `.codex-plugin/plugin.json` and `.claude-plugin/plugin.json`); returning `"ask"` for
  Antigravity (live `agy 1.5.18` testing proved `"ask"` is bypassed by default sandbox execution);
  emitting empty stdout for Antigravity passthrough (conflicts with the documented required
  `decision` schema); symlinking `git-guard.py` between host directories (breaks self-contained
  file copying and the distribution test's regular-file check); maintaining a static
  `agents/reviewer.md` alongside built-in read-only subagent primitives.
- Consequences: `plugins/engineering/package.json` includes `.antigravity-plugin` in `files`.
  `config/antigravity/hooks.json` invokes `./hooks/git-guard.py` relative to its config directory.
  Distribution tests validate the Antigravity manifest, `config/antigravity/` artifacts and JSON
  adapter schemas; `evals/tests/antigravity-hooks.test.ts` exercises the Antigravity `PreToolUse`
  contract (`force_ask` / `allow`) and guards script parity with Claude Code. Live `agy 1.5.18`
  qualification covers package validation, GitHub installation, CLI/App discovery, global
  `~/.gemini/AGENTS.md` loading, read-only `understand-codebase` / `release-and-rollout`
  shared-reference invocation, and `git-guard` passthrough/blocking; interactive App confirmation
  UI, subagent delegation, and full multi-skill workflow parity remain unverified.
- Evidence: `evals/tests/distribution.test.ts`, `evals/tests/antigravity-hooks.test.ts`,
  `evals/tests/claude-hooks.test.ts`; live `agy 1.5.18` runs recorded in
  [implementation.md](engineering/implementation.md) (2026-11-27/28 section).

## D-014: Add user-invoked engineering skills

- Date: 2026-11-28
- Status: accepted; implementation evidence in [implementation.md](engineering/implementation.md)
- Context: The owner chose to add capabilities the package lacked, aiming at better outcomes. The
  evidence is in [implementation.md](engineering/implementation.md). D-008 and D-009 fixed the inventory
  at nine lifecycle entry points plus `spar` and `rubber-duck`, and the design required a
  demonstrated purpose before a new public entry.
- Decision: Add fifteen skills to the engineering package: `arena`, `swarm`, `interrogate`,
  `optimize-metric`, `figure-it-out`, `resume-work`, `reframe`, `sharpen`, `teach`, `reflect`,
  `no-comments`, `unslop`, `technical-writing`, `create-formal-verification-skill` and
  `maintain-formal-verification-skill`. A new skill is admitted when it has a distinct outcome, a
  distinct invocation, works when called on its own and has its own evidence. These skills are
  user-invoked: every skill carries frontmatter `disable-model-invocation: true`, which
  Claude Code, Pi, Antigravity and Copilot CLI read, and `agents/openai.yaml` with
  `policy.allow_implicit_invocation: false`, which Codex reads. Grok Bot's handling of the flag is
  unverified. The lifecycle skills stay model-invocable and may point to the new skills by
  relative link. Each skill is host-neutral, follows the existing authority rules and names no
  fixed models. The repository and the package
  carry an MIT license held by LaChimere. The formal-verification skills ship as conditional
  methods, not lifecycle gates.
- Alternatives rejected: Model-invoked descriptions for the new skills, because several of them run
  multiple agents at real cost, and a user-invoked skill adds no context to every turn.
- Consequences: Supersedes the fixed inventory in D-008 and D-009, the design rule that a new
  public entry needs a prior demonstrated purpose, and the rule that formal verification exercise
  maintenance after a relevant change before a reusable generator is proposed. The other
  consequences of D-008 and D-009 stand, and so do the design's conditions for a new shared
  resource or state mechanism.
  Distribution tests list model-invoked and user-invoked skills separately and check both
  manual-invocation settings, the package license and the absence of Cursor-only names and model
  slugs. The manual-invocation metadata alone controls invocation where a host's skill loader
  reads it; a file-backed workflow that reads `SKILL.md` directly does not enforce it. Personal
  host guidance in `config/` is unchanged, because explicit invocation and `resume-work` recall
  worked without it and an always-loaded note would add context to every turn. One lifecycle
  pointer is kept: `release-and-rollout` points PR descriptions to `technical-writing`, on a 3 of 3
  read rate and fewer hits of that skill's own writing rules; a blind ranking showed no clear
  quality gain in English. The owner kept it on 2026-11-28 because PR descriptions that follow the
  owner-approved writing rules are the goal, so a missing English quality gain is no reason to
  revert it. The other measured pointers were never followed and were reverted.
- Evidence: `evals/tests/distribution.test.ts`; Claude Code runs recorded in
  [implementation.md](engineering/implementation.md) (2026-11-28 section).
