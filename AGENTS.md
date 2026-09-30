# AGENTS.md

## Purpose

This file governs contributions to the **`agent-coding` repository itself**.

It is **not** a portable coordination contract for downstream repositories. Goal and plan handling
belong to the consuming agent harness. Each distributed skill supplies its own engineering
methods and task-specific constraints.

## Repository model

- `skills/` contains standalone skills; the four workflow specialists live under `plugins/workflow/skills/`.
- `plugins/` contains shared plugin skills with native distribution for Codex CLI, Claude Code and GitHub Copilot CLI.
- `evals/` contains the Bun/TypeScript Codex evaluation framework, central cases, fixtures and versioned profiles; it is never distributed with skills. Follow its local `AGENTS.md` and frozen quality baseline.
- `plugins/workflow/` contains independent quality, PR structure and documentation skills. An optional engineering-design template is bundled with its consuming skill.
- This repository does not keep a root `plans/` directory or task slugs. Use the authorized conversation for maintenance scope and `evals/out/` for new generated evaluation evidence. Historical `.skill-evals/` evidence and user-requested engineering documents remain unchanged; eval fixtures are task inputs, not runtime conventions.
- Repo-root `AGENTS.md` is for repo-specific contributor guidance only.
- Repo-root `templates/` should not exist; reusable templates belong with the skill that uses them.

## Distribution contract

- Users consume root `skills/` through copies installed by `npx skills add`; plugin-owned skills are
  consumed as complete plugins. Codex uses `.agents/plugins/marketplace.json`; Claude Code and
  Copilot CLI share `.claude-plugin/marketplace.json`. Keep one runtime skill tree per plugin and
  synchronize common metadata and versions across its native manifests.
- Manually invoking a skill from an unregistered source checkout is unsupported. A native plugin manager may live-load a registered local marketplace; validate that path against an isolated candidate copy.
- Runtime references, templates, scripts, and platform adapters must be bundled under the skill that uses them and resolved relative to the installed skill directory.
- Skills documented as standalone must work when installed alone.
- Skill dependencies must be task-specific, explicit and tested in their supported installed combinations.

## Working rules for this repo

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
- Treat repo-root `AGENTS.md` as high-impact documentation for this repo, not as a global orchestration layer.

## Validation guidance

This repo does not have a single universal build/test pipeline.

Use the narrowest validation that matches the change:

- minimum structural check: `git diff --check`
- eval corpus structural check: `(cd evals && bun run start -- validate)`
- framework checks: `(cd evals && bun run check && bun run test:coverage && bun run build)`; these local checks do not run model evaluations
- workflow changes: targeted skill/doc consistency review
- doc-only changes: consistency review of the affected skills/docs
- distributed skill changes: validate installed snapshot copies through `npx skills add`; plugin-owned changes also need actual isolated marketplace installation. Neither structural checks nor snapshot copies prove host discovery.
- Plugin changes: run `(cd evals && bun test tests/distribution.test.ts)`, validate native manifests, and verify isolated installation/update, source identity and discovery in each supported CLI. Required model invocation, behavioral evaluation and orchestration-effectiveness acceptance use Codex. Claude Code and Copilot CLI remain compatible distribution targets without an effectiveness guarantee; model evaluations for them require an explicit request. Record CLI versions and distinguish installation, discovery, invocation and optional capability coverage. App/IDE/cloud compatibility needs separate evidence when claimed; it is not a gate for this repository-only working-tree delivery. Do not switch production installs or copy credentials as part of validation.

## Practical change map

- Changing a specialist's scope or methods -> update that skill and directly affected references/cases
- Changing eval cases, fixtures, or classifications -> update `evals/cases/` and `evals/fixtures/`, never runtime skill directories
- Changing trigger/composition coverage -> update the relevant cases and their declared requirements under `evals/cases/`
- Changing harness contracts -> update `evals/src/` and `evals/tests/`; see `evals/README.md` and `docs/evaluation/design.md`
- Changing repo contribution guidance -> update this `AGENTS.md`
- Changing a user-requested engineering artifact -> update its owning skill only if that format is part of the skill's purpose
- Changing a plugin -> update `plugins/<plugin>/`, its affected central cases in `evals/cases/`, and native marketplace/docs when needed
