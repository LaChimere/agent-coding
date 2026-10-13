# Lessons

Recurring pitfalls in this repository's prompts, skills, plugins and evals themselves. Format and
promotion rules follow the `global-agent-rules` skill (`references/project-docs.md`).

- Each entry has a rule, reason, evidence links and an occurrence count.
- When a pitfall recurs, increment its count and add the evidence link; do not duplicate the entry.
- At **3 occurrences**, promote the rule into the owning skill or this repo's docs, add a case under
  `evals/cases/` that catches it, and mark the entry promoted with links to both.
- Retrospective cadence: weekly by default.

## L-001: Tests must not depend on an untracked evals cache directory

- Rule: Test scratch directories under `evals/.cache/` are created by the test preload (`evals/tests/setup.ts`, wired in `evals/bunfig.toml`); do not rely on a manual `mkdir`.
- Reason: Tests call `mkdtemp` under `evals/.cache/` and failed with `ENOENT` in a fresh checkout, which looked like a plugin-distribution regression but was a local-environment gap.
- Evidence: branch `lachimere/routing-conventions`, local run on 2026-10-13: 2 fail on unmodified `main`, 3 pass after `mkdir -p evals/.cache`; recurred in the PR #12 worktree.
- Occurrences: 2
- Status: resolved by the test preload; a fresh worktree passes `bun run test` without creating the directory.

## L-002: Use hidden-aware search when verifying a rename

- Rule: Check renames with `rg --hidden -g '!.git'` (or `rg -uu`), not plain `rg`.
- Reason: Plain `rg` skips hidden directories such as `.codex-plugin/` and `.claude-plugin/`, so a rename check reported no matches while both workflow manifests still named `working-conventions`.
- Evidence: [PR #11 review, MAJOR-01](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183); fix commit `7071aaf`.
- Occurrences: 1
- Status: active; enforced by the `manifests reference only existing skills` case in `evals/tests/distribution.test.ts`, which fails when a plugin manifest names a skill (kebab-case or `$skill`) that has no `skills/<name>/SKILL.md` in that plugin. Hidden-aware search is still required for renames outside manifests.
