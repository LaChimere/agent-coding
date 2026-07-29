# Anti-slop core principles (embeddable block)

Paste this block into a working repository's agent-guidance file so every agent carries these habits by default. It is local policy for that repository, not part of any shared workflow contract. It is the short routine baseline; use the installed `anti-slop` skill for its full signal-driven pre-commit check.

---

## Quality bar: don't ship AI slop

Slop is output that looks polished but is unnecessary, wrong, or hard to maintain. Good names and tidy structure do not make code correct or needed. Judge behavior and necessity, not appearance.

For routine edits, carry these invariants:

- **I can explain it.** In plain words, what it does and why it is needed. If I can't, I don't commit it.
- **I have proven it works.** I ran the relevant verification and kept the command and result as evidence. "It compiles" is not evidence.
- **It has one purpose**, stated in one sentence. Mixed-purpose changes get split first.
- **It fits the codebase.** It uses existing patterns; any duplication is justified by generation, bounded compatibility work, or another demonstrated need.
- **It is only what's needed.** No speculative options, flags, or abstractions "for later".
- **I checked for removable complexity.** I looked at whether the change makes anything deletable or simpler, and did it if so. Never removing anything across a long task means complexity is piling up.

Use the full anti-slop check for an explicit request, when ready to land, when scope/add-only/fix-on-fix signals appear, or at a meaningful/high-risk milestone. On long, multi-commit tasks:

- Keep the diff's shape in mind. If it only ever grows, that is a warning sign.
- At an explicit or meaningful/high-risk milestone, get the strongest independent review available and ask it to find what is wrong, missing, unnecessary, or duplicated, not to bless the change.
- If a fix keeps creating new problems, stop and rethink the approach instead of patching the patches.

When uncertainty affects correctness, safety, or scope, stop rather than generating more code to cover it.
