# Gate status

This change is intended to land in the repository; it is not an explicit throwaway.

```text
$ node --test test/parse-feature-flags.test.js
not ok 1 - parses enabled and disabled flags
AssertionError: expected { search: true, reports: false }, received {}
```

The verification gate is failing. No resolution or waiver is recorded.
