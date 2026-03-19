#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  trivy_latest_scan.sh [--output-dir DIR] <image> [more-images...]

Examples:
  trivy_latest_scan.sh sandbox-orchestrator:dev
  trivy_latest_scan.sh --output-dir /tmp/trivy-results mcr.microsoft.com/hello-world:latest
EOF
}

if ! command -v trivy >/dev/null 2>&1; then
  echo "ERROR: trivy is not installed or not on PATH." >&2
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
  output_dir="$(mktemp -d /tmp/trivy-image-scan.XXXXXX)"
else
  mkdir -p "$output_dir"
fi

echo "Refreshing Trivy vulnerability DB..."
trivy clean --vuln-db >/dev/null 2>&1 || true
if ! trivy image --download-db-only 2>&1; then
  echo "ERROR: Failed to download Trivy vulnerability database." >&2
  exit 1
fi

echo "Output directory: $output_dir"

failed_images=()

for image in "${images[@]}"; do
  safe_name="$(printf '%s' "$image" | tr '/:@' '___')"
  json_path="$output_dir/${safe_name}.json"

  echo
  echo "=== Scanning: $image ==="
  if ! trivy image --scanners vuln --format json -o "$json_path" "$image" 2>&1; then
    echo "ERROR: Failed to scan $image" >&2
    failed_images+=("$image")
    continue
  fi

  python3 - <<'PY' "$json_path" "$image"
import json
import sys
from collections import Counter

json_path, image = sys.argv[1], sys.argv[2]
with open(json_path, encoding="utf-8") as f:
    data = json.load(f)

counts = Counter()
findings = []
for result in data.get("Results", []):
    target = result.get("Target")
    for vuln in result.get("Vulnerabilities") or []:
        severity = vuln.get("Severity", "UNKNOWN")
        counts[severity] += 1
        findings.append(
            {
                "severity": severity,
                "id": vuln.get("VulnerabilityID"),
                "pkg": vuln.get("PkgName"),
                "installed": vuln.get("InstalledVersion"),
                "fixed": vuln.get("FixedVersion"),
                "target": target,
            }
        )

order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
priority = {name: idx for idx, name in enumerate(order)}
findings.sort(key=lambda item: (priority.get(item["severity"], 99), item["pkg"] or "", item["id"] or ""))

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
PY
done

echo
if [[ ${#failed_images[@]} -gt 0 ]]; then
  echo "WARNING: Failed to scan ${#failed_images[@]} image(s):" >&2
  for img in "${failed_images[@]}"; do
    echo "  - $img" >&2
  done
fi
echo "Done. Raw JSON results are in: $output_dir"
