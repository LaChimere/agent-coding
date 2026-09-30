---
name: refresh-related-docs
description: Refresh Markdown made stale by established behavior, configuration, interfaces or repository practices. Update directly related documents while respecting exclusions and their existing style.
---

# Find the affected documents

Ground corrections in source, configuration, tests or actual implementation evidence. Follow the
repository's documentation authority, links and deprecation notices; a docs directory is not
automatically canonical. Search changed public names, commands, flags and interfaces. Read the
relevant guides, README, runbooks and contributor instructions. Internal changes that no document
describes may need no documentation update.

Distinguish documentation of current behavior from accepted design decisions, proposals and
historical observations. New code alone does not establish that an approved contract has changed
or that a proposal is now implemented. If sources disagree, identify the document's purpose and
authority before calling it stale; report an unresolved discrepancy instead of rewriting the
approved design or scope to fit an unauthorized implementation.

# Refresh and verify

During authorized implementation or a documentation-refresh request, correct related stale
Markdown directly, including newly discovered related files and repository AGENTS.md. Preserve
explicit file/section exclusions, established terminology, heading structure and unrelated edits.
Use the existing request and implementation evidence.

Read surrounding paragraphs and correct affected statements, examples, commands, parameters and
outputs in place. Prefer an existing relevant section over adding another account of the same
behavior. Check directly related links and references when names or interfaces changed. Leave
unrelated stale content as a separately reported follow-up; do not turn a focused refresh into
repository-wide cleanup.

Read-only requests such as find, assess or list stale docs return findings without writing.
Documentation refresh grants no authority to change product behavior, invent governance, weaken
safety, synchronize global configuration or touch files outside the authorized boundary.

Check each correction against the established behavior and inspect the diff for unrelated changes.
If evidence conflicts or a correction requires a product decision, report that specific question.
Run applicable documentation checks and state their scope; a consistency check is not evidence
that runtime tests ran. Return changed files, the corrected behavior and relevant evidence.
Report explicit exclusions, unresolved evidence gaps and remaining relevant discrepancies, with
their reasons. Distinguish unrelated follow-ups from incomplete in-scope work. When no document
needs changing, report that result without inventing staleness or a new document.
