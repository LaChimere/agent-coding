#!/usr/bin/env python3
"""Claude Code PreToolUse hook: ask before irreversible or broad Git commands.

Reads the hook input from stdin. For a Bash call whose command runs one of the Git operations
below, it prints a PreToolUse decision of "ask", so the person confirms it in a permission
prompt. Every other call gets no decision and follows the normal permission flow.
"ask" rather than "deny" keeps an explicit instruction from the person executable. In
non-interactive `claude -p` runs nobody can answer, so the call is denied.

This guards against mistakes, not against deliberate evasion. Covered: `add -A/--all/-u/--update/.`,
`commit -a/--all`, `reset --hard`, `clean` without `-n/--dry-run`, `checkout` that discards files
(`--`, `.`, `-f`), `restore` of the worktree, `switch -f/--discard-changes`, `branch -D`,
`stash drop/clear`, and force or deleting `push` (including `:branch`). Every unquoted `git`
word is checked, also after `env`, `xargs`, `do`, `then` or a path. A command that cannot be
tokenized, for example with an unbalanced quote, gets "ask" when it contains the word `git`.
Commands inside quoted strings such as `bash -c '...'`, `eval`, scripts or aliases are not
detected.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import sys

PUNCTUATION = ";&|()`"
GLOBAL_OPTIONS_WITH_VALUE = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"}


def split_segments(command: str) -> list[list[str]]:
    lexer = shlex.shlex(command.replace("\n", " ; "), posix=True, punctuation_chars=PUNCTUATION)
    lexer.whitespace_split = True
    lexer.commenters = ""
    segments, current = [], []
    for token in lexer:
        if set(token) <= set(PUNCTUATION):
            if current:
                segments.append(current)
            current = []
        else:
            current.append(token)
    if current:
        segments.append(current)
    return segments


def git_invocations(segment: list[str]) -> list[list[str]]:
    invocations = []
    for index, word in enumerate(segment):
        if os.path.basename(word) != "git":
            continue
        rest, position = segment[index + 1:], 0
        while position < len(rest) and rest[position].startswith("-"):
            position += 2 if rest[position] in GLOBAL_OPTIONS_WITH_VALUE else 1
        invocations.append(rest[position:])
    return invocations


def short_flags(arguments: list[str]) -> set[str]:
    flags = set()
    for argument in arguments:
        if argument == "--":
            break
        if re.fullmatch(r"-[A-Za-z]+", argument):
            flags.update(argument[1:])
    return flags


def reason_for(arguments: list[str]) -> str | None:
    if not arguments:
        return None
    command, options = arguments[0], arguments[1:]
    flags = short_flags(options)
    words = set(options)

    if command == "add":
        if words & {"-A", "--all", "-u", "--update", ".", ":/", "*"} or flags & {"A", "u"}:
            return "stages files beyond the ones this task changed"
    if command == "commit" and ("--all" in words or "a" in flags):
        return "commits every modified tracked file"
    if command == "reset" and "--hard" in words:
        return "discards uncommitted work"
    if command == "clean" and not (words & {"-n", "--dry-run"} or "n" in flags):
        return "deletes untracked files"
    if command == "checkout" and ("--" in words or "." in words or words & {"-f", "--force"} or "f" in flags):
        return "overwrites working-tree files"
    if command == "restore":
        staged_only = ("--staged" in words or "S" in flags) and not ("--worktree" in words or "W" in flags)
        if not staged_only:
            return "overwrites working-tree files"
    if command == "switch" and (words & {"-f", "--force", "--discard-changes"} or "f" in flags):
        return "discards local changes"
    if command == "branch":
        forced_delete = (words & {"-d", "--delete"} or "d" in flags) and (words & {"-f", "--force"} or "f" in flags)
        if "D" in flags or forced_delete:
            return "deletes a branch"
    if command == "stash" and options[:1] in (["drop"], ["clear"]):
        return "deletes stashed work"
    if command == "push":
        forced = any(w.startswith("--force") for w in words) or "f" in flags or any(w.startswith("+") for w in words)
        deleting = words & {"-d", "--delete", "--mirror", "--prune"} or any(re.fullmatch(r":[^:]+", w) for w in words)
        if forced or deleting:
            return "rewrites or deletes remote history"
    return None


def ask(reason: str) -> dict:
    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": f"git-guard: {reason}. Confirm only if you asked for it.",
        }
    }


def decide(payload: dict) -> dict | None:
    if payload.get("tool_name") != "Bash":
        return None
    tool_input = payload.get("tool_input")
    command = str(tool_input.get("command", "")) if isinstance(tool_input, dict) else ""
    try:
        segments = split_segments(command)
    except ValueError:
        if re.search(r"(^|[\s;&|(`/])git(\s|$)", command):
            return ask("this Git command could not be parsed")
        return None
    for segment in segments:
        for arguments in git_invocations(segment):
            reason = reason_for(arguments)
            if reason:
                return ask(f"`git {' '.join(arguments)}` {reason}")
    return None


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return
    decision = decide(payload) if isinstance(payload, dict) else None
    if decision:
        print(json.dumps(decision))


if __name__ == "__main__":
    main()
