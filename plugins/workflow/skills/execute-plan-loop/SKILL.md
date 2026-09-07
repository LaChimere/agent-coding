---
name: execute-plan-loop
description: Execute approved plans or resume implementation that needs verified slices and progress tracking. Clear one-step changes stay in the primary session unless this skill is explicitly requested.
---

# Purpose

Carry the entire approved implementation scope forward in small, reviewable, verified slices until the user's requested return boundary is reached. A slice is a checkpoint, not the end of a whole-plan request. This is an execution skill, not a planning shortcut or a persistent goal lifecycle.

# Boundaries

Use it for an approved plan or step, implementation that needs verified slices and progress tracking, or an explicit request for this skill. Handle clear one-step changes directly in the primary session; being too small for Plan Mode does not itself call for an execution loop.

Route elsewhere when the work is still discovery or design (refresh an artifact only when writing is allowed and authorized, then stop at any required gate), when a feature needs a PR sequence (`decompose-feature`), when simultaneous code implementers need missing isolation or ownership decisions (`plan-parallel-work`), when an existing diff mixes concerns (`ensure-atomic-pr`), or when docs beyond this slice may be stale (`refresh-related-docs`). Parallel research/review and a single worktree do not need parallel implementation planning.

Add `anti-slop` only on signal: an explicit quality request, pre-commit readiness, scope creep, repeatedly add-only work, a fix-on-fix loop, or a meaningful/high-risk milestone. Routine slices rely on the compact invariants below.

# 1) Resolve the contract before coding

Resolve phase, scope, approval, landing, acceptance and return boundary from the user's request, accepted native Plan Mode proposal and explicit revisions, or existing living `plan.md`. A formatted handoff and a plan file are not prerequisites. Use an existing handoff if helpful; do not repeat planning or approval merely to produce one.

- Recorded and unchanged: that is the active contract. Execute it. Do not route the same decision back through the orchestrator or create a routing loop.
- Real phase, approval, scope or worker ambiguity: consult the installed `workflow-orchestrator` if available. If unavailable, report the missing capability and resolve only what can safely be decided from existing authority; never assume missing approval. Clear small tasks stay in the primary session.
- Landing authorization is separate from implementation approval. `commits` allows atomic commits after checks pass; anything else, including the default `working_tree`, means verify in the working tree and report. "Implement", "fix", "finish", and "keep going" never imply commit permission.

Read only the artifacts the scope depends on: `plan.md` for approved scope, acceptance and current progress; `design.md` or `research.md` when correctness depends on them. Save an approved native proposal only when authorized and the host allows writing; saving adds no Gate 2 approval. A save-only request does not authorize implementation, and leaving Plan Mode alone does not grant approval. Honor a single-phase or single-step boundary exactly.

The native host `/goal`, when explicitly requested and available, owns persistence, pause/resume, budgets and completion state. Ordinary implementation creates no goal. Do not create independent TODO or custom goal state, call retired lifecycle scripts, add old-format compatibility, or modify historical task files. Without a native goal, execute ordinary authorized work without promising automatic cross-turn continuation. Goal intent never expands side-effect authority.

# 2) Pick one atomic slice

Choose the smallest coherent next step that advances the approved scope, leaves the repository valid and is verifiable. Unrelated ready items stay untouched. Validation units need not equal commit units; avoid splitting directly coupled behavior/tests/docs just to make the checklist longer. Consume existing parallel ownership decisions rather than invoking another planning round; actual allocation belongs to authorized execution.

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
- Fix safely repairable failures caused by this implementation and rerun affected checks without asking again. Complete independent authorized work if a required capability is missing; report exact limits instead of a pass. Broaden checks only for a change, failure or concrete unresolved risk.

# 5) Update the progress truth

When a plan is used, update its execution progress, commands/results, blockers and next step at each meaningful checkpoint. Keep approved scope separate from dynamic status. Routine internal choices, evidence updates and equivalent execution refinements do not reset approval. Record `lessons.md` only after a material correction. Re-align before changing external behavior, public contracts, important architecture, state/concurrency semantics, security, cost or scope; do not silently revise the approved section to match an unapproved implementation.

# 6) Land or report

Under `commits`, commit only this slice's files after checks pass: one implementation step plus its tests, or one status/doc update tied to what just landed. Never bundle unrelated checklist items, opportunistic cleanup, or broad rewrites.

Under `working_tree`, create no commit. After each slice, continue to the next approved slice unless the requested phase/step boundary or a real blocker is reached. At the return boundary, report:

```text
Scope completed: <whole scope or explicitly requested phase/step>
Files changed: <paths>
Verification: <command> -> <result>
Completion: <complete|implementation complete, verification incomplete|blocked>
Deferred / blockers: <out-of-scope items and blockers, or none>
```

# Docs

Update the documentation and status inseparable from the slice you just landed — slug-local status, plus the document describing the behavior, config, or interface this slice changed. Running this loop covers those.

When broader related Markdown may be stale (`README.md`, `AGENTS.md`, canonical design docs or runbooks, multi-file sweeps), use `refresh-related-docs` to update it directly within the task's documentation scope. No additional per-file approval is needed; explicit user exclusions and read-only boundaries still apply.

# Milestone review

Review deeply when a coherent milestone completes, before or after a high-risk slice, or at the cadence the user or active contract set. Commit count is not a trigger. Routine slices need no verifier subagent. Use the installed `pr-review` for general change-set review, without chaining community review workflows. Missing optional capability is a coverage limit; required independent review remains incomplete if unavailable, never replaced by self-review or an automatic install. Reviewers are read-only; the primary executor consolidates findings before fixes.

Compare the actual diff against the approved plan and acceptance criteria, checking correctness, missing tests, scope creep, stale docs, and lost atomicity. Every finding takes one explicit action:

- implementation gap -> fix it in the next slice and re-run checks
- diff no longer atomic -> split it, using `ensure-atomic-pr` when boundaries are hard to recover
- equivalent execution refinement -> update plan detail/evidence and continue
- approved scope or consequential plan/design decision invalidated -> explain evidence and stop for the relevant decision before crossing that boundary
- risky or unclear finding -> stop and surface the trade-off with evidence

Fix at the root cause, not with the smallest patch that silences the comment.

# Repeated failure

After two materially similar failed attempts with no new evidence, stop the fix-on-fix loop: record what was tried and what each result disproved, reassess the assumption and path, update plan or design through the required gate if the path changed, and escalate when safe replanning is not possible.

# Done when

Audit the original request at the requested return boundary: the entire authorized scope (or explicitly limited step/phase) is implemented; acceptance and affected regression checks have evidence; required reviews passed; plan progress and coupled docs match reality; deviations and extra implementation have been checked; no known in-scope blocking finding remains. Unrun, ungraded or failed required verification is incomplete, not success. Stop adding checks once this evidence is sufficient.

# Gotchas

- Drifting off the approved objective into "while I'm here" work.
- Letting the living plan lag the code so the next session decides from stale state.
- Treating milestone review as ceremony, or answering findings cosmetically.
- Coding through an approval boundary after discovering plan or design drift.
- Test-fitting: hard-coded fixture values or a throwaway workaround script behind a green test.
- Over-defensive internals that hide broken assumptions while quietly swallowing real operational failures.
