# Testing, verification and CI

Read before adding or changing tests, validating, reporting results or relying on CI.

## Tests

- Verify requested and affected existing behavior in proportion to risk, using checks directly supporting completion claims. Add regression tests where coverage is insufficient; documentation, comments and pure renames need no new tests. Test observable behavior, avoiding duplicate or implementation-mirroring tests and impossible task states.
- Before adding or changing a test, identify its contract, credible failing regression, gap in existing coverage and any production interface added only for testing. Prefer the real owning boundary. For bug fixes, demonstrate failure on pre-fix code for the intended reason and success after repair when feasible; otherwise state the evidence gap. Changes to expectations, skips or removed coverage need contract-based justification and retained proof of distinct risks.

## Checks and acceptance

- Inspect the complete change against the request before final acceptance. Start with the smallest relevant checks, exercising the actual changed path, and complete required repository gates. Broaden/repeat only for changed code, failures or specific unresolved risk. Fix change-caused failures and rerun affected checks without asking; report unrelated failures without expanding scope. Report the result once the outcome is implemented, relevant checks have passed, required reviews are complete and no in-scope blocker remains; further improvement/verification needs new evidence. Each investigation or review should resolve a concrete uncertainty, not pursue test counts, coverage percentages or review rounds as delivery goals.
- Run every repository hook; never bypass one with `--no-verify` or equivalent. If a hook fails for local-environment reasons, fix the environment or rerun the same hook in a clean environment, and record that in the change description.

## CI gate

A CI result counts as passing only for the exact head commit being accepted or merged, and only when all required runs completed successfully. These do not count as passing:

- a run cancelled, superseded or skipped because a later push started a new run;
- a green PR run while the base branch (for example `main`) is already red on the same required checks; report the red base as a blocker or unresolved risk instead of treating the PR as green.

## Reporting

- Report exact validation commands, the smallest decisive output and actual checked scope; include longer output only to explain failures. For subagent checks, identify the subagent and quote its reported command/results; never reconstruct missing evidence or claim broader coverage, regression freedom or unverified success. If verification is blocked/unavailable, finish unaffected authorized work and distinguish implementation from verification, listing checked/unverified scope, blockers and evidence needed to resolve them.
- Never invent URLs, identifiers, results, logs, test counts or commands. Mask secrets, tokens, credentials and customer data in quoted output and disclose masking.
