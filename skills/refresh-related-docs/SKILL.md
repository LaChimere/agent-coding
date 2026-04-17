---
name: refresh-related-docs
description: Refresh documentation that has become stale after code changes, with explicit user approval before any edits. Use when tasks modify functionality, configuration, or interfaces that should be reflected in Markdown docs (including AGENTS.md, planning slugs, and other .md files). Also trigger when a milestone or feature is completed, behavior changes, or an API surface changes, even if the user did not mention docs. Always ask the user whether to update related docs before editing them, then preserve each document's existing tone and structure.
---

# Refresh Related Docs

## Operating context

This skill may be invoked at any point in the workflow — typically after execution or verification, when the agent notices that completed work has made existing documentation stale. It does not enter plan mode or require approval gates by itself; instead, it uses its own lightweight approval step (ask the user before editing any doc).

Because changes to `AGENTS.md` affect how this repository is maintained in future sessions, treat `AGENTS.md` edits with the same care as a code change to a shared module — always get explicit user approval even if the user gave blanket "update docs" permission.

## Overview

Keep documentation aligned with completed work while requiring explicit user approval before any doc edits. Treat all Markdown docs as potentially outdated and update only the ones related to the change, preserving each file's style.

## Non-negotiables

- Ask for user approval before editing any documentation.
- If the user declines or does not respond, skip doc edits and proceed with the task result.
- Treat all `.md` files (including `AGENTS.md`) as potentially outdated; prioritize only those related to the change.
- Preserve each document's tone, headings, formatting, and organization; make minimal, targeted edits.
- Update docs only to reflect confirmed changes; do not invent features or rewrite unrelated sections.

## Repo-specific doc structure

Adopting projects typically have a layered documentation layout; know which layer you are touching:

- `docs/` (if present) — canonical design documents and API specs. These are the source of truth for product semantics.
- `plans/{slug}/` — planning slugs (`research.md`, `design.md`, `plan.md`, `todo.md`). These carry execution constraints derived from the canonical design, not the design itself.
- `AGENTS.md` — the repo-local contributor guidance for agents working on this repository. Changes here affect how future maintenance work is performed.
- `README.md`, runbooks, and feature-specific guides.

When a change touches product semantics and `docs/` exists, update `docs/` first. When a change only affects execution constraints or decomposition, update `plans/` only. Do not let planning slug edits silently diverge from the canonical design.

## Workflow

### 1) Detect doc-worthy changes

- Trigger when a milestone or feature is completed, behavior changes, configuration changes, or any API surface changes (endpoints, request/response fields, parameters, error codes, examples).
- Trigger even if the user didn't mention docs; ask once when the work meaningfully changes expected behavior or usage.

### 2) Find related docs

- Start with the repo's entry points: `docs/` (if present), `plans/{slug}/`, `AGENTS.md`, `README.md`.
- Search for names of changed features, endpoints, config keys, or files to identify related `.md` files.
- Build a concise candidate list; prefer fewer, relevant docs over broad, noisy updates.

### 3) Ask for approval

- Summarize the change in 1-3 bullets and list the docs you plan to update.
- Ask for explicit approval (single yes/no) before touching any doc.
- Offer an easy way to adjust the list (add/remove files).
- If the user already asked to update docs, treat that as approval but still confirm the target file list.

### 4) Update with style preservation (only after approval)

- Open each approved document and mirror its existing structure:
  - Keep heading hierarchy, bullet style, voice, and formatting conventions.
  - Prefer editing existing sections over adding new ones.
  - Update examples, parameters, and expected outputs to match the change.
- Keep edits minimal and directly tied to the confirmed change.
- After editing `plans/` files, grep the corresponding `docs/` canonical doc (if one exists) to confirm the edit is consistent; flag any drift.

### 5) Report updates

- List the documents updated and summarize the changes.
- Call out any uncertainties or doc gaps and ask follow-up questions if needed.

## Gotchas

- **Don't touch docs under active external review.** If a canonical design doc is currently out for review, do not edit it unless the user explicitly says so. Edits during review can cause merge conflicts or silently override reviewer feedback.
- **Don't let `plans/` and `docs/` drift.** A common failure is updating a planning slug without checking whether the canonical design doc still says the same thing, or vice versa. Always cross-check after editing either layer.
- **Don't rewrite tone.** It is easy to accidentally homogenize a doc's voice when making targeted edits. Read a few paragraphs around your edit site before writing so you match the existing style.
- **Don't expand scope.** When detecting doc-worthy changes, resist the urge to also fix unrelated stale sections you notice. Only touch what the current change requires; file the rest as follow-up.
- **`AGENTS.md` is high-impact.** Changes to `AGENTS.md` affect how future agent sessions maintain this repo. Treat it with the same care as a code change to a shared module.
