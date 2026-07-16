---
name: scan-image-vulnerabilities
description: Scan container image references or images used by cluster workloads for known vulnerabilities with Trivy and a freshly updated database. Use for container-image CVEs, image security posture, Trivy scans, or discovering and scanning exact workload images; do not use for source-code security audits or generic dependency questions.
compatibility:
  tools: [bash, python3]
  dependencies: [Trivy installed locally; Docker access only for local daemon images; optional kubectl access when discovering images from a cluster]
---

# Trivy image vulnerability scan

## Operating context

This skill is a **read-only inspection tool** — it scans images and reports findings but does not modify code, create PRs, or produce plan artifacts. It operates outside the plan mode / approval gate workflow coordinated by `workflow-orchestrator`, so it can be invoked directly without routing through that contract. Its output may feed into research or security triage but does not require gates.

## Purpose

Use Trivy to scan one or more images against the **latest** vulnerability database, not a stale cached result, and present the findings in a way that helps the user decide what matters.

## Use this skill when

- the user asks whether an image has vulnerabilities
- the user asks for a Trivy scan
- the user wants to check images used by a Kubernetes workload or cluster
- the user asks about CVEs or package vulnerabilities in a container image

## Core expectations

- Refresh the Trivy vulnerability DB before scanning.
- Prefer scanning the exact image reference the workload is using, not a guessed tag.
- When scanning cluster workloads, first enumerate the actual image references from the cluster, then scan those exact images.
- Report the outcome plainly: whether vulnerabilities were found, the severity breakdown, and the most important findings.
- If there are no findings, say so explicitly.

## Standard workflow

### 1. Identify the target images

If the user already gave concrete image references, use them directly.

If the user asked about a Kubernetes cluster or workload, first discover the exact images. For example:

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' | sort -u
```

Narrow to the relevant namespace, deployment, or workload when the user gave a more specific scope.

### 2. Run the bundled scanner

Resolve the helper relative to this installed skill's base directory:

```bash
<skill-base>/scripts/trivy_latest_scan.sh <image> [more-images...]
```

If you want deterministic artifacts, pass an explicit output directory:

```bash
<skill-base>/scripts/trivy_latest_scan.sh \
  --output-dir ./trivy-scan-results \
  <image> [more-images...]
```

The script:

- refreshes the vulnerability DB
- scans each image with `--scanners vuln`
- saves raw JSON per image
- prints a severity summary and top findings
- returns nonzero if the DB refresh or any requested image scan fails

Without `--output-dir`, raw artifacts are created under the current working directory. Use an explicit ignored or session-controlled directory when the project should remain clean.

### 3. Summarize for the user

Use a compact structure like this:

## Scan result
- images scanned
- DB refresh confirmed
- whether vulnerabilities were found

## Severity summary
- critical
- high
- medium
- low

## Top findings
- CVE / advisory id
- package
- installed version
- fixed version if available
- why it matters

## Notes
- whether the image came from a live cluster or local Docker
- any scan limitations

## Practical guidance

- If the user asked only "有没有 vul", keep the answer short and lead with the verdict.
- If findings exist, prioritize `CRITICAL` and `HIGH` first; do not bury them in a giant table.
- If a fix version exists, call it out.
- If the scan is against a live cluster image, mention the exact image reference and namespace/workload you used.
- If Trivy cannot pull or inspect the image, say whether the issue is image access, registry auth, or missing local image data.

## Example

**User ask:** "帮我看看这个 image 有没有 vul"

**Good response shape:**

```markdown
## Scan result
- Scanned `sandbox-orchestrator:dev` with the latest Trivy DB.
- No vulnerabilities found.

## Severity summary
- Critical: 0
- High: 0
- Medium: 0
- Low: 0
```

## Gotchas

These are failure patterns that come up when agents run Trivy scans.

- **Scanning a tag that does not match the running workload.** If the user says "scan my app image," do not guess `latest`. Pull the exact image reference from the deployment, pod spec, or user input. Scanning the wrong tag gives a misleading security picture.

- **Registry authentication failures mistaken for "no vulnerabilities."** If Trivy cannot pull the image, the scan fails — but a swallowed error could look like a clean result. Always confirm the scan actually completed before reporting findings.

- **Stale vulnerability DB despite running the refresh.** Network issues can cause `trivy image --download-db-only` to fail silently or download an incomplete DB. If the DB refresh fails, report it instead of scanning with stale data.

- **Overwhelming the user with hundreds of findings.** A base OS image can have dozens of CVEs. Lead with CRITICAL and HIGH, give a count summary, and only detail the top findings. Do not dump 200 rows of LOW severity noise.

- **Missing Docker daemon for a local-only image.** Docker access is needed when the target exists only in the local daemon. Remote registry references do not require Docker; diagnose registry access and local-daemon access separately.

## Bundled resource

- `scripts/trivy_latest_scan.sh` — refreshes the DB, scans images, saves JSON, and prints a summary
