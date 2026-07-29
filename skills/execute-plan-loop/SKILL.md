---
name: execute-plan-loop
description: Execute an approved implementation scope in small verified slices while keeping plan and status artifacts accurate. Use for an approved `plans/{slug}` step, an explicitly scoped implementation request, or continuation of execution that needs atomic changes and milestone review. This skill does not create persistent goal lifecycle state.
---

# Purpose

Carry an approved implementation scope forward in small, reviewable, verified slices until the requested milestone is done. This is an execution skill, not a planning shortcut.

# Boundaries

Use it for an approved `plans/{slug}` step, an explicitly scoped task too small for plan mode, or continuation of started execution.

Route elsewhere when the work is still discovery or design (refresh the artifact and stop at its gate), when a feature needs a PR sequence (`decompose-feature`), when agents need ownership boundaries (`plan-parallel-work`), when an existing diff mixes concerns (`ensure-atomic-pr`), or when docs beyond this slice may be stale (`refresh-related-docs`).

Add `anti-slop` only on signal: an explicit quality request, pre-commit readiness, scope creep, repeatedly add-only work, a fix-on-fix loop, or a meaningful/high-risk milestone. Routine slices rely on the compact invariants below.

# 1) Resolve the contract before coding

Read the structured handoff recorded by `workflow-orchestrator` or `achieve-goal` and use its fields directly: phase, scope, approval, landing, acceptance, primary worker.

- Recorded and unchanged: that is the active contract. Execute it. Do not route the same decision back through the orchestrator or create a routing loop.
- Phase, approval, scope, or worker missing or unresolved: invoke the installed `workflow-orchestrator` and wait for its handoff. If it is not installed, report the missing dependency instead of assuming approval.
- Landing authorization is separate from implementation approval. `commits` allows atomic commits after checks pass; anything else, including the default `working_tree`, means verify in the working tree and report. "Implement", "fix", "finish", and "keep going" never imply commit permission.

Read only the artifacts this slice depends on: `plan.md` for approved steps and acceptance criteria, `todo.md` for the current progress truth, `design.md` or `research.md` when correctness depends on them. Honor a single-phase or single-step boundary exactly.

# 2) Pick one atomic slice

Choose the smallest next step that advances the approved plan, leaves the repository valid, is verifiable with existing checks, and has one purpose you can state in a sentence. Split anything larger before coding. Unrelated ready items stay untouched and are recorded as deferred.

# 3) Implement it

- Inspect the named sources, tests, and callers first. Never infer behavior from filenames, test names, or stale plan text. If a required source cannot be read, stop with that blocker. When asked only to plan the slice, state what must be inspected rather than implying it was read.
- Solve the real behavior for all valid inputs. Tests verify the solution; they are not a list of values to special-case. Real repository tooling (migrations, fixture generators, build scripts) is legitimate when it is part of the actual solution; a throwaway script whose only job is making visible tests pass is not.
- Validate untrusted input where it enters the system. Inside trusted internals, rely on existing invariants instead of repeating guards. Handle each operational failure class where it can actually occur — a file read and a database write are separate — and propagate or surface it. No broad catches, no success-shaped fallbacks.
- Keep this slice's tests, fixtures, config, and directly coupled status/docs together; keep unrelated refactors and cleanup out.
- If the request is infeasible, unsafe, or rests on an incorrect test, stop with evidence instead of building a workaround.

# 4) Verify with real commands

- Run the narrowest existing check that demonstrates the change, then broader checks if the change class needs them. Prefer the commands captured in the plan.
- If a documented command no longer exists, inspect the repository's scripts and config for the closest real one, then update the plan/status with that evidence or escalate if the plan is stale. Never report an unrun or invented pass.
- Boundary and error-handling work needs evidence for invalid-data behavior and for each relevant operational-failure class.
- Evidence is a command and its result. "Double-checked" is not verification.

# 5) Update the progress truth

Before landing or reporting, update `todo.md` checklist state and evidence, `lessons.md` after a material correction, and any other slug-local status the repository treats as truth. Touch `plan.md` or `design.md` only when the approved path genuinely changed — then stop for the required gate instead of building on unapproved drift.

# 6) Land or report

Under `commits`, commit only this slice's files after checks pass: one implementation step plus its tests, or one status/doc update tied to what just landed. Never bundle unrelated checklist items, opportunistic cleanup, or broad rewrites.

Under `working_tree`, create no commit, leave the verified change in the tree, and report:

```text
Slice purpose: <one sentence>
Files changed: <paths>
Verification: <command> -> <result>
Ready to commit: <yes|no>
Deferred / blockers: <out-of-scope items and blockers, or none>
```

# Docs

Update the documentation and status inseparable from the slice you just landed — slug-local status, plus the document describing the behavior, config, or interface this slice changed. Running this loop covers those.

When broader Markdown may be stale (`README.md`, `AGENTS.md`, canonical design docs or runbooks, multi-file sweeps), hand off to `refresh-related-docs` and let its approval rule govern. Do not restate or pre-empt its procedure.

# Milestone review

Review deeply when a coherent milestone completes, before or after a high-risk slice, or at the cadence the user or active contract set. Commit count is not a trigger. Routine slices need no verifier subagent; use an independent reviewer only for an explicit request or a genuinely high-risk milestone.

Compare the actual diff against the approved plan and acceptance criteria, checking correctness, missing tests, scope creep, stale docs, and lost atomicity. Every finding takes one explicit action:

- implementation gap -> fix it in the next slice and re-run checks
- diff no longer atomic -> split it, using `ensure-atomic-pr` when boundaries are hard to recover
- approved plan wrong or incomplete -> update `plan.md` and stop for its gate
- approved design invalidated -> update `design.md` and stop for its gate
- risky or unclear finding -> stop and surface the trade-off with evidence

Fix at the root cause, not with the smallest patch that silences the comment.

# Repeated failure

After two materially similar failed attempts with no new evidence, stop the fix-on-fix loop: record what was tried and what each result disproved, reassess the assumption and path, update plan or design through the required gate if the path changed, and escalate when safe replanning is not possible.

# Done when

The approved slice is implemented, acceptance criteria have evidence, required checks passed, status artifacts match reality, coupled docs are updated or explicitly deferred, and review findings are resolved, deferred, or escalated.

# Gotchas

- Drifting off the approved objective into "while I'm here" work.
- Letting `todo.md` lag the code so the next session decides from stale state.
- Treating milestone review as ceremony, or answering findings cosmetically.
- Coding through an approval boundary after discovering plan or design drift.
- Test-fitting: hard-coded fixture values or a throwaway workaround script behind a green test.
- Over-defensive internals that hide broken assumptions while quietly swallowing real operational failures.
