---
name: arena
description: Have several independent attempts produce the same artifact, score them on a written rubric, then build the result on the best attempt and fold in what the others did better. Use it for a design, interface, prompt or document that is costly to get wrong on the first try.
disable-model-invocation: true
---

# Arena

Read [the shared agreement](../../references/working-agreement.md). Each attempt writes only inside
its own scratch location. The combined result reaches the real tree only under the task's
implementation authority.

## Set up the comparison

1. Describe the output every attempt must deliver and list the inputs all attempts share: the
   files, the constraints and how the system behaves now. All attempts get word for word the same
   task statement, so write it as the contract.
2. Write three to six criteria that can be graded for this task. The criteria are for scoring;
   attempts see only the task statement.
3. Decide how many attempts to run. Three is usual; run more when several distinct design
   directions deserve a try. Any model the host offers may run an attempt, and mixing model
   families is optional. Record the models that actually ran.
4. Give each attempt a location of its own: a separate worktree when available, otherwise a
   scratch folder outside the repository.

Setup is done when the output, shared inputs, criteria, attempt count and locations are written
down.

## Launch

Start all attempts together with the host's delegation tool. Each brief contains the task
statement, the paths of the shared inputs, the attempt's location, its limits (write only in that
location; no commits, pushes, branch changes or writes to outside services) and a request for the
artifact with a short note on the options it weighed and turned down. Track only the handles the
host returned. An attempt with no artifact by the deadline you set at launch, after one status
check, is stopped and
counted as missing; continue with the others and note it. If fewer than two artifacts arrive, the
comparison failed: rerun it once or report the failure. Without a delegation tool, produce the
attempts one after another yourself and label the result as not independent.

## Score

Read every artifact completely before deciding. Score each one on each criterion instead of
forming a general impression. You may also give the artifacts, relabeled anonymously, and the
criteria to one fresh-context judge that only reads, preferably from another model family, and
compare its scores with yours. Matching scores support the choice without settling it. Mismatched
scores point to bias or an unclear criterion, so reread both notes before deciding.

The base is the artifact with the best total score. When two are close, take the one that is
easier to maintain; for code, that means each piece of state has one owner, there is a single way
to do each job, and callers depend on fewer details.

## Combine

Go through each other artifact once more for parts worth adopting, usually one or two each. Rework
every adopted part into the base by hand so the result reads as one design; fragments stitched
together from several designs do not count. If the artifacts all reached the same shape, say so
and keep that shape as it is. If they split into viable but very different directions, choosing
between them is a product decision: unless the user delegated it, stop and return the directions
with their scores instead of blending them. If the split comes from an unclear task statement,
sharpen it and rerun once.

## Check and report

Check the combined artifact as you would any result: exercise it, then score it on the criteria
and against the original constraints. When the check fails, find the cause. An adopted part caused
the problem, or an attempt already solved it and that part was not adopted; combine again. Or the
task statement was wrong; rerun at most once, then report.

Return the artifact with a note on how it was built: the base and the reason, all scores, the
judge's scores or that no judge ran, every adopted part and its source, what you turned down and
why, convergence and missing attempts, the models used and the check result. Copy the artifacts
and evidence the note cites to a location you name in the report. Then remove the scratch locations
you made, after a failed run as well; leave branches for the user to delete.
