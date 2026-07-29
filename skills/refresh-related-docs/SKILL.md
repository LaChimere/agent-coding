---
name: refresh-related-docs
description: Refresh Markdown documentation when evidence shows completed behavior, configuration, interfaces, or workflow guidance made it stale. Explicitly named document targets are already approved; ask only before adding newly discovered or expanded scope. Preserve each document's existing tone and structure.
---

# Refresh Related Docs

## Classify targets before editing

**Hard stop:** never edit a newly discovered `AGENTS.md` in the same turn that proposes it. End that branch after the concrete proposal and approval question; edit only after a later explicit approval.

Before any edit, sort each target:

- **Named or already approved** — the user or an active approved workflow named this document and the change. Edit it for exactly that stated purpose; do not re-ask.
- **Newly discovered or expanded** — anything you found yourself, an unrelated section, or a wider set than requested. Ask one focused approval question first, then edit only what is approved.

When stopping for that approval, include both:

```text
Proposed change: <file + exact old value -> new value, and why>
Approval needed: update <file> for <stated reason>?
```

Saying only "deferred", "pending approval", or "high impact" is incomplete. Do not finish that branch until the concrete old-to-new proposal and direct approval question are present.

Rules that never bend:

- A blanket "update the docs" or "update all docs" request never includes `AGENTS.md`. It is high-impact contributor guidance: show the specific proposed change and its maintenance impact, then ask. A request naming `AGENTS.md` approves only the change it states.
- A declined target stays untouched. Record the deferral and do not ask again.
- Silence or no response is not approval.
- A document under active external review is off limits unless the user explicitly names it; editing it can override reviewer feedback.

## Inspection is not authorization

"Find", "assess", or "list stale docs" is a report request. Return the candidate list and what is stale in each, end with the proposed-change/approval-needed form above, and make no edits until answered. Edit unasked only when the user also asked to update, or an approved workflow already covers those files.

## Scope

Runs after confirmed work makes documentation stale. Never enter plan mode or produce plan artifacts. Consume the active installed `workflow-orchestrator` handoff only when phase or approval is unresolved; never rely on repository-source paths.

Skip entirely for internal-only changes no user- or contributor-facing document describes; report the no-op instead of opening an approval loop.

## Find the right documents

Determine the repository's real documentation authority from contributor guidance, links, and existing references. Do not assume a directory is canonical because it is named `docs/`; a deprecation notice or pointer elsewhere overrides the name.

Search from what actually changed: feature names, endpoints, config keys, commands, public identifiers. Build a short candidate list; prefer few relevant documents over broad, noisy ones. Common surfaces: the documentation directory, `README.md`, runbooks and guides, `plans/{slug}` artifacts (execution constraints only, never product design), and `AGENTS.md`.

## Propose, then update

Summarize the change in 1-3 bullets and list the documents you intend to touch, separating approved targets from new candidates. Ask one question covering only the new candidates.

In each approved document, mirror its heading hierarchy, bullet style, and voice; read the paragraphs around the edit site first so you do not homogenize its tone. Prefer editing an existing section over adding one. Update only the examples, parameters, and outputs this change affects; file unrelated staleness as follow-up. After editing planning files, cross-check the canonical design document and flag drift.

## Report

List the documents updated, deferred, and still stale. Report the underlying task result even when doc edits were declined or absent. Raise remaining gaps as follow-up questions rather than acting on them.

Before sending the final response:

- If a newly discovered `AGENTS.md` lacks approval, include the literal labels `Proposed change:` and `Approval needed:`, then stop that branch.
- List every declined or unapproved target under deferred or still stale, with its path and reason.
