#!/usr/bin/env python3

import argparse
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Tuple

ADO_RESOURCE = "499b84ac-1321-427f-aa17-267ca6975798"
ROOT_CAUSE_PATTERNS = [
    r"AssertionError.*",
    r"FAILED\s+.+",
    r"##\[error\].*",
    r"Bash exited with code '.+'",
    r"Traceback \(most recent call last\):",
    r".*Exception:.*",
]


def run(cmd: List[str]) -> Tuple[int, str, str]:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.returncode, proc.stdout, proc.stderr


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def get_token() -> str:
    code, stdout, stderr = run(
        [
            "az",
            "account",
            "get-access-token",
            "--resource",
            ADO_RESOURCE,
            "--query",
            "accessToken",
            "-o",
            "tsv",
        ]
    )
    if code != 0 or not stdout.strip():
        fail(f"Failed to get Azure DevOps access token: {stderr.strip()}")
    return stdout.strip()


def fetch_json(url: str, token: str) -> Dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_text(url: str, token: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "text/plain"},
    )
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read().decode("utf-8", errors="replace")


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def safe_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("_") or "record"


def build_path(record_id: str, by_id: Dict[str, Dict[str, Any]]) -> List[str]:
    path: List[str] = []
    current = by_id.get(record_id)
    while current:
        path.append(current.get("name") or current.get("type") or current.get("id"))
        parent_id = current.get("parentId")
        current = by_id.get(parent_id) if parent_id else None
    return list(reversed(path))


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect a failed Azure DevOps build.")
    parser.add_argument("--build-id", required=True, help="Build id to inspect")
    parser.add_argument("--project", required=True, help="Project name, for example 'O365 Core'")
    parser.add_argument("--output-dir", required=True, help="Directory to write artifacts into")
    parser.add_argument(
        "--org",
        required=True,
        help="Azure DevOps org or collection URL",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    token = get_token()
    quoted_project = urllib.parse.quote(args.project, safe="")
    collection_url = args.org.rstrip("/")
    build_url = f"{collection_url}/{quoted_project}/_apis/build/builds/{args.build_id}?api-version=7.1-preview.7"
    timeline_url = (
        f"{collection_url}/{quoted_project}/_apis/build/builds/{args.build_id}/timeline?api-version=7.1-preview.2"
    )

    build = fetch_json(build_url, token)
    timeline = fetch_json(timeline_url, token)
    write_json(output_dir / "build.json", build)
    write_json(output_dir / "timeline.json", timeline)

    records = timeline.get("records") or []
    by_id = {record.get("id"): record for record in records}
    interesting: List[Dict[str, Any]] = []

    for record in records:
        result = record.get("result")
        issues = record.get("issues") or []
        if result in {"failed", "canceled", "partiallySucceeded"} or issues:
            row = {
                "id": record.get("id"),
                "parentId": record.get("parentId"),
                "type": record.get("type"),
                "name": record.get("name"),
                "state": record.get("state"),
                "result": result,
                "order": record.get("order"),
                "workerName": record.get("workerName"),
                "issues": issues,
                "log": record.get("log"),
                "path": build_path(record.get("id"), by_id),
            }
            interesting.append(row)

    write_json(output_dir / "interesting_records.json", interesting)

    root_cause_candidates: List[Dict[str, Any]] = []
    for index, record in enumerate(interesting, start=1):
        log = record.get("log") or {}
        log_url = log.get("url")
        if not log_url:
            continue
        log_text = fetch_text(f"{log_url}?api-version=7.1-preview.2", token)
        log_name = f"log_{index}_{safe_name(record.get('name') or 'record')}.txt"
        write_text(output_dir / log_name, log_text)

        lines = log_text.splitlines()
        matches: List[Dict[str, Any]] = []
        for line_index, line in enumerate(lines):
            if any(re.search(pattern, line) for pattern in ROOT_CAUSE_PATTERNS):
                start = max(0, line_index - 2)
                end = min(len(lines), line_index + 3)
                snippet = "\n".join(lines[start:end])
                matches.append({"line": line_index + 1, "snippet": snippet})
            if len(matches) >= 8:
                break

        root_cause_candidates.append(
            {
                "record_name": record.get("name"),
                "record_type": record.get("type"),
                "result": record.get("result"),
                "path": record.get("path"),
                "matches": matches,
            }
        )

    write_json(output_dir / "root_cause_candidates.json", root_cause_candidates)

    summary = {
        "build": {
            "id": build.get("id"),
            "definition": ((build.get("definition") or {}).get("name")),
            "status": build.get("status"),
            "result": build.get("result"),
            "queueTime": build.get("queueTime"),
            "startTime": build.get("startTime"),
            "finishTime": build.get("finishTime"),
            "webUrl": ((build.get("_links") or {}).get("web") or {}).get("href"),
        },
        "failed_records": interesting,
        "root_cause_candidates": root_cause_candidates,
    }
    write_json(output_dir / "summary.json", summary)

    lines = [
        f"build_id={summary['build']['id']}",
        f"definition={summary['build']['definition']}",
        f"status={summary['build']['status']}",
        f"result={summary['build']['result']}",
        f"queueTime={summary['build']['queueTime']}",
        f"startTime={summary['build']['startTime']}",
        f"finishTime={summary['build']['finishTime']}",
        "",
        "failed_records:",
    ]
    for record in interesting:
        lines.append(
            json.dumps(
                {
                    "path": record.get("path"),
                    "type": record.get("type"),
                    "name": record.get("name"),
                    "result": record.get("result"),
                    "issues": record.get("issues"),
                },
                ensure_ascii=False,
            )
        )
    lines.extend(["", "root_cause_candidates:"])
    for candidate in root_cause_candidates:
        lines.append(json.dumps(candidate, ensure_ascii=False))
    write_text(output_dir / "summary.txt", "\n".join(lines))

    print(output_dir)


if __name__ == "__main__":
    main()
