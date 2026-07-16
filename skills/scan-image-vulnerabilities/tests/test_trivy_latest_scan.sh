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
if [[ "${FAKE_SCAN_FAIL:-0}" == "1" ]]; then
  exit 2
fi
if [[ -n "${FAKE_FAIL_IMAGE:-}" && "$image" == "$FAKE_FAIL_IMAGE" ]]; then
  exit 2
fi

mkdir -p "$(dirname "$output")"
if [[ "$image" == *invalid-json* ]]; then
  printf '{' >"$output"
  exit 0
fi
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
  [[ "$(find "$workspace/partial" -name '*.json' | wc -l | tr -d ' ')" == "1" ]] ||
    fail "successful image artifact was not retained"
  grep -q "registry.example.com/broken:1" "$workspace/partial.out" ||
    fail "failed image was not reported"
}

test_explicit_output_directory() {
  : >"$FAKE_SCAN_LOG"
  bash "$scanner" --output-dir "$workspace/explicit" registry.example.com/app:2 \
    >"$workspace/explicit.out" 2>&1
  [[ "$(find "$workspace/explicit" -name '*.json' | wc -l | tr -d ' ')" == "1" ]] ||
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
  project_dir="$(cd "$workspace/project" && pwd -L)"
  [[ "$output_dir" == "$project_dir/"* ]] ||
    fail "default output directory is not controlled by the working repository"
  [[ "$(find "$output_dir" -name '*.json' | wc -l | tr -d ' ')" == "1" ]] ||
    fail "default output artifact is missing"
}

test_remote_scan_does_not_require_docker() {
  : >"$FAKE_SCAN_LOG"
  "$scanner" --output-dir "$workspace/remote" registry.example.com/app:4 \
    >"$workspace/remote.out" 2>&1
}

test_summary_failure_is_reported() {
  : >"$FAKE_SCAN_LOG"
  if "$scanner" --output-dir "$workspace/invalid-json" registry.example.com/invalid-json:1 \
    >"$workspace/invalid-json.out" 2>&1; then
    fail "invalid scan JSON returned success"
  fi
  [[ "$(find "$workspace/invalid-json" -name '*.json' | wc -l | tr -d ' ')" == "1" ]] ||
    fail "invalid raw JSON artifact was not retained"
  grep -q "Failed to summarize" "$workspace/invalid-json.out" ||
    fail "summary failure was not reported"
}

test_colliding_safe_names_do_not_overwrite() {
  : >"$FAKE_SCAN_LOG"
  "$scanner" --output-dir "$workspace/collisions" \
    registry.example.com/team/app:1 registry.example.com/team/app@1 \
    >"$workspace/collisions.out" 2>&1
  [[ "$(find "$workspace/collisions" -name '*.json' | wc -l | tr -d ' ')" == "2" ]] ||
    fail "collision-prone artifacts did not remain distinct"
}

test_long_image_reference_has_bounded_filename() {
  : >"$FAKE_SCAN_LOG"
  long_segment="$(printf 'a%.0s' {1..250})"
  "$scanner" --output-dir "$workspace/long-name" \
    "registry.example.com/$long_segment:1" \
    >"$workspace/long-name.out" 2>&1
  artifact="$(find "$workspace/long-name" -name '*.json' -print -quit)"
  [[ -n "$artifact" ]] || fail "long image reference artifact is missing"
  artifact_name="${artifact##*/}"
  [[ ${#artifact_name} -le 255 ]] ||
    fail "long image reference produced an oversized filename"
}

test_failed_rescan_removes_stale_artifact() {
  : >"$FAKE_SCAN_LOG"
  "$scanner" --output-dir "$workspace/rescan" registry.example.com/app:5 \
    >"$workspace/rescan-first.out" 2>&1
  [[ "$(find "$workspace/rescan" -name '*.json' | wc -l | tr -d ' ')" == "1" ]] ||
    fail "initial rescan artifact is missing"
  if FAKE_SCAN_FAIL=1 "$scanner" --output-dir "$workspace/rescan" registry.example.com/app:5 \
    >"$workspace/rescan-second.out" 2>&1; then
    fail "failed rescan returned success"
  fi
  [[ "$(find "$workspace/rescan" -name '*.json' | wc -l | tr -d ' ')" == "0" ]] ||
    fail "failed rescan left a stale artifact"
}

test_reordered_rescan_removes_stale_artifact() {
  : >"$FAKE_SCAN_LOG"
  image_a="registry.example.com/image-a:1"
  image_b="registry.example.com/image-b:1"
  "$scanner" --output-dir "$workspace/reordered" "$image_a" "$image_b" \
    >"$workspace/reordered-first.out" 2>&1
  b_artifact="$(find "$workspace/reordered" -name '*image-b*json' -print -quit)"
  [[ -n "$b_artifact" ]] || fail "initial image B artifact is missing"
  if FAKE_FAIL_IMAGE="$image_b" "$scanner" --output-dir "$workspace/reordered" \
    "$image_b" "$image_a" >"$workspace/reordered-second.out" 2>&1; then
    fail "reordered partial failure returned success"
  fi
  [[ ! -e "$b_artifact" ]] || fail "reordered failed image retained stale JSON"
  [[ "$(find "$workspace/reordered" -name '*image-a*json' | wc -l | tr -d ' ')" == "1" ]] ||
    fail "successful reordered image artifact is missing"
}

test_db_failure_stops_scan
test_partial_failure_is_nonzero
test_explicit_output_directory
test_default_output_is_workspace_controlled
test_remote_scan_does_not_require_docker
test_summary_failure_is_reported
test_colliding_safe_names_do_not_overwrite
test_long_image_reference_has_bounded_filename
test_failed_rescan_removes_stale_artifact
test_reordered_rescan_removes_stale_artifact

echo "All scanner tests passed."
