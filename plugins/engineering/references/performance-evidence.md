# Validate a performance claim

Use this method when measured latency, throughput or resource use supports an optimization
conclusion or a choice between alternatives. It applies to design-only comparisons and review
of supplied measurements as well as implementation. Loading it grants no execution authority.
A change touching a loop or cache does not require a benchmark without a relevant claim.

## Establish what the comparison means

State the claim, units, workload, artifact versions, operating conditions and measured interval.
Inspect the runner and supplied evidence before interpreting a number. Reuse existing tools and
measurements that still establish the same claim under the same conditions.

Preserve the user's comparison. Production-tuned alternatives need fair tuning on both sides.
A question about default settings or an exact deployment constraint must retain that condition;
do not silently change the workload or configuration to answer a different question. Separate
implementation effects from configuration effects and describe the supported scope.

## Check the measurement

- **Actual work and correctness:** verify that the intended requests, rows, bytes or other work
  completed inside the timed interval. Check outputs and count errors, rejections, retries and
  timeouts. Fast failure, skipped work, an unconsumed iterator or an unawaited operation is not
  evidence of improved performance.
- **Bottleneck and interference:** use relevant source and profiling evidence to identify what
  limits the result. Check whether the load generator, instrumentation, warmup, caches or other
  machine activity measured something different from the claimed work. Separate profiling from
  reported timing when its overhead matters. Use tools supported by the actual host.
- **Repeatability:** use an existing sound statistical method, or repeat and alternate comparable
  runs enough to expose variability and drift. Report the sample count and spread. There is no
  universal sample-count gate; evidence that cannot distinguish alternatives is inconclusive.
- **End-to-end significance:** relate a micro result to the path the user waits on, with realistic
  data and concurrency. Check physical plausibility and the changed component's share of total
  cost. A local speedup alone does not establish an equivalent product speedup.

A narrowly requested ballpark can use fewer checks, but still establish that the work happened
and the result is correct; label the limited sample and uncertainty. Do not use that exception
to declare a consequential winner without adequate comparison evidence.

In a read-only assessment, inspect the supplied runner, outputs and conditions within scope.
Report gaps rather than inventing a new measurement or expanding permission to execute one.
An unknown cause does not invalidate an observed number by itself, but a material unexplained
limitation must bound the conclusion. Never invent a bottleneck to complete the checklist.

## Report what the evidence supports

State whether the result supports an improvement, regression, no measurable difference or an
inconclusive comparison. Include the relevant magnitude and units, conditions, repetitions,
variability, correctness/work checks and remaining limitations. Keep observations separate from
causal explanations. Link detailed evidence instead of copying all runs into the summary.

Use [verification evidence](verification-evidence.md) for artifact identity, failure attribution,
authority and cleanup. Do not suppress unsuccessful attempts or alter the measurement merely
to produce a favorable conclusion.
