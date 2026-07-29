# Changelog

## 0.4.0 (unreleased)

- Added `--dry-run` to preview a transform without writing output.
- Renamed `--out-file` to `--output`; the old name is accepted for one more minor release.
- Changed the default of `--batch-size` from 100 to 500.
- Fixed a crash when the input stream closed mid-record.

## 0.3.0

- Added `--batch-size` to control how many records are buffered before a flush.
- Added `--out-file` to write results to a file instead of stdout.
