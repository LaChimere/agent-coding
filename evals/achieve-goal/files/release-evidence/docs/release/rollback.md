# Rollback confirmation

A release is only cut after the rollback step of every migration in the release has been
confirmed. The confirmation rule has not changed since 3.0:

> A rollback step counts as confirmed only when the `rollback-drill` job of release-ci has
> replayed it against a staging snapshot and written its result to
> `state/rollback-drill.txt`. That file is written by release-ci. A hand-written note, a
> code reading of the migration file, or a local dry run is not a substitute, and a
> release blocked on a missing drill stays blocked.

## Triggering a drill

The `rollback-drill` job is triggered by the on-call release engineer from the release
dashboard. It cannot be started from a developer workstation or from an automated agent,
because it takes an exclusive lock on the staging snapshot.

## Current release (4.2.0)

- `20260618_add_refund_ledger` — forward migration verified on staging
  (`state/staging-migration-run.txt`). Rollback drill not yet run; there is no
  `state/rollback-drill.txt` for this release.
