---
name: refresh-related-docs
description: Refresh repository Markdown made stale by completed behavior, configuration, interfaces, or workflow changes. Update related documents directly, including discovered files and repository AGENTS.md, while preserving explicit user exclusions and each document's style.
---

# Refresh Related Docs

## Scope

As part of authorized implementation or a request to refresh documentation, update the related stale Markdown directly. No separate user approval is needed for each file or newly discovered related document. Named files are starting points, not a closed list unless the user explicitly limits the scope.

Repository `AGENTS.md` and other contributor guidance follow the same rule: bring them into agreement with the established behavior or workflow. Refreshing documentation is not permission to invent new governance rules, change implementation, relax a safety requirement, or rewrite approved design and scope to fit an unauthorized change. Updating a repository copy does not authorize synchronizing global agent configuration or files outside the task repository.

Respect explicit limits such as “only this section,” “leave that file alone,” and a declined edit. Preserve unrelated user changes. For “find,” “assess,” “list stale docs,” or an explicitly read-only request, inspect and report without writing or adding a routine approval question. Host write restrictions still apply.

Use the user's request, accepted native proposal and explicit revisions, or existing living `plan.md` to resolve the task. No formatted handoff, new plan or orchestrator round is needed for a clear documentation refresh. Consult the installed `workflow-orchestrator` only for real phase or scope ambiguity, never through repository-source paths.

## Find the right documents

Confirm what actually changed from source, configuration, tests or recorded implementation evidence. Skip internal-only changes that no user- or contributor-facing document describes; report the no-op rather than inventing staleness.

Follow the repository's documentation authority: contributor guidance, links and migration/deprecation notices. A directory named `docs/` is not automatically canonical.

Search from changed public names, commands, flags, config keys and interfaces. Inspect a small relevant set: guides, `README.md`, runbooks, repository `AGENTS.md`, and an existing living plan when its progress or evidence needs updating. Leave unrelated stale content as a follow-up.

## Refresh and verify

Read the surrounding paragraphs and update only the affected statements, examples, parameters and outputs. Preserve heading hierarchy, voice and formatting; prefer correcting existing text over adding a new section.

Check each correction against the implementation evidence and inspect the diff for unrelated edits. Follow applicable documentation checks; do not claim code tests ran when only documentation consistency was checked. For planning artifacts, preserve approved scope and design decisions while updating execution facts. If evidence conflicts or a correction would require a new product or policy decision, report that specific unresolved question instead of guessing.

## Report

Summarize the files updated, the changes made and the checks actually performed. List any explicit exclusions, evidence gaps or remaining unrelated staleness with their reasons. Report the underlying task result even when no documentation needed changing. Do not ask for retroactive approval of completed in-scope refreshes.
