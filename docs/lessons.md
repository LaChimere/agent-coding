# Lessons

Recurring pitfalls in this repository's prompts, skills, plugins and evals themselves. Format and
promotion rules follow the `global-agent-rules` skill (`references/project-docs.md`).

- Each entry has a rule, reason, evidence links and an occurrence count.
- When a pitfall recurs, increment its count and add the evidence link; do not duplicate the entry.
- At **3 occurrences**, promote the rule into the owning skill or this repo's docs, add a case under
  `evals/cases/` that catches it, and mark the entry promoted with links to both.
- Retrospective cadence: weekly by default.

## L-001: Create the ignored evals cache before running distribution tests

- Rule: In a fresh checkout, create `evals/.cache/` (ignored) before `bun test tests/distribution.test.ts`.
- Reason: The test calls `mkdtemp` under `evals/.cache/` and fails with `ENOENT` when it is missing, which looks like a plugin-distribution regression but is a local-environment gap.
- Evidence: branch `lachimere/routing-conventions` (PR adding routing conventions), local run on 2026-10-13: 2 fail on unmodified `main`, 3 pass after `mkdir -p evals/.cache`.
- Occurrences: 1
- Status: active

## L-002: Use hidden-aware search when verifying a rename

- Rule: Check renames with `rg --hidden -g '!.git'` (or `rg -uu`), not plain `rg`.
- Reason: Plain `rg` skips hidden directories such as `.codex-plugin/` and `.claude-plugin/`, so a rename check reported no matches while both workflow manifests still named `working-conventions`.
- Evidence: [PR #11 review, MAJOR-01](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183); fix commit `7071aaf`.
- Occurrences: 1
- Status: active; follow-up planned for the next PR: a distribution test that every skill referenced in plugin manifests exists.
