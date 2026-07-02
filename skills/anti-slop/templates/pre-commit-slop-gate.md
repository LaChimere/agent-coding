# Pre-commit slop gate

Run this before landing a change (by default, before every commit). Every item must pass. If any item fails, fix it before the change lands. Do not land a change that fails the gate.

(Atomic-commit and verification-level discipline are owned by the workflow contract / `execute-plan-loop`; this gate does not repeat them. It adds the slop-specific checks.)

## Can you explain it?
- [ ] I can say what this change does in one or two plain sentences.
- [ ] I can say why it is needed.
- [ ] I understand every line I am about to commit. "An AI wrote it" is not enough.

## Have you proven it works?
- [ ] I ran the narrowest relevant verification for this change (its tests, a build, or a run) and saw the intended behavior.
- [ ] I recorded the command and result as evidence, on the status/evidence surface the workflow already uses (or the commit body when there is none).
- [ ] The tests check real behavior — they do not just assert hard-coded values I copied in.

## Is it only what's needed?
- [ ] It uses the patterns already in this repo, not a new parallel way to do the same thing.
- [ ] Nothing here is duplicated from code that already exists somewhere.
- [ ] No speculative options, flags, config, or abstractions added "for later"; nothing here is unused by the actual task.

## Complexity check
- [ ] I looked at whether this change makes anything removable or simpler, and did it if so. (Making nothing removable is fine for a single change.)
- [ ] Across the last several commits I am not only ever adding. (Add-only over a long stretch means complexity is piling up — stop and consolidate.)
- [ ] A new reader could follow this change without me explaining it.

## Record and result
- [ ] The commit message states the single purpose in one sentence.
- [ ] The verification evidence is recorded on the normal status surface (or the commit body when there is no status artifact).
- [ ] Every box above is checked. If not, fix the gap — do not land the change.
