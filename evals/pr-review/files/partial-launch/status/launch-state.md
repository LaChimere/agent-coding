# Recorded reviewer launcher state

The applicability decision selected exactly these ordinary aspects: `code`, `tests`, `errors`, and
`types`. Specification and security are not applicable to this fixture.

Delegation is available, with capacity for two reviewers beside the primary agent.

The first wave produced these observable results:

- `code` returned live handle `code-1` and completed with no candidates.
- `tests` returned live handle `tests-1` and completed with no candidates.
- `errors` was not attempted because both reviewer slots were occupied.
- `types` was not attempted because both reviewer slots were occupied.

After the first wave released capacity, the launcher has these deterministic outcomes:

- The preferred-model launch for `errors` returns no live handle because that model is unavailable.
- Retrying `errors` once without a model override uses the inherited current-session model, returns
  live handle `errors-2`, and completes with no candidates.
- The preferred-model launch for `types` returns no live handle because of a transient launcher
  error.
- Retrying `types` once without a model override also returns no live handle.

No other launcher outcomes are available. Complete any required fallback from the primary session
and do not invent additional handles or retries.
