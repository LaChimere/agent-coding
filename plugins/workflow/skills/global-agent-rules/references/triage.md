# Polling and triage

Read before polling or triaging issues, CI runs, alerts, review queues or similar streams.

1. **Classify with luna first.** Send each polled item to the luna-model role (`ordinary_worker`, `gpt-6-luna` in the agent-coding `config/codex` roles) for read-only classification: what it is, whether it is actionable, duplicate, noise or already handled, its urgency, and the evidence link. Classification does not fix, comment, label, rerun or close anything.
2. **Route worth-handling items to sol.** Items luna classifies as worth handling go to a sol-model role (`complex_worker` for implementation or diagnosis, `critical_reviewer` for read-only critical analysis; `gpt-6.1-sol` in the same roles), with luna's classification and evidence attached.
3. **The primary keeps authority.** The primary checks the classification against the evidence before acting and reports items it dropped and why. External writes (comments, labels, reruns, closures) still need authorization for that action class.

If a luna or sol role is unavailable, follow [capability-boundaries.md](capability-boundaries.md): say which is missing and do not silently substitute another model. CI results found while polling are judged by the [CI gate](verification.md#ci-gate).
