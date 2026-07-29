# Pre-commit slop gate

Use this only when the full anti-slop check is triggered: an explicit request, readiness to land, scope/add-only/fix-on-fix signal, or a meaningful/high-risk milestone. Routine edits use the primary executor's compact quality invariants instead.

Correctness, safety, and requested-scope failures mean fix or stop. A duplication or complexity exception must be narrow and recorded.

## Purpose and evidence

- [ ] In one or two plain sentences, I state what this change does and why it is needed.
- [ ] I ran the narrowest runnable validation that demonstrates the real behavior, beyond a copied visible value where relevant.
- [ ] I recorded that purpose, command, and result on the existing status/evidence surface (or commit body when none exists).
- [ ] If the existing status surface was stale, I refreshed it with this evidence instead of treating stale bookkeeping as a correctness failure.

## Necessity, reuse, and complexity

- [ ] The change solves the requested problem without speculative options, flags, plugins, or abstractions.
- [ ] I looked for and reused existing behavior or patterns. Any generated or compatibility duplication has a source, bounds, verification, and removal condition.
- [ ] I looked for a concrete simplification or removal and acted when supported.
- [ ] For repeated add-only work, I inspected the full diff for duplication, dead scaffolding, missed consolidation, and reader clarity; I recorded why remaining additions are necessary when no removal is warranted.

## Result

- [ ] Every required item passed, or I fixed the issue or stopped. Any permitted exception records its scope and removal condition.
- [ ] For an explicit or meaningful/high-risk milestone, independent adversarial review findings were checked and fixed, split, or escalated; if unavailable, adversarial self-review is recorded as a limitation.
