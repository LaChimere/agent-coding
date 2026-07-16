# Design: Refine Portable Skills

Runtime slug: `goal-refine-portable-skills`

## Direction

Keep the existing nine-skill topology. Refine contracts and routing rather than merging or deleting skills without comparative evidence.

## Design principles

- State outcomes, evidence requirements, approval boundaries, and stop conditions once.
- Keep the shared workflow contract in `workflow-orchestrator`; workers contain role-specific deltas.
- Use capability-based language instead of model, provider, or host names.
- Resolve runtime resources relative to the installed skill directory.
- Treat the orchestrator as a router, workers as primary owners, `anti-slop` as a companion, and the scanner as direct read-only inspection.
- Preserve useful behavior before optimizing token count or prompt size.

## Change groups

### Shared contract and core execution

Update the workflow contract, orchestrator, goal lifecycle, execution loop, and anti-slop guard together so routing, approval, commit, and review rules remain coherent.

### Planning and recovery

Make decomposition vertical-slice-first, split atomic changes by purpose, and express parallel work as repeatable tasks with explicit handoffs.

### Documentation

Treat explicitly named docs as approved, discover the repository's documentation authority, and ask only when scope expands.

### Image scanning

Make the installed script path portable, failures machine-visible, Docker conditional, and output locations caller-controlled.

### Trigger and invocation policy

Review all descriptions as a competing set after body behavior stabilizes. Change invocation mode only when installed-runtime behavior can be measured faithfully on both families.

## Evaluation design

- Freeze the current commit as the old package source.
- Install old and candidate versions into clean destinations through `npx skills add`.
- Keep regression guards separate from intended behavior changes.
- Use deterministic graders wherever possible.
- Cross-grade model-produced outputs with the other model family.
- Keep raw runs outside git and commit a concise results summary.

## Approval

Approved by the user in this session for complete execution as one focused PR.
