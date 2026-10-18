# Independent review execution

The current owner selects bounded questions, checking methods, permitted tools, model/effort and
read-only scope. Use the host's actual available delegation mechanism. No particular model family
or personal role is required; honor the user's choices and report effective settings when known.

Give each reviewer the same pinned target, authoritative context and acceptance criteria, without
other reviewers' conclusions or the author's self-justification. The owner also inspects the target
and double-confirms candidates. Independent means a separate context, not a different role label.
Another model family can help but is neither required nor evidence of correctness.

Assign each selected method an owner and a state: completed, pending, incomplete or skipped with
reason. One reviewer may cover several methods but must actually read and apply each brief. Reviewers
return candidates and coverage, remain read-only and do not recursively delegate. Launch in waves
within available capacity. Wait only on a live handle returned by a completed asynchronous launch;
a completed synchronous result needs no later wait. An error or missing handle is not launched work.

On a transient launch failure, retry at most once if permitted, preserving the chosen constraints.
Capacity-deferred work waits for capacity. Preserve finished results before using native lifecycle
controls to release occupied slots. If delegation is unavailable or a launched reviewer fails, the
owner may perform a separate sequential pass and label it non-independent. This cannot satisfy an
explicit independence or different-family requirement. Continue unaffected work and report the gap.

Treat agreement and voting as screening signals, then check the actual evidence. Preserve material
counterevidence, unresolved questions and completed specialist results. Report observed context
independence and model provenance separately; requested parameters are not proof of execution.
