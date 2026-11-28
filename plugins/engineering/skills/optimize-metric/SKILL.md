---
name: optimize-metric
description: Push one measurable number toward a target by testing one change at a time against a fixed, validated measurement and keeping only the changes that measurably help. Use it for sustained work on speed, size, cost or a score; a one-off fix belongs in implement-task.
disable-model-invocation: true
---

# Optimize a metric

Read [the shared agreement](../../references/working-agreement.md) and
[performance evidence](../../references/performance-evidence.md). Implementation authority covers
code edits; commits, pushes and PRs need their own authorization. Correct behavior and simple code
matter more than the number.

## Pin down the problem

1. Follow the path being optimized and list the inputs that can move the number: data size,
   history, state and concurrency. Pick a case that shows the problem the user described. If no
   case shows it, fix the reproduction first.
2. Settle one metric, which direction is better and a stop condition you can check: a target and a
   minimum number of attempts, so one lucky early result cannot end the work. Take both from the
   user when given; otherwise propose them and get the user's agreement before the first attempt.
   If the user cannot answer before work starts, write the proposed values as the log's first row,
   mark them unconfirmed and report them.

## Build and fix the measurement

Build a measurement and show that it responds: different realistic inputs give clearly different
numbers, and the chosen case shows the problem. Check it before fixing it in place:

- **Bottleneck.** Find what limits the number, such as CPU, I/O, locks or the load generator, from
  a profile taken in a separate run. If it stays unknown, say so; it then limits what you can
  conclude.
- **Conditions.** Measure both sides under the conditions of the user's comparison: the same
  builds, settings, caches, versions and data. A claim about production uses production builds and
  settings.
- **Ceiling.** Compare each result with what is physically possible. If a part takes 10% of the
  run, removing it saves at most that 10%, so the run gets at most about 11% faster.
- **Errors.** The measurement counts failures and checks that the outputs are right.
- **Work.** The measurement confirms that the work happened inside the measured interval and
  prints how much.
- **Spread.** For a timed number, alternate the two sides over enough runs to show how much results
  vary, and report the run count, median and range. A difference within that variation is no
  measurable difference. A deterministic number such as a file size needs one run per side once you
  have seen it repeat.

If the measurement cannot separate the cases, change the input or the metric. Choose the regression
checks that must stay green. On the unchanged code, record the starting number and a green run of
those checks. Then fix the measurement in place so every run prints the number, the error count and
the work count. Changing the measurement is a separate, logged step and never a way to make an
attempt pass.

## Log every attempt

Keep a TSV file outside the tracked tree, such as `decisions.tsv` in the working folder, with the
columns `ts`, `attempt`, `hypothesis`, `change`, `before`, `after`, `delta`, `tests`, `verdict` and
`note`. Add one row per attempt, kept or undone, and read the file before each new attempt. Rows are
only appended; to correct a row, add a new one. Commit the file only when a reviewer needs it and
commits are authorized.

## Run the attempts

Each attempt tests one idea about a named cause, such as "take X off the startup path because it
delays the first paint".

1. Make the smallest change that tests the idea. Record the state before it so you can undo exactly
   this change without touching anyone else's edits. Independent ideas may be built in parallel,
   each in its own worktree.
2. Measure with the fixed measurement, one attempt at a time on an otherwise quiet machine, and run
   the regression checks.
3. Keep the change only when the number moves beyond the variation, or when it simplifies the code
   and holds the number, and in both cases the error and work counts match the start and the checks
   pass. A change that makes work fail early is no gain. Otherwise undo exactly this change,
   including one that merely might help. When ideas were built in parallel, measure each one you
   keep on top of the changes already kept, and undo it if its gain no longer shows.
4. Add the row to the log.

Keep a change only on measured evidence, never because the code looks faster. After several
rejected attempts in a row, try another kind of idea, combine near misses, reread the source or try
something bolder before you give up. Undo a gain that breaks behavior.

## Stop and report

Stop when the stop condition holds. Before that, continue while cheap untested ideas remain, and
stop early only when what is left would cost more than it could gain, logging that reason. Keep the stop condition as
agreed, and report being stuck instead of repeating attempts.

Report the metric and target; the start and end values with the percent change, run count, range
and bottleneck; how many attempts were kept and undone; one line per kept change; the log path; and
the most promising next idea. Call the result inconclusive when errors or work went unchecked or the
two sides ran under different conditions, and say what is missing.
