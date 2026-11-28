---
name: swarm
description: Split a job across parallel workers, or race several workers on the same brief, then merge their evidence-backed results into one report. Use it for broad coverage, verification sweeps, reproductions or exploration.
disable-model-invocation: true
---

# Swarm

Read [the shared agreement](../../references/working-agreement.md).

## Plan the run

1. Write down the condition that ends the run and the report it must return.
2. Pick the layout. In a split, each worker gets its own slice. In a race, several workers get the
   same brief. A run can combine both. Before a race starts, fix how the winner is picked: the
   first verified pass, or the best result on a named criterion.
3. Give every writing worker a worktree or scratch folder of its own. When workers check or
   measure commits, name the exact SHAs in each brief. A measurement brief also fixes the method:
   how many samples, what one sample is and the order of runs.
4. Any model the host offers may run a worker, and mixing model families is optional. Record the
   models that actually ran.

## Launch

Start every worker together through the host's delegation tool, except timed measurements, which
run one at a time with no other worker running on that machine. Each brief stands on its own: the
goal, the scope, the slice or race arm, the worker's limits (write only in its own location; no
commits, pushes, branch changes or writes to outside services), how to check the result and what to
return. Each worker returns `PASS`, `ISSUES` or `BLOCKED` with its evidence and the SHAs and method
it used, and a worker that finds defects returns every defect it can prove. Track only the handles
the host returned. A launch that fails gets one retry. A worker with no result by the deadline you
set at launch, after one status check, is stopped and counted as missing; carry on with the rest.
Without a delegation tool, run the slices yourself one after another and label the report as not
independent.

## Merge

Read every final result. A result that lacks the SHAs or method its brief required is rejected, and
that worker is launched once more; a second miss is a gap. Inspect the decisive evidence behind each
`PASS` and each `ISSUES` before accepting it, because a worker's verdict is only its claim.
Coverage needs an accepted `PASS` or `ISSUES` for every required slice. A `BLOCKED`, missing or
rejected slice is a gap, and a gap never counts as a pass. For a race, pick the winner by the rule
fixed before launch, then stop the arms still running.

## Report

Return one report: a table with each slice or arm, its status, its evidence and its SHA; one line
per issue; the gaps and missing workers; and the race rule when there was a race. Copy the raw
worker output the report links to a location you name, then remove the scratch locations you made,
after a failed run as well. Leave branches for the user to delete.
