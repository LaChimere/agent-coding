---
name: refresh-related-docs
description: Refresh Markdown documentation when evidence shows completed behavior, configuration, interfaces, or workflow guidance made it stale. Explicitly named document targets are already approved; ask only before adding newly discovered or expanded scope. Preserve each document's existing tone and structure.
---

# Refresh Related Docs

## Operating context

This skill operates within the workflow coordinated by `workflow-orchestrator` and its bundled framework contract.

Use the active installed `workflow-orchestrator` handoff for broader workflow or planning documentation. Invoke it only when phase or approval is unresolved. Do not rely on repository-source paths.

This skill may be invoked after evidence shows documentation is stale. It does not enter plan mode. Its lightweight approval rule applies only to targets not already named by the user or approved workflow.

Because changes to `AGENTS.md` affect future maintenance, a blanket "update docs" request does not automatically include it. A request that explicitly names `AGENTS.md` and the intended change is approval for that scope.

## Overview

Keep documentation aligned with confirmed work. Search narrowly for related documents, preserve each file's style, and avoid approval loops for targets the user already named.

## Non-negotiables

- Treat explicitly named document targets as approved for the stated purpose.
- Ask before editing newly discovered files, unrelated sections, or an expanded documentation set.
- If the user declines or does not respond, skip doc edits and proceed with the task result.
- Preserve each document's tone, headings, formatting, and organization; make minimal, targeted edits.
- Update docs only to reflect confirmed changes; do not invent features or rewrite unrelated sections.

## Discover the documentation structure

Determine the repository's documentation authority from its contributor guidance, links, directory structure, and existing references. Common surfaces include:

- a project-specific documentation directory such as `docs/` or `documentation/`
- `plans/{slug}/` — planning slugs (`research.md`, `design.md`, `plan.md`, `todo.md`). These carry execution constraints derived from the canonical design, not the design itself.
- `AGENTS.md` — the repo-local contributor guidance for agents working on this repository. Changes here affect how future maintenance work is performed.
- `README.md`, runbooks, and feature-specific guides.

Do not assume a directory is canonical merely because it is named `docs/`. When a change affects product semantics, update the repository's actual authority. When it affects only execution status, update the plan surface only.

## Workflow

### 1) Detect doc-worthy changes

- Trigger when confirmed changes affect documented behavior, usage, configuration, interfaces, examples, or maintenance workflow.
- Do not trigger for internal-only refactors that cannot make user or contributor documentation stale.

### 2) Find related docs

- Discover the repo's documentation entry points before selecting targets.
- Search from changed feature names, endpoints, config keys, commands, or public identifiers.
- Build a concise candidate list; prefer fewer, relevant docs over broad, noisy updates.

### 3) Ask for approval

- Summarize the change in 1-3 bullets and list the docs you plan to update.
- Separate already approved named targets from newly discovered candidates.
- Ask one focused question only for the new or expanded candidates.
- For a high-impact candidate such as `AGENTS.md`, show the specific proposed change and why it is related before asking.
- If the user declines a candidate, leave it untouched and report the deferral.
- If approval is declined or absent, still report the underlying task result and identify which documentation remains stale.

### 4) Update with style preservation (only after approval)

- Open each approved document and mirror its existing structure:
  - Keep heading hierarchy, bullet style, voice, and formatting conventions.
  - Prefer editing existing sections over adding new ones.
  - Update examples, parameters, and expected outputs to match the change.
- Keep edits minimal and directly tied to the confirmed change.
- After editing planning files, cross-check the repository's corresponding canonical product or design document when one exists; flag any drift.

### 5) Report updates

- List the documents updated and summarize the changes.
- Call out any uncertainties or doc gaps and ask follow-up questions if needed.

## Gotchas

- **Don't touch docs under active external review.** If a canonical design doc is currently out for review, do not edit it unless the user explicitly says so. Edits during review can cause merge conflicts or silently override reviewer feedback.
- **Don't let plans and canonical docs drift.** When the repository has a separate product/design authority, cross-check it after changing related planning constraints.
- **Don't rewrite tone.** It is easy to accidentally homogenize a doc's voice when making targeted edits. Read a few paragraphs around your edit site before writing so you match the existing style.
- **Don't expand scope.** When detecting doc-worthy changes, resist the urge to also fix unrelated stale sections you notice. Only touch what the current change requires; file the rest as follow-up.
- **`AGENTS.md` is high-impact.** A broad docs request does not include it automatically; an explicitly named `AGENTS.md` change is approved only for the stated purpose.
