# Pre-commit slop gate

Use this only when the full anti-slop check is triggered: an explicit request, readiness to land, scope/add-only/fix-on-fix signal, or a meaningful/high-risk milestone. Routine edits use the primary executor's compact quality invariants instead.

Correctness, safety, and requested-scope failures block readiness: recommend a correction in review, or fix it within already authorized implementation. A duplication or complexity exception must be narrow and recorded.

Read-only review reports this checklist and evidence inline without file writes. Authorized implementation may refresh the existing living `plan.md`; there is no separate tracker. A full check neither automatically adds a reviewer nor restarts for each commit of an already checked slice.

## Purpose and evidence

- [ ] In one or two plain sentences, I state what this change does and why it is needed.
- [ ] I have the narrowest relevant validation evidence for the claim (consistency review for documentation-only changes), beyond a copied visible value where relevant. Unavailable or unrun checks remain explicit gaps.
- [ ] I reported the purpose, command, and result inline for read-only review, or recorded them in the existing living plan / final response during authorized implementation.
- [ ] I distinguished stale bookkeeping from correctness failures, and refreshed files only when implementation or those writes were authorized.

## Necessity, reuse, and complexity

- [ ] The change solves the requested problem without speculative options, flags, plugins, or abstractions.
- [ ] I looked for and reused existing behavior or patterns. Any generated or compatibility duplication has a source, bounds, verification, and removal condition.
- [ ] I looked for a concrete simplification or removal, reported it in review, and applied it only within authorized implementation.
- [ ] For repeated add-only work, I inspected the full diff for duplication, dead scaffolding, missed consolidation, and reader clarity; I recorded why remaining additions are necessary when no removal is warranted.

## Result

- [ ] Every required item passed, or I reported the failure and recommended action; I applied corrections only within authorized implementation. Any permitted exception records its scope and removal condition.
- [ ] Where independent review is required, I can identify the actual target, the launch/result source of its returned assessment, my check of its findings, and a recommended correction or reason for deferral/escalation for each confirmed finding. Otherwise I report the missing evidence or disposition without claiming the change is ready.
