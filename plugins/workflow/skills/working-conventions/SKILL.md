---
name: working-conventions
description: Global engineering conventions that a routing-only AGENTS.md points to. Read the reference named by the routing table before implementation, verification, Git publication, delegation and review, polling or triage, stateful or remote work, continuation, or creating and maintaining a project's docs, lessons, decisions and retrospectives.
---

# Purpose

Hold the detailed working rules that a global or project `AGENTS.md` routes to, so instruction
files stay short. Each reference owns one phase. Read only the reference for the current task or
phase; do not import unrelated steps or deliverables.

Explicit user instructions, more specific `AGENTS.md` files and project docs override these
defaults within system, developer and tool constraints. Communication and authorization rules stay
in the caller's `AGENTS.md`; these references never widen authority.

# Routing

| Before you | Read |
|---|---|
| Edit code or other implementation artifacts | [references/implementation.md](references/implementation.md) |
| Add or change tests, validate, report results or judge CI | [references/verification.md](references/verification.md) |
| Commit, push, open or update a PR, merge, or recover from a Git failure | [references/git-publication.md](references/git-publication.md) |
| Delegate, choose a role or model, take over a worker, or run or integrate a review | [references/delegation-review.md](references/delegation-review.md) |
| Poll or triage issues, CI runs, alerts or similar queues | [references/triage.md](references/triage.md) |
| Run multi-step shell or SSH work that changes state | [references/stateful-remote.md](references/stateful-remote.md) |
| Continue earlier work or rely on a tool, model or host capability | [references/capability-boundaries.md](references/capability-boundaries.md) |
| Create or change a project's `AGENTS.md`, `docs/`, lessons, decisions or retrospective | [references/project-docs.md](references/project-docs.md) |

# Templates

Copy these into a project when it adopts the project-docs convention; resolve paths relative to
this skill directory.

- [templates/AGENTS.md](templates/AGENTS.md): routing-only project `AGENTS.md`
- [templates/docs/README.md](templates/docs/README.md): project docs index
- [templates/docs/lessons.md](templates/docs/lessons.md): lessons log
- [templates/docs/decisions.md](templates/docs/decisions.md): decision record
