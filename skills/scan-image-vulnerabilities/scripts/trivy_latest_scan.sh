#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  trivy_latest_scan.sh [--output-dir DIR] <image> [more-images...]

Examples:
  trivy_latest_scan.sh sandbox-orchestrator:dev
  trivy_latest_scan.sh --output-dir ./trivy-results mcr.microsoft.com/hello-world:latest

The scan refreshes the vulnerability DB, then uses:
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
EOF
}

if ! command -v trivy >/dev/null 2>&1; then
  echo "ERROR: trivy is not installed or not on PATH." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is not installed or not on PATH." >&2
  exit 1
fi

minimum_trivy_version="0.58.0"
if ! trivy_version_output="$(trivy --version 2>&1)"; then
  echo "ERROR: Failed to determine the Trivy version." >&2
  exit 1
fi
trivy_version="$(printf '%s\n' "$trivy_version_output" | sed -n 's/^Version: //p' | head -n 1)"
if ! python3 - "$trivy_version" "$minimum_trivy_version" <<'PY'
import re
import sys


def parse_version(value):
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", value or "")
    if not match:
        return None
    return tuple(int(part) for part in match.groups())


current = parse_version(sys.argv[1])
minimum = parse_version(sys.argv[2])
if current is None or minimum is None or current < minimum:
    raise SystemExit(1)
PY
then
  echo "ERROR: Trivy $minimum_trivy_version or newer is required; found ${trivy_version:-unknown}." >&2
  exit 1
fi

output_dir=""
images=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      output_dir="${2:-}"
      if [[ -z "$output_dir" ]]; then
        echo "ERROR: --output-dir requires a value." >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      images+=("$1")
      shift
      ;;
  esac
done

if [[ ${#images[@]} -eq 0 ]]; then
  usage >&2
  exit 1
fi

if [[ -z "$output_dir" ]]; then
  output_dir="$(mktemp -d "$PWD/trivy-image-scan.XXXXXX")"
else
  mkdir -p "$output_dir"
fi

echo "Refreshing Trivy vulnerability and Java DBs..."
if ! trivy clean --vuln-db --java-db >/dev/null 2>&1; then
  echo "ERROR: Failed to clear the cached Trivy databases." >&2
  exit 1
fi
if ! trivy image --download-db-only --skip-db-update=false 2>&1; then
  echo "ERROR: Failed to download Trivy vulnerability database." >&2
  exit 1
fi
if ! trivy image --download-java-db-only --skip-java-db-update=false 2>&1; then
  echo "ERROR: Failed to download Trivy Java database." >&2
  exit 1
fi

echo "Output directory: $output_dir"
echo "Scan mode: comprehensive vulnerabilities for OS and library packages"
echo "Ambient status/file filters and vulnerability exit-code overrides are disabled"

failed_images=()
trivy_scan_flags=(
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
)

for image in "${images[@]}"; do
  safe_name="$(python3 - "$image" <<'PY'
import hashlib
import re
import sys

image = sys.argv[1]
stem = re.sub(r"[^A-Za-z0-9._-]+", "_", image).strip("._-")[:120] or "image"
digest = hashlib.sha256(image.encode("utf-8")).hexdigest()[:12]
print(f"{stem}_{digest}")
PY
)"
  json_path="$output_dir/${safe_name}.json"

  echo
  echo "=== Scanning: $image ==="
  rm -f "$json_path"
  if ! trivy image "${trivy_scan_flags[@]}" --format json -o "$json_path" "$image" 2>&1; then
    echo "ERROR: Failed to scan $image" >&2
    failed_images+=("$image")
    continue
  fi

  if ! python3 - "$json_path" "$image" <<'PY'
import json
import sys
from collections import Counter

json_path, image = sys.argv[1], sys.argv[2]
with open(json_path, encoding="utf-8") as f:
    data = json.load(f)

counts = Counter()
findings = []
suppressed_counts = Counter()
suppressed_findings = []
package_inventory = Counter()
library_packages = {}


def remember_package(
    name,
    version,
    target,
    package_type,
    package_path=None,
    severity=None,
):
    if not name:
        return
    package_type = package_type or "unknown"
    target = target or "unknown"
    version = version or "unknown"
    package_path = package_path or "unknown"
    key = (package_type, target, package_path, name, version)
    entry = library_packages.setdefault(
        key,
        {
            "name": name,
            "versions": set(),
            "targets": set(),
            "types": set(),
            "paths": set(),
            "severities": Counter(),
        },
    )
    entry["versions"].add(version)
    entry["targets"].add(target)
    entry["types"].add(package_type)
    entry["paths"].add(package_path)
    if severity:
        entry["severities"][severity] += 1


for result in data.get("Results") or []:
    target = result.get("Target")
    result_class = result.get("Class") or "unknown"
    result_type = result.get("Type") or "unknown"
    result_group = f"{result_class}/{result_type}"
    is_library_package = result_class == "lang-pkgs"
    for pkg in result.get("Packages") or []:
        pkg_name = pkg.get("Name") or pkg.get("PkgName")
        if pkg_name:
            package_inventory[result_group] += 1
        if is_library_package:
            remember_package(
                pkg_name,
                pkg.get("Version") or pkg.get("InstalledVersion"),
                target,
                result_type,
                pkg.get("FilePath") or pkg.get("PkgPath"),
            )
    for vuln in result.get("Vulnerabilities") or []:
        severity = vuln.get("Severity") or "UNKNOWN"
        pkg_name = vuln.get("PkgName")
        counts[severity] += 1
        findings.append(
            {
                "severity": severity,
                "id": vuln.get("VulnerabilityID"),
                "pkg": pkg_name,
                "installed": vuln.get("InstalledVersion"),
                "fixed": vuln.get("FixedVersion"),
                "target": target,
            }
        )
        if is_library_package:
            remember_package(
                pkg_name,
                vuln.get("InstalledVersion"),
                target,
                result_type,
                vuln.get("PkgPath") or vuln.get("FilePath"),
                severity,
            )
    for modified in result.get("ExperimentalModifiedFindings") or []:
        if modified.get("Type") not in (None, "vulnerability"):
            continue
        finding = modified.get("Finding") or {}
        if not isinstance(finding, dict):
            continue
        severity = finding.get("Severity") or "UNKNOWN"
        suppressed_counts[severity] += 1
        suppressed_findings.append(
            {
                "severity": severity,
                "id": finding.get("VulnerabilityID"),
                "pkg": finding.get("PkgName"),
                "installed": finding.get("InstalledVersion"),
                "fixed": finding.get("FixedVersion"),
                "target": target,
                "path": finding.get("PkgPath") or finding.get("FilePath") or "unknown",
                "status": modified.get("Status") or "unknown",
                "statement": modified.get("Statement") or "n/a",
                "source": modified.get("Source") or "n/a",
            }
        )

order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
priority = {name: idx for idx, name in enumerate(order)}
findings.sort(key=lambda item: (priority.get(item["severity"], 99), item["pkg"] or "", item["id"] or ""))
suppressed_findings.sort(
    key=lambda item: (
        priority.get(item["severity"], 99),
        item["pkg"] or "",
        item["id"] or "",
    )
)

print(f"Image: {image}")
print("Severity summary:")
for severity in order:
    print(f"  {severity}: {counts.get(severity, 0)}")
print(f"  TOTAL: {sum(counts.values())}")

if findings:
    print("Top findings:")
    for item in findings[:10]:
        fixed = item["fixed"] or "n/a"
        print(
            f"  - [{item['severity']}] {item['id']} "
            f"pkg={item['pkg']} installed={item['installed']} fixed={fixed} target={item['target']}"
        )
else:
    print("Top findings:")
    print("  - none")

print("Suppressed findings:")
for severity in order:
    print(f"  {severity}: {suppressed_counts.get(severity, 0)}")
print(f"  TOTAL: {sum(suppressed_counts.values())}")
if suppressed_findings:
    print("  Top suppressed findings:")
    for item in suppressed_findings[:10]:
        fixed = item["fixed"] or "n/a"
        print(
            f"  - [{item['severity']}] {item['id']} "
            f"pkg={item['pkg']} installed={item['installed']} fixed={fixed} "
            f"target={item['target']} path={item['path']} "
            f"status={item['status']} statement={item['statement']} "
            f"source={item['source']}"
        )
else:
    print("  Top suppressed findings:")
    print("  - none")

all_counts = counts + suppressed_counts
print("All findings (active + suppressed):")
for severity in order:
    print(f"  {severity}: {all_counts.get(severity, 0)}")
print(f"  TOTAL: {sum(all_counts.values())}")

print("Package coverage:")
print("  Inventory by Trivy result class/type:")
if package_inventory:
    for group, count in sorted(package_inventory.items()):
        print(f"  - {group}: {count} package(s)")
else:
    print("  - none returned")

print("Library packages:")
if library_packages:
    ecosystems = Counter()
    for entry in library_packages.values():
        ecosystems.update(entry["types"])
    ecosystem_summary = ", ".join(
        f"{name}={count}" for name, count in sorted(ecosystems.items())
    )
    print(f"  Detected: {len(library_packages)} package(s) ({ecosystem_summary})")
    vulnerable_library_packages = [
        (key, entry)
        for key, entry in library_packages.items()
        if entry["severities"]
    ]
    if vulnerable_library_packages:
        print("  Vulnerable library packages:")
        for _, entry in sorted(
            vulnerable_library_packages,
            key=lambda item: (
                item[1]["name"],
                sorted(item[1]["types"]),
                sorted(item[1]["targets"]),
                sorted(item[1]["versions"]),
            ),
        )[:10]:
            name = entry["name"]
            versions = ", ".join(sorted(entry["versions"])) or "unknown"
            package_types = ", ".join(sorted(entry["types"])) or "unknown"
            targets = ", ".join(sorted(entry["targets"])) or "unknown"
            paths = ", ".join(sorted(entry["paths"])) or "unknown"
            severities = ", ".join(
                f"{severity}={count}"
                for severity, count in sorted(
                    entry["severities"].items(),
                    key=lambda item: priority.get(item[0], 99),
                )
            )
            print(
                f"  - {name}: type={package_types} "
                f"versions={versions} targets={targets} "
                f"paths={paths} findings={severities}"
            )
    else:
        print("  Vulnerable library packages: none")
else:
    print("  - none detected")
PY
  then
    echo "ERROR: Failed to summarize scan result for $image" >&2
    failed_images+=("$image")
    continue
  fi
done

echo
if [[ ${#failed_images[@]} -gt 0 ]]; then
  echo "WARNING: Failed to scan ${#failed_images[@]} image(s):" >&2
  for img in "${failed_images[@]}"; do
    echo "  - $img" >&2
  done
  echo "Partial raw JSON results are in: $output_dir" >&2
  exit 1
fi
echo "Done. Raw JSON results are in: $output_dir"
