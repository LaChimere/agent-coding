# Pre-commit slop gate

Run this before landing a change. Correctness and scope failures require a fix or stop. Duplication and complexity findings may use a narrow recorded exception for generated output, bounded compatibility work, or another demonstrated need.

(Atomic-commit and verification-level discipline are owned by the workflow contract / `execute-plan-loop`; this gate does not repeat them. It adds the slop-specific checks.)

## Can you explain it?
- [ ] I can say what this change does in one or two plain sentences.
- [ ] I can say why it is needed.
- [ ] I understand the owned source and behavior I am about to land. Generated output is traceable to its generator and inputs.

## Have you proven it works?
- [ ] The workflow contains the narrowest relevant verification evidence for this change.
- [ ] I recorded the command and result as evidence, on the status/evidence surface the workflow already uses (or the commit body when there is none).
- [ ] The tests check real behavior — they do not just assert hard-coded values I copied in.

## Is it only what's needed?
- [ ] It uses existing patterns unless a new path is required by the task.
- [ ] Duplication is absent or justified by a reproducible source, bounded scope, verification, and removal condition.
- [ ] No speculative options, flags, config, or abstractions added "for later"; nothing here is unused by the actual task.

## Complexity check
- [ ] I looked for concrete removable or simpler code and acted when the evidence supported it.
- [ ] If the recent diff is add-only, I inspected the whole change for duplication or missed consolidation and recorded why remaining additions are necessary.
- [ ] A new reader could follow this change without private context from the author.

## Record and result
- [ ] The change or commit description states the single purpose in one sentence.
- [ ] The verification evidence is recorded on the normal status surface (or the commit body when there is no status artifact).
- [ ] Every box above is checked, or an exception permitted by this checklist is recorded with its scope and removal condition.
