# AGENTS.md

## Purpose

This file governs contributions to the **`agent-coding` repository itself**.

It is **not** the portable coordination contract for downstream skills or downstream repositories. Cross-skill workflow coordination now lives in:

- `skills/workflow-orchestrator/SKILL.md`
- `skills/workflow-orchestrator/references/workflow-contract.md`
- `skills/workflow-orchestrator/templates/`

## Repository model

- `skills/` contains the reusable skills shipped by this repo.
- `skills/workflow-orchestrator/` is the portable coordination layer and owns the shared workflow contract plus planning templates.
- `plans/{slug}/` stores planning/execution artifacts for changes made **to this repository**.
- Repo-root `AGENTS.md` is for repo-specific contributor guidance only.
- Repo-root `templates/` should not exist; reusable templates belong with the skill that uses them.

## Working rules for this repo

- Prefer small, focused, reviewable changes.
- Do not mix unrelated cleanup into the same change.
- Back claims with repo evidence when behavior, docs, or workflow rules are changing.
- When changing portable workflow behavior, update `workflow-orchestrator` first and then align any affected worker skills.
- Worker skills in this repo should not cite repo-root `AGENTS.md` as their runtime coordination source.
- If a skill needs templates, reference docs, or helper scripts, bundle them under that skill's directory.

## Documentation rules

- Update directly coupled docs in the same change.
- If you add, remove, or rename a skill, update `README.md`.
- If you change the shared workflow contract, update `workflow-orchestrator` and any planning docs that depend on it.
- Treat repo-root `AGENTS.md` as high-impact documentation for this repo, not as a global orchestration layer.

## Validation guidance

This repo does not have a single universal build/test pipeline.

Use the narrowest validation that matches the change:

- minimum structural check: `git diff --check`
- workflow changes: targeted skill/doc consistency review
- doc-only changes: consistency review of the affected skills/docs

## Practical change map

- Changing cross-skill routing or approval/gate behavior -> update `skills/workflow-orchestrator/`
- Changing a worker skill's narrow behavior -> update that skill and keep it aligned with `workflow-orchestrator`
- Changing repo contribution guidance -> update this `AGENTS.md`
- Changing planning artifact formats -> update `skills/workflow-orchestrator/templates/`
