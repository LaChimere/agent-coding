# Lessons

Recurring pitfalls in this repository's prompts, skills, plugins and evals themselves. Format and
promotion rules follow the `working-conventions` skill (`references/project-docs.md`).

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
