# Scanner contract

On-demand detail for `scripts/trivy_latest_scan.sh`. The script is the source of deterministic behavior; this file only describes what it does. Read it when debugging unexpected scanner output or interpreting a raw JSON artifact — not during a routine scan.

## Invocation

```bash
<skill-base>/scripts/trivy_latest_scan.sh [--output-dir DIR] <image> [more-images...]
```

- `--output-dir DIR` — artifacts land exactly there (created if absent).
- No `--output-dir` — a fresh `trivy-image-scan.XXXXXX` directory under the current working directory; never `/tmp`, never a fixed shared path.
- `-h` / `--help` — usage, exit 0.

## Preconditions

`trivy` and `python3` must be on `PATH`, and Trivy must be 0.58.0 or newer; each missing precondition exits 1 before any scan. Docker is needed only for images that exist only in the local daemon.

## Database refresh

Before any image is scanned: `trivy clean --vuln-db --java-db`, then `trivy image --download-db-only --skip-db-update=false`, then `trivy image --download-java-db-only --skip-java-db-update=false`. Any failure exits 1 and no image is scanned, so a stale database can never be reported as a fresh result.

## Scan flags

```
--scanners vuln
--pkg-types os,library
--pkg-relationships unknown,root,workspace,direct,indirect
--detection-priority comprehensive
--offline-scan=false
--severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL
--ignore-unfixed=false
--ignore-status=
--skip-dirs=
--skip-files=
--skip-db-update=false
--skip-java-db-update=false
--show-suppressed
--list-all-pkgs
--exit-code 0
--exit-on-eol 0
```

The empty `--ignore-status=`, `--skip-dirs=`, and `--skip-files=` values and the zeroed exit-code flags override ambient config that could silently shrink or misclassify a completed scan. Registry and authentication settings are left untouched. `--scanners vuln` means secrets, misconfiguration, license, and malware scanning are out of scope.

## Artifacts

One file per image: `<sanitized-reference>_<sha256-prefix-12>.json`, containing the complete unfiltered Trivy JSON report (including `Packages` and `ExperimentalModifiedFindings`). Non-`[A-Za-z0-9._-]` characters in the reference become `_`, the stem is truncated to 120 characters, and the digest suffix keeps distinct references distinct.

## Printed summary, per image

- `Severity summary` — active counts for CRITICAL/HIGH/MEDIUM/LOW/UNKNOWN plus TOTAL.
- `Top findings` — up to 10 sorted by severity: id, package, installed version, fixed version (`n/a` when none), target; `- none` when empty.
- `Suppressed findings` — separate counts and up to 10 entries with path, suppression status, statement, and source (ignore file, VEX, or policy).
- `All findings (active + suppressed)` — combined counts and TOTAL.
- `Package coverage` — inventory counts grouped by Trivy `Class/Type`.
- `Library packages` — detected language-package count with per-ecosystem breakdown (for example `npm=3`), then vulnerable library packages with type, versions, targets, paths, and per-severity finding counts.

## Exit status

- `0` — DB refresh succeeded and every requested image scanned and summarized.
- `1` — a precondition, the DB refresh, or at least one image failed. Failed references are listed on stderr with the output directory; successful artifacts and summaries are kept.

A nonzero status is the authoritative signal that the run is partial: report the named images as failed rather than clean.
