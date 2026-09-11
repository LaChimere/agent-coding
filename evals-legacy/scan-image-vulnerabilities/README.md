# scan-image-vulnerabilities eval fixtures

These cases must never touch a real registry, Trivy database mirror, Docker daemon, or
Kubernetes cluster. Everything the skill can observe at run time is supplied here as static
fixture data plus local shims, and every case carries the manifest's `default_execution`
hint (`network: disabled`, `bin` prepended to `PATH`, the three shims marked executable).
An adapter that cannot honor those hints must refuse to run these cases.

This directory is repository-maintenance material: it is never installed with the skill.
Nothing here encodes an expected answer — the fixtures only state facts about the simulated
external systems, exactly as a real registry or cluster would.

## Layout

Every case declares `"fixture_prefix": "files"`, so the corpus path `files/bin/trivy` is
written to the case workspace as `bin/trivy` and the workspace looks like an ordinary project
with a local `bin/` directory. Execution hints use those same workspace paths (`bin`,
`bin/trivy`), and the shims resolve their fixture data relative to their own location, so they
work unchanged in either layout.

```
files/bin/trivy          hermetic Trivy shim (fixture data only, no network)
files/bin/kubectl        hermetic kubectl shim (recorded cluster snapshot only)
files/bin/docker         hermetic Docker shim (client responds, daemon is unreachable)
files/trivy-fixture/images/<sanitized-image>.json    successful scan result for one image
files/trivy-fixture/images/<sanitized-image>.error   failure for one image (line 1: exit_code=N)
files/trivy-fixture/db-refresh-fails                 present => `--download-db-only` fails
files/trivy-fixture/java-db-refresh-fails            present => `--download-java-db-only` fails
files/cluster/pods-all-namespaces.json               fixture cluster, every namespace
files/cluster/pods-<namespace>.json                  fixture cluster, one namespace
```

In the case workspace the same tree appears with the `files/` prefix stripped: `bin/`,
`trivy-fixture/`, and `cluster/` sit at the workspace root.

`<sanitized-image>` is the image reference with every character outside `[A-Za-z0-9._-]`
replaced by `_` (for example `registry.example.com/app:1.2.3` becomes
`registry.example.com_app_1.2.3`). An image reference with no fixture fails as an inspect
error, so a guessed tag such as `:latest` can never silently succeed.

Each shim appends its full argument vector to `${SCAN_FIXTURE_CALL_LOG_DIR:-$PWD/.scan-fixture-calls}/<tool>.log`,
so a reviewer can confirm which external commands a run actually attempted — for example
that no image scan followed a failed database refresh.

## Scenario coverage

| Case | Scenario | Fixture facts |
|---|---|---|
| 0 | Vulnerability DB refresh failure | `db-refresh-fails` (rate-limited mirror); the image fixture exists, so a scan would have succeeded had the refresh passed |
| 1 | Cluster exact-image discovery | `pods-payments.json` / `pods-all-namespaces.json` pin one digest reference and one tagged reference across four namespaces |
| 2 | Severity prioritization + registry auth failure | `platform/base:3.1.0` (2 CRITICAL, 5 HIGH, 12 MEDIUM, 240 LOW) and `private/billing:5.0.0` (`UNAUTHORIZED`) |
| 3 | Routing boundary | shims only; nothing to scan |
| 4 | Partial multi-image failure | `app/ok:1.0.0` succeeds, `app/missing:1.0.0` fails with `MANIFEST_UNKNOWN` |
| 5 | Caller-controlled output, no Docker daemon | `app:1.2.3` plus a Docker shim whose daemon is unreachable |
| 6 | Installed-copy script resolution | `app:1.2.3` |
| 7 | Package inventory, ecosystems, suppressed findings | `coverage/app:1.0.0`: 1 Alpine OS package, 2 npm packages, 1 HIGH `lodash` finding, 1 VEX-suppressed CRITICAL `minimist` finding |

## Regenerating image fixtures

Run:

```sh
uv run --locked --project tools/skill-evals \
  python tools/skill-evals/generate_scanner_fixtures.py
```

The generator replaces `files/trivy-fixture/images/*.json` with the exact generated set (the
259-finding base image is generated rather than hand-written). Failure `.error` files, cluster
snapshots, and the shims are maintained by hand.
