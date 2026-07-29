# AGENTS.md

## Purpose

This file governs contributions to the **`agent-coding` repository itself**.

It is **not** the portable coordination contract for downstream skills or downstream repositories. Cross-skill workflow coordination now lives in:

- `skills/workflow-orchestrator/SKILL.md`
- `skills/workflow-orchestrator/references/approval-gates.md`
- `skills/workflow-orchestrator/references/worker-routing.md`
- `skills/workflow-orchestrator/references/workflow-contract.md` (compatibility index)
- `skills/workflow-orchestrator/templates/`

## Repository model

- `skills/` contains the reusable skills shipped by this repo.
- `evals/` contains the central repository-maintenance corpus; it is never distributed with skills.
- `tools/skill-evals/` contains the provider-neutral validation, snapshot, grading, aggregation, and suite tooling.
- `skills/workflow-orchestrator/` is the portable coordination layer and owns the shared workflow contract plus planning templates.
- `plans/{slug}/` stores planning/execution artifacts for changes made **to this repository**.
- Repo-root `AGENTS.md` is for repo-specific contributor guidance only.
- Repo-root `templates/` should not exist; reusable templates belong with the skill that uses them.

## Distribution contract

- Users consume `skills/` only through copies installed by `npx skills add`.
- Running a skill from the repository source checkout is unsupported.
- Runtime references, templates, scripts, and platform adapters must be bundled under the skill that uses them and resolved relative to the installed skill directory.
- Skills documented as standalone must work when installed alone.
- Workflow-managed dependencies must be explicit and tested in their supported installed combinations.

## Working rules for this repo

- Prefer small, focused, reviewable changes.
- Do not mix unrelated cleanup into the same change.
- Back claims with repo evidence when behavior, docs, or workflow rules are changing.
- When changing portable workflow behavior, update `workflow-orchestrator` first and then align any affected worker skills.
- Worker skills in this repo should not cite repo-root `AGENTS.md` as their runtime coordination source.
- If a skill needs templates, reference docs, or helper scripts, bundle them under that skill's directory.
- Do not use repository-root runtime paths inside distributed skills.

## Documentation rules

- Update directly coupled docs in the same change.
- If you add, remove, or rename a skill, update `README.md`.
- If you change the shared workflow contract, update `workflow-orchestrator` and any planning docs that depend on it.
- Treat repo-root `AGENTS.md` as high-impact documentation for this repo, not as a global orchestration layer.

## Validation guidance

This repo does not have a single universal build/test pipeline.

Use the narrowest validation that matches the change:

- minimum structural check: `git diff --check`
- skill/eval structural check: `uv run --locked --project tools/skill-evals python tools/skill-evals/skill_evals.py validate --repo .`
- Python tests: use `uv run --locked --project tools/skill-evals pytest ...` as the primary runner; existing unittest-compatible tests may remain when pytest collects them correctly
- workflow changes: targeted skill/doc consistency review
- doc-only changes: consistency review of the affected skills/docs
- distributed skill changes: install the affected skill combinations through `npx skills add` and validate the installed copies

## Practical change map

- Changing cross-skill routing or approval/gate behavior -> update `skills/workflow-orchestrator/`
- Changing a worker skill's narrow behavior -> update that skill and keep it aligned with `workflow-orchestrator`
- Changing eval cases, fixtures, or classifications -> update `evals/<skill>/`, never `skills/<skill>/evals/`
- Changing trigger/composition suites -> update `evals/suites/`
- Changing harness contracts -> update `tools/skill-evals/` and its tests
- Changing repo contribution guidance -> update this `AGENTS.md`
- Changing planning artifact formats -> update `skills/workflow-orchestrator/templates/`
