# Anti-slop core principles (embeddable block)

Paste this block into a working repository's own `AGENTS.md` (or `CLAUDE.md`) so every agent carries these habits by default. It is local policy for that repository, not part of any shared workflow contract. It is the short, always-on version; the full method and the hard gates live in the `anti-slop` skill, when it is installed.

---

## Quality bar: don't ship AI slop

Slop is output that looks polished but is unnecessary, wrong, or hard to maintain. Good names and tidy structure do not make code correct or needed. Judge behavior and necessity, not appearance.

Before landing any code change, all of these must be true:

- **I can explain it.** In plain words, what it does and why it is needed. If I can't, I don't commit it.
- **I have proven it works.** I ran the relevant verification and kept the command and result as evidence. "It compiles" is not evidence.
- **It has one purpose**, stated in one sentence. Mixed-purpose changes get split first.
- **It fits the codebase.** It uses existing patterns; any duplication is justified by generation, bounded compatibility work, or another demonstrated need.
- **It is only what's needed.** No speculative options, flags, or abstractions "for later".
- **I checked for removable complexity.** I looked at whether the change makes anything deletable or simpler, and did it if so. Never removing anything across a long task means complexity is piling up.

On long, multi-commit tasks:

- Keep the diff's shape in mind. If it only ever grows, that is a warning sign.
- At each milestone, get the strongest independent review available and ask it to find what is wrong, missing, unnecessary, or duplicated, not to bless the change.
- If a fix keeps creating new problems, stop and rethink the approach instead of patching the patches.

When uncertainty affects correctness, safety, or scope, stop rather than generating more code to cover it.
