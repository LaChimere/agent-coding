---
name: arena
description: Produce several independent candidates for one artifact, judge them against a rubric, build on the strongest and graft the best parts of the rest. User-invoked for a consequential design, interface, prompt or document where a single attempt could lock in the wrong shape.
disable-model-invocation: true
---

# Arena

Read [the shared agreement](../../references/working-agreement.md). Candidates write only to
their own isolated locations. The synthesized result enters the real tree only within the task's
implementation authority, and material product choices stay with the user.

## Frame the contest

1. Name the artifact each candidate produces and the grounding every candidate reads: the
   relevant files, constraints and current behavior. Every candidate receives the same task text,
   so that text is the contract.
2. Write a rubric of three to six concrete criteria that can be graded for this task. The rubric
   is for judging; candidates see only the task.
3. Choose the candidate count, normally three, more when several design directions need a
   hearing. Use the models the host offers; a different model family can help but is not
   required. Record which models actually ran.
4. Give each candidate its own output location: a separate worktree where possible, otherwise a
   scratch directory outside the repository.

The frame is complete when the artifact, grounding, rubric, count and output locations are
written down.

## Fan out

Launch every candidate in one wave through the host's delegation mechanism. Each brief holds the
task, the grounding paths, the candidate's output location and a request for the artifact plus a
short rationale naming the alternatives it considered and rejected. Wait only on handles the host
actually returned. A candidate that produces nothing drops out; continue with the rest and record
the dropout. With fewer than two candidates left, the contest has failed, so relaunch or report it.
Without delegation, write the candidates in sequence yourself and label the result
non-independent.

## Judge

Read every candidate in full before choosing. Score each against every rubric criterion rather
than on overall impression. Optionally give one read-only, fresh-context judge, ideally on another
model family, the candidates under anonymous labels and the same rubric, then compare its scores
with yours. Agreement on the base confirms the choice. Disagreement points to bias or an ambiguous
rubric, so reread both rationales before deciding.

Pick as base the candidate a future maintainer can extend most easily while keeping invariants:
each piece of state has one owner, each task has one way to do it, and callers need to know the
least. Between two close candidates, prefer the smaller interface and the cleaner boundary.

## Graft

Walk each remaining candidate once more for what deserves porting, usually one or two things
from each. Fold every graft in by hand so the result stays one coherent design; pasted fragments
from several designs are not a synthesis. When the candidates converge on one shape, record that
agreement and keep the shape without grafts. When they diverge widely, the frame was
underspecified: sharpen the task or rubric and run again rather than averaging the divergence.

## Verify and report

Verify the synthesized artifact like any other result: exercise it and check it against the
rubric and the original constraints. A problem found here means the frame was wrong, so reframe
and rerun, or a candidate already solved it and the graft was missed, so graft again.

Return the artifact with a synthesis note: the base and why, rubric scores, the judge's verdict
or that no judge ran, each graft with its source, what was rejected and why, convergence or
dropouts, the models used and the verification result. Preserve the artifact and evidence, then
remove the scratch locations you created.
