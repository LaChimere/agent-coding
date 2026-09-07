# Anti-slop core principles (embeddable block)

Paste this block into a working repository's agent-guidance file so every agent carries these habits by default. It is local policy for that repository, not part of any shared workflow contract. It is the short routine baseline; use the installed `anti-slop` skill for its full signal-driven pre-commit check.

---

## Quality bar: don't ship AI slop

Slop is output that looks polished but is unnecessary, wrong, or hard to maintain. Good names and tidy structure do not make code correct or needed. Judge behavior and necessity, not appearance.

For routine edits, carry these invariants:

- **I can explain it.** In plain words, what it does and why it is needed. If I can't, I don't commit it.
- **I have evidence for my claim.** I ran relevant verification and kept the command and result. Compilation alone does not prove behavioral correctness; documentation-only edits need consistency review.
- **It has one purpose**, stated in one sentence. Mixed-purpose changes get split first.
- **It fits the codebase.** It uses existing patterns; any duplication is justified by generation, bounded compatibility work, or another demonstrated need.
- **It is only what's needed.** No speculative options, flags, or abstractions "for later".
- **I checked for removable complexity.** Repeated add-only work is an inspection signal, not a requirement to delete. Remove only concretely unnecessary content within the approved scope.

Use the full anti-slop check for an explicit request, when ready to land, when scope/add-only/fix-on-fix signals appear, or at a meaningful/high-risk milestone. On long, multi-commit tasks:

- Keep the diff's shape in mind. If it only ever grows, that is a warning sign.
- Reuse a completed full check across commits of the same verified slice unless changed code or new risk calls for another check.
- Obtain independent review when the user or applicable policy requires it. Missing review capability remains an explicit gap; self-review is not a substitute. The anti-slop check does not itself add a reviewer.
- If a fix keeps creating new problems, stop and rethink the approach instead of patching the patches.

When uncertainty affects correctness, safety, or scope, stop rather than generating more code to cover it.

Read-only review reports findings and evidence without file writes. Apply fixes or refresh an existing living plan only within authorized implementation.
