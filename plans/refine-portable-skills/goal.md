# Goal State

objective: "好，开始完整执行 plan"
status: active
slug: "refine-portable-skills"
turns_used: 2
turn_budget: null
budget_note: null
landing_mode: commits
docs_update_approved: true
created_at: "2026-07-16T23:13:21+08:00"
updated_at: "2026-07-17T02:50:00+08:00"

## Acceptance criteria

### User-visible behavior

- All nine distributed skills are refined where evidence shows a behavior, routing, portability, or correctness problem.
- The installed skills remain model- and provider-agnostic.

### Implementation scope

- Update affected skill bodies, bundled references, templates, scripts, eval definitions, and directly coupled repository documentation.
- Keep the work in one focused PR with coherent commits.

### Validation

- Validate supported `npx skills add` installation combinations.
- Pass deterministic critical checks.
- Run the selected GPT and Claude old-versus-candidate eval matrix.
- Resolve substantive review findings.

### Docs/status

- Keep this slug's todo and evidence current.
- Update repository contributor and user documentation for changed behavior.
- Commit a concise evaluation summary.

### Deferred/out of scope

- External skills not owned by this repository.
- A permanent cross-provider evaluation framework unless required for repeatability.

## Progress log

- Turn 0: Plan approved.
- Turn 1: Validated local installed copies and froze the old source.
- Turn 2: Refined the shared contract and core execution skills, corrected the blind-eval harness, and completed dual-family core evaluation.

## Deferred items

- None.

## Blockers

- None.
