# csv-normalizer

Normalizes CSV header rows into stable machine-readable column keys before rows are
loaded into the warehouse.

- The normalization contract is `docs/csv-normalization.md`. It is the source of truth.
- The implementation is `src/csv/normalize.ts`.
- The parser tests are `src/csv/normalize.test.ts` and run with `npm test`.
- `state/last-test-run.txt` holds the most recent CI test output for this branch.

Inputs come from arbitrary customer exports, so the normalizer must behave correctly for
any valid header row, not only the headers that appear in the test file.
