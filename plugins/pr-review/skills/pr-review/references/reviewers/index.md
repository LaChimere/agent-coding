# Reviewer routing

Use this index to decide which aspects apply. After selection, read only the linked ordinary
reviewer files. `all` means every applicable aspect, not every aspect regardless of evidence.
Applicability is decided here; do not open files for skipped aspects merely to confirm the skip.

## Ordinary reviewers

- **code** — [code.md](code.md). Always applicable unless the user explicitly requests only other
  aspects. Reviews changed behavior, repository standards, regressions, and material design costs.
- **comments** — [comments.md](comments.md). Applicable when comments, docstrings, README/API
  guidance, design documents, or other explanatory prose changed, or when explicitly requested.
- **tests** — [tests.md](tests.md). Applicable when behavior or tests changed, or when explicitly
  requested. Reviews coverage and test quality; it does not execute tests.
- **errors** — [errors.md](errors.md). Applicable when the change touches exceptions, error values,
  callbacks, retries, fallbacks, failure defaults, optional access that may hide absence, logging,
  cleanup, or user-facing failures.
- **types** — [types.md](types.md). Applicable when types, schemas, data models, public interfaces,
  state machines, construction rules, or mutation boundaries changed, or when explicitly requested.
- **spec** — [spec.md](spec.md). Applicable only when the user supplies or the repository contains an
  authoritative specification. Skip it without asking when no such source exists.

When the user says `only`, run only the named ordinary reviewers plus the scope work needed to run
them safely. A neighboring reviewer does not substitute for an applicable one merely because it
could notice the same code.

Design is a focus, not a public aspect. For a design review, apply that focus to the applicable
`code`, `comments`, and `spec` reviewers.

## Security

Security is applicable when explicitly requested or when the change affects authentication,
authorization, sessions, secrets, cryptography, signatures, untrusted input, parsing,
deserialization, uploads, dynamic execution, shell or process boundaries, filesystem paths or
permissions, storage, network boundaries, webhooks, sensitive data, dependencies, CI/CD,
deployment, infrastructure permissions, or controls named by `SECURITY.md`.

Security is not an ordinary reviewer file. Invoke the complete
`$codex-security:security-diff-scan` workflow from the primary agent against the same pinned target.
An ordinary reviewer may identify a correctness issue with security impact, but that does not
complete the security aspect.
