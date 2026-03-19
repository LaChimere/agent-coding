#!/usr/bin/env python3

import argparse
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ADO_RESOURCE = "499b84ac-1321-427f-aa17-267ca6975798"


def run(cmd: List[str]) -> Tuple[int, str, str]:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.returncode, proc.stdout, proc.stderr


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def parse_pr_id(value: str) -> str:
    stripped = value.strip()
    if stripped.isdigit():
        return stripped
    match = re.search(r"/pullrequest/(\d+)", stripped)
    if match:
        return match.group(1)
    fail(f"Could not extract a pull request id from: {value}")
    return ""


def derive_collection_url(show: Dict[str, Any], supplied_org: Optional[str]) -> str:
    if supplied_org:
        return supplied_org.rstrip("/")

    repo = show.get("repository") or {}
    candidates = [repo.get("remoteUrl"), repo.get("webUrl")]
    for candidate in candidates:
        if not candidate:
            continue
        parsed = urllib.parse.urlparse(candidate)
        parts = [part for part in parsed.path.split("/") if part]
        if parts and parts[0] == "DefaultCollection":
            return f"{parsed.scheme}://{parsed.netloc}/DefaultCollection"
        return f"{parsed.scheme}://{parsed.netloc}"

    fail("Could not derive the Azure DevOps collection URL from PR metadata.")
    return ""


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
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def extract_build_ids(statuses: Dict[str, Any]) -> List[int]:
    build_ids: List[int] = []
    for status in statuses.get("value") or []:
        target_url = status.get("targetUrl") or ""
        match = re.search(r"buildId=(\d+)", target_url)
        if match:
            build_ids.append(int(match.group(1)))
    return sorted(set(build_ids), reverse=True)


def latest_by_definition(builds: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    latest: Dict[str, Dict[str, Any]] = {}
    for build in sorted(builds, key=lambda item: int(item.get("id", 0)), reverse=True):
        definition_name = ((build.get("definition") or {}).get("name")) or f"build-{build.get('id')}"
        if definition_name not in latest:
            latest[definition_name] = {
                "id": build.get("id"),
                "definition": definition_name,
                "status": build.get("status"),
                "result": build.get("result"),
                "queueTime": build.get("queueTime"),
                "startTime": build.get("startTime"),
                "finishTime": build.get("finishTime"),
                "sourceBranch": build.get("sourceBranch"),
                "webUrl": ((build.get("_links") or {}).get("web") or {}).get("href"),
            }
    return list(latest.values())


def summarize_comments(threads: Dict[str, Any]) -> Dict[str, Any]:
    total_comments = 0
    non_system_comments = 0
    system_comments = 0
    ai_assistant_comments = 0

    for thread in threads.get("value") or []:
        for comment in thread.get("comments") or []:
            if comment.get("isDeleted"):
                continue
            total_comments += 1
            comment_type = comment.get("commentType")
            author = (comment.get("author") or {}).get("displayName") or ""
            content = comment.get("content") or ""

            if comment_type == "system":
                system_comments += 1
            else:
                non_system_comments += 1

            if "AI Code Review" in content or "GitOpsUserAgent" in content or author.startswith("GitOps"):
                ai_assistant_comments += 1

    return {
        "thread_count": len(threads.get("value") or []),
        "comment_count": total_comments,
        "non_system_comment_count": non_system_comments,
        "system_comment_count": system_comments,
        "ai_assistant_comment_count": ai_assistant_comments,
    }


def summarize_statuses(statuses: Dict[str, Any]) -> List[Dict[str, Any]]:
    seen = set()
    items: List[Dict[str, Any]] = []
    for status in statuses.get("value") or []:
        context = status.get("context") or {}
        row = {
            "genre": context.get("genre"),
            "name": context.get("name"),
            "state": status.get("state"),
            "description": status.get("description"),
            "targetUrl": status.get("targetUrl"),
        }
        key = (
            row["genre"],
            row["name"],
            row["state"],
            row["description"],
            row["targetUrl"],
        )
        if key in seen:
            continue
        seen.add(key)
        items.append(row)
    return items


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Azure DevOps PR details through az + REST.")
    parser.add_argument("--pr", required=True, help="PR URL or numeric PR id")
    parser.add_argument("--output-dir", required=True, help="Directory to write artifacts into")
    parser.add_argument("--org", help="Optional Azure DevOps org or collection URL")
    parser.add_argument("--max-builds", type=int, default=30, help="Maximum linked builds to fetch")
    args = parser.parse_args()

    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    pr_id = parse_pr_id(args.pr)

    pr_show_cmd = ["az", "repos", "pr", "show", "--id", pr_id, "-o", "json"]
    if args.org:
        pr_show_cmd.extend(["--org", args.org])
    code, stdout, stderr = run(pr_show_cmd)
    write_text(output_dir / "pr_show.stderr.txt", stderr)
    if code != 0:
        fail(f"Failed to fetch PR metadata with az repos pr show: {stderr.strip()}")

    show = json.loads(stdout)
    write_json(output_dir / "pr_show.json", show)

    collection_url = derive_collection_url(show, args.org)
    project = ((show.get("repository") or {}).get("project") or {}).get("name")
    repo_id = (show.get("repository") or {}).get("id")
    if not project or not repo_id:
        fail("PR metadata did not include repository id and project name.")

    quoted_project = urllib.parse.quote(project, safe="")
    token = get_token()

    base_git = f"{collection_url}/{quoted_project}/_apis/git/repositories/{repo_id}/pullRequests/{pr_id}"
    threads = fetch_json(f"{base_git}/threads?api-version=7.1-preview.1", token)
    iterations = fetch_json(f"{base_git}/iterations?api-version=7.1-preview.1", token)
    statuses = fetch_json(f"{base_git}/statuses?api-version=7.1-preview.1", token)
    commits = fetch_json(f"{base_git}/commits?api-version=7.1-preview.1", token)

    latest_iteration_id = None
    iteration_values = iterations.get("value") or []
    if iteration_values:
        latest_iteration_id = max(item.get("id", 0) for item in iteration_values)
        changes = fetch_json(
            f"{base_git}/iterations/{latest_iteration_id}/changes?api-version=7.1-preview.1&%24top=2000",
            token,
        )
    else:
        changes = {"count": 0, "value": []}

    policy_cmd = ["az", "repos", "pr", "policy", "list", "--id", pr_id, "-o", "json"]
    if args.org:
        policy_cmd.extend(["--org", args.org])
    policy_code, policy_stdout, policy_stderr = run(policy_cmd)
    write_text(output_dir / "policies.stderr.txt", policy_stderr)
    policies: Any
    if policy_code == 0:
        policies = json.loads(policy_stdout)
    else:
        policies = {"error": policy_stderr.strip(), "returncode": policy_code}

    build_ids = extract_build_ids(statuses)[: args.max_builds]
    builds: List[Dict[str, Any]] = []
    for build_id in build_ids:
        build_url = f"{collection_url}/{quoted_project}/_apis/build/builds/{build_id}?api-version=7.1-preview.7"
        try:
            builds.append(fetch_json(build_url, token))
        except Exception as exc:  # noqa: BLE001
            builds.append({"id": build_id, "error": str(exc)})

    write_json(output_dir / "threads.json", threads)
    write_json(output_dir / "iterations.json", iterations)
    write_json(output_dir / "statuses.json", statuses)
    write_json(output_dir / "commits.json", commits)
    write_json(output_dir / "changes.json", changes)
    write_json(output_dir / "policies.json", policies)
    write_json(output_dir / "builds.json", builds)

    changed_paths: List[str] = []
    for change in (
        changes.get("changeEntries")
        or changes.get("changes")
        or changes.get("value")
        or []
    ):
        item = change.get("item") or {}
        path = item.get("path")
        if path:
            changed_paths.append(path)
    changed_paths = sorted(set(changed_paths))

    policy_highlights: List[Dict[str, Any]] = []
    if isinstance(policies, list):
        for policy in policies:
            configuration = policy.get("configuration") or {}
            policy_type = configuration.get("type") or {}
            policy_highlights.append(
                {
                    "type": policy_type.get("displayName"),
                    "status": policy.get("status"),
                    "isBlocking": configuration.get("isBlocking"),
                    "isEnabled": configuration.get("isEnabled"),
                }
            )

    latest_builds = latest_by_definition([build for build in builds if "definition" in build])
    failed_or_canceled = [
        build
        for build in latest_builds
        if build.get("result") in {"failed", "canceled", "partiallySucceeded"}
        or build.get("status") not in {None, "completed"}
    ]

    summary = {
        "pullRequestId": int(pr_id),
        "title": show.get("title"),
        "status": show.get("status"),
        "repo": (show.get("repository") or {}).get("name"),
        "project": project,
        "collectionUrl": collection_url,
        "source": show.get("sourceRefName"),
        "target": show.get("targetRefName"),
        "reviewActivity": summarize_comments(threads),
        "changes": {
            "iteration_count": len(iteration_values),
            "latest_iteration_id": latest_iteration_id,
            "commit_count": len(commits.get("value") or []),
            "changed_file_count": len(changed_paths),
            "changed_files": changed_paths,
        },
        "ci": {
            "status_count": len(statuses.get("value") or []),
            "policy_count": len(policies) if isinstance(policies, list) else None,
            "status_highlights": summarize_statuses(statuses),
            "policy_highlights": policy_highlights,
            "latest_builds_by_definition": latest_builds,
            "failed_or_unfinished_builds": failed_or_canceled,
        },
    }

    write_json(output_dir / "summary.json", summary)

    lines = [
        f"title={summary['title']}",
        f"status={summary['status']}",
        f"repo={summary['repo']}",
        f"source={summary['source']}",
        f"target={summary['target']}",
        f"threads={summary['reviewActivity']['thread_count']}",
        f"comments={summary['reviewActivity']['comment_count']}",
        f"human_comments={summary['reviewActivity']['non_system_comment_count']}",
        f"system_comments={summary['reviewActivity']['system_comment_count']}",
        f"ai_comments={summary['reviewActivity']['ai_assistant_comment_count']}",
        f"iterations={summary['changes']['iteration_count']}",
        f"commits={summary['changes']['commit_count']}",
        f"changed_files={summary['changes']['changed_file_count']}",
        "",
        "changed_file_list:",
    ]
    lines.extend(summary["changes"]["changed_files"])
    lines.extend(["", "latest_builds_by_definition:"])
    for build in summary["ci"]["latest_builds_by_definition"]:
        lines.append(json.dumps(build, ensure_ascii=False))
    lines.extend(["", "blocking_policy_highlights:"])
    for policy in policy_highlights:
        if policy.get("isBlocking") and policy.get("status") not in {"approved"}:
            lines.append(json.dumps(policy, ensure_ascii=False))
    write_text(output_dir / "summary.txt", "\n".join(lines))

    print(output_dir)


if __name__ == "__main__":
    main()
