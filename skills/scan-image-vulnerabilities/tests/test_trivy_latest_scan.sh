#!/usr/bin/env bash
set -euo pipefail

skill_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
scanner="$skill_dir/scripts/trivy_latest_scan.sh"
workspace="$(mktemp -d "${TMPDIR:-/tmp}/trivy-skill-test.XXXXXX")"
if [[ "${KEEP_TEST_WORKSPACE:-0}" == "1" ]]; then
  echo "Test workspace: $workspace"
else
  trap 'rm -rf "$workspace"' EXIT
fi

fake_bin="$workspace/bin"
mkdir -p "$fake_bin"

cat >"$fake_bin/trivy" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ "$1" == "clean" ]]; then
  exit 0
fi

if [[ "$1" != "image" ]]; then
  echo "unexpected trivy command: $*" >&2
  exit 90
fi

shift
if [[ "${1:-}" == "--download-db-only" ]]; then
  if [[ "${FAKE_DB_FAIL:-0}" == "1" ]]; then
    exit 1
  fi
  exit 0
fi

output=""
image=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o)
      output="$2"
      shift 2
      ;;
    --scanners|--format)
      shift 2
      ;;
    *)
      image="$1"
      shift
      ;;
  esac
done

printf '%s\n' "$image" >>"${FAKE_SCAN_LOG:?}"
if [[ "$image" == *broken* ]]; then
  exit 2
fi

mkdir -p "$(dirname "$output")"
cat >"$output" <<JSON
{"Results":[{"Target":"$image","Vulnerabilities":[]}]}
JSON
EOF
chmod +x "$fake_bin/trivy"

cat >"$fake_bin/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker must not be called for remote image scans" >&2
exit 99
EOF
chmod +x "$fake_bin/docker"

export PATH="$fake_bin:$PATH"
export FAKE_SCAN_LOG="$workspace/scans.log"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

test_db_failure_stops_scan() {
  : >"$FAKE_SCAN_LOG"
  if FAKE_DB_FAIL=1 bash "$scanner" --output-dir "$workspace/db-fail" registry.example.com/app:1 >"$workspace/db-fail.out" 2>&1; then
    fail "DB refresh failure returned success"
  fi
  [[ ! -s "$FAKE_SCAN_LOG" ]] || fail "image scan ran after DB refresh failure"
  grep -q "Failed to download" "$workspace/db-fail.out" || fail "DB failure was not reported"
}

test_partial_failure_is_nonzero() {
  : >"$FAKE_SCAN_LOG"
  if bash "$scanner" --output-dir "$workspace/partial" \
    registry.example.com/ok:1 registry.example.com/broken:1 \
    >"$workspace/partial.out" 2>&1; then
    fail "partial image failure returned success"
  fi
  [[ -f "$workspace/partial/registry.example.com_ok_1.json" ]] ||
    fail "successful image artifact was not retained"
  grep -q "registry.example.com/broken:1" "$workspace/partial.out" ||
    fail "failed image was not reported"
}

test_explicit_output_directory() {
  : >"$FAKE_SCAN_LOG"
  bash "$scanner" --output-dir "$workspace/explicit" registry.example.com/app:2 \
    >"$workspace/explicit.out" 2>&1
  [[ -f "$workspace/explicit/registry.example.com_app_2.json" ]] ||
    fail "explicit output directory was not honored"
}

test_default_output_is_workspace_controlled() {
  : >"$FAKE_SCAN_LOG"
  mkdir -p "$workspace/project"
  (
    cd "$workspace/project"
    bash "$scanner" registry.example.com/app:3 >"$workspace/default.out" 2>&1
  )
  output_dir="$(sed -n 's/^Output directory: //p' "$workspace/default.out")"
  [[ "$output_dir" == "$workspace/project/"* ]] ||
    fail "default output directory is not controlled by the working repository"
  [[ -f "$output_dir/registry.example.com_app_3.json" ]] ||
    fail "default output artifact is missing"
}

test_remote_scan_does_not_require_docker() {
  : >"$FAKE_SCAN_LOG"
  bash "$scanner" --output-dir "$workspace/remote" registry.example.com/app:4 \
    >"$workspace/remote.out" 2>&1
}

test_db_failure_stops_scan
test_partial_failure_is_nonzero
test_explicit_output_directory
test_default_output_is_workspace_controlled
test_remote_scan_does_not_require_docker

echo "All scanner tests passed."
