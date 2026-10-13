# Decisions

Settled decisions for contributions to `agent-coding`. Reviews check whether a change overturns one; overturning needs an explicit new decision that supersedes the old entry. Format follows the `global-agent-rules` skill (`references/project-docs.md`).

## D-001: AGENTS.md files are routing-only

- Date: 2026-10-13
- Status: accepted
- Context: The global `config/codex/AGENTS.md` and the root `AGENTS.md` had grown into long rule lists loaded for every task.
- Decision: Both are routing tables ("before X, read Y"). The global file keeps only Communication and Authority rules; detailed rules live in skills and `docs/`.
- Alternatives rejected: Keep full rules inline: every task loads every rule, and the files keep growing.
- Consequences: Rules must be reachable through a routing row; a missing routed plugin triggers the conservative fallback in `config/codex/AGENTS.md`.
- Links: [PR #11](https://github.com/LaChimere/agent-coding/pull/11), [missing-plugin thread](https://github.com/LaChimere/agent-coding/pull/11#discussion_r4256527565), [review](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183)

## D-002: Lessons are kept per project in docs/lessons.md

- Date: 2026-10-13
- Status: accepted
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
- Consequences: pr-review recommendations name the reviewed SHA; see `global-agent-rules` `references/git-publication.md`.
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
- Status: accepted
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
- Links: [Codex: package your plugin](https://developers.openai.com/plugins/build/plugins), [Codex plugin.json spec](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/plugin-creator/references/plugin-json-spec.md), [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
