# Ops Runbook

## Retry limit

The fetch worker retries a failed job up to 3 times before moving it to the
dead-letter queue.

## Logging

> Status: Out for review — PR #482 (@morgan). Do not edit until merged.

Job logs are written to `/var/log/fetch-worker.log` in plain text.
