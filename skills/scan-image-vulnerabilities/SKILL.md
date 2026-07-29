---
name: scan-image-vulnerabilities
description: Scan container image references or images used by cluster workloads for known vulnerabilities with Trivy and a freshly updated database. Use for container-image CVEs, image security posture, Trivy scans, or discovering and scanning exact workload images; do not use for source-code security audits or generic dependency questions.
compatibility: Requires bash, python3, and Trivy 0.58.0 or newer. Docker is needed only for local daemon images; kubectl is optional for cluster image discovery.
---

# Trivy image vulnerability scan

## When this applies

Use it when the target is a container image: "does this image have vulnerabilities", a Trivy scan, CVEs or package vulnerabilities in an image, or the images a Kubernetes workload or cluster is running.

Do not use it for source-code security audits — SQL injection, authn/authz flaws, unsafe deserialization, or any review of application code. Route those to a source-code security review capability and say so instead of scanning. The word "vulnerability" alone is not the trigger; neither are generic dependency-policy questions.

This skill is read-only: it inspects images and reports findings, and never edits code, opens PRs, or produces plan artifacts. It sits outside the plan-mode/approval workflow coordinated by `workflow-orchestrator`, so invoke it directly without routing through that contract.

## 1. Identify the exact targets

Use concrete references from the user as given. For a cluster or workload scope, enumerate the running images first, then scan those exact references:

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' | sort -u
```

Narrow to the namespace, deployment, or workload the user named. Never guess `latest` or any tag the workload is not actually running — the wrong tag gives a misleading security picture.

## 2. Run the bundled scanner

Resolve the helper relative to this installed skill's base directory (no repository-root path):

```bash
<skill-base>/scripts/trivy_latest_scan.sh [--output-dir ./trivy-scan-results] <image> [more-images...]
```

The script owns the deterministic behavior: it refreshes the vulnerability and Java databases, then scans OS and library packages with comprehensive online detection across every package relationship, every severity, unfixed findings, suppressed findings, and the full package inventory, overriding ambient status/path filters and vulnerability/EOL exit-code settings. It writes the raw Trivy JSON per image, prints active, suppressed, and combined summaries plus package coverage, and exits nonzero if the database refresh or any requested image fails.

Pass `--output-dir` when artifacts must land somewhere specific or ignored; without it the script creates a controlled `trivy-image-scan.XXXXXX` directory under the current working directory. Docker is needed only for images that exist only in the local daemon; remote registry references do not require it.

The script's exit status and the artifacts it wrote are the result — no separate re-check. Nonzero means the run is partial or the database refresh failed: report the named images as failed and never as clean.

`references/scanner-contract.md` documents exact flags, artifact naming, summary shape, and exit semantics. Read it only when scanner output is unexpected or you need to interpret the raw JSON.

## 3. Report

Lead with the verdict and keep it short when the ask was short ("有没有 vul").

- **Scan result** — images scanned, database refresh confirmed, whether vulnerabilities were found. If there are none, say so explicitly.
- **Severity summary** — critical, high, medium, low. Keep suppressed counts separate from active counts and give the combined total.
- **Top findings** — CVE/advisory id, package, installed version, fixed version when one exists, and why it matters. CRITICAL and HIGH first; summarize the rest instead of dumping hundreds of LOW rows.
- **Coverage and provenance** — Trivy result classes/types and detected language-package ecosystems; whether the image came from a live cluster (name the exact reference and namespace/workload) or the local Docker daemon.
- **Limitations** — this is a complete vulnerability scan, not a complete security assessment: secrets, misconfigurations, licenses, malware, and runtime risks stay outside `--scanners vuln`. Ignore-file, VEX, and policy suppressions stay visible in the suppressed and combined summaries.

When something failed, state the cause — database refresh, image access, registry authentication, or missing local image data. A failed pull is a failed scan, not a clean image.

## Bundled resources

- `scripts/trivy_latest_scan.sh` — performs the scan; source of deterministic behavior.
- `references/scanner-contract.md` — on-demand flag, artifact, output, and exit-status detail.
