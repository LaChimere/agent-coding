---
name: optimize-metric
description: Drive one measurable metric toward a target through a frozen, proven measurement harness and one-change experiments that are kept or reverted. User-invoked for sustained performance, size, cost or score improvement; a one-off fix stays in implement-task.
disable-model-invocation: true
---

# Optimize a metric

Read [the shared agreement](../../references/working-agreement.md). Implementation authority
covers the code changes; commits, pushes and PRs need their own authorization. Correctness and
simplicity outrank the number.

## Ground the workload

1. Trace the target path and name the workload dimensions that can move the result: data size,
   history, state and concurrency. Select a case that reproduces the user's complaint. If no case
   reproduces it, fix the reproduction before optimizing anything.
2. Fix one metric, the direction that counts as better and a checkable stop predicate: a target
   plus a minimum number of attempts, so a lucky early win cannot end the climb. Use the user's
   numbers when given; otherwise agree the target with the user before the first attempt.

## Build and freeze the harness

Build a measurement harness and prove it is sensitive: contrasting realistic workloads separate
as expected and the target case shows the symptom. Vet it before freezing:

- **Limiter.** Name what bounds the number, such as CPU, I/O, locks or the load generator, from a
  profile taken in a run you do not report.
- **Tuning.** Run every side the way production runs it: release builds, production settings,
  comparable caches, versions and data.
- **Limits.** Check the result against physical bounds. Removing a part that takes 10% of the run
  can make the run at most about 11% faster.
- **Errors.** The harness counts failures and checks that outputs are correct.
- **Work done.** The harness confirms the work happened inside the timed region and prints a
  count of it.
- **Repeatability.** Alternate the sides over at least five runs and report the median and
  range. A gap inside the run-to-run variation is no measurable difference.

If the harness cannot tell the cases apart, revise the workload or the metric. Choose the
regression checks that must keep passing. Record the baseline metric and a green run of those
checks on the unchanged code, then freeze the harness so it prints the metric, the error count
and the count of work done on every run. A harness change is its
own recorded step and never a way to make a candidate pass. For deeper checks use
[performance evidence](../../references/performance-evidence.md).

## Keep a decision log

Keep a TSV file outside the tracked tree, for example `decisions.tsv` in the work directory, with
the columns `ts`, `attempt`, `hypothesis`, `change`, `before`, `after`, `delta`, `tests`, `verdict`
and `note`. Write one row per attempt, kept or reverted, and read the log before each attempt.
The log is append-only: a correction is a new row, and earlier rows stay.
Commit it only when a reviewer needs the trail and commits are authorized.

## Run the loop

Each iteration tests one hypothesis tied to a named mechanism, such as "move X off the startup
path because it blocks first paint".

1. Make the smallest change for that hypothesis. Independent hypotheses may run in parallel,
   each in its own worktree.
2. Measure before and after with the frozen harness, and run the regression checks.
3. Keep the change only when the metric moves past noise, the error and work counts match the
   baseline and the checks stay green; a change that makes work fail fast is not a win. Otherwise
   revert it completely; a change that only might help is reverted.
4. Log the row.

Every kept change rests on a measurement, never on reading the code. On a plateau, several
rejects in a row, switch category, combine near misses, reread the source or try a bolder idea
before concluding. Keep a simplification that holds the number, and revert a win that breaks
behavior.

## Stop and report

Stop when the predicate holds or when the remaining ideas cost more than they could return; while
cheap untried hypotheses remain, keep climbing. Keep the predicate as set, and report being stuck
rather than looping.

Report the metric and target; baseline to final with the percent change, run count, range and
limiter; iterations kept and reverted; each kept change in one line; the log path; and the most
promising next idea. Call the result inconclusive when the limiter is unknown, a side ran
untuned, or errors and work done went unchecked, and name the gap.
