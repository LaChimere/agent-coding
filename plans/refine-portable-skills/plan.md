# Plan: Refine Portable Skills

## 1. Validate installed-runtime evaluation

- Verify isolated local installs and supported skill combinations.
- Verify GPT and Claude execution paths, cross-grading, and metadata capture.
- Freeze and install the old version.
- Classify regression and intended-change eval cases.

## 2. Refine shared contract and core execution

- Update `workflow-orchestrator`.
- Align `achieve-goal`, `execute-plan-loop`, and `anti-slop`.
- Run targeted dual-family evals and resolve regressions.

## 3. Refine planning and recovery

- Update `decompose-feature`, `ensure-atomic-pr`, and `plan-parallel-work`.
- Replace fixed templates with repeatable structures.
- Add functional eval coverage and handoff checks.

## 4. Refine documentation behavior

- Update `refresh-related-docs`.
- Add approval, discovery, no-op, and governance-doc evals.

## 5. Fix scanner behavior

- Update installed resource paths and failure semantics.
- Add hermetic script tests and prompt evals.

## 6. Reconcile descriptions and invocation

- Review all descriptions together.
- Run installed-runtime trigger tests when faithful.
- Keep current invocation modes when measurement is not reliable.

## 7. Align repository documentation and verify

- Update `AGENTS.md` and `README.md`.
- Install every supported combination.
- Run deterministic checks and the full dual-family selected eval matrix.
- Commit `eval-results.md`.
- Review and refine until no substantive findings remain.
