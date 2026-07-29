#!/usr/bin/env python3
"""Deterministic goal lifecycle state mechanics for the `achieve-goal` skill.

This script performs structural mechanics only: discovery, parsing, legal
transitions, turn/budget accounting, audit structure checks, and atomic writes.
It never judges whether evidence is substantively correct, never chooses an
implementation, and never crosses an approval gate.

Commands
--------
  discover --repo REPO
  read     --repo REPO [--slug SLUG | --path PATH]
  apply    --repo REPO --request -|FILE

Every response is a single JSON object on stdout using the schema
``achieve-goal/goal-lifecycle-v1``. Exit status is 0 for ``ok: true`` and 1 for
``ok: false``; argparse usage errors exit 2.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA = "achieve-goal/goal-lifecycle-v1"

STATUSES = ("active", "paused", "budget_limited", "complete", "cleared", "blocked")

CRITERIA_SECTIONS = (
    "User-visible behavior",
    "Implementation scope",
    "Validation",
    "Docs/status",
    "Deferred/out of scope",
)
LEGACY_SECTION = "Unclassified legacy criteria"

KNOWN_META = (
    "status",
    "slug",
    "turns_used",
    "turn_budget",
    "budget_note",
    "landing_mode",
    "docs_update_approved",
    "created_at",
    "updated_at",
    "format_version",
)

BODY_SECTIONS = ("Acceptance criteria", "Progress log", "Deferred items", "Blockers")
AUDIT_SECTION = "Completion audit"

DEFERRED_PLACEHOLDER = (
    "None. Use `reason=<out_of_scope|needs_user_decision|future_phase|"
    "blocked_by_dependency>` when adding deferred work."
)

SLUG_PATTERN = re.compile(r"^goal-[a-z0-9]+(?:-[a-z0-9]+)*$")
EXPLICIT_RESUME_PATTERN = re.compile(
    r"(?:^|\s)(?:/goal\s+resume\b|resume\s+(?:the\s+)?(?:paused\s+)?goal\b|unpause\s+(?:the\s+)?goal\b)",
    re.IGNORECASE,
)
META_PATTERN = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*):\s?(.*)$")

# Status transitions the script is allowed to perform, keyed by operation.
TRANSITIONS: dict[str, dict[str, str]] = {
    "pause": {"active": "paused", "budget_limited": "paused", "blocked": "paused"},
    "resume": {"paused": "active", "budget_limited": "active", "blocked": "active"},
    "clear": {
        "active": "cleared",
        "paused": "cleared",
        "budget_limited": "cleared",
        "blocked": "cleared",
        "complete": "cleared",
    },
    "block": {"active": "blocked"},
    "record_progress": {"active": "active"},
    "audit_complete": {"active": "complete"},
    "replace": {
        "active": "cleared",
        "paused": "cleared",
        "budget_limited": "cleared",
        "blocked": "cleared",
        "complete": "cleared",
    },
}

# Operations that never touch `turns_used`.
CONTROL_OPS = ("pause", "resume", "clear", "replace", "repair_legacy", "block", "audit_complete")

AUDIT_ROW_STATUSES = ("met", "deferred-out-of-scope")


class LifecycleError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


# --------------------------------------------------------------------------
# parsing
# --------------------------------------------------------------------------


def decode_scalar(raw: str) -> Any:
    raw = raw.strip()
    if raw == "" or raw == "null":
        return None
    if raw in ("true", "false"):
        return raw == "true"
    if re.fullmatch(r"-?\d+", raw):
        return int(raw)
    if len(raw) >= 2 and raw[0] == '"' and raw[-1] == '"':
        return raw[1:-1]
    return raw


def parse_goal_text(text: str) -> dict[str, Any]:
    lines = text.replace("\r\n", "\n").split("\n")

    section_start = len(lines)
    for index, line in enumerate(lines):
        if line.startswith("## "):
            section_start = index
            break

    head = lines[:section_start]
    meta: dict[str, Any] = {}
    unknown_meta: list[tuple[str, str]] = []
    objective: str | None = None

    index = 0
    while index < len(head):
        line = head[index]
        if line.strip() == "objective: |":
            index += 1
            block: list[str] = []
            while index < len(head):
                current = head[index]
                if current.startswith("  ") or current.strip() == "":
                    block.append(current)
                    index += 1
                else:
                    break
            while block and block[-1].strip() == "":
                block.pop()
            objective = "\n".join(item[2:] if item.startswith("  ") else item for item in block)
            continue
        match = META_PATTERN.match(line)
        if match:
            key, raw = match.group(1), match.group(2)
            if key in KNOWN_META:
                meta[key] = decode_scalar(raw)
            else:
                unknown_meta.append((key, raw))
        index += 1

    sections: list[dict[str, Any]] = []
    current_section: dict[str, Any] | None = None
    for line in lines[section_start:]:
        if line.startswith("## "):
            current_section = {"name": line[3:].strip(), "body": []}
            sections.append(current_section)
        elif current_section is not None:
            current_section["body"].append(line)

    return {
        "objective": objective if objective is not None else "",
        "meta": meta,
        "unknown_meta": unknown_meta,
        "sections": sections,
    }


def find_section(state: dict[str, Any], name: str) -> dict[str, Any] | None:
    for section in state["sections"]:
        if section["name"].lower() == name.lower():
            return section
    return None


def section_bullets(section: dict[str, Any] | None) -> list[str]:
    if section is None:
        return []
    bullets = []
    for line in section["body"]:
        stripped = line.strip()
        if stripped.startswith("- "):
            bullets.append(stripped[2:].strip())
    return bullets


def parse_criteria(section: dict[str, Any] | None) -> list[dict[str, Any]]:
    if section is None:
        return []
    groups: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for line in section["body"]:
        if line.startswith("### "):
            current = {"section": line[4:].strip(), "bullets": []}
            groups.append(current)
        elif line.strip().startswith("- "):
            if current is None:
                current = {"section": None, "bullets": []}
                groups.append(current)
            current["bullets"].append(line.strip()[2:].strip())
    return groups


def criteria_ids(groups: list[dict[str, Any]]) -> list[str]:
    ids = []
    for group in groups:
        label = group["section"] or "Unclassified"
        for bullet in group["bullets"]:
            ids.append(f"{label}: {bullet}")
    return ids


def is_legacy(groups: list[dict[str, Any]], state: dict[str, Any]) -> bool:
    """A goal needs structural repair when the canonical criteria sections are not all present."""
    if find_section(state, "Acceptance criteria") is None:
        return True
    if any(group["section"] is None for group in groups):
        return True
    present = {group["section"] for group in groups}
    return any(name not in present for name in CRITERIA_SECTIONS)


def blocker_is_resolved(text: str) -> bool:
    lowered = text.strip().lower()
    return lowered in ("none", "none.") or lowered.startswith("resolved:")


def resolve_blockers(state: dict[str, Any], resolutions: Any) -> list[str]:
    if not isinstance(resolutions, dict):
        raise LifecycleError(
            "bad_request", "blocker_resolutions must be an object of blocker -> evidence"
        )
    blockers_section = ensure_section(state, "Blockers")
    if resolutions:
        body = []
        for line in blockers_section["body"]:
            stripped = line.strip()
            if stripped.startswith("- "):
                bullet = stripped[2:].strip()
                if bullet in resolutions:
                    evidence = resolutions[bullet]
                    if not isinstance(evidence, str) or not evidence.strip():
                        raise LifecycleError(
                            "bad_request",
                            "each blocker resolution needs non-empty evidence",
                            {"blocker": bullet},
                        )
                    body.append(f"- Resolved: {bullet} — {evidence}")
                    continue
            body.append(line)
        blockers_section["body"] = body
    return [
        bullet for bullet in section_bullets(blockers_section) if not blocker_is_resolved(bullet)
    ]


# --------------------------------------------------------------------------
# serialization
# --------------------------------------------------------------------------


def encode_scalar(key: str, value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if key in ("slug", "budget_note", "created_at", "updated_at"):
        return json.dumps(str(value))
    return str(value)


def serialize_goal(state: dict[str, Any]) -> str:
    lines: list[str] = ["# Goal State", "", "objective: |"]
    for line in state["objective"].split("\n"):
        lines.append("" if line.strip() == "" else "  " + line)
    meta = state["meta"]
    for key in KNOWN_META:
        if key == "format_version" and key not in meta:
            continue
        lines.append(f"{key}: {encode_scalar(key, meta.get(key))}")
    for key, raw in state["unknown_meta"]:
        lines.append(f"{key}: {raw}")

    lines.append("")
    for section in state["sections"]:
        body = list(section["body"])
        while body and body[-1].strip() == "":
            body.pop()
        if not body or body[0].strip() != "":
            body.insert(0, "")
        lines.append("## " + section["name"])
        lines.extend(body)
        lines.append("")

    text = "\n".join(lines)
    return text.rstrip("\n") + "\n"


def append_bullet(section: dict[str, Any], text: str, drop_placeholder: bool = True) -> None:
    body = list(section["body"])
    if drop_placeholder:
        body = [
            line
            for line in body
            if not (line.strip().startswith("- ") and line.strip()[2:].strip().lower().startswith("none"))
        ]
    while body and body[-1].strip() == "":
        body.pop()
    if not body or body[0].strip() != "":
        body.insert(0, "")
    body.append(f"- {text}")
    section["body"] = body


def ensure_section(state: dict[str, Any], name: str, body: list[str] | None = None) -> dict[str, Any]:
    section = find_section(state, name)
    if section is not None:
        return section
    section = {"name": name, "body": list(body) if body else [""]}
    if name == AUDIT_SECTION:
        state["sections"].append(section)
        return section
    order = list(BODY_SECTIONS)
    if name in order:
        position = order.index(name)
        insert_at = len(state["sections"])
        for index, existing in enumerate(state["sections"]):
            existing_name = existing["name"]
            if existing_name in order and order.index(existing_name) > position:
                insert_at = index
                break
        state["sections"].insert(insert_at, section)
    else:
        state["sections"].append(section)
    return section


def criteria_body(groups: list[dict[str, Any]]) -> list[str]:
    body: list[str] = [""]
    for group in groups:
        body.append("### " + (group["section"] or LEGACY_SECTION))
        body.append("")
        if group["bullets"]:
            for bullet in group["bullets"]:
                body.append(f"- {bullet}")
            body.append("")
    return body


# --------------------------------------------------------------------------
# paths, revisions, atomic writes
# --------------------------------------------------------------------------


def resolve_repo(repo: str) -> Path:
    root = Path(repo).expanduser().resolve()
    if not root.is_dir():
        raise LifecycleError("bad_request", f"repo is not a directory: {repo}")
    return root


def contained_path(root: Path, candidate: Path) -> Path:
    resolved = Path(os.path.normpath(str(candidate)))
    if not resolved.is_absolute():
        resolved = Path(os.path.normpath(str(root / resolved)))
    try:
        resolved.relative_to(root)
    except ValueError:
        raise LifecycleError(
            "path_escape",
            "goal path must stay inside the repository",
            {"repo": str(root), "path": str(candidate)},
        ) from None
    real_root = root.resolve()
    probe = resolved
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    try:
        probe.resolve().relative_to(real_root)
    except ValueError:
        raise LifecycleError(
            "path_escape",
            "goal path resolves outside the repository",
            {"repo": str(root), "path": str(candidate)},
        ) from None
    return resolved


def goal_path_for_slug(root: Path, slug: str) -> Path:
    if not isinstance(slug, str) or not SLUG_PATTERN.match(slug):
        raise LifecycleError(
            "invalid_slug",
            "slug must match ^goal-[a-z0-9]+(-[a-z0-9]+)*$",
            {"slug": slug},
        )
    return contained_path(root, root / "plans" / slug / "goal.md")


def revision_of(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise LifecycleError("not_found", f"no goal file at {path}", {"path": str(path)}) from None
    except OSError as error:
        raise LifecycleError("read_failed", str(error), {"path": str(path)}) from None


def atomic_write(path: Path, text: str) -> None:
    temporary = path.parent / f".{path.name}.{uuid.uuid4().hex}.tmp"
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(temporary, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except OSError as error:
        try:
            if temporary.exists():
                temporary.unlink()
        except OSError:
            pass
        raise LifecycleError("write_failed", str(error), {"path": str(path)}) from None


# --------------------------------------------------------------------------
# goal views
# --------------------------------------------------------------------------


def escape_objective(objective: str) -> str:
    return objective.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def goal_view(root: Path, path: Path, text: str, state: dict[str, Any]) -> dict[str, Any]:
    meta = state["meta"]
    criteria_section = find_section(state, "Acceptance criteria")
    groups = parse_criteria(criteria_section)
    blockers = section_bullets(find_section(state, "Blockers"))
    escaped = escape_objective(state["objective"])
    view = {
        "path": str(path.relative_to(root)),
        "slug": meta.get("slug") or path.parent.name,
        "status": meta.get("status"),
        "objective": state["objective"],
        "objective_escaped": escaped,
        "objective_prompt_block": f"<untrusted_objective>\n{escaped}\n</untrusted_objective>",
        "turns_used": meta.get("turns_used", 0),
        "turn_budget": meta.get("turn_budget"),
        "budget_note": meta.get("budget_note"),
        "landing_mode": meta.get("landing_mode", "working_tree"),
        "docs_update_approved": bool(meta.get("docs_update_approved", False)),
        "created_at": meta.get("created_at"),
        "updated_at": meta.get("updated_at"),
        "acceptance_criteria": [
            {"section": group["section"], "bullets": group["bullets"]} for group in groups
        ],
        "criteria_ids": criteria_ids(groups),
        "unclassified_criteria": [
            bullet
            for group in groups
            if group["section"] in (None, LEGACY_SECTION)
            for bullet in group["bullets"]
        ],
        "progress_log": section_bullets(find_section(state, "Progress log")),
        "deferred_items": section_bullets(find_section(state, "Deferred items")),
        "blockers": blockers,
        "unresolved_blockers": [item for item in blockers if not blocker_is_resolved(item)],
        "completion_audit": section_bullets(find_section(state, AUDIT_SECTION)),
        "unknown_sections": [
            section["name"]
            for section in state["sections"]
            if section["name"] not in BODY_SECTIONS and section["name"] != AUDIT_SECTION
        ],
        "legacy_structure": is_legacy(groups, state),
        "revision": revision_of(text),
    }
    if "format_version" in meta:
        view["format_version"] = meta["format_version"]
    budget = meta.get("turn_budget")
    used = meta.get("turns_used", 0) or 0
    view["budget_exhausted"] = bool(budget is not None and used >= budget)
    missing_meta = [
        key for key in KNOWN_META if key != "format_version" and key not in meta
    ]
    view["missing_metadata"] = missing_meta
    view["needs_repair"] = bool(missing_meta or view["legacy_structure"])
    return view


def load_goal(root: Path, path: Path) -> tuple[str, dict[str, Any], dict[str, Any]]:
    text = read_text(path)
    state = parse_goal_text(text)
    return text, state, goal_view(root, path, text, state)


def discover_goals(root: Path) -> dict[str, Any]:
    plans = root / "plans"
    goals: list[dict[str, Any]] = []
    if plans.is_dir():
        for directory in sorted(plans.iterdir()):
            if not directory.is_dir() or not directory.name.startswith("goal-"):
                continue
            path = directory / "goal.md"
            if not path.is_file():
                continue
            try:
                _, _, view = load_goal(root, path)
            except LifecycleError as error:
                goals.append(
                    {
                        "path": str(path.relative_to(root)),
                        "slug": directory.name,
                        "status": None,
                        "error": {"code": error.code, "message": error.message},
                    }
                )
                continue
            goals.append(view)
    active = [goal for goal in goals if goal.get("status") == "active"]
    live = [goal for goal in goals if goal.get("status") not in ("cleared", "complete", None)]
    ignored = [
        goal["slug"] for goal in goals if goal.get("status") in ("cleared", "complete")
    ]
    result: dict[str, Any] = {
        "goals": goals,
        "active_slugs": [goal["slug"] for goal in active],
        "live_slugs": [goal["slug"] for goal in live],
        "ignored_slugs": ignored,
        "active_goal": active[0] if len(active) == 1 else None,
        "resolved_goal": live[0] if len(live) == 1 else None,
        "ambiguous": len(live) > 1,
    }
    return result


def resolve_target(root: Path, request: dict[str, Any]) -> Path:
    if request.get("path"):
        return contained_path(root, Path(str(request["path"])))
    if request.get("slug"):
        return goal_path_for_slug(root, str(request["slug"]))
    discovery = discover_goals(root)
    if discovery["ambiguous"]:
        raise LifecycleError(
            "ambiguous_active_goal",
            "more than one live goal exists; name the goal explicitly",
            {"live_slugs": discovery["live_slugs"], "active_slugs": discovery["active_slugs"]},
        )
    if discovery["resolved_goal"] is None:
        raise LifecycleError("no_active_goal", "no live goal exists", {})
    return contained_path(root, root / discovery["resolved_goal"]["path"])


# --------------------------------------------------------------------------
# request helpers
# --------------------------------------------------------------------------


def require(request: dict[str, Any], field: str) -> Any:
    if field not in request or request[field] in (None, ""):
        raise LifecycleError("bad_request", f"missing required field {field!r}", {"field": field})
    return request[field]


def now_stamp(request: dict[str, Any]) -> str:
    provided = request.get("now")
    if isinstance(provided, str) and provided:
        return provided
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slugify(objective: str) -> str:
    words = re.sub(r"[^a-z0-9]+", "-", objective.strip().lower()).strip("-")
    words = re.sub(r"-{2,}", "-", words)
    if not words:
        words = "objective"
    slug = "goal-" + words
    if len(slug) > 48:
        slug = slug[:48].rstrip("-")
    return slug


def check_revision(request: dict[str, Any], view: dict[str, Any]) -> None:
    expected = request.get("expected_revision")
    if expected is None:
        return
    if expected != view["revision"]:
        raise LifecycleError(
            "revision_conflict",
            "goal file changed since it was read",
            {"expected_revision": expected, "actual_revision": view["revision"]},
        )


def check_transition(op: str, status: str | None) -> str:
    table = TRANSITIONS.get(op)
    if table is None:
        raise LifecycleError("bad_request", f"unknown operation {op!r}", {"op": op})
    if status not in table:
        raise LifecycleError(
            "illegal_transition",
            f"operation {op!r} is not legal from status {status!r}",
            {"op": op, "from": status, "allowed_from": sorted(table)},
        )
    return table[status]


def new_goal_state(request: dict[str, Any], slug: str, stamp: str) -> dict[str, Any]:
    objective = str(require(request, "objective"))
    turn_budget = request.get("turn_budget")
    if turn_budget is not None:
        if not isinstance(turn_budget, int) or isinstance(turn_budget, bool) or turn_budget <= 0:
            raise LifecycleError(
                "invalid_budget", "turn_budget must be a positive integer or null",
                {"turn_budget": turn_budget},
            )
    criteria = request.get("acceptance_criteria") or {}
    if not isinstance(criteria, dict):
        raise LifecycleError("bad_request", "acceptance_criteria must be an object of section -> bullets")
    unknown_sections = [name for name in criteria if name not in CRITERIA_SECTIONS]
    if unknown_sections:
        raise LifecycleError(
            "bad_request",
            "acceptance_criteria sections must use the five canonical headings",
            {"unknown_sections": unknown_sections, "allowed": list(CRITERIA_SECTIONS)},
        )
    groups = [
        {"section": name, "bullets": [str(item) for item in criteria.get(name, [])]}
        for name in CRITERIA_SECTIONS
    ]
    state = {
        "objective": objective,
        "meta": {
            "status": "active",
            "slug": slug,
            "turns_used": 0,
            "turn_budget": turn_budget,
            "budget_note": request.get("budget_note"),
            "landing_mode": request.get("landing_mode") or "working_tree",
            "docs_update_approved": bool(request.get("docs_update_approved", False)),
            "created_at": stamp,
            "updated_at": stamp,
        },
        "unknown_meta": [],
        "sections": [
            {"name": "Acceptance criteria", "body": criteria_body(groups)},
            {"name": "Progress log", "body": ["", "- Turn 0: Goal registered.", ""]},
            {"name": "Deferred items", "body": ["", f"- {DEFERRED_PLACEHOLDER}", ""]},
            {"name": "Blockers", "body": ["", "- None.", ""]},
        ],
    }
    if request.get("format_version") is not None:
        state["meta"]["format_version"] = request["format_version"]
    landing = state["meta"]["landing_mode"]
    if landing not in ("working_tree", "commits"):
        raise LifecycleError(
            "bad_request", "landing_mode must be working_tree or commits", {"landing_mode": landing}
        )
    return state


def control_note(section: dict[str, Any], op: str, note: str) -> None:
    append_bullet(section, f"Control: {op} — {note}", drop_placeholder=False)


# --------------------------------------------------------------------------
# operations
# --------------------------------------------------------------------------


def op_create(root: Path, request: dict[str, Any]) -> dict[str, Any]:
    stamp = now_stamp(request)
    slug = request.get("slug") or slugify(str(require(request, "objective")))
    path = goal_path_for_slug(root, slug)
    if path.exists():
        raise LifecycleError(
            "already_exists", "a goal file already exists at this slug", {"path": str(path.relative_to(root))}
        )
    discovery = discover_goals(root)
    if discovery["live_slugs"] and not request.get("allow_parallel_scope"):
        raise LifecycleError(
            "active_goal_exists",
            "a live goal already exists; pause, clear, replace, or authorize a parallel scope",
            {"live_slugs": discovery["live_slugs"], "active_slugs": discovery["active_slugs"]},
        )
    state = new_goal_state(request, slug, stamp)
    text = serialize_goal(state)
    atomic_write(path, text)
    _, _, view = load_goal(root, path)
    return {"op": "create", "goal": view, "created": True, "turn_increment": 0}


def op_repair_legacy(root: Path, path: Path, request: dict[str, Any]) -> dict[str, Any]:
    text, state, view = load_goal(root, path)
    check_revision(request, view)
    repaired: list[str] = []
    meta = state["meta"]
    defaults = {
        "status": "active",
        "slug": path.parent.name,
        "turns_used": 0,
        "turn_budget": None,
        "budget_note": None,
        "landing_mode": "working_tree",
        "docs_update_approved": False,
        "created_at": None,
        "updated_at": None,
    }
    for key, default in defaults.items():
        if key not in meta:
            meta[key] = default
            repaired.append(f"metadata:{key}")
    if meta.get("status") not in STATUSES:
        raise LifecycleError(
            "bad_request", f"unknown status {meta.get('status')!r}", {"status": meta.get("status")}
        )

    criteria_section = ensure_section(state, "Acceptance criteria")
    groups = parse_criteria(criteria_section)
    classification = request.get("classification") or {}
    if not isinstance(classification, dict):
        raise LifecycleError("bad_request", "classification must be an object of section -> bullets")
    unknown_sections = [name for name in classification if name not in CRITERIA_SECTIONS]
    if unknown_sections:
        raise LifecycleError(
            "bad_request",
            "classification sections must use the five canonical headings",
            {"unknown_sections": unknown_sections, "allowed": list(CRITERIA_SECTIONS)},
        )

    unclassified = [
        bullet
        for group in groups
        if group["section"] is None or group["section"] == LEGACY_SECTION
        for bullet in group["bullets"]
    ]
    classified_flat = [bullet for bullets in classification.values() for bullet in bullets]
    if classification:
        missing = [bullet for bullet in unclassified if bullet not in classified_flat]
        extra = [bullet for bullet in classified_flat if bullet not in unclassified]
        if missing or extra:
            raise LifecycleError(
                "bad_request",
                "classification must map exactly the unclassified legacy bullets",
                {"missing": missing, "unexpected": extra},
            )

    rebuilt: list[dict[str, Any]] = []
    for name in CRITERIA_SECTIONS:
        bullets = [
            bullet
            for group in groups
            if group["section"] == name
            for bullet in group["bullets"]
        ]
        bullets.extend(str(item) for item in classification.get(name, []))
        rebuilt.append({"section": name, "bullets": bullets})
    remaining = [bullet for bullet in unclassified if bullet not in classified_flat]
    if remaining:
        rebuilt.append({"section": LEGACY_SECTION, "bullets": remaining})

    preserved = [
        group["section"]
        for group in groups
        if group["section"] not in (None, LEGACY_SECTION) and group["section"] not in CRITERIA_SECTIONS
    ]
    for name in preserved:
        bullets = [
            bullet for group in groups if group["section"] == name for bullet in group["bullets"]
        ]
        rebuilt.append({"section": name, "bullets": bullets})

    if view["legacy_structure"] or [group["section"] for group in groups] != [
        group["section"] for group in rebuilt
    ]:
        repaired.append("acceptance_criteria_sections")
    criteria_section["body"] = criteria_body(rebuilt)

    for name, body in (
        ("Progress log", ["", "- Turn 0: Goal registered.", ""]),
        ("Deferred items", ["", f"- {DEFERRED_PLACEHOLDER}", ""]),
        ("Blockers", ["", "- None.", ""]),
    ):
        if find_section(state, name) is None:
            ensure_section(state, name, body)
            repaired.append(f"section:{name}")

    meta["updated_at"] = now_stamp(request)
    new_text = serialize_goal(state)
    atomic_write(path, new_text)
    _, _, new_view = load_goal(root, path)
    return {
        "op": "repair_legacy",
        "goal": new_view,
        "repaired": repaired,
        "needs_classification": remaining,
        "turn_increment": 0,
        "turns_used_before": view["turns_used"],
    }


def op_status_change(root: Path, path: Path, request: dict[str, Any], op: str) -> dict[str, Any]:
    text, state, view = load_goal(root, path)
    check_revision(request, view)
    target_status = check_transition(op, view["status"])
    meta = state["meta"]
    details: dict[str, Any] = {}

    if op == "resume":
        explicit_instruction = request.get("explicit_resume_instruction")
        if not isinstance(explicit_instruction, str) or not explicit_instruction.strip():
            raise LifecycleError(
                "explicit_resume_required",
                "resume requires the user's explicit resume instruction",
            )
        if not EXPLICIT_RESUME_PATTERN.search(explicit_instruction):
            raise LifecycleError(
                "explicit_resume_required",
                "the quoted user instruction does not explicitly say resume or unpause the goal",
                {"instruction": explicit_instruction},
            )
        if view["status"] == "budget_limited" or view["budget_exhausted"]:
            reauth = request.get("reauthorization")
            if not isinstance(reauth, dict):
                raise LifecycleError(
                    "budget_reauthorization_required",
                    "the turn budget is exhausted; explicit re-authorization is required to resume",
                    {"turns_used": view["turns_used"], "turn_budget": view["turn_budget"]},
                )
            kind = reauth.get("kind")
            if kind == "new_budget":
                budget = reauth.get("turn_budget")
                if not isinstance(budget, int) or isinstance(budget, bool) or budget <= view["turns_used"]:
                    raise LifecycleError(
                        "invalid_budget",
                        "a re-authorized turn_budget must be an integer greater than turns_used",
                        {"turn_budget": budget, "turns_used": view["turns_used"]},
                    )
                meta["turn_budget"] = budget
                details["reauthorization"] = {"kind": kind, "turn_budget": budget}
            elif kind in ("narrowed_objective", "explicit_acknowledgement"):
                note = reauth.get("note")
                if not isinstance(note, str) or not note.strip():
                    raise LifecycleError(
                        "bad_request",
                        f"reauthorization kind {kind!r} requires a non-empty note quoting the user",
                        {"kind": kind},
                    )
                budget = reauth.get("turn_budget")
                if budget is not None:
                    if not isinstance(budget, int) or isinstance(budget, bool) or budget <= view["turns_used"]:
                        raise LifecycleError(
                            "invalid_budget",
                            "a re-authorized turn_budget must be an integer greater than turns_used",
                            {"turn_budget": budget, "turns_used": view["turns_used"]},
                        )
                    meta["turn_budget"] = budget
                meta["budget_note"] = note
                details["reauthorization"] = {"kind": kind, "note": note}
            else:
                raise LifecycleError(
                    "bad_request",
                    "reauthorization.kind must be new_budget, narrowed_objective, or explicit_acknowledgement",
                    {"kind": kind},
                )
        unresolved = resolve_blockers(state, request.get("blocker_resolutions") or {})
        if unresolved:
            if "reauthorization" in details:
                target_status = "blocked"
                details["resume_deferred"] = True
                details["unresolved_blockers"] = unresolved
            else:
                raise LifecycleError(
                    "blockers_unresolved",
                    "resolve every blocker with evidence before resuming a blocked goal",
                    {"unresolved_blockers": unresolved},
                )
        details["explicit_resume_instruction"] = explicit_instruction

    if op == "block":
        blocker = str(require(request, "blocker"))
        append_bullet(ensure_section(state, "Blockers"), blocker)

    meta["status"] = target_status
    meta["updated_at"] = now_stamp(request)
    note = str(request.get("note") or f"status {view['status']} -> {target_status}")
    control_note(ensure_section(state, "Progress log"), op, note)

    atomic_write(path, serialize_goal(state))
    _, _, new_view = load_goal(root, path)
    return {
        "op": op,
        "goal": new_view,
        "status_change": [view["status"], target_status],
        "turn_increment": 0,
        "turns_used_before": view["turns_used"],
        **details,
    }


def op_replace(root: Path, path: Path, request: dict[str, Any]) -> dict[str, Any]:
    if request.get("explicit_replacement") is not True:
        raise LifecycleError(
            "replacement_not_authorized",
            "replacing an existing goal requires explicit_replacement: true",
            {},
        )
    replacement = request.get("replacement")
    if not isinstance(replacement, dict):
        raise LifecycleError("bad_request", "replacement must be an object with the new goal fields")

    text, state, view = load_goal(root, path)
    check_revision(request, view)
    target_status = check_transition("replace", view["status"])

    stamp = now_stamp(request)
    new_slug = replacement.get("slug") or slugify(str(require(replacement, "objective")))
    new_path = goal_path_for_slug(root, new_slug)
    if new_path.exists():
        raise LifecycleError(
            "already_exists",
            "a goal file already exists at the replacement slug",
            {"path": str(new_path.relative_to(root))},
        )
    replacement = dict(replacement)
    replacement.setdefault("now", stamp)
    new_state = new_goal_state(replacement, new_slug, stamp)

    state["meta"]["status"] = target_status
    state["meta"]["updated_at"] = stamp
    control_note(
        ensure_section(state, "Progress log"),
        "replace",
        f"cleared and replaced by {new_slug}",
    )
    atomic_write(new_path, serialize_goal(new_state))
    atomic_write(path, serialize_goal(state))

    _, _, replaced_view = load_goal(root, path)
    _, _, new_view = load_goal(root, new_path)
    return {
        "op": "replace",
        "goal": new_view,
        "replaced_goal": replaced_view,
        "status_change": [view["status"], target_status],
        "turn_increment": 0,
    }


def op_record_progress(root: Path, path: Path, request: dict[str, Any]) -> dict[str, Any]:
    text, state, view = load_goal(root, path)
    check_revision(request, view)
    check_transition("record_progress", view["status"])

    if request.get("verified_evidence") is not True:
        raise LifecycleError(
            "evidence_required",
            "record_progress requires verified_evidence: true; turns_used is unchanged",
            {"turns_used": view["turns_used"]},
        )
    entry = str(require(request, "entry")).strip()
    evidence = request.get("evidence")

    if view["budget_exhausted"]:
        raise LifecycleError(
            "budget_exhausted",
            "the turn budget is already exhausted; re-authorize before recording progress",
            {"turns_used": view["turns_used"], "turn_budget": view["turn_budget"]},
        )

    meta = state["meta"]
    turns_used = int(meta.get("turns_used") or 0) + 1
    meta["turns_used"] = turns_used
    line = f"Turn {turns_used}: {entry}"
    if isinstance(evidence, str) and evidence.strip():
        line += f" (evidence: {evidence.strip()})"
    append_bullet(ensure_section(state, "Progress log"), line, drop_placeholder=False)

    for blocker in request.get("blockers_add") or []:
        append_bullet(ensure_section(state, "Blockers"), str(blocker))
    for deferred in request.get("deferred_add") or []:
        append_bullet(ensure_section(state, "Deferred items"), str(deferred))

    budget = meta.get("turn_budget")
    budget_state = "within_budget"
    if budget is not None and turns_used >= budget:
        meta["status"] = "budget_limited"
        budget_state = "exhausted"
    meta["updated_at"] = now_stamp(request)

    atomic_write(path, serialize_goal(state))
    _, _, new_view = load_goal(root, path)
    return {
        "op": "record_progress",
        "goal": new_view,
        "turn_increment": 1,
        "turns_used_before": view["turns_used"],
        "budget_state": budget_state,
        "status_change": [view["status"], new_view["status"]],
    }


def op_audit_complete(root: Path, path: Path, request: dict[str, Any]) -> dict[str, Any]:
    text, state, view = load_goal(root, path)
    check_revision(request, view)
    target_status = check_transition("audit_complete", view["status"])

    if view["legacy_structure"]:
        raise LifecycleError(
            "legacy_structure",
            "repair the acceptance-criteria structure before auditing completion",
            {},
        )
    expected = view["criteria_ids"]
    if not expected:
        raise LifecycleError(
            "no_acceptance_criteria",
            "the goal has no acceptance-criteria bullets to audit",
            {},
        )

    rows = request.get("audit")
    if not isinstance(rows, list) or not rows:
        raise LifecycleError("bad_request", "audit must be a non-empty list of rows")
    normalized: list[dict[str, str]] = []
    for row in rows:
        if not isinstance(row, dict):
            raise LifecycleError("bad_request", "each audit row must be an object")
        criterion = str(row.get("criterion", "")).strip()
        evidence = str(row.get("evidence", "")).strip()
        status = str(row.get("status", "")).strip()
        if not criterion or not evidence:
            raise LifecycleError(
                "bad_request", "each audit row needs criterion and evidence", {"row": row}
            )
        if status not in AUDIT_ROW_STATUSES:
            raise LifecycleError(
                "bad_request",
                f"audit row status must be one of {list(AUDIT_ROW_STATUSES)}",
                {"row": row},
            )
        normalized.append({"criterion": criterion, "evidence": evidence, "status": status})

    seen = [row["criterion"] for row in normalized]
    missing = [item for item in expected if item not in seen]
    unexpected = [item for item in seen if item not in expected]
    duplicates = sorted({item for item in seen if seen.count(item) > 1})
    if missing or unexpected or duplicates:
        raise LifecycleError(
            "audit_incomplete",
            "the audit needs exactly one row per acceptance-criteria bullet",
            {"missing": missing, "unexpected": unexpected, "duplicates": duplicates},
        )

    unresolved = resolve_blockers(state, request.get("blocker_resolutions") or {})
    if unresolved:
        raise LifecycleError(
            "blockers_unresolved",
            "resolve or record resolution evidence for every blocker before completing",
            {"unresolved_blockers": unresolved},
        )

    audit_body = ["", "| Criterion | Evidence | Status |", "|---|---|---|"]
    for item in expected:
        row = next(row for row in normalized if row["criterion"] == item)
        audit_body.append(f"| {row['criterion']} | {row['evidence']} | {row['status']} |")
    audit_body.append("")
    audit_section = ensure_section(state, AUDIT_SECTION)
    audit_section["body"] = audit_body

    state["meta"]["status"] = target_status
    state["meta"]["updated_at"] = now_stamp(request)
    control_note(
        ensure_section(state, "Progress log"),
        "audit_complete",
        f"completion audit recorded for {len(expected)} criteria",
    )

    atomic_write(path, serialize_goal(state))
    _, _, new_view = load_goal(root, path)
    return {
        "op": "audit_complete",
        "goal": new_view,
        "status_change": [view["status"], target_status],
        "audited_criteria": expected,
        "turn_increment": 0,
        "turns_used_before": view["turns_used"],
    }


OPERATIONS = (
    "create",
    "repair_legacy",
    "pause",
    "resume",
    "clear",
    "replace",
    "record_progress",
    "block",
    "audit_complete",
)


def apply_request(root: Path, request: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(request, dict):
        raise LifecycleError("bad_request", "request must be a JSON object")
    op = request.get("op")
    if op not in OPERATIONS:
        raise LifecycleError(
            "bad_request", f"unknown operation {op!r}", {"allowed": list(OPERATIONS)}
        )
    if op == "create":
        return op_create(root, request)
    path = resolve_target(root, request)
    if op == "repair_legacy":
        return op_repair_legacy(root, path, request)
    if op == "replace":
        return op_replace(root, path, request)
    if op == "record_progress":
        return op_record_progress(root, path, request)
    if op == "audit_complete":
        return op_audit_complete(root, path, request)
    return op_status_change(root, path, request, op)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def emit(payload: dict[str, Any]) -> int:
    print(json.dumps(payload, indent=2, sort_keys=False))
    return 0 if payload.get("ok") else 1


def error_payload(command: str, error: LifecycleError, op: str | None = None) -> dict[str, Any]:
    payload = {
        "schema": SCHEMA,
        "ok": False,
        "command": command,
        "error": {"code": error.code, "message": error.message, "details": error.details},
    }
    if op:
        payload["op"] = op
    return payload


def load_request(source: str) -> dict[str, Any]:
    raw = sys.stdin.read() if source == "-" else Path(source).read_text(encoding="utf-8")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        raise LifecycleError("bad_request", f"request is not valid JSON: {error}") from None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="achieve-goal deterministic lifecycle mechanics")
    sub = parser.add_subparsers(dest="command", required=True)

    discover = sub.add_parser("discover", help="list goal files and resolve the active goal")
    discover.add_argument("--repo", required=True)

    read = sub.add_parser("read", help="read one goal file without mutating it")
    read.add_argument("--repo", required=True)
    read.add_argument("--slug")
    read.add_argument("--path")

    apply_parser = sub.add_parser("apply", help="apply one lifecycle operation from a JSON request")
    apply_parser.add_argument("--repo", required=True)
    apply_parser.add_argument("--request", required=True, help="request JSON file, or - for stdin")

    args = parser.parse_args(argv)

    if args.command == "discover":
        try:
            root = resolve_repo(args.repo)
            discovery = discover_goals(root)
        except LifecycleError as error:
            return emit(error_payload("discover", error))
        return emit({"schema": SCHEMA, "ok": True, "command": "discover", **discovery})

    if args.command == "read":
        try:
            root = resolve_repo(args.repo)
            if args.path:
                path = contained_path(root, Path(args.path))
            elif args.slug:
                path = goal_path_for_slug(root, args.slug)
            else:
                path = resolve_target(root, {})
            _, _, view = load_goal(root, path)
        except LifecycleError as error:
            return emit(error_payload("read", error))
        return emit({"schema": SCHEMA, "ok": True, "command": "read", "goal": view, "turn_increment": 0})

    request: dict[str, Any] = {}
    try:
        root = resolve_repo(args.repo)
        request = load_request(args.request)
        result = apply_request(root, request)
    except LifecycleError as error:
        op = request.get("op") if isinstance(request, dict) else None
        return emit(error_payload("apply", error, op))
    except OSError as error:
        return emit(error_payload("apply", LifecycleError("write_failed", str(error))))
    return emit({"schema": SCHEMA, "ok": True, "command": "apply", **result})


if __name__ == "__main__":
    sys.exit(main())
