---
name: workflow-orchestrator
description: Determine the next workflow phase or repair workflow state when approval or the primary worker is unresolved. Use for ambiguous multi-phase requests or explicit phase coordination. Do not use for direct execution of an approved plan, explicit PR decomposition, parallel ownership planning, atomicity assessment, documentation refresh, or image scanning.
---

# Purpose

Decide the next workflow step and hand it off. This skill routes; it does not implement.

It decides which phase applies now, which `plans/{slug}` artifacts must exist, which worker skill acts next, and when to stop for approval or missing information.

# Use this skill when

- The correct next skill is not obvious, or the work may need planning, execution, recovery, review, or doc refresh in sequence
- The user asks how the installed skills should cooperate, or wants slug artifacts created before work continues
- Approval state or the primary worker is unresolved

# Do not use this skill when

- The right worker is already obvious and the user asked for that narrower workflow
- The task is a tiny one-off edit needing no artifacts or cross-skill coordination

# Reference material

Read a reference only when the trigger below applies. Do not load them by default.

| Read | When |
|---|---|
| `references/approval-gates.md` | Deciding whether a gate, approval, landing mode, fast path, or verification level blocks the next step |
| `references/worker-routing.md` | Choosing between workers, defining companion boundaries, or handling an unavailable worker |
| `references/workflow-contract.md` | A caller asks for the legacy contract index |

Repo-local `AGENTS.md` supplies project-specific rules only (validation commands, ownership notes, doc expectations). It is not the orchestration contract.

Use this skill's bundled `templates/` to create missing artifacts; the repo-local `plans/{slug}` files are the runtime truth after creation.

# Procedure

## 1) Classify from evidence

Pick the current state: **discovery**, **design**, **plan**, **execution ready**, **recovery/review**, **doc refresh**, or **direct inspection**.

If the request names a file, symbol, slug, diff, or failing test, inspect it (or route to a step that does) before making codebase claims. If evidence contradicts the request or the tests, report the conflict instead of routing toward a workaround. Never route to a throwaway script or fixture rewrite whose purpose is making visible tests pass; normal repository tooling (build scripts, migrations, fixture generators, CI utilities) is fine when it is part of the real solution or verification path.

## 2) Resolve the slug before creating anything

- **Existing slug wins.** If the request names or implies an existing `plans/{slug}`, continue it. Never open a second slug for work an existing plan already covers.
- New work gets one short kebab-case slug matching one logical purpose (`add-auth-middleware`, not `misc-fixes`).
- One approved plan plus a request for persistent goal status is still **one** slug: `achieve-goal` keeps the outer lifecycle in `plans/{slug}/goal.md`, and the approved implementation scope goes to `execute-plan-loop`. Record `achieve-goal` as the primary worker and `execute-plan-loop` as the delegated executor under companions. Every executor result returns to the lifecycle layer: verified progress may increment the goal turn, while a blocker updates goal status without a turn increment. Never leave the requested overall status only in plan/todo artifacts. Do not invent a new objective, and do not let the lifecycle layer own the executor's slice, verification, or commit cadence.

## 3) Materialize the minimum artifacts

Create only what the current phase needs: `research.md` (evidence), `design.md` (trade-off review), `plan.md` + `todo.md` (approved executable sequence), `lessons.md` (after a material correction). Reuse existing artifacts instead of duplicating them. No files for ceremony.

## 4) Pick one primary worker

| Worker | Primary when |
|---|---|
| `decompose-feature` | The work exceeds one reviewable PR or the PR sequence is unclear |
| `plan-parallel-work` | Multiple agents need branch/path ownership and merge order |
| `execute-plan-loop` | Scope is approved or trivially safe and needs verified slice execution |
| `achieve-goal` | The user set a persistent objective (`/goal`-style) needing status, pause/resume/clear, or a completion audit |
| `ensure-atomic-pr` | An existing diff, branch, or PR mixes concerns |
| `refresh-related-docs` | Broader Markdown docs may be stale beyond slice-local files |
| `scan-image-vulnerabilities` | Container images or Trivy findings need read-only inspection: exact image reference, freshly refreshed database, no slug artifacts, no gates |

Add `anti-slop` only for an explicit quality request, pre-commit readiness, scope/add-only/fix-on-fix signals, or a meaningful/high-risk milestone. Routine implementation uses the executor's compact quality invariants. It never becomes the primary owner or adds a second review loop.

When safety, validation, or error handling is in scope, route boundary-first: validate external inputs where untrusted data enters, surface operational failures (I/O, network, permission, timeout, resource) where they occur, and skip redundant checks for internal states existing invariants already guarantee. Blanket defensive coding is not the definition of safety.

## 5) Check approval and worker availability

Continue only when required approval is recorded in the active state (not implied by a file existing) and the landing mode is recorded. Default landing mode is `working_tree`; commits, destructive actions, and external side effects need explicit authorization. See `references/approval-gates.md` when a gate decision is unclear.

If the selected worker is not installed, do not claim a handoff occurred. Name the missing worker, state the required action (install it, approve a bounded contract-equivalent fallback in this environment, or supply the missing decision), and stop unless the fallback is already safe and authorized.

If the request, slug, recorded gate, `plans/{slug}` artifacts, and next worker disagree, reconcile them before routing and state which surface was stale or incorrect.

## 6) Return the structured handoff

```text
Phase: <discovery|design|plan|execution|recovery|docs|inspection>
Scope: <slug + the one logical purpose being handed off>
Evidence: <files, artifacts, approvals, or facts used>
Approval: <not-needed|missing|recorded: quote or artifact>
Landing: <working_tree|commits>
Acceptance: <criteria or evidence the worker must return>
Primary worker: <skill name or none>
Companions: <skill names or none>
Artifacts: <created, updated, or none>
Worker availability: <available|missing: required action>
Stop reason: <handoff|approval|blocker|complete|none>
```

Keep the user-facing form concise, but never drop a missing approval, missing worker, or blocker. The handoff ends when the worker returns the named acceptance evidence; say so explicitly.

## 7) Stop at the right boundary

Stop when scope is unclear, a gate is required, design/plan drift invalidates the path, or the next action would mix concerns or silently expand scope. Otherwise continue with the chosen worker.

# Gotchas

- **Thin wrapper.** Punting coordination back to repo-root files is not orchestration.
- **Duplicate slug/goal.** Adding a parallel goal or plan next to an approved one splits the state surfaces.
- **Artifact spam.** Do not pre-create every file.
- **Routing without state.** Check existing artifacts and approvals before choosing a worker.
