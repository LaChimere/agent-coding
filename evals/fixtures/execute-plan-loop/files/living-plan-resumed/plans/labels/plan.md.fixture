# Label corrections

## Approved scope

Correct first and second labels in src/labels.js. Preserve exports. Both slices are approved for implementation. Landing mode: working_tree. No commits, pushes, installs or network actions.

## Slices and acceptance

1. first() returns first. Check: node --test --test-name-pattern="first label" test/labels.test.js
2. second() returns second. Check: node --test test/labels.test.js

## Execution status

- [x] Slice 1
- [ ] Slice 2
Supplied prior execution evidence: first() was corrected to first; node --test --test-name-pattern="first label" test/labels.test.js passed. The subsequent node --test test/labels.test.js failed only second label: second() returned secod, expected second. This is an in-scope missed edit, not an invalidated design.
Blockers: none.
Next: correct second(), then rerun node --test test/labels.test.js and record the actual result.
