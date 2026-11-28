---
name: swarm
description: Fan out parallel workers over slices of a job or as racing attempts, collect results that carry their evidence and return one consolidated report. User-invoked for parallel coverage, verification sweeps, reproductions or exploration.
disable-model-invocation: true
---

# Swarm

Read [the shared agreement](../../references/working-agreement.md). Workers act only within the
task's authority, and each writing worker writes only to its own output location.

## Frame

1. State the done predicate and the report the swarm must return.
2. Choose the shape. A partition gives each worker a distinct slice. A race gives several workers
   the identical brief. A mixed shape does both. For a race, declare the selection rule before
   launch: first pass, rank all, or best of.
3. Give each writing worker its own worktree or scratch directory. When workers verify or measure
   commits, every brief names the exact SHAs. A measurement brief also names the method: sample
   count, what one sample is and the run order.
4. Use the models the host offers; a different model family can help but is not required.
   Record which models actually ran.

## Fan out

Launch all workers in one wave through the host's delegation mechanism. Each brief stands alone:
goal, scope, the exact slice or race arm, how to verify and what to report. Every worker reports
`PASS`, `ISSUES` or `BLOCKED` with its evidence and records the SHAs and method it used, and a
worker that can prove defects lists every
defect it can prove. Wait only on handles the host returned. Retry a failed launch at most once.
When a worker drops out, continue with the rest and record the dropout.

## Aggregate

Read each terminal result. A result that omits the SHAs or method its brief named is rejected,
and that worker is launched once more; a second miss becomes a gap. A gap never counts as a pass.
Coverage requires a result for every required slice. For a race, apply the selection rule
declared before launch. A worker's `PASS` is a claim until you inspect its decisive evidence.

## Report

Return one consolidated report: a table of each slice or arm with its status, evidence and SHA,
one line per issue, the gaps and dropouts, and the race rule when one applied. Link raw worker
output rather than pasting it. Preserve the evidence, then remove the scratch locations you
created.
