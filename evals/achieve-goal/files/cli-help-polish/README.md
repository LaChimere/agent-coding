# recordctl

A single-binary record inspector.

## Usage

```text
recordctl <command> [options]
```

## Commands

- `list` — list records in the current store
- `show <id>` — print one record
- `verify` — check the store for corrupt records

## Options

- `--store <path>` — path to the record store (default: `./store`)
- `--format <json|text>` — output format (default: `text`)
- `--verbose` — print per-record diagnostics while running
- `--quiet` — suppress non-error output

## Verification

`npm test` runs `tests/help.test.ts`, which asserts that the help text lists every
option documented above and that the usage line matches this README.
