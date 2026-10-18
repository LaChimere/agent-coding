# Grok cold-start acceptance and refinement

On 2026-10-18 the owner supplied `project-modified.zip` after running the cold-start task in
Grok Bot. Its SHA-256 is `afd35a71793efdd09f266926bc1bf870adb1f2f3d158c169febc2f520578c95e`,
matching the [PR report](https://github.com/LaChimere/agent-coding/pull/15#issuecomment-6251508166).
The input bundle came from `c600b12c904b5a807d31c8f9cf41d3fff802a6e2`. Methods were loaded by file;
this does not qualify native plugin import, routines or the other lifecycle skills.

## Returned artifact

Only `format.mjs` and `tests.mjs` changed among the six original project files. Generated
verification assets and evidence were added. All thirteen non-evidence files match the final
review's recorded hashes. The final formatter distinguishes the singleton empty field `[""]`
from the zero-field row `[]`; the final verifier also detects that distinction.

Independent local execution on macOS / Node 24.22.0 passed nine product tests, three verification
journeys and a 3,009-row round trip through the real CLI and Python's standard CSV reader.
Restoring the old formatter fails; removing only the singleton-empty repair fails both the
tests and the generated verifier. Temporary resources were cleaned.

The archive supports a repair/re-review timeline for the final code. It cannot independently
authenticate worker identity or context separation. Same-family separate-context review is a
valid method; model diversity is optional. LibreOffice, Linux, other Node versions and scale
checks remain supported by the supplied logs rather than independently repeated here.
Formula neutralization remains a product decision under the exact-round-trip contract.

## Findings and corrective scope

1. The returned helper creates evidence and work directories before its error handler; cleanup
   and result persistence can also escape it. An evidence path that is a regular file reproduced
   an uncaught `ENOTDIR`, exit 1, instead of the promised tool-error exit 2.
2. The feature map promises TAP output from `node tests.mjs`; Node 24's default reporter differs.
   The Bot report disclosed this drift. It does not invalidate the product test result.
3. Our cold-start and resumed-handoff CSV oracles also lacked singleton-empty coverage. A
   formatter with otherwise correct quoting passed those oracles while losing `[""]`.

The refinement adds contract-derived empty/combined-Unicode inputs to both oracles and executable
controls that reject the defective formatter while accepting an all-fields-quoted alternative.
The shared verification method now covers independent oracles and error handling through setup,
cleanup and persistence; maintenance guidance covers runtime/reporter drift.

A separate corrected copy of the returned project handles those tool-error boundaries, preserves
multiple failures, reports unsaved evidence on stderr and uses reporter-independent map criteria.
Its helper regression tests cover successful behavior, product failure, evidence/work directory
failure, source-identity read failure, cleanup failure, result-write failure and simultaneous
drive/cleanup failure. The original
archive and its historical reports remain unchanged. These are local maintainer corrections,
not a new Grok execution or evidence of changed Bot behavior.

Independent artifact review found one additional ordering gap: source hashing ran before
creating the evidence directory. An unreadable identity file could therefore prevent saving an
error despite writable storage. The corrected order and an eighth regression check now preserve
that result. Product files remain unchanged by this refinement.

## Evidence boundaries

The supplied archive and reproduction logs are local, unpublished artifacts. Repository-local
correction outputs are under ignored `evals/out/grok-refinement/`; their presence is not assumed
for PR readers. `oracle-before.log` / `oracle-after.log` and `helper-before.log` / `helper-after.log`
retain failing controls and corrected runs. The corrected project carries its own refinement
note and tests; the public repository oracle controls run with:

```sh
cd evals
bun test --isolate tests/corpus/engineering.test.ts
```

The file-loaded cold-start now has user-run artifact evidence with independent local verification.
The revised methods and renamed release entry have not been rerun in Grok or requalified across
native hosts. No Computer Use, production installation or routine was enabled during this audit.

Local refinement gates passed: 327 repository tests, 97.06% line coverage, type/lint checks, build,
16-case / 36-check corpus validation, eleven skill validators, package/link checks and the existing
pre-commit/pre-push hooks. The initial sandbox run failed at loopback binding; the unchanged full
suite passed with local port binding permitted. The corrected project separately passes its nine
product tests, eight helper tests and three journeys. An isolated mutation returning success for
tool errors is rejected by the helper tests. These are local checks, not remote CI or model runs.

## PR #15 follow-up: retain the product verdict (2026-10-19)

[Review](https://github.com/LaChimere/agent-coding/pull/15#discussion_r4307782143) found that a
product failure followed by cleanup failure retained failed checks but lost
the explicit product verdict. A separate `evals/out/grok-refinement-v2/project/` copy now records
`productVerdict` independently of the overall result: a failed check establishes `FAIL`, completed
product checks establish `PASS`, and interrupted evaluation without a conclusion stays `null`.
Any tool error still takes overall `ERROR` / exit 2 precedence. The generated skill and console
summary explain both outcomes. Shared verification guidance now requires retaining the explicit
product outcome alongside later cleanup or evidence-write errors.

The final new regression controls failed against the unchanged v1 helper in an isolated copy:
product failure plus cleanup failure, product failure plus result-write failure, and interrupted
evaluation after successful partial checks all lacked the required product verdict. The corrected
helper passed all 11 tests, including explicit product-outcome assertions for the original eight
scenarios. On macOS arm64 / Node 24.22.0, all 9 unchanged product tests and 3 journeys passed;
doctor before and after reported no leftover temporary directories. The repository's targeted
corpus suite passed 4 tests with Bun 1.4.2. Its three parameterized setup diagnostics now name both
the actual case ID and metric, including the resumed-handoff case.

New local, unpublished evidence is under ignored `evals/out/grok-refinement-v2/`, with a separate
`project/evidence/codex-refinement-v2/` folder. `helper-final-before.log` and `helper-final-after.log`
retain the final regression proof; `preservation-after.log` confirms all six product files and
copied historical evidence are byte-identical and the original refinement tree/ZIP are unchanged.
The v1 reports and copied v1 contents record remain historical. The finalized local v2 ZIP
has SHA-256 `f7d6214c4513481d80aec798e534b3c5767581391d2ab613bc208b9e594fbb40`; its current contents manifest was checked against every archived file.

The primary inspected the results and rejected an isolated mutation that discards product verdicts
on tool errors. A scoped independent source review found no consequential issue in the new
result model or tests. Full repository tests (327, zero failures), type/lint, build and corpus
validation passed again. These are local checks, not new Grok behavior, native-host qualification
or remote CI success.
