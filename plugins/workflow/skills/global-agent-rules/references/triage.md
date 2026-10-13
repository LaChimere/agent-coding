# Polling and triage

Read before polling or triaging issues, CI runs, alerts, review queues or similar streams.
Roles are named here; their concrete models and effort are set in the user's Codex configuration
(`config.toml` and `agents/*.toml`; in agent-coding, `config/codex/`), not in this skill.

1. **Classify with the triage role first.** Send each polled item to the cheap classifier role (`ordinary_worker`) for read-only classification: what it is, whether it is actionable, duplicate, noise or already handled, its urgency, and the evidence link. Classification does not fix, comment, label, rerun or close anything.
2. **Route worth-handling items to a main role.** Items the classifier marks as worth handling go to `complex_worker` for implementation or diagnosis, or `critical_reviewer` for read-only critical analysis, with the classification and evidence attached.
3. **The primary keeps authority.** The primary checks the classification against the evidence before acting and reports items it dropped and why. External writes (comments, labels, reruns, closures) still need authorization for that action class.

If a triage or main role is unavailable, follow [capability-boundaries.md](capability-boundaries.md): say which is missing and do not silently substitute another model. CI results found while polling are judged by the [CI gate](verification.md#ci-gate).
