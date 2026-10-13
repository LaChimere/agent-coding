# Contributing

Written for humans and agents contributing to `agent-coding`. Routed from the root [AGENTS.md](../AGENTS.md).

## Working rules

- Prefer small, focused, reviewable changes.
- Do not mix unrelated cleanup into the same change.
- Back claims with repo evidence when behavior, docs, or workflow rules are changing.
- Keep each skill independently usable; align directly affected skills without introducing a shared coordinator or lifecycle contract.
- Distributed skills should not cite repo-root `AGENTS.md` as a runtime instruction source.
- If a skill needs templates, reference docs, or helper scripts, bundle them under that skill's directory.
- Do not use repository-root runtime paths inside distributed skills.

## Documentation rules

- Update directly coupled docs in the same change.
- If you add, remove, or rename a skill, update `README.md`.
- If you retire a skill or change its scope, update active references and affected evaluation cases while preserving historical evidence.
- Treat repo-root `AGENTS.md` and the contributor docs it routes to as high-impact documentation for this repo, not as a global orchestration layer.

## Change map

- Changing a specialist's scope or methods -> update that skill and directly affected references/cases
- Changing eval cases, fixtures, or classifications -> update `evals/cases/` and `evals/fixtures/`, never runtime skill directories
- Changing trigger/composition coverage -> update the relevant cases and their declared requirements under `evals/cases/`
- Changing harness contracts -> update `evals/src/` and `evals/tests/`; see [evals/README.md](../evals/README.md) and [evaluation/design.md](evaluation/design.md)
- Changing repo contribution guidance -> update the owning page under `docs/` and, if routing changes, the root `AGENTS.md` table
- Changing a user-requested engineering artifact -> update its owning skill only if that format is part of the skill's purpose
- Changing a plugin -> update `plugins/<plugin>/`, its affected central cases in `evals/cases/`, and native marketplace/docs when needed
