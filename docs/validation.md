# Validation

Written for humans and agents contributing to `agent-coding`. Routed from the root [AGENTS.md](../AGENTS.md).

This repo does not have a single universal build/test pipeline.

Use the narrowest validation that matches the change:

- minimum structural check: `git diff --check`
- eval corpus structural check: `(cd evals && bun run start -- validate)`
- framework checks: `(cd evals && bun run check && bun run test:coverage && bun run build)`; these local checks do not run model evaluations
- workflow changes: targeted skill/doc consistency review
- doc-only changes: consistency review of the affected skills/docs
- distributed skill changes: validate installed snapshot copies through `npx skills add`; plugin-owned changes also need actual isolated marketplace installation. Neither structural checks nor snapshot copies prove host discovery.
- Plugin changes: run `(cd evals && bun test tests/distribution.test.ts)` (it also checks that every skill named in a plugin manifest exists as a skill directory with a matching `SKILL.md`), validate native manifests, and verify isolated installation/update, source identity and discovery in each supported CLI. Required model invocation, behavioral evaluation and orchestration-effectiveness acceptance use Codex. Claude Code and Copilot CLI remain compatible distribution targets without an effectiveness guarantee; model evaluations for them require an explicit request. Record CLI versions and distinguish installation, discovery, invocation and optional capability coverage. App/IDE/cloud compatibility needs separate evidence when claimed; it is not a gate for this repository-only working-tree delivery. Do not switch production installs or copy credentials as part of validation.
