# Repository model and distribution

Written for humans and agents contributing to `agent-coding`. Routed from the root [AGENTS.md](../AGENTS.md).

## Purpose

The root `AGENTS.md` and the docs it routes to govern contributions to the **`agent-coding` repository itself**.

It is **not** a portable coordination contract for downstream repositories. Goal and plan handling
belong to the consuming agent harness. Each distributed skill supplies its own engineering
methods and task-specific constraints.

## Repository model

- `skills/` contains standalone skills; the four workflow specialists live under `plugins/workflow/skills/`.
- `plugins/` contains shared plugin skills with native distribution for Codex CLI, Claude Code and GitHub Copilot CLI.
- `evals/` contains the Bun/TypeScript Codex evaluation framework, central cases, fixtures and versioned profiles; it is never distributed with skills. Follow its local `AGENTS.md` and frozen quality baseline.
- `plugins/workflow/` contains independent quality, commit structure and documentation skills. An optional engineering-design template is bundled with its consuming skill.
- This repository does not keep a root `plans/` directory or task slugs. Use the authorized conversation for maintenance scope and `evals/out/` for new generated evaluation evidence. Historical `.skill-evals/` evidence and user-requested engineering documents remain unchanged; eval fixtures are task inputs, not runtime conventions.
- Repo-root `AGENTS.md` is for repo-specific contributor guidance only, as a routing table into `docs/`.
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
