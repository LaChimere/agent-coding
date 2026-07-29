# pipe-cli

A small command line tool for streaming record transforms.

## Release documentation

Every release ships a note under `docs/releases/<version>.md`. A release note is
considered correct when it matches two sources:

- `CHANGELOG.md` for the list of user-visible changes in that version
- `src/cli.ts` for the exact flag names and defaults the release exposes

`docs/releases/0.3.0.md` is the most recent published note and shows the expected
shape of a release note, including the verification section.

## Verification

`npm test` runs the flag-contract tests in `src/cli.test.ts`. A release note is not
publishable until that command has been run and its result recorded.
