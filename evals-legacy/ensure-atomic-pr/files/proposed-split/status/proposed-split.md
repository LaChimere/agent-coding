# Existing mixed change and proposed recovery units

This is supplied evidence for assessing an already-authored mixed change. No
application source, patch, test execution, or branch history is available in this
workspace. The facts below describe the change to assess; they are not claims
that the assessment agent has inspected code or run commands.

## Established context

The target project uses JavaScript ES modules and Node's built-in test runner.
The change currently bundles three unrelated concerns. The proposed recovery
already separates them into units A, B and C below. Finalize those boundaries and
their acceptance/validation; do not invent a new feature or delivery stack.

All changed paths are listed below. The three sets are disjoint, none imports
another set, and no shared manifest, lockfile, build configuration or public
interface changes. Each unit can be extracted against the unchanged target
branch without another unit. No base PR or ordering dependency is required.
Within each unit, its directly coupled edits must stay together.

The commands named below are existing project checks, not recorded executions.
No check result is supplied. Intermediate health is a property to justify from
these dependency facts and then verify after extraction, not an observed pass.

## Unit A: Correct cache expiry at the deadline

Changed paths:
- src/cache/ttl-cache.js
- test/cache/ttl-cache.test.js
- docs/cache-expiry.md

Existing get(key, nowMs) returns a cached value while nowMs is earlier than its
expiresAtMs. The authored fix changes the deadline comparison so an entry is
also expired exactly at expiresAtMs, not only after it. A missing or expired
entry returns undefined; a still-active entry returns the stored value.
The signature, stored timestamp units and behavior before/after the exact
deadline otherwise remain unchanged. No background expiry or eviction feature
was added.

The changed tests cover just before, exactly at and just after the deadline,
plus missing keys. The changed documentation describes the same deadline rule.
Existing focused check: node --test test/cache/ttl-cache.test.js

## Unit B: Redact credential fields from a log event

Changed paths:
- src/logging/redact-event.js
- test/logging/redact-event.test.js
- docs/logging-events.md

The existing redaction function returns a copy of a flat event object. The
authored fix replaces values for the documented password and token keys with
the literal [REDACTED] when those keys are present. It preserves other fields,
does not add absent keys and never mutates the caller's event. Nested objects
and new credential-name discovery are outside this flat-event contract.

The changed tests cover both sensitive keys, one absent key, ordinary fields
and input immutability. The changed documentation lists the two keys and the
replacement literal. Existing focused check:
node --test test/logging/redact-event.test.js

This logging correction neither uses nor changes the cache or display helpers.

## Unit C: Rename a package-private display helper consistently

Changed paths:
- src/display/text.js
- src/display/profile-name.js
- src/display/receipt-name.js
- test/display/names.test.js

The authored mechanical change renames the package-private helper
normalizeWhitespace to collapseWhitespace in its declaration and every import,
call and directly referencing test. Its implementation still trims outer
whitespace and collapses each internal whitespace run to one space. The
public formatProfileName and formatReceiptName exports and their results do
not change. The old helper is not exported from the package's public entrypoint;
the listed modules and test are all of its consumers.

The existing behavior assertions remain unchanged apart from the helper name.
Existing focused check: node --test test/display/names.test.js
A scoped reference search can confirm there is no remaining old helper
declaration/import/call in src/display/ or test/display/.

Do not divide this rename by filename: leaving a caller on the old name breaks
its connection to the renamed declaration. It is independent of units A and B.

## Integration validation available after extraction

The existing aggregate check is node --test test/cache/ttl-cache.test.js
test/logging/redact-event.test.js test/display/names.test.js (one command with
all three paths). It verifies the combination after each unit has its own
focused evidence. Do not claim those checks ran during this assessment.
