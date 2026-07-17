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

if [[ "$1" == "--version" ]]; then
  echo "Version: ${FAKE_TRIVY_VERSION:-0.72.0}"
  exit 0
fi

if [[ "$1" == "clean" ]]; then
  if [[ "${FAKE_CLEAN_FAIL:-0}" == "1" ]]; then
    exit 1
  fi
  exit 0
fi

if [[ "$1" != "image" ]]; then
  echo "unexpected trivy command: $*" >&2
  exit 90
fi

shift
if [[ "${1:-}" == "--download-db-only" ]]; then
  if [[ "${FAKE_REQUIRE_REFRESH_OVERRIDE:-0}" == "1" && "${2:-}" != "--skip-db-update=false" ]]; then
    exit 14
  fi
  if [[ "${FAKE_DB_FAIL:-0}" == "1" ]]; then
    exit 1
  fi
  exit 0
fi
if [[ "${1:-}" == "--download-java-db-only" ]]; then
  if [[ "${FAKE_REQUIRE_REFRESH_OVERRIDE:-0}" == "1" && "${2:-}" != "--skip-java-db-update=false" ]]; then
    exit 15
  fi
  if [[ "${FAKE_JAVA_DB_FAIL:-0}" == "1" ]]; then
    exit 1
  fi
  exit 0
fi

output=""
image=""
list_all_packages=0
pkg_types=""
pkg_relationships=""
detection_priority=""
online_scan=0
severity_filter=""
include_unfixed=0
show_suppressed=0
update_db=0
update_java_db=0
ignore_status_reset=0
skip_dirs_reset=0
skip_files_reset=0
exit_code=""
exit_on_eol=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o)
      output="$2"
      shift 2
      ;;
    --scanners|--format)
      shift 2
      ;;
    --pkg-types)
      pkg_types="$2"
      shift 2
      ;;
    --pkg-relationships)
      pkg_relationships="$2"
      shift 2
      ;;
    --detection-priority)
      detection_priority="$2"
      shift 2
      ;;
    --offline-scan=false)
      online_scan=1
      shift
      ;;
    --severity)
      severity_filter="$2"
      shift 2
      ;;
    --ignore-unfixed=false)
      include_unfixed=1
      shift
      ;;
    --ignore-status=)
      ignore_status_reset=1
      shift
      ;;
    --skip-dirs=)
      skip_dirs_reset=1
      shift
      ;;
    --skip-files=)
      skip_files_reset=1
      shift
      ;;
    --skip-db-update=false)
      update_db=1
      shift
      ;;
    --skip-java-db-update=false)
      update_java_db=1
      shift
      ;;
    --show-suppressed)
      show_suppressed=1
      shift
      ;;
    --list-all-pkgs)
      list_all_packages=1
      shift
      ;;
    --exit-code)
      exit_code="$2"
      shift 2
      ;;
    --exit-on-eol)
      exit_on_eol="$2"
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
if [[ "${FAKE_REQUIRE_LIST_ALL:-0}" == "1" && "$list_all_packages" != "1" ]]; then
  exit 3
fi
if [[ "${FAKE_REQUIRE_COMPREHENSIVE:-0}" == "1" ]]; then
  [[ "$pkg_types" == "os,library" ]] || exit 4
  [[ "$pkg_relationships" == "unknown,root,workspace,direct,indirect" ]] || exit 16
  [[ "$detection_priority" == "comprehensive" ]] || exit 5
  [[ "$online_scan" == "1" ]] || exit 17
  [[ "$severity_filter" == "UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL" ]] || exit 6
  [[ "$include_unfixed" == "1" ]] || exit 7
  [[ "$show_suppressed" == "1" ]] || exit 8
  [[ "$list_all_packages" == "1" ]] || exit 9
  [[ "$update_db" == "1" ]] || exit 14
  [[ "$update_java_db" == "1" ]] || exit 15
fi
if [[ "${FAKE_REQUIRE_FILTER_RESET:-0}" == "1" ]]; then
  [[ "$ignore_status_reset" == "1" ]] || exit 10
  [[ "$skip_dirs_reset" == "1" ]] || exit 11
  [[ "$skip_files_reset" == "1" ]] || exit 12
  [[ "$exit_code" == "0" ]] || exit 13
  [[ "$exit_on_eol" == "0" ]] || exit 18
fi
if [[ "$image" == *invalid-json* ]]; then
  printf '{' >"$output"
  exit 0
fi
if [[ "$image" == *coverage* ]]; then
  cat >"$output" <<JSON
{
  "Results": [
    {
      "Target": "alpine",
      "Class": "os-pkgs",
      "Type": "alpine",
      "Packages": [
        {"Name": "busybox", "Version": "1.36.1"}
      ],
      "Vulnerabilities": []
    },
    {
      "Target": "app/node_modules",
      "Class": "lang-pkgs",
      "Type": "npm",
      "Packages": [
        {"Name": "lodash", "Version": "4.17.20"},
        {"Name": "express", "Version": "4.18.2"},
        {"Name": "minipass", "Version": "3.3.6", "FilePath": "node_modules/a/node_modules/minipass"},
        {"Name": "minipass", "Version": "3.3.6", "FilePath": "node_modules/b/node_modules/minipass"}
      ],
      "Vulnerabilities": [
        {
          "VulnerabilityID": "CVE-2021-23337",
          "PkgName": "lodash",
          "InstalledVersion": "4.17.20",
          "FixedVersion": "4.17.21",
          "Severity": "HIGH"
        }
      ],
      "ExperimentalModifiedFindings": [
        {
          "Type": "vulnerability",
          "Status": "not_affected",
          "Statement": "vulnerable_code_not_in_execute_path",
          "Source": "test.vex",
          "Finding": {
            "VulnerabilityID": "CVE-2020-7598",
            "PkgName": "minimist",
            "InstalledVersion": "1.2.0",
            "FixedVersion": "1.2.2",
            "PkgPath": "node_modules/minimist",
            "Severity": "CRITICAL"
          }
        }
      ]
    },
    {
      "Target": "app/vendor",
      "Class": "lang-pkgs",
      "Type": "npm",
      "Packages": [
        {"Name": "lodash", "Version": "3.10.1"}
      ],
      "Vulnerabilities": []
    }
  ]
}
JSON
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

test_old_trivy_version_stops_before_db_refresh() {
  : >"$FAKE_SCAN_LOG"
  if FAKE_TRIVY_VERSION=0.57.2 bash "$scanner" --output-dir "$workspace/old-version" \
    registry.example.com/app:1 >"$workspace/old-version.out" 2>&1; then
    fail "unsupported Trivy version returned success"
  fi
  [[ ! -s "$FAKE_SCAN_LOG" ]] || fail "image scan ran with unsupported Trivy"
  grep -q "Trivy 0.58.0 or newer is required" "$workspace/old-version.out" ||
    fail "minimum Trivy version failure was not reported"
}

test_db_clean_failure_stops_scan() {
  : >"$FAKE_SCAN_LOG"
  if FAKE_CLEAN_FAIL=1 bash "$scanner" --output-dir "$workspace/db-clean-fail" \
    registry.example.com/app:1 >"$workspace/db-clean-fail.out" 2>&1; then
    fail "DB clean failure returned success"
  fi
  [[ ! -s "$FAKE_SCAN_LOG" ]] || fail "image scan ran after DB clean failure"
  grep -q "Failed to clear" "$workspace/db-clean-fail.out" ||
    fail "DB clean failure was not reported"
}

test_java_db_failure_stops_scan() {
  : >"$FAKE_SCAN_LOG"
  if FAKE_JAVA_DB_FAIL=1 bash "$scanner" --output-dir "$workspace/java-db-fail" \
    registry.example.com/app:1 >"$workspace/java-db-fail.out" 2>&1; then
    fail "Java DB refresh failure returned success"
  fi
  [[ ! -s "$FAKE_SCAN_LOG" ]] || fail "image scan ran after Java DB failure"
  grep -q "Failed to download Trivy Java database" "$workspace/java-db-fail.out" ||
    fail "Java DB failure was not reported"
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

test_package_coverage_is_reported() {
  : >"$FAKE_SCAN_LOG"
  FAKE_REQUIRE_LIST_ALL=1 FAKE_REQUIRE_COMPREHENSIVE=1 \
    "$scanner" --output-dir "$workspace/coverage" \
    registry.example.com/coverage:1 >"$workspace/coverage.out" 2>&1
  grep -q "Scan mode: comprehensive vulnerabilities for OS and library packages" \
    "$workspace/coverage.out" ||
    fail "comprehensive scan mode was not reported"
  grep -q "os-pkgs/alpine: 1 package(s)" "$workspace/coverage.out" ||
    fail "OS package inventory was not reported"
  grep -q "lang-pkgs/npm: 5 package(s)" "$workspace/coverage.out" ||
    fail "language package inventory was not reported"
  grep -q "Detected: 5 package(s) (npm=5)" "$workspace/coverage.out" ||
    fail "language ecosystem summary was not reported"
  grep -q "lodash: type=npm versions=4.17.20 targets=app/node_modules.*findings=HIGH=1" \
    "$workspace/coverage.out" ||
    fail "vulnerable library package summary was not reported"
  grep -q "Suppressed findings:" "$workspace/coverage.out" ||
    fail "suppressed findings section was not reported"
  awk '
    /Suppressed findings:/ { in_suppressed = 1; next }
    in_suppressed && /TOTAL: 1/ { found = 1; exit }
    END { exit !found }
  ' "$workspace/coverage.out" ||
    fail "suppressed finding total was not reported"
  grep -q "CVE-2020-7598.*pkg=minimist.*target=app/node_modules.*path=node_modules/minimist.*status=not_affected" \
    "$workspace/coverage.out" ||
    fail "suppressed vulnerability details were not reported"
  awk '
    /All findings \(active \+ suppressed\):/ { in_all = 1; next }
    in_all && /TOTAL: 2/ { found = 1; exit }
    END { exit !found }
  ' "$workspace/coverage.out" ||
    fail "combined active and suppressed total was not reported"
}

test_ambient_filters_are_overridden() {
  : >"$FAKE_SCAN_LOG"
  TRIVY_IGNORE_STATUS=fixed \
  TRIVY_PKG_RELATIONSHIPS=direct \
  TRIVY_OFFLINE_SCAN=true \
  TRIVY_SKIP_DIRS=node_modules \
  TRIVY_SKIP_FILES=package-lock.json \
  TRIVY_EXIT_CODE=7 \
  TRIVY_EXIT_ON_EOL=9 \
  FAKE_REQUIRE_FILTER_RESET=1 \
    "$scanner" --output-dir "$workspace/filter-reset" \
    registry.example.com/app:6 >"$workspace/filter-reset.out" 2>&1
  grep -q "Ambient status/file filters" "$workspace/filter-reset.out" ||
    fail "ambient filter reset was not reported"
}

test_ambient_db_skip_is_overridden() {
  : >"$FAKE_SCAN_LOG"
  TRIVY_SKIP_DB_UPDATE=true \
  TRIVY_SKIP_JAVA_DB_UPDATE=true \
  FAKE_REQUIRE_REFRESH_OVERRIDE=1 \
    "$scanner" --output-dir "$workspace/db-skip-reset" \
    registry.example.com/app:7 >"$workspace/db-skip-reset.out" 2>&1
}

test_db_failure_stops_scan
test_old_trivy_version_stops_before_db_refresh
test_db_clean_failure_stops_scan
test_java_db_failure_stops_scan
test_partial_failure_is_nonzero
test_explicit_output_directory
test_default_output_is_workspace_controlled
test_remote_scan_does_not_require_docker
test_summary_failure_is_reported
test_colliding_safe_names_do_not_overwrite
test_long_image_reference_has_bounded_filename
test_failed_rescan_removes_stale_artifact
test_reordered_rescan_removes_stale_artifact
test_package_coverage_is_reported
test_ambient_filters_are_overridden
test_ambient_db_skip_is_overridden

echo "All scanner tests passed."
