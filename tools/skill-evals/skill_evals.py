#!/usr/bin/env python3
"""Provider-neutral validation, run-manifest, grading, and aggregation for skill evals."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Callable

RUN_REQUEST_SCHEMA = 'skill-evals/run-request-v1'
RUN_RESULT_SCHEMA = 'skill-evals/run-result-v1'
RUBRIC_INPUT_SCHEMA = 'skill-evals/rubric-input-v1'
IMPORTED_RESULT_SCHEMA = 'skill-evals/imported-results-v1'
AGGREGATE_SCHEMA = 'skill-evals/aggregate-v1'
FOOTPRINT_PROFILES_SCHEMA = 'skill-evals/footprint-profiles-v1'
FOOTPRINT_SCHEMA = 'skill-evals/context-footprint-v1'

NAME_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
RUN_ID_PATTERN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$')
MAX_NAME_LENGTH = 64
MAX_DESCRIPTION_LENGTH = 1024
GRADE_STATUSES = ('passed', 'failed', 'ungraded')
# "not_run" covers a case the adapter never actually exercised (refused, skipped, environment
# unavailable, etc). It still counts toward run coverage -- the case is present with a result
# -- but can never be graded as passed or failed; see `grade`/`combine_grade`.
RESULT_STATUSES = ('completed', 'failed', 'not_run')
NONE_ROUTE = 'none'
# Named capabilities that are never a runtime skill directory (built-in agent modes, not
# something `npx skills add` ever installs) but are legitimate to name in a suite case's
# `forbidden_skills` when the point of the case is that composition must not overreach into
# them. Never valid in `expected_skills`: a case cannot expect a non-skill capability to be
# the activated route.
EXTERNAL_FORBIDDEN_CAPABILITIES = frozenset({'security-review'})

# Evals are repository-maintenance assets: they live in a central corpus outside skills/ so
# `npx skills add` never distributes cases, fixtures, or expected answers with a skill.
EVAL_ROOT = 'evals'
SUITE_ROOT = 'suites'
LEGACY_EVAL_DIRNAME = 'evals'
# Mirrors .gitignore's evals/*/outputs/ (anchored to the top of each skill's eval directory,
# never a nested directory that merely happens to share the name) plus its evals/**/ generated
# filename globs (grading/timing/benchmark/review reports, matched at any depth).
EVAL_ARTIFACT_DIRS = ('outputs',)
EVAL_ARTIFACT_FILE_GLOBS = (
    'grading.json',
    'timing.json',
    'benchmark*.json',
    'benchmark*.md',
    'review*.html',
)
RUNTIME_ARTIFACT_DIRS = frozenset(
    {'__pycache__', '.pytest_cache', '.ruff_cache', '.mypy_cache', '.venv'}
)
RUNTIME_ARTIFACT_FILE_GLOBS = ('*.py[codz]', '*$py.class', '.DS_Store')
EVAL_CORPUS_FILENAMES = ('evals.json', 'manifest.json')
KNOWN_CASE_KEYS = {
    'id',
    'prompt',
    'expected_output',
    'files',
    'expectations',
    'grading',
    'fixture_prefix',
    'execution',
}
# "default_category" and "clarification_rationale" are already used across the real central
# corpus (see evals/*/manifest.json) even though only the latter is otherwise cross-checked
# here; both are recognized so they don't get flagged as unknown/typo'd keys.
KNOWN_MANIFEST_KEYS = {
    'skill_name',
    'default_execution',
    'default_category',
    'critical_ids',
    'behavior_change_ids',
    'redundant_ids',
    'deterministic_ids',
    'critical_expectations',
    'behavior_change_rationale',
    'clarification_rationale',
}


class ContractError(ValueError):
    """Raised when an input document, artifact, or invocation violates a harness contract."""


def canonical_json(value: Any) -> str:
    """Serialize `value` to the canonical JSON text every digest is computed over."""
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def digest(value: Any) -> str:
    """Compute the stable SHA-256 hex digest of `value`'s canonical JSON form."""
    return hashlib.sha256(canonical_json(value).encode()).hexdigest()


def read_json(path: Path) -> Any:
    """Read a JSON document, reporting unreadable or malformed files as contract errors."""
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        message = f'{path}: {error}'
        raise ContractError(message) from error


def write_immutable(path: Path, value: Any) -> None:
    """Write `value` as an artifact that must not already exist (immutable by contract)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open('x', encoding='utf-8') as output:
            output.write(json.dumps(value, indent=2, sort_keys=True) + '\n')
    except FileExistsError as error:
        message = f'refusing to overwrite immutable artifact: {path}'
        raise ContractError(message) from error


def resolve_profile_file(repo: Path, raw_path: Any, location: str) -> tuple[str, Path]:
    """Resolve one footprint profile entry to its repo-relative path and absolute location."""
    if not isinstance(raw_path, str) or not raw_path:
        message = f'{location}: file path must be a non-empty string'
        raise ContractError(message)
    candidate = Path(raw_path)
    if candidate.is_absolute():
        message = f'{location}: file path must be relative to the repository'
        raise ContractError(message)
    resolved = (repo / candidate).resolve()
    try:
        resolved.relative_to(repo)
    except ValueError as error:
        message = f'{location}: file path escapes repository: {raw_path}'
        raise ContractError(message) from error
    if not resolved.is_file():
        message = f'{location}: file does not exist: {raw_path}'
        raise ContractError(message)
    return resolved.relative_to(repo).as_posix(), resolved


def load_footprint_profiles(repo: Path, config_path: Path) -> list[dict[str, Any]]:
    """Load and validate the footprint profile configuration into resolved profile entries."""
    document = read_json(config_path)
    if (
        not isinstance(document, dict)
        or document.get('schema') != FOOTPRINT_PROFILES_SCHEMA
    ):
        message = f'{config_path}: schema must equal {FOOTPRINT_PROFILES_SCHEMA}'
        raise ContractError(message)
    profiles = document.get('profiles')
    if not isinstance(profiles, list) or not profiles:
        message = f'{config_path}: profiles must be a non-empty array'
        raise ContractError(message)
    names: set[str] = set()
    parsed = []
    for index, profile in enumerate(profiles):
        location = f'{config_path}: profiles[{index}]'
        if not isinstance(profile, dict):
            message = f'{location}: profile must be an object'
            raise ContractError(message)
        name = profile.get('name')
        if not isinstance(name, str) or not NAME_PATTERN.fullmatch(name):
            message = f'{location}: name must match {NAME_PATTERN.pattern}'
            raise ContractError(message)
        if name in names:
            message = f'{location}: duplicate profile name {name!r}'
            raise ContractError(message)
        names.add(name)
        files = profile.get('files')
        if not isinstance(files, list) or not files:
            message = f'{location}: files must be a non-empty array'
            raise ContractError(message)
        resolved_files = []
        seen_paths: set[str] = set()
        for file_index, raw_path in enumerate(files):
            path, resolved = resolve_profile_file(
                repo, raw_path, f'{location}: files[{file_index}]'
            )
            if path in seen_paths:
                message = f'{location}: duplicate file path {path!r}'
                raise ContractError(message)
            seen_paths.add(path)
            resolved_files.append((path, resolved))
        parsed.append({'name': name, 'files': resolved_files})
    return parsed


def file_footprint(path: str, resolved: Path) -> dict[str, Any]:
    """Measure one file's provider-neutral static context proxies and content digest."""
    try:
        content = resolved.read_bytes()
        text = content.decode('utf-8')
    except (OSError, UnicodeDecodeError) as error:
        message = f'{resolved}: footprint files must be readable UTF-8 text: {error}'
        raise ContractError(message) from error
    return {
        'path': path,
        'lines': len(text.splitlines()),
        'words': len(re.findall(r'\S+', text)),
        'bytes': len(content),
        'sha256': hashlib.sha256(content).hexdigest(),
    }


def footprint(args: argparse.Namespace) -> dict[str, Any]:
    """Write the immutable static context footprint document for the selected profiles."""
    repo = Path(args.repo).resolve()
    if not repo.is_dir():
        message = f'repository does not exist: {repo}'
        raise ContractError(message)
    config_path = Path(args.profiles)
    profiles = load_footprint_profiles(repo, config_path)
    selected = set(args.profile)
    available = {profile['name'] for profile in profiles}
    unknown = sorted(selected - available)
    if unknown:
        message = f'unknown footprint profile(s): {", ".join(unknown)}'
        raise ContractError(message)
    if selected:
        profiles = [profile for profile in profiles if profile['name'] in selected]
    measured = []
    for profile in profiles:
        files = [file_footprint(path, resolved) for path, resolved in profile['files']]
        totals = {
            name: sum(file[name] for file in files)
            for name in ('lines', 'words', 'bytes')
        }
        content = {
            'name': profile['name'],
            'files': [
                {'path': file['path'], 'sha256': file['sha256']} for file in files
            ],
        }
        measured.append(
            {**content, **totals, 'sha256': digest(content), 'files': files}
        )
    document = {
        'schema': FOOTPRINT_SCHEMA,
        'measurement': 'static-context-proxy',
        'limitation': 'Static lines, words, and bytes are provider-neutral context proxies, not exact model token counts.',
        'profiles': measured,
    }
    document['content_sha256'] = digest(document)
    write_immutable(Path(args.output), document)
    return document


def issue(errors: list[str], location: str, message: str) -> None:
    """Append one located validation error to `errors`."""
    errors.append(f'{location}: {message}')


def parse_frontmatter_fields(text: str) -> dict[str, str]:
    """Parse `key: value` frontmatter lines into a field mapping."""
    fields: dict[str, str] = {}
    for line in text.splitlines():
        if ':' in line:
            key, value = line.split(':', 1)
            fields[key.strip()] = value.strip()
    return fields


def validate_frontmatter_fields(
    skill_dir: Path, path: Path, fields: dict[str, str], errors: list[str]
) -> None:
    """Check the frontmatter `name` and `description` fields of one runtime skill."""
    name = fields.get('name', '')
    if name != skill_dir.name:
        issue(errors, str(path), f'frontmatter name must equal {skill_dir.name!r}')
    if not name or not NAME_PATTERN.match(name) or len(name) > MAX_NAME_LENGTH:
        issue(
            errors,
            str(path),
            f'frontmatter name must match {NAME_PATTERN.pattern} and be <= {MAX_NAME_LENGTH} characters',
        )
    description = fields.get('description', '')
    if not description.strip():
        issue(errors, str(path), 'frontmatter requires a non-empty description')
    elif len(description) > MAX_DESCRIPTION_LENGTH:
        issue(
            errors,
            str(path),
            f'frontmatter description must be <= {MAX_DESCRIPTION_LENGTH} characters',
        )


def validate_bundled_references(
    skill_dir: Path, path: Path, text: str, errors: list[str]
) -> None:
    """Check that every referenced bundled file exists inside the skill directory."""
    for match in re.finditer(
        r'(?:references|templates|scripts)/[A-Za-z0-9_./-]+', text
    ):
        relative = match.group(0).rstrip('.,:;)')
        target = skill_dir / relative
        try:
            target.resolve().relative_to(skill_dir.resolve())
            contained = True
        except ValueError:
            contained = False
        if not contained or not target.is_file():
            issue(errors, str(path), f'missing bundled reference {relative}')


def validate_frontmatter(skill_dir: Path, errors: list[str]) -> None:
    """Validate a runtime skill's SKILL.md frontmatter and its bundled references."""
    path = skill_dir / 'SKILL.md'
    if not path.is_file():
        issue(errors, str(path), 'missing SKILL.md')
        return
    text = path.read_text(encoding='utf-8')
    if not text.startswith('---\n'):
        issue(errors, str(path), 'frontmatter must start with ---')
        return
    end = text.find('\n---', 4)
    if end < 0:
        issue(errors, str(path), 'frontmatter must end with ---')
        return
    validate_frontmatter_fields(
        skill_dir, path, parse_frontmatter_fields(text[4:end]), errors
    )
    validate_bundled_references(skill_dir, path, text, errors)


def valid_grading_check(check: Any) -> bool:
    """Report whether one deterministic grading check declares every field its type needs."""
    if not isinstance(check, dict):
        return False
    kind = check.get('type')
    if kind == 'exit_status':
        values = [key for key in ('equals', 'not_equals') if key in check]
        return (
            len(values) == 1
            and isinstance(check[values[0]], int)
            and not isinstance(check[values[0]], bool)
        )
    if kind == 'file_exists':
        return isinstance(check.get('path'), str) and bool(check['path'])
    if kind == 'text_contains':
        return isinstance(check.get('value'), str) and bool(check['value'])
    if kind == 'text_regex':
        if not isinstance(check.get('pattern'), str) or not check['pattern']:
            return False
        try:
            re.compile(check['pattern'])
        except re.error:
            return False
        return True
    if kind == 'json_shape':
        return (
            isinstance(check.get('path', 'response_json'), str) and 'required' in check
        )
    if kind == 'skill_selection':
        return valid_skill_selection_check(check)
    return False


def valid_skill_name_list(values: Any) -> bool:
    """Report whether `values` is a list of unique real skill names.

    The reserved literal "none" is never a skill name, so it never belongs in such a list.
    """
    if not isinstance(values, list) or not all(
        isinstance(value, str) and value.strip() for value in values
    ):
        return False
    if len(values) != len(set(values)):
        return False
    return all(
        NAME_PATTERN.fullmatch(value) and value != NONE_ROUTE for value in values
    )


def valid_skill_selection_check(check: dict[str, Any]) -> bool:
    """Validate a provider-neutral, deterministic trigger-activation grading check.

    `universe` is the closed set of runtime skills this check evaluates over (the run's
    selected skills). `expected` is either exactly `["none"]` (no universe skill should have
    activated) or a non-empty list of selected real skill names. `forbidden` may also name an
    explicitly observed external capability: unlike unrelated global activations, an explicit
    forbidden route is checked even when it is outside `universe`.
    """
    universe = check.get('universe')
    forbidden = check.get('forbidden', [])
    expected = check.get('expected')
    if not universe or not valid_skill_name_list(universe):
        return False
    if not valid_skill_name_list(forbidden):
        return False
    if expected != [NONE_ROUTE] and not (expected and valid_skill_name_list(expected)):
        return False
    # Both are lists by now (validated above); the guard only restates that for the checker.
    if not isinstance(expected, list) or not isinstance(forbidden, list):
        return False
    return not set(expected) & set(forbidden)


EXECUTION_KEYS = ('network', 'path_prepend', 'executable_files')
EXECUTION_NETWORK_MODES = ('disabled', 'enabled')


def contained_fixture_path(root: Path, relative: str) -> Path | None:
    """Resolve a path relative to `root`, or None when it is absolute or escapes `root`."""
    candidate = Path(relative)
    if candidate.is_absolute() or '..' in candidate.parts:
        return None
    target = root / candidate
    try:
        target.resolve().relative_to(root.resolve())
    except ValueError:
        return None
    return target


def fixture_prefix_of(case: Any) -> str:
    """Return the case's declared fixture prefix, without a trailing slash ("" if absent)."""
    prefix = case.get('fixture_prefix') if isinstance(case, dict) else None
    return prefix.rstrip('/') if isinstance(prefix, str) else ''


def fixture_workspace_path(prefix: str, path: str) -> str:
    """Map a corpus-relative fixture path to where it lands in the case workspace.

    Without a `fixture_prefix` the workspace path is the corpus-relative path unchanged, which
    is exactly the pre-existing contract, so adding the field never moves an existing fixture.
    With a prefix, the prefix is stripped: `files/bin/trivy` under prefix `files` is written to
    `bin/trivy`, so a workspace looks like a real project instead of the corpus's own layout.
    """
    if not prefix:
        return path
    try:
        return PurePosixPath(path).relative_to(PurePosixPath(prefix)).as_posix()
    except ValueError:
        return path


def validate_fixture_prefix(
    case: dict[str, Any], location: str, eval_dir: Path, files: Any, errors: list[str]
) -> str:
    """Validate the optional `fixture_prefix` and return the normalized prefix ("" if absent).

    The prefix must be a relative, non-escaping directory of the eval corpus, and every `files`
    entry must live beneath it — otherwise stripping it would produce a workspace path that
    escapes the workspace or collides with an unrelated fixture.
    """
    if 'fixture_prefix' not in case:
        return ''
    raw = case['fixture_prefix']
    if not isinstance(raw, str) or not raw.strip().rstrip('/'):
        issue(
            errors,
            location,
            'fixture_prefix must be a non-empty relative directory path',
        )
        return ''
    prefix = raw.rstrip('/')
    target = contained_fixture_path(eval_dir, prefix)
    if target is None:
        issue(
            errors,
            location,
            f'fixture_prefix must be relative and stay inside the eval corpus: {raw}',
        )
        return ''
    if not target.is_dir():
        issue(
            errors,
            location,
            f'fixture_prefix directory is missing from the eval corpus: {raw}',
        )
        return ''
    for relative in files if isinstance(files, list) else []:
        if isinstance(relative, str) and not relative.startswith(f'{prefix}/'):
            issue(
                errors,
                location,
                f'file fixture must live under fixture_prefix {prefix!r}: {relative}',
            )
    return prefix


def validate_execution_structure(
    execution: Any, location: str, errors: list[str]
) -> bool:
    """Validate an `execution` hint block's own shape, independent of any case's fixture layout.

    Execution hints describe the hermetic environment a case must run in — which fixture
    directories go on `PATH`, which fixture files must be executable, and whether network
    access is allowed. They are provider-neutral: no CLI, container, or sandbox mechanism is
    named here, only the requirement an adapter has to satisfy. Every path is **workspace**
    relative, so it is written the way the adapter will see it after `fixture_prefix` stripping.
    """
    if not isinstance(execution, dict):
        issue(errors, location, 'execution must be an object')
        return False
    valid = True
    unknown = sorted({str(key) for key in execution} - set(EXECUTION_KEYS))
    if unknown:
        issue(errors, location, f'unknown execution keys: {", ".join(unknown)}')
        valid = False
    if 'network' in execution and execution['network'] not in EXECUTION_NETWORK_MODES:
        issue(
            errors,
            location,
            f'execution.network must be one of {EXECUTION_NETWORK_MODES}',
        )
        valid = False
    for field in ('path_prepend', 'executable_files'):
        values = execution.get(field, [])
        if not isinstance(values, list) or not all(
            isinstance(value, str) and value.strip() for value in values
        ):
            issue(
                errors,
                location,
                f'execution.{field} must be a list of non-empty strings',
            )
            valid = False
            continue
        for relative in values:
            candidate = Path(relative)
            if candidate.is_absolute() or '..' in candidate.parts:
                issue(
                    errors,
                    location,
                    f'execution.{field} entry must be a workspace-relative path that does not escape: {relative}',
                )
                valid = False
    return valid


def validate_execution_path_entry(
    field: str, relative: str, location: str, root: Path, errors: list[str]
) -> None:
    """Check one hinted `path_prepend`/`executable_files` entry against the eval corpus."""
    target = contained_fixture_path(root, relative)
    if target is None:
        issue(
            errors,
            location,
            f'execution.{field} entry must be a workspace-relative path inside the eval corpus: {relative}',
        )
    elif is_generated_eval_artifact(Path(relative)):
        issue(
            errors,
            location,
            f'execution.{field} entry must not reference a generated-artifact path (excluded from'
            f' snapshots): {relative}',
        )
    elif field == 'path_prepend' and not target.is_dir():
        issue(
            errors,
            location,
            f'execution.path_prepend directory is missing from the eval corpus: {relative}',
        )
    elif field == 'executable_files' and not target.is_file():
        issue(
            errors,
            location,
            f'execution.executable_files entry is missing from the eval corpus: {relative}',
        )
    elif field == 'executable_files' and not os.access(target, os.X_OK):
        issue(
            errors,
            location,
            f'execution.executable_files entry must be executable in the eval corpus: {relative}',
        )


def validate_execution_paths(
    execution: Any, location: str, root: Path, errors: list[str]
) -> None:
    """Resolve hinted workspace paths back to the corpus (under `fixture_prefix`) and check them."""
    if not isinstance(execution, dict):
        return
    for field in ('path_prepend', 'executable_files'):
        values = execution.get(field, [])
        if not isinstance(values, list):
            continue
        for relative in values:
            if isinstance(relative, str):
                validate_execution_path_entry(field, relative, location, root, errors)


def validate_execution_coverage(
    execution: Any, location: str, workspace_files: list[str], errors: list[str]
) -> None:
    """Check every hinted path is materialized by the case's own `files` fixtures.

    Comparison happens in workspace paths, the same coordinates the hints are written in, so a
    case cannot claim a local `PATH` directory or an executable shim that the runner never
    writes into the workspace and then silently fall back to a real host binary.
    """
    if not isinstance(execution, dict):
        return
    for relative in execution.get('path_prepend', []) or []:
        if not isinstance(relative, str):
            continue
        prefix = relative.rstrip('/') + '/'
        if not any(
            isinstance(path, str) and path.startswith(prefix)
            for path in workspace_files
        ):
            issue(
                errors,
                location,
                f'execution.path_prepend directory has no fixture in files: {relative}',
            )
    for relative in execution.get('executable_files', []) or []:
        if isinstance(relative, str) and relative not in workspace_files:
            issue(
                errors,
                location,
                f'execution.executable_files entry must also be listed in files: {relative}',
            )


def resolve_execution(case: dict[str, Any], default_execution: Any) -> Any:
    """Resolve a case's `execution` block, which replaces the manifest default outright.

    A case's own block is never deep-merged with the manifest's `default_execution`.
    """
    return (
        case.get('execution', default_execution)
        if isinstance(case, dict)
        else default_execution
    )


def validate_case_identity(
    case: dict[str, Any], location: str, seen: set[str], errors: list[str]
) -> None:
    """Check a behavior case's unique `id` and its required non-empty text fields."""
    case_id = case.get('id')
    if not isinstance(case_id, (str, int)) or isinstance(case_id, bool):
        issue(errors, location, 'id must be a string or integer')
    else:
        case_id = str(case_id)
        if case_id in seen:
            issue(errors, location, f'duplicate id {case_id}')
        seen.add(case_id)
    for field in ('prompt', 'expected_output'):
        value = case.get(field)
        if not isinstance(value, str) or not value.strip():
            issue(errors, location, f'{field} must be a non-empty string')


def validate_case_fixture_files(
    files: Any, location: str, eval_dir: Path, errors: list[str]
) -> None:
    """Check every `files` fixture exists inside the eval corpus and is not generated output."""
    for relative in files if isinstance(files, list) else []:
        target = eval_dir / relative
        try:
            target.resolve().relative_to(eval_dir.resolve())
            contained = True
        except ValueError:
            contained = False
        if (
            Path(relative).is_absolute()
            or '..' in Path(relative).parts
            or not contained
            or not target.is_file()
        ):
            issue(
                errors,
                location,
                f'file fixture is missing or escapes the eval corpus: {relative}',
            )
        elif is_generated_eval_artifact(Path(relative)):
            issue(
                errors,
                location,
                f'file fixture must not reference a generated-artifact path (excluded from snapshots): {relative}',
            )


def validate_case_execution(
    case: dict[str, Any],
    location: str,
    eval_dir: Path,
    prefix: str,
    files: Any,
    default_execution: Any,
    errors: list[str],
) -> None:
    """Check the case's resolved `execution` hint against the corpus and its own fixtures."""
    execution = resolve_execution(case, default_execution)
    if execution is None:
        return
    structural = True
    if 'execution' in case:
        structural = validate_execution_structure(execution, location, errors)
    if not structural:
        return
    validate_execution_paths(
        execution, location, eval_dir / prefix if prefix else eval_dir, errors
    )
    validate_execution_coverage(
        execution,
        location,
        [
            fixture_workspace_path(prefix, path)
            for path in files
            if isinstance(path, str)
        ]
        if isinstance(files, list)
        else [],
        errors,
    )


def validate_case(
    case: Any,
    location: str,
    eval_dir: Path,
    seen: set[str],
    errors: list[str],
    default_execution: Any = None,
) -> None:
    """Validate one behavior case from a skill's `evals.json` against its eval corpus."""
    if not isinstance(case, dict):
        issue(errors, location, 'case must be an object')
        return
    unknown_keys = sorted({str(key) for key in case} - KNOWN_CASE_KEYS)
    if unknown_keys:
        issue(errors, location, f'unknown case keys (typo?): {", ".join(unknown_keys)}')
    validate_case_identity(case, location, seen, errors)
    files = case.get('files', [])
    expectations = case.get('expectations', [])
    if not isinstance(files, list) or not all(isinstance(x, str) for x in files):
        issue(errors, location, 'files must be a list of strings')
    if not isinstance(expectations, list) or not all(
        isinstance(x, str) and x.strip() for x in expectations
    ):
        issue(
            errors,
            location,
            'expectations must be a list of non-empty strings, exact text is graded verbatim',
        )
    validate_case_fixture_files(files, location, eval_dir, errors)
    grading = case.get('grading', [])
    if not isinstance(grading, list):
        issue(errors, location, 'grading must be a list')
    elif not all(valid_grading_check(check) for check in grading):
        issue(errors, location, 'grading checks need complete supported fields')
    prefix = validate_fixture_prefix(case, location, eval_dir, files, errors)
    validate_case_execution(
        case, location, eval_dir, prefix, files, default_execution, errors
    )


def valid_rationale_map(value: Any, ids: set[str]) -> bool:
    """Report whether a rationale map's keys are known case ids or `_`-prefixed meta notes.

    Meta keys (e.g. `_scenario_fixtures`, `_redundant_ids`) document a decision that spans
    several cases rather than annotating one id, so they are exempt from the known-id check;
    every value must still be a non-empty string either way.
    """
    if not isinstance(value, dict):
        return False
    return all(
        isinstance(text, str)
        and text.strip()
        and (str(key).startswith('_') or str(key) in ids)
        for key, text in value.items()
    )


def case_list_counts(cases: list[Any], field: str) -> dict[str, int]:
    """Count the entries of each case's list-valued `field`, keyed by the case's id."""
    counts: dict[str, int] = {}
    for case in cases:
        if not isinstance(case, dict):
            continue
        case_id = case.get('id')
        if not isinstance(case_id, (str, int)):
            continue
        value = case.get(field, [])
        counts[str(case_id)] = len(value) if isinstance(value, list) else 0
    return counts


def validate_manifest_id_lists(
    manifest: dict[str, Any],
    manifest_path: Path,
    ids: set[str],
    grading_counts: dict[str, int],
    errors: list[str],
) -> None:
    """Check every manifest id list names known cases, and that deterministic ids are gradeable."""
    for field in (
        'critical_ids',
        'behavior_change_ids',
        'redundant_ids',
        'deterministic_ids',
    ):
        values = manifest.get(field, [])
        if not isinstance(values, list) or not all(
            str(value) in ids for value in values
        ):
            issue(
                errors, str(manifest_path), f'{field} must contain only known case ids'
            )
        elif field == 'deterministic_ids':
            # A case cannot be scored deterministically without at least one grading check;
            # listing it here without one is a contract error, not just missing rubric coverage.
            ungraded = [
                str(value) for value in values if grading_counts.get(str(value), 0) == 0
            ]
            if ungraded:
                issue(
                    errors,
                    str(manifest_path),
                    f'deterministic_ids case(s) have no grading checks, so they cannot be graded'
                    f' deterministically: {", ".join(ungraded)}',
                )


def valid_critical_expectations(
    critical: Any, ids: set[str], expectation_counts: dict[str, int]
) -> bool:
    """Report whether `critical_expectations` maps known case ids to in-range indexes."""
    if not isinstance(critical, dict):
        return False
    return all(
        str(key) in ids
        and isinstance(value, list)
        and all(
            isinstance(index, int)
            and not isinstance(index, bool)
            and 0 <= index < expectation_counts[str(key)]
            for index in value
        )
        for key, value in critical.items()
    )


def validate_manifest(
    manifest: Any,
    manifest_path: Path,
    skill_name: str,
    ids: set[str],
    cases: list[Any],
    errors: list[str],
) -> None:
    """Validate a skill's eval `manifest.json` against the ids and shape of its own cases."""
    if not isinstance(manifest, dict) or manifest.get('skill_name') != skill_name:
        issue(
            errors, str(manifest_path), 'skill_name must equal the skill directory name'
        )
        return
    unknown_manifest_keys = sorted({str(key) for key in manifest} - KNOWN_MANIFEST_KEYS)
    if unknown_manifest_keys:
        issue(
            errors,
            str(manifest_path),
            f'unknown manifest keys (typo?): {", ".join(unknown_manifest_keys)}',
        )
    expectation_counts = case_list_counts(cases, 'expectations')
    grading_counts = case_list_counts(cases, 'grading')
    validate_manifest_id_lists(manifest, manifest_path, ids, grading_counts, errors)
    if not valid_critical_expectations(
        manifest.get('critical_expectations', {}), ids, expectation_counts
    ):
        issue(
            errors,
            str(manifest_path),
            'critical_expectations must map known ids to expectation indexes',
        )
    if not valid_rationale_map(manifest.get('behavior_change_rationale', {}), ids):
        issue(
            errors,
            str(manifest_path),
            'behavior_change_rationale must map known ids (or _meta keys) to strings',
        )
    if not valid_rationale_map(manifest.get('clarification_rationale', {}), ids):
        issue(
            errors,
            str(manifest_path),
            'clarification_rationale must map known ids (or _meta keys) to strings',
        )


def validate_skill(skill_dir: Path, eval_dir: Path) -> list[str]:
    """Validate one runtime skill against its central eval corpus directory.

    `skill_dir` is the distributed runtime tree (`skills/<name>/`); `eval_dir` is the
    repository-maintenance corpus (`evals/<name>/`). They are validated together but stay
    physically separate so installed copies never carry eval cases or expected answers.
    """
    errors: list[str] = []
    validate_frontmatter(skill_dir, errors)
    legacy = skill_dir / LEGACY_EVAL_DIRNAME
    if legacy.exists():
        issue(
            errors,
            str(legacy),
            f'legacy in-skill eval corpus is not allowed; move it to {EVAL_ROOT}/{skill_dir.name}/',
        )
    eval_path = eval_dir / 'evals.json'
    manifest_path = eval_dir / 'manifest.json'
    if not eval_path.is_file() or not manifest_path.is_file():
        issue(errors, str(eval_dir), 'requires evals.json and manifest.json')
        return errors
    try:
        evals = read_json(eval_path)
        manifest = read_json(manifest_path)
    except ContractError as error:
        errors.append(str(error))
        return errors
    if not isinstance(evals, dict) or evals.get('skill_name') != skill_dir.name:
        issue(errors, str(eval_path), 'skill_name must equal the skill directory name')
    cases = evals.get('evals') if isinstance(evals, dict) else None
    if not isinstance(cases, list):
        issue(errors, str(eval_path), 'evals must be a list')
        return errors
    seen: set[str] = set()
    default_execution = (
        manifest.get('default_execution') if isinstance(manifest, dict) else None
    )
    if default_execution is not None:
        # Structure only here: the default's paths are workspace-relative, so they are resolved
        # against each inheriting case's own `fixture_prefix` inside validate_case.
        validate_execution_structure(
            default_execution, f'{manifest_path}: default_execution', errors
        )
    for index, case in enumerate(cases):
        validate_case(
            case,
            f'{eval_path}: evals[{index}]',
            eval_dir,
            seen,
            errors,
            default_execution,
        )
    validate_manifest(
        manifest, manifest_path, skill_dir.name, set(seen), list(cases), errors
    )
    return errors


SUITE_DIRECTIONS = ('should_trigger', 'should_not_trigger')


def string_entries(value: Any) -> list[str]:
    """Return every string entry of `value` when it is a list, else an empty list."""
    return (
        [item for item in value if isinstance(item, str)]
        if isinstance(value, list)
        else []
    )


def validate_suite_case_text(
    case: dict[str, Any], location: str, errors: list[str]
) -> None:
    """Check a suite case's `prompt` and free-text `expectations`."""
    prompt = case.get('prompt')
    expectations = case.get('expectations')
    if (
        not isinstance(prompt, str)
        or not prompt.strip()
        or not isinstance(expectations, list)
        or not expectations
        or not all(isinstance(item, str) and item.strip() for item in expectations)
    ):
        issue(
            errors,
            location,
            'prompt must be non-empty and expectations must be a non-empty list of strings',
        )


def validate_suite_case_routing(
    case: dict[str, Any], location: str, errors: list[str]
) -> tuple[list[str], list[str]]:
    """Check a suite case's routing lists and return its expected and forbidden skill names."""
    raw_expected = case.get('expected_skills')
    if (
        not isinstance(raw_expected, list)
        or not raw_expected
        or not all(isinstance(item, str) and item.strip() for item in raw_expected)
    ):
        issue(
            errors,
            location,
            'expected_skills must be a non-empty list of strings (use "none" for no route)',
        )
        expected_skills: list[str] = []
    else:
        expected_skills = string_entries(raw_expected)
    for field in ('related_skills', 'forbidden_skills'):
        values = case.get(field, [])
        if not isinstance(values, list) or not all(
            isinstance(item, str) and item.strip() for item in values
        ):
            issue(errors, location, f'{field} must be a list of strings')
    forbidden_skills = string_entries(case.get('forbidden_skills', []))
    if set(expected_skills) & set(forbidden_skills):
        issue(
            errors,
            location,
            'expected_skills and forbidden_skills must not overlap',
        )
    return expected_skills, forbidden_skills


def validate_suite_case_universe(
    location: str,
    expected_skills: list[str],
    forbidden_skills: list[str],
    universe: set[str],
    errors: list[str],
) -> None:
    """Check a suite case's routing names against the full runtime skill universe."""
    unknown_expected = sorted(
        name for name in expected_skills if name != NONE_ROUTE and name not in universe
    )
    if unknown_expected:
        issue(
            errors,
            location,
            f'expected_skills must be "none" or a real runtime skill: {", ".join(unknown_expected)}',
        )
    unknown_forbidden = sorted(
        name
        for name in forbidden_skills
        if name not in universe and name not in EXTERNAL_FORBIDDEN_CAPABILITIES
    )
    if unknown_forbidden:
        issue(
            errors,
            location,
            'forbidden_skills must be a real runtime skill or an explicitly allowlisted external'
            f' capability: {", ".join(unknown_forbidden)}',
        )


def validate_suite_case_direction(
    case: dict[str, Any],
    location: str,
    expected_skills: list[str],
    forbidden_skills: list[str],
    errors: list[str],
) -> None:
    """Check that an explicit `direction` agrees with the case's own routing lists."""
    direction = case.get('direction')
    if direction is None:
        return
    if direction not in SUITE_DIRECTIONS:
        issue(errors, location, f'direction must be one of {SUITE_DIRECTIONS}')
    elif direction == 'should_trigger' and expected_skills == [NONE_ROUTE]:
        issue(
            errors,
            location,
            'should_trigger cases must expect a real skill, not only "none"',
        )
    elif direction == 'should_not_trigger' and not forbidden_skills:
        issue(
            errors,
            location,
            'should_not_trigger cases must name at least one forbidden_skills entry',
        )


def validate_suite_case(
    case: Any,
    location: str,
    seen: set[str],
    universe: set[str] | None,
    errors: list[str],
) -> None:
    """Validate one trigger/composition suite case."""
    case_id = case.get('id') if isinstance(case, dict) else None
    if not isinstance(case, dict) or not isinstance(case_id, str) or not case_id:
        issue(errors, location, 'id must be a non-empty string')
        return
    if case_id in seen:
        issue(errors, location, f'duplicate id {case_id}')
    seen.add(case_id)
    validate_suite_case_text(case, location, errors)
    expected_skills, forbidden_skills = validate_suite_case_routing(
        case, location, errors
    )
    if universe is not None:
        validate_suite_case_universe(
            location, expected_skills, forbidden_skills, universe, errors
        )
    validate_suite_case_direction(
        case, location, expected_skills, forbidden_skills, errors
    )
    grading = case.get('grading', [])
    if (
        not isinstance(grading, list)
        or not grading
        or not all(valid_grading_check(check) for check in grading)
    ):
        issue(
            errors,
            location,
            'grading must be a non-empty list of complete, supported checks',
        )


def validate_suite(path: Path, universe: set[str] | None = None) -> list[str]:
    """Validate a trigger/composition suite document.

    Every case must declare a non-empty `expected_skills` naming the actual correct route
    (a real skill name, or the literal "none" when no skill should trigger) so a
    should-not-trigger ("near miss") case is just as gradeable as a should-trigger one: it
    never relies on an empty `expected_skills` list. An optional `direction` further makes
    that intent explicit and self-checking: `should_trigger` cases must not leave
    `expected_skills` at `["none"]`, and `should_not_trigger` cases must name at least one
    `forbidden_skills` entry (the skill that must not fire). `expected_skills` and
    `forbidden_skills` must never overlap for the same case.

    When `universe` (the full set of real runtime skill names) is given, every
    `expected_skills` entry must be `"none"` or a name in `universe`, and every
    `forbidden_skills` entry must be in `universe` or the explicit
    `EXTERNAL_FORBIDDEN_CAPABILITIES` allowlist -- suite authoring can only expect a real
    skill to activate, but may deliberately forbid a named non-skill capability. `universe`
    is the full repo skill set, not a run's narrower `--skill` selection: a suite's own
    correctness never depends on which subset of skills a particular run selects.
    """
    errors: list[str] = []
    try:
        suite = read_json(path)
    except ContractError as error:
        return [str(error)]
    if (
        not isinstance(suite, dict)
        or suite.get('schema') != 'skill-evals/trigger-suite-v1'
    ):
        return [f'{path}: expected skill-evals/trigger-suite-v1']
    suite_name = suite.get('suite_name')
    if not isinstance(suite_name, str) or not suite_name.strip():
        return [f'{path}: suite_name must be a non-empty string']
    cases = suite.get('cases')
    if not isinstance(cases, list):
        return [f'{path}: cases must be a list']
    seen: set[str] = set()
    for index, case in enumerate(cases):
        validate_suite_case(case, f'{path}: cases[{index}]', seen, universe, errors)
    return errors


def skill_directories(repo: Path) -> list[Path]:
    """List real runtime skills from the root and bundled Codex plugins."""
    root_skills = [path for path in (repo / 'skills').glob('*/') if path.is_dir()]
    plugin_skills = [
        path for path in (repo / 'plugins').glob('*/skills/*/') if path.is_dir()
    ]
    return sorted([*root_skills, *plugin_skills])


def skill_directory_map(repo: Path) -> dict[str, Path]:
    """Index runtime skills by name and reject ambiguous duplicate names."""
    indexed: dict[str, Path] = {}
    for path in skill_directories(repo):
        existing = indexed.get(path.name)
        if existing is not None:
            first = existing.relative_to(repo).as_posix()
            second = path.relative_to(repo).as_posix()
            message = f'duplicate runtime skill name {path.name!r}: {first}, {second}'
            raise ContractError(message)
        indexed[path.name] = path
    return indexed


def eval_corpus_root(repo: Path) -> Path:
    """Return the central eval corpus root (`evals/`) of `repo`."""
    return repo / EVAL_ROOT


def eval_directory(repo: Path, name: str) -> Path:
    """Return the central eval corpus directory of the named skill."""
    return eval_corpus_root(repo) / name


def eval_directories(repo: Path) -> list[Path]:
    """List the central eval corpus directories, the only place eval material lives."""
    root = eval_corpus_root(repo)
    if not root.is_dir():
        return []
    return sorted(
        path for path in root.glob('*/') if path.is_dir() and path.name != SUITE_ROOT
    )


def validate_repository(repo: Path) -> list[str]:
    """Validate runtime skills against the central eval corpus (evals/*).

    Runtime discovery and eval discovery are deliberately separate roots: every runtime skill
    in `skills/*` or `plugins/*/skills/*` must have a matching central eval directory, no eval
    directory may be orphaned, and any surviving in-skill eval corpus is rejected outright.
    """
    skills = skill_directories(repo)
    if not skills:
        return [f'{repo}: no skills found']
    try:
        indexed = skill_directory_map(repo)
    except ContractError as error:
        return [str(error)]
    errors: list[str] = []
    for skill in skills:
        errors.extend(validate_skill(skill, eval_directory(repo, skill.name)))
    known = set(indexed)
    for eval_dir in eval_directories(repo):
        if eval_dir.name not in known:
            issue(
                errors,
                str(eval_dir),
                f'eval corpus has no matching runtime skill skills/{eval_dir.name}/',
            )
    return errors


def bundled_suites(repo: Path) -> list[Path]:
    """List trigger/composition suites from the central eval corpus."""
    return sorted((eval_corpus_root(repo) / SUITE_ROOT).glob('*.json'))


def git_sha(repo: Path) -> str | None:
    """Return the repository's checked-out commit, or None when Git cannot report one."""
    git = shutil.which('git')
    if git is None:
        return None
    # Fixed argv with a resolved executable and no shell: the only interpolated value is the
    # caller's own repository path, and the exit status is handled instead of raising.
    completed = subprocess.run(  # noqa: S603
        [git, '-C', str(repo), 'rev-parse', 'HEAD'],
        text=True,
        capture_output=True,
        check=False,
    )
    return completed.stdout.strip() if completed.returncode == 0 else None


def resolve_skill_selection(repo: Path, selected: list[str]) -> list[str]:
    """Resolve --skill into a concrete, validated list of real skill names.

    Kept independent of behavior-case collection so a --suite-only run can still snapshot
    and install the exact selected real skills without loading their behavior cases.
    """
    all_skills = skill_directory_map(repo)
    names = selected or sorted(all_skills)
    unknown = sorted(set(names) - set(all_skills))
    if unknown:
        message = f'unknown skills: {", ".join(unknown)}'
        raise ContractError(message)
    if len(names) != len(set(names)):
        message = '--skill values must be unique'
        raise ContractError(message)
    return names


def collect_cases(repo: Path, names: list[str]) -> list[dict[str, Any]]:
    """Collect behavior cases with their hermetic execution hints already resolved.

    A case's own `execution` block wins; otherwise the skill manifest's `default_execution`
    applies. Resolution happens here so a run request is self-contained: an adapter never
    reads `manifest.json` (which stays out of every snapshot an agent can see) to learn that
    a case must run with network disabled and local fixture shims on `PATH`.
    """
    cases: list[dict[str, Any]] = []
    for name in names:
        eval_dir = eval_directory(repo, name)
        data = read_json(eval_dir / 'evals.json')
        manifest = read_json(eval_dir / 'manifest.json')
        default_execution = (
            manifest.get('default_execution') if isinstance(manifest, dict) else None
        )
        critical_ids = {str(value) for value in manifest.get('critical_ids', [])}
        critical_expectations = {
            str(case_id): list(indexes)
            for case_id, indexes in manifest.get('critical_expectations', {}).items()
        }
        for case in data['evals']:
            copied = dict(case)
            copied['skill_name'] = name
            copied['case_id'] = str(copied.pop('id'))
            copied['critical'] = copied['case_id'] in critical_ids
            copied['critical_expectations'] = critical_expectations.get(
                copied['case_id'], []
            )
            execution = resolve_execution(case, default_execution)
            if execution is not None:
                copied['execution'] = execution
                copied['execution_source'] = (
                    'case' if 'execution' in case else 'manifest_default'
                )
            cases.append(copied)
    return sorted(cases, key=lambda case: (case['skill_name'], case['case_id']))


def skill_selection_grading(
    case: dict[str, Any], universe: list[str]
) -> list[dict[str, Any]]:
    """Build the single deterministic `skill_selection` check for one trigger-suite case.

    Derived entirely from the case's own `expected_skills`/`forbidden_skills` and the run's
    selected runtime skill universe -- never from the suite's own hand-authored `grading`,
    which stays in the source suite file unchanged as documentation of original intent.
    """
    return [
        {
            'type': 'skill_selection',
            'expected': list(case.get('expected_skills', [])),
            'forbidden': list(case.get('forbidden_skills', [])),
            'universe': list(universe),
        }
    ]


def suite_case_applies(case: dict[str, Any], universe: list[str]) -> bool:
    """Keep only suite cases whose routing contract is observable in this selected skill set."""
    selected = set(universe)
    expected = {name for name in case.get('expected_skills', []) if name != 'none'}
    if expected:
        return expected <= selected
    forbidden = set(case.get('forbidden_skills', []))
    return bool(
        selected.intersection(forbidden)
        or EXTERNAL_FORBIDDEN_CAPABILITIES.intersection(forbidden)
    )


def collect_suite_cases(
    paths: list[Path], universe: list[str], repo: Path
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Expand --suite documents into cases namespaced under skill_name "suite:<suite_name>".

    Keeping suite cases in the same case/result/grade pipeline as skill cases avoids a second
    parallel schema, while the "suite:" namespace keeps them out of installed-copy selection.
    Each case's runner-facing `grading` is replaced with one deterministic `skill_selection`
    check scored against `universe` (the run's selected real skills), and `rubric_required` is
    set to `false`: a trigger case's free-text `expectations` are kept for documentation, but
    the case's final grade is decided purely by deterministic skill-activation evidence.

    Suite documents are re-validated here against the *full* repo skill universe (`repo`),
    not the narrower `universe` a particular run selects: a suite's own correctness never
    depends on which subset of skills `--skill` chose for this run.
    """
    suite_cases: list[dict[str, Any]] = []
    identities: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    full_universe = {path.name for path in skill_directories(repo)}
    for path in paths:
        resolved = path.resolve()
        errors = validate_suite(resolved, full_universe)
        if errors:
            raise ContractError(
                f'cannot prepare invalid suite {resolved}:\n' + '\n'.join(errors)
            )
        suite = read_json(resolved)
        suite_name = suite['suite_name']
        if suite_name in seen_names:
            message = f'duplicate suite_name across --suite inputs: {suite_name}'
            raise ContractError(message)
        seen_names.add(suite_name)
        identity = {
            'suite_name': suite_name,
            'repository_path': str(resolved),
            'content_sha256': digest(suite),
        }
        identities.append(identity)
        for case in suite['cases']:
            if not suite_case_applies(case, universe):
                continue
            copied = dict(case)
            copied['case_id'] = str(copied.pop('id'))
            copied['skill_name'] = f'suite:{suite_name}'
            copied['suite_identity'] = identity
            copied['grading'] = skill_selection_grading(case, universe)
            copied['rubric_required'] = False
            suite_cases.append(copied)
    return sorted(
        suite_cases, key=lambda case: (case['skill_name'], case['case_id'])
    ), identities


def hash_file(path: Path) -> str:
    """Return the SHA-256 hex digest of a file's bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def is_generated_eval_artifact(relative: Path) -> bool:
    """Report whether a corpus-relative path is generated grading/run output.

    Generated outputs are never part of a run's cases, fixtures, or digests. This mirrors
    `.gitignore`: `evals/*/outputs/` is anchored to the top of each skill's eval directory (a
    nested directory that merely happens to be named "outputs" is real fixture content, not a
    generated artifact), while `evals/**/grading.json`, `timing.json`, `benchmark*.json`,
    `benchmark*.md`, and `review*.html` are unanchored filename globs that match at any depth.
    """
    if relative.parts and relative.parts[0] in EVAL_ARTIFACT_DIRS:
        return True
    return any(
        fnmatch.fnmatch(relative.name, pattern) for pattern in EVAL_ARTIFACT_FILE_GLOBS
    )


def is_generated_runtime_artifact(relative: Path) -> bool:
    """Report whether a runtime-relative path is generated local state."""
    if any(part in RUNTIME_ARTIFACT_DIRS for part in relative.parts):
        return True
    return any(
        fnmatch.fnmatch(relative.name, pattern)
        for pattern in RUNTIME_ARTIFACT_FILE_GLOBS
    )


def tree_entries(
    root: Path,
    *,
    skip_generated: bool = False,
    skip_runtime_generated: bool = False,
) -> list[dict[str, str]]:
    """List every file below `root` with its digest, optionally skipping generated artifacts."""
    entries = []
    for file in sorted(p for p in root.rglob('*') if p.is_file()):
        relative = file.relative_to(root)
        if skip_generated and is_generated_eval_artifact(relative):
            continue
        if skip_runtime_generated and is_generated_runtime_artifact(relative):
            continue
        entries.append({'path': relative.as_posix(), 'sha256': hash_file(file)})
    return entries


def runtime_tree_digest(repo: Path, names: list[str]) -> dict[str, Any]:
    """Digest the exact selected runtime skill trees (distributed content only).

    Unlike a mutable repo checkout path or Git SHA, this is stable across checkouts, works
    without Git, and only reflects the runtime skills actually selected for this run. It
    covers nothing from the eval corpus, so editing a case never changes it.
    """
    skill_paths = skill_directory_map(repo)
    per_skill = {
        name: digest(tree_entries(skill_paths[name], skip_runtime_generated=True))
        for name in names
    }
    return {'skills': per_skill, 'digest': digest(per_skill)}


def evaluation_corpus_digest(
    repo: Path, names: list[str], suite_identities: list[dict[str, Any]]
) -> dict[str, Any]:
    """Digest the evaluation material a run is graded against.

    This is intentionally separate from the runtime digest: a run's comparability depends on
    identical cases, fixtures, and suites, while the runtime skill trees are exactly what a
    baseline/candidate comparison is allowed to differ on.
    """
    per_skill = {
        name: digest(tree_entries(eval_directory(repo, name), skip_generated=True))
        for name in names
    }
    suites = {item['suite_name']: item['content_sha256'] for item in suite_identities}
    content = {'skills': per_skill, 'suites': suites}
    return {'skills': per_skill, 'suites': suites, 'digest': digest(content)}


def generated_artifact_ignore(
    source_root: Path,
) -> Callable[[str, list[str]], set[str]]:
    """Build a `shutil.copytree` ignore callable anchored to `source_root`.

    `shutil.ignore_patterns` matches basenames at any depth, which would wrongly exclude a
    nested directory merely named "outputs"; this instead computes each entry's path relative
    to `source_root` and defers to the anchored `is_generated_eval_artifact`.
    """

    def ignore(directory: str, names: list[str]) -> set[str]:
        base = Path(directory).relative_to(source_root)
        return {name for name in names if is_generated_eval_artifact(base / name)}

    return ignore


def runtime_artifact_ignore(
    source_root: Path,
) -> Callable[[str, list[str]], set[str]]:
    """Build an ignore callable for generated runtime artifacts."""

    def ignore(directory: str, names: list[str]) -> set[str]:
        base = Path(directory).relative_to(source_root)
        return {name for name in names if is_generated_runtime_artifact(base / name)}

    return ignore


def copy_tree(
    source: Path,
    destination: Path,
    *,
    skip_generated: bool = False,
    skip_runtime_generated: bool = False,
) -> None:
    """Copy a tree, optionally excluding generated eval artifacts."""
    if skip_generated:
        ignore = generated_artifact_ignore(source)
    elif skip_runtime_generated:
        ignore = runtime_artifact_ignore(source)
    else:
        ignore = None
    shutil.copytree(source, destination, ignore=ignore)


def materialize_snapshot(
    skill_paths: dict[str, Path],
    names: list[str],
    snapshot_root: Path,
) -> dict[str, str]:
    """Freeze the named subtrees of `source_root` into a fresh snapshot directory."""
    if snapshot_root.exists():
        message = f'refusing to overwrite existing snapshot: {snapshot_root}'
        raise ContractError(message)
    snapshot_root.mkdir(parents=True)
    copies = {}
    for name in names:
        destination = snapshot_root / name
        copy_tree(
            skill_paths[name],
            destination,
            skip_runtime_generated=True,
        )
        copies[name] = str(destination)
    return copies


def materialize_evaluation_snapshot(
    repo: Path,
    names: list[str],
    suite_identities: list[dict[str, Any]],
    snapshot_root: Path,
) -> dict[str, Any]:
    """Freeze the evaluation corpus (cases, fixtures, selected suites) for one run.

    Any adapter can copy fixtures out of this snapshot without reading the mutable repo or
    the runtime skill snapshot.
    """
    if snapshot_root.exists():
        message = f'refusing to overwrite existing evaluation snapshot: {snapshot_root}'
        raise ContractError(message)
    snapshot_root.mkdir(parents=True)
    skills_root = snapshot_root / 'skills'
    skills_root.mkdir()
    skills = {}
    for name in names:
        destination = skills_root / name
        copy_tree(eval_directory(repo, name), destination, skip_generated=True)
        skills[name] = str(destination)
    suites: dict[str, str] = {}
    if suite_identities:
        suites_root = snapshot_root / 'suites'
        suites_root.mkdir()
        for identity in suite_identities:
            destination = suites_root / f'{identity["suite_name"]}.json'
            shutil.copy2(identity['repository_path'], destination)
            suites[identity['suite_name']] = str(destination)
    return {'root': str(snapshot_root), 'skills': skills, 'suites': suites}


def assert_no_eval_material(snapshot_root: Path) -> None:
    """Fail loudly if a runtime snapshot (what gets installed) carries eval material.

    `installed_copy_steps` only ever point at this snapshot, so this is the check that keeps
    installed copies free of cases, fixtures, expectations, and expected answers.
    """
    leaked = sorted(
        path.relative_to(snapshot_root).as_posix()
        for path in snapshot_root.rglob('*')
        if (path.is_dir() and path.name == LEGACY_EVAL_DIRNAME)
        or (path.is_file() and path.name in EVAL_CORPUS_FILENAMES)
    )
    if leaked:
        message = f'runtime skill snapshot must not contain eval material: {", ".join(leaked)}'
        raise ContractError(message)


def assert_no_runtime_artifacts(snapshot_root: Path) -> None:
    """Fail loudly if an installable snapshot carries generated local state."""
    leaked = sorted(
        path.relative_to(snapshot_root).as_posix()
        for path in snapshot_root.rglob('*')
        if is_generated_runtime_artifact(path.relative_to(snapshot_root))
    )
    if leaked:
        message = (
            'runtime skill snapshot must not contain generated artifacts: '
            + ', '.join(leaked)
        )
        raise ContractError(message)


def bind_case_fixtures(
    cases: list[dict[str, Any]], evaluation_snapshot: dict[str, Any]
) -> list[dict[str, Any]]:
    """Point every case fixture at the immutable evaluation snapshot.

    Fixture sources never reference the runtime snapshot or the mutable repository, so a
    runner materializes exactly the frozen bytes the run identity was computed over.

    Each fixture is `{path, source, sha256, workspace_path}`: `path` is where it lives in the
    eval corpus, `source` is the frozen absolute path to copy from, and `workspace_path` is
    exactly where the adapter must write it inside the case workspace. Adapters copy
    `source` to `workspace_path` and never derive a destination themselves.
    """
    bound = []
    for case in cases:
        copied = dict(case)
        skill_root = evaluation_snapshot['skills'].get(case['skill_name'])
        if skill_root is None:
            bound.append(copied)
            continue
        prefix = fixture_prefix_of(case)
        copied['fixture_root'] = skill_root
        fixtures = []
        for relative in case.get('files', []):
            source = Path(skill_root) / relative
            try:
                sha256 = hash_file(source)
            except OSError as error:
                message = (
                    f'case {case.get("skill_name")}:{case.get("case_id")} fixture is missing from the'
                    f' evaluation snapshot (it may live under a generated-artifact path that is'
                    f' excluded from snapshots): {relative}'
                )
                raise ContractError(message) from error
            fixtures.append(
                {
                    'path': relative,
                    'source': str(source),
                    'sha256': sha256,
                    'workspace_path': fixture_workspace_path(prefix, relative),
                }
            )
        copied['fixtures'] = fixtures
        bound.append(copied)
    return bound


def make_run_id(
    role: str,
    runtime_digest: str,
    evaluation_digest: str,
    model: str,
    config: Any,
    agents: list[str],
    cases: list[dict[str, Any]],
    suite_identities: list[dict[str, Any]],
) -> str:
    """Derive a deterministic run id from everything a run's comparability depends on."""
    identity = {
        'runtime_digest': runtime_digest,
        'evaluation_digest': evaluation_digest,
        'model': model,
        'config': config,
        'agents': sorted(agents),
        'cases': [(case['skill_name'], case['case_id']) for case in cases],
        'suites': sorted(
            (item['suite_name'], item['content_sha256']) for item in suite_identities
        ),
    }
    return f'{role}-{digest(identity)[:16]}'


def prepare_run_config(args: argparse.Namespace) -> dict[str, Any]:
    """Validate the invocation's own arguments and return the fixed model settings object."""
    try:
        config = json.loads(args.config_json)
    except json.JSONDecodeError as error:
        message = f'--config-json must be valid JSON: {error.msg}'
        raise ContractError(message) from error
    if not isinstance(config, dict):
        message = '--config-json must be a JSON object'
        raise ContractError(message)
    if len(args.agent) != len(set(args.agent)) or not all(
        agent.strip() for agent in args.agent
    ):
        message = '--agent values must be unique non-empty strings'
        raise ContractError(message)
    if Path(args.output).exists():
        message = f'refusing to overwrite immutable artifact: {args.output}'
        raise ContractError(message)
    if getattr(args, 'suite_only', False) and not args.suite:
        message = '--suite-only requires at least one --suite'
        raise ContractError(message)
    return config


def validate_run_role(args: argparse.Namespace) -> None:
    """Check that the run's role and its baseline reference are consistent."""
    if args.role == 'baseline' and args.baseline_run_id:
        message = 'baseline runs cannot name a baseline run'
        raise ContractError(message)
    if args.role == 'candidate' and not args.baseline_run_id:
        message = 'candidate runs require --baseline-run-id'
        raise ContractError(message)


def install_steps(
    agents: list[str], names: list[str], snapshot_copies: dict[str, str]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Describe the installed-copy steps for every requested agent and selected skill.

    Both descriptions cover the same steps: `installed_copy_steps[i]["argv"]` remains the
    source of truth for any adapter that shells out to `npx`, while `install_requirements[i]`
    is an additive, backward-compatible structured description of identical intent for
    adapters that cannot or do not want to.
    """
    installed_copies: list[dict[str, Any]] = []
    install_requirements: list[dict[str, Any]] = []
    for agent in agents:
        for case_skill in names:
            source = snapshot_copies[case_skill]
            installed_copies.append(
                {
                    'agent': agent,
                    'skill_name': case_skill,
                    'argv': [
                        'npx',
                        'skills',
                        'add',
                        source,
                        '--agent',
                        agent,
                        '--copy',
                        '--yes',
                    ],
                }
            )
            install_requirements.append(
                {
                    'agent': agent,
                    'skill_name': case_skill,
                    'package_manager': 'npx',
                    'package': 'skills',
                    'action': 'add',
                    'source': source,
                    'options': {'agent': agent, 'copy': True, 'yes': True},
                }
            )
    return installed_copies, install_requirements


def prepare_run(args: argparse.Namespace) -> dict[str, Any]:
    """Write the immutable, runner-neutral run request for one baseline or candidate run."""
    repo = Path(args.repo).resolve()
    errors = validate_repository(repo)
    if errors:
        raise ContractError('cannot prepare invalid corpus:\n' + '\n'.join(errors))
    config = prepare_run_config(args)
    selected_skills = resolve_skill_selection(repo, args.skill)
    # --suite-only skips the real behavior cases so a trigger/composition
    # suite can be prepared on its own, but the selected real skills are still snapshotted
    # and installed below exactly as a full run would.
    cases = (
        []
        if getattr(args, 'suite_only', False)
        else collect_cases(repo, selected_skills)
    )
    suite_cases, suite_identities = collect_suite_cases(
        [Path(path) for path in args.suite], selected_skills, repo
    )
    runtime = runtime_tree_digest(repo, selected_skills)
    evaluation = evaluation_corpus_digest(repo, selected_skills, suite_identities)
    sha = git_sha(repo)
    validate_run_role(args)
    run_id = args.run_id or make_run_id(
        args.role,
        runtime['digest'],
        evaluation['digest'],
        args.model,
        config,
        args.agent,
        cases,
        suite_identities,
    )
    if not RUN_ID_PATTERN.fullmatch(run_id):
        message = (
            '--run-id must be 1-128 characters, start with an alphanumeric character, '
            "and contain only alphanumerics, '.', '_', or '-'"
        )
        raise ContractError(message)
    output = Path(args.output).resolve()
    snapshot_root = output.parent / f'{run_id}.skills-snapshot'
    evaluation_snapshot_root = output.parent / f'{run_id}.evaluation-snapshot'
    # Only clean up snapshot directories this invocation actually created: a pre-existing
    # directory (e.g. a run_id collision with a previous, already-completed run) is left
    # alone -- materialize_snapshot/materialize_evaluation_snapshot already refuse to
    # overwrite it, and a failed prepare must never delete another run's snapshot.
    pre_existing_snapshot = snapshot_root.exists()
    pre_existing_evaluation_snapshot = evaluation_snapshot_root.exists()
    try:
        snapshot_copies = materialize_snapshot(
            skill_directory_map(repo), selected_skills, snapshot_root
        )
        assert_no_eval_material(snapshot_root)
        assert_no_runtime_artifacts(snapshot_root)
        evaluation_snapshot = materialize_evaluation_snapshot(
            repo, selected_skills, suite_identities, evaluation_snapshot_root
        )
        for identity in suite_identities:
            identity['snapshot_path'] = evaluation_snapshot['suites'][
                identity['suite_name']
            ]
        installed_copies, install_requirements = install_steps(
            args.agent, selected_skills, snapshot_copies
        )
        request: dict[str, Any] = {
            'schema': RUN_REQUEST_SCHEMA,
            'run_id': run_id,
            'role': args.role,
            'repository': {
                'path': str(repo),
                'sha': sha,
                'selected_skill_tree_digest': runtime['digest'],
                'skill_tree_digests': runtime['skills'],
            },
            'evaluation': {
                'corpus_root': str(eval_corpus_root(repo)),
                'corpus_digest': evaluation['digest'],
                'eval_tree_digests': evaluation['skills'],
                'suite_digests': evaluation['suites'],
            },
            'model': {
                'id': args.model,
                'settings': config,
                'config_id': digest(config),
            },
            'agents': args.agent,
            'snapshot': {'root': str(snapshot_root), 'skills': snapshot_copies},
            'evaluation_snapshot': evaluation_snapshot,
            'installed_copy_steps': installed_copies,
            'install_requirements': install_requirements,
            'comparison_key': args.comparison_key,
            'baseline_run_id': args.baseline_run_id,
            'suites': suite_identities,
            'cases': bind_case_fixtures(cases, evaluation_snapshot) + suite_cases,
        }
        request['content_sha256'] = digest(request)
        write_immutable(Path(args.output), request)
    except BaseException:
        # A failed prepare must never leave behind a snapshot directory it created itself:
        # that would permanently block a retry with `refusing to overwrite existing
        # snapshot`. Directories that pre-date this invocation are never touched.
        if not pre_existing_snapshot and snapshot_root.exists():
            shutil.rmtree(snapshot_root)
        if not pre_existing_evaluation_snapshot and evaluation_snapshot_root.exists():
            shutil.rmtree(evaluation_snapshot_root)
        raise
    return request


def json_at(value: Any, path: str) -> Any:
    """Look up a dotted JSON path, raising KeyError when any component is absent."""
    current = value
    for component in path.split('.'):
        if not component:
            continue
        if not isinstance(current, dict) or component not in current:
            raise KeyError(path)
        current = current[component]
    return current


def matches_shape(value: Any, required: Any) -> bool:
    """Report whether `value` satisfies a declarative `json_shape` requirement."""
    if isinstance(required, dict):
        return isinstance(value, dict) and all(
            key in value and matches_shape(value[key], expected)
            for key, expected in required.items()
        )
    if isinstance(required, list):
        return isinstance(value, list)
    if required == 'string':
        return isinstance(value, str)
    if required == 'number':
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if required == 'boolean':
        return isinstance(value, bool)
    if required == 'object':
        return isinstance(value, dict)
    if required == 'array':
        return isinstance(value, list)
    return value == required


def grade_exit_status(
    check: dict[str, Any], result: dict[str, Any]
) -> tuple[bool, str]:
    """Score one `exit_status` check against a runner result."""
    if 'equals' in check:
        return (
            result.get('exit_status') == check['equals'],
            f'exit_status == {check["equals"]}',
        )
    return (
        result.get('exit_status') != check['not_equals'],
        f'exit_status != {check["not_equals"]}',
    )


def grade_text(check: dict[str, Any], result: dict[str, Any]) -> tuple[bool, str]:
    """Score one `text_contains` or `text_regex` check against a runner result."""
    text = result.get('response_text', '')
    if check['type'] == 'text_contains':
        return check.get('value', '') in text, f'text contains {check.get("value")!r}'
    return (
        bool(re.search(check.get('pattern', ''), text)),
        f'text matches {check.get("pattern")!r}',
    )


def grade_json_shape(check: dict[str, Any], result: dict[str, Any]) -> tuple[bool, str]:
    """Score one `json_shape` check against a runner result."""
    path = check.get('path', 'response_json')
    try:
        passed = matches_shape(json_at(result, path), check.get('required', {}))
    except KeyError:
        passed = False
    return passed, f'JSON at {path!r} matches shape'


def grade_skill_selection(
    check: dict[str, Any], result: dict[str, Any]
) -> tuple[bool, str]:
    """Score one deterministic `skill_selection` check against a runner result.

    Only skills inside the declared universe count: any other globally-available skill an
    adapter happens to report is ignored unless the case explicitly forbids it.
    """
    universe = set(check.get('universe', []))
    expected = check.get('expected', [])
    forbidden = set(check.get('forbidden', []))
    raw_activated = set(result.get('activated_skills', []))
    activated = raw_activated & universe
    if expected == [NONE_ROUTE]:
        passed, detail = not activated, 'no universe skill activated'
    else:
        passed = set(expected).issubset(activated)
        detail = f'activated skills include expected={sorted(expected)}'
    if forbidden & raw_activated:
        return False, f'forbidden skills activated: {sorted(forbidden & raw_activated)}'
    return passed, detail


def grade_check(
    check: dict[str, Any], result: dict[str, Any], *, not_run: bool
) -> tuple[bool, str]:
    """Score one deterministic grading check, honoring the `not_run` exit-status rule."""
    kind = check['type']
    if kind == 'exit_status':
        if not_run:
            return (
                False,
                'exit_status check cannot pass or fail meaningfully: result status is not_run',
            )
        return grade_exit_status(check, result)
    if kind == 'file_exists':
        return (
            check.get('path') in result.get('artifacts', {}),
            f'artifact {check.get("path")!r} exists',
        )
    if kind in {'text_contains', 'text_regex'}:
        return grade_text(check, result)
    if kind == 'json_shape':
        return grade_json_shape(check, result)
    if kind == 'skill_selection':
        return grade_skill_selection(check, result)
    return False, ''


def grade(result: dict[str, Any], checks: list[dict[str, Any]]) -> dict[str, Any]:
    """Deterministic-only grading from explicit machine-checkable `grading` entries.

    A `not_run` result (the agent refused or was never exercised, see `refusal_reason`) can
    never be graded as passed or failed: an `exit_status` check is forced to fail outright --
    there is no real exit status to compare -- and, regardless of what any individual check
    reports, the overall status is forced to `ungraded` so a not_run case never counts as a
    deterministic pass or fail.
    """
    not_run = result.get('status') == 'not_run'
    outcomes: list[dict[str, Any]] = []
    for check in checks:
        passed, detail = grade_check(check, result, not_run=not_run)
        outcomes.append({'type': check['type'], 'passed': passed, 'detail': detail})
    if not checks or not_run:
        return {'status': 'ungraded', 'checks': outcomes}
    return {
        'status': 'passed' if all(item['passed'] for item in outcomes) else 'failed',
        'checks': outcomes,
    }


def normalize_rubric_expectation(
    item: Any, text: Any, index: int, key: tuple[str, str]
) -> dict[str, Any]:
    """Validate one submitted rubric expectation and return its normalized form.

    An expectation is either applicable (the legacy `{text, passed, evidence}` shape,
    `applicable` defaulting to `true`) and needs a boolean `passed` verdict, or explicitly
    not applicable (`{text, applicable: false, evidence}`) and must carry no verdict at all.
    """
    if not isinstance(item, dict):
        message = f'rubric expectation[{index}] for {key[0]}/{key[1]} must be an object'
        raise ContractError(message)
    if item.get('text') != text:
        message = f'rubric expectation[{index}] text for {key[0]}/{key[1]} must exactly match the case expectation'
        raise ContractError(message)
    applicable = item.get('applicable', True)
    if not isinstance(applicable, bool):
        message = f'rubric expectation[{index}] applicable for {key[0]}/{key[1]} must be a boolean'
        raise ContractError(message)
    evidence = item.get('evidence')
    if not isinstance(evidence, str) or not evidence.strip():
        message = f'rubric expectation[{index}] evidence must be a non-empty string for {key[0]}/{key[1]}'
        raise ContractError(message)
    if not applicable:
        if 'passed' in item:
            message = (
                f'rubric expectation[{index}] for {key[0]}/{key[1]} must not include passed when '
                'applicable is false (N/A)'
            )
            raise ContractError(message)
        return {'text': text, 'applicable': False, 'evidence': evidence}
    passed = item.get('passed')
    if not isinstance(passed, bool):
        message = (
            f'rubric expectation[{index}] passed must be a boolean for {key[0]}/{key[1]} '
            'when the expectation is applicable'
        )
        raise ContractError(message)
    return {
        'text': text,
        'applicable': True,
        'passed': passed,
        'evidence': evidence,
    }


def validate_rubric_status(
    status: Any, normalized_items: list[dict[str, Any]], key: tuple[str, str]
) -> None:
    """Check that a rubric's overall status agrees with its applicable expectation verdicts."""
    if status not in GRADE_STATUSES:
        message = f'rubric status for {key[0]}/{key[1]} must be one of {GRADE_STATUSES}'
        raise ContractError(message)
    applicable_items = [item for item in normalized_items if item['applicable']]
    any_failed = any(item['passed'] is False for item in applicable_items)
    all_passed = bool(applicable_items) and all(
        item['passed'] for item in applicable_items
    )
    if not applicable_items and status != 'ungraded':
        message = f"rubric status for {key[0]}/{key[1]} must be 'ungraded' when no expectation is applicable"
        raise ContractError(message)
    if any_failed and status != 'failed':
        message = f"rubric status for {key[0]}/{key[1]} must be 'failed' when any applicable expectation failed"
        raise ContractError(message)
    if all_passed and status != 'passed':
        message = f"rubric status for {key[0]}/{key[1]} must be 'passed' when every applicable expectation passed"
        raise ContractError(message)


def rubric_entry_key(entry: dict[str, Any], known_agents: set[str]) -> tuple[str, str]:
    """Validate a rubric entry's identity fields and return its (skill_name, case_id) key."""
    required = ('agent', 'skill_name', 'case_id', 'expectations', 'status')
    if any(field not in entry for field in required):
        message = f'rubric entry missing required fields: {", ".join(required)}'
        raise ContractError(message)
    if not isinstance(entry['agent'], str) or entry['agent'] not in known_agents:
        message = 'rubric entry agent is not a requested agent'
        raise ContractError(message)
    if (
        not isinstance(entry['skill_name'], str)
        or not isinstance(entry['case_id'], (str, int))
        or isinstance(entry['case_id'], bool)
    ):
        message = 'rubric entry skill_name and case_id must be strings or integers'
        raise ContractError(message)
    return (entry['skill_name'], str(entry['case_id']))


def validate_rubric_entry(
    entry: Any,
    known_cases: dict[tuple[str, str], dict[str, Any]],
    known_agents: set[str],
) -> dict[str, Any]:
    """Strictly validate an external/blind grader's per-expectation rubric submission.

    A rubric entry must restate each case expectation's exact text (count and wording),
    non-empty `evidence`, plus a consistent overall `status`. Each expectation is either
    applicable (the legacy `{text, passed, evidence}` shape, `applicable` defaulting to
    `true`) and needs a boolean `passed` verdict, or explicitly not applicable to this case
    (`{text, applicable: false, evidence}`, e.g. a conditional expectation that didn't apply)
    and must not carry a `passed` verdict at all.
    """
    if not isinstance(entry, dict):
        message = 'rubric entry must be an object'
        raise ContractError(message)
    key = rubric_entry_key(entry, known_agents)
    case = known_cases.get(key)
    if case is None:
        message = f'unknown rubric case {key[0]}/{key[1]}'
        raise ContractError(message)
    case_expectations = case.get('expectations', [])
    items = entry['expectations']
    if not isinstance(items, list) or len(items) != len(case_expectations):
        message = f'rubric expectations for {key[0]}/{key[1]} must list exactly {len(case_expectations)} item(s)'
        raise ContractError(message)
    normalized_items = [
        normalize_rubric_expectation(item, text, index, key)
        for index, (item, text) in enumerate(zip(items, case_expectations, strict=True))
    ]
    status = entry['status']
    validate_rubric_status(status, normalized_items, key)
    return {
        'agent': entry['agent'],
        'skill_name': key[0],
        'case_id': key[1],
        'expectations': normalized_items,
        'status': status,
    }


def combine_grade(
    case: dict[str, Any],
    deterministic: dict[str, Any],
    rubric_entry: dict[str, Any] | None,
    result_status: str | None = None,
) -> dict[str, Any]:
    """Combine deterministic checks with an optional rubric verdict.

    Any explicit failure (deterministic or rubric) fails the case. Passing requires every
    declared required part (deterministic checks when present, rubric when expectations
    exist and a rubric is required) to have passed. A case with expectations but no
    submitted rubric is ungraded, and so is a submitted rubric whose expectations were all
    N/A (`applicable: false`), since that leaves no applicable verdict to pass or fail on.

    A case may set `rubric_required: false` (defaulting to `true` when absent, so existing
    behavior cases are unaffected) to declare that its `expectations` are documentation only
    -- e.g. a trigger-suite case's free-text intent kept alongside its deterministic
    `skill_selection` check. Such a case's final status is decided purely by its
    deterministic `grading`, even when a rubric was never submitted (or was submitted).

    `result_status` is the raw runner result's `status` (`completed`/`failed`/`not_run`). A
    `not_run` result is forced to `ungraded` here as well as inside `grade()`: even a
    misbehaving or stale external rubric submission that reports "passed"/"failed" for a
    case the agent never actually ran can never make it out of `combine_grade` as anything
    but ungraded.
    """
    if result_status == 'not_run':
        return {
            'status': 'ungraded',
            'deterministic': deterministic,
            'rubric': rubric_entry,
        }
    rubric_required = case.get('rubric_required', True)
    required_statuses = []
    if case.get('grading'):
        required_statuses.append(deterministic['status'])
    if case.get('expectations') and rubric_required:
        required_statuses.append(rubric_entry['status'] if rubric_entry else None)
    if not required_statuses:
        status = 'ungraded'
    elif any(value == 'failed' for value in required_statuses):
        status = 'failed'
    elif any(value is None or value == 'ungraded' for value in required_statuses):
        status = 'ungraded'
    else:
        status = 'passed'
    return {'status': status, 'deterministic': deterministic, 'rubric': rubric_entry}


def case_requires_activated_skills(case: dict[str, Any]) -> bool:
    """Report whether a case must be answered with the skills that actually activated.

    A trigger case -- one graded by a deterministic `skill_selection` check -- must report
    them; nothing else in the contract can grade activation.
    """
    return any(
        isinstance(check, dict) and check.get('type') == 'skill_selection'
        for check in case.get('grading', []) or []
    )


def case_requires_execution_honored(case: dict[str, Any]) -> bool:
    """Report whether a case must confirm that its resolved `execution` hint was honored.

    Nothing else in the contract can confirm an adapter actually ran the case hermetically
    (correct `PATH`, executable bits, network mode); a case without an `execution` hint has
    nothing to confirm.
    """
    return case.get('execution') is not None


def validate_result_identity(
    result: dict[str, Any],
    case_map: dict[tuple[str, str], dict[str, Any]],
    known_agents: set[str],
) -> tuple[str, str]:
    """Validate a result's required identity fields and return its (skill_name, case_id) key."""
    required = (
        'agent',
        'skill_name',
        'case_id',
        'status',
        'exit_status',
        'response_text',
        'metrics',
    )
    if any(field not in result for field in required):
        message = f'result missing required fields: {", ".join(required)}'
        raise ContractError(message)
    if not isinstance(result['agent'], str) or result['agent'] not in known_agents:
        message = 'result agent is not a requested agent'
        raise ContractError(message)
    if (
        not isinstance(result['skill_name'], str)
        or not isinstance(result['case_id'], (str, int))
        or isinstance(result['case_id'], bool)
    ):
        message = 'result skill_name and case_id must be strings or integers'
        raise ContractError(message)
    key = (result['skill_name'], str(result['case_id']))
    if key not in case_map:
        message = f'unknown result case {key[0]}/{key[1]}'
        raise ContractError(message)
    return key


def validate_result_payload(result: dict[str, Any]) -> None:
    """Validate a result's status, exit status, response text, metrics, and artifacts."""
    if (
        not isinstance(result['status'], str)
        or result['status'] not in RESULT_STATUSES
        or not isinstance(result['exit_status'], int)
        or isinstance(result['exit_status'], bool)
    ):
        message = f'result status or exit_status is invalid; status must be one of {RESULT_STATUSES}'
        raise ContractError(message)
    if not isinstance(result['response_text'], str) or not isinstance(
        result['metrics'], dict
    ):
        message = 'response_text must be a string and metrics must be an object'
        raise ContractError(message)
    for metric in (
        'input_tokens',
        'output_tokens',
        'duration_ms',
        'tool_calls',
        'subagent_calls',
    ):
        value = result['metrics'].get(metric)
        if (
            metric not in result['metrics']
            or not isinstance(value, (int, float))
            or isinstance(value, bool)
            or value < 0
        ):
            message = f'metric {metric} must be non-negative'
            raise ContractError(message)
    if 'artifacts' in result and not isinstance(result['artifacts'], dict):
        message = 'artifacts must map paths to runner-provided metadata'
        raise ContractError(message)


def validate_result_activation(
    result: dict[str, Any], case: dict[str, Any], key: tuple[str, str]
) -> None:
    """Validate the reported `activated_skills`, which trigger cases must always supply."""
    if 'activated_skills' in result:
        activated = result['activated_skills']
        if (
            not isinstance(activated, list)
            or not all(isinstance(name, str) and name.strip() for name in activated)
            or len(activated) != len(set(activated))
        ):
            message = f'result activated_skills for {key[0]}/{key[1]} must be a list of unique, non-empty strings'
            raise ContractError(message)
    elif case_requires_activated_skills(case):
        message = f'result for {key[0]}/{key[1]} is graded by skill_selection and requires activated_skills'
        raise ContractError(message)


def validate_result_execution(
    result: dict[str, Any], case: dict[str, Any], key: tuple[str, str]
) -> None:
    """Validate that a hermetic case reports an honored execution hint or a refusal reason."""
    if not case_requires_execution_honored(case):
        return
    if result['status'] == 'not_run':
        refusal_reason = result.get('refusal_reason')
        if not isinstance(refusal_reason, str) or not refusal_reason.strip():
            message = f'result for {key[0]}/{key[1]} has status not_run and requires a non-empty refusal_reason'
            raise ContractError(message)
    elif (
        'execution_honored' not in result
        or result['execution_honored'] != case['execution']
    ):
        message = (
            f'result for {key[0]}/{key[1]} has an execution hint and requires execution_honored'
            " deep-equal to the case's execution block, or status not_run with a refusal_reason"
        )
        raise ContractError(message)


def validate_result(
    result: Any, case_map: dict[tuple[str, str], dict[str, Any]], known_agents: set[str]
) -> dict[str, Any]:
    """Strictly validate one runner result against the run's requested cases and agents."""
    if not isinstance(result, dict):
        message = 'result must be an object'
        raise ContractError(message)
    key = validate_result_identity(result, case_map, known_agents)
    validate_result_payload(result)
    validate_result_activation(result, case_map[key], key)
    validate_result_execution(result, case_map[key], key)
    return result


def load_rubric_map(
    paths: list[Path],
    run_id: str,
    case_map: dict[tuple[str, str], dict[str, Any]],
    known_agents: set[str],
) -> dict[tuple[str, str, str], dict[str, Any]]:
    """Load every rubric submission for this run, keyed by (agent, skill_name, case_id)."""
    rubric_map: dict[tuple[str, str, str], dict[str, Any]] = {}
    for path in paths:
        document = read_json(path)
        if (
            not isinstance(document, dict)
            or document.get('schema') != RUBRIC_INPUT_SCHEMA
            or document.get('run_id') != run_id
        ):
            message = f'{path}: must be a matching {RUBRIC_INPUT_SCHEMA} document'
            raise ContractError(message)
        rubrics = document.get('rubrics')
        if not isinstance(rubrics, list):
            message = f'{path}: rubrics must be a list'
            raise ContractError(message)
        for raw in rubrics:
            entry = validate_rubric_entry(raw, case_map, known_agents)
            key = (entry['agent'], entry['skill_name'], entry['case_id'])
            if key in rubric_map:
                message = f'duplicate rubric submission for {key[0]}/{key[1]}/{key[2]}'
                raise ContractError(message)
            rubric_map[key] = entry
    return rubric_map


def import_results(args: argparse.Namespace) -> dict[str, Any]:
    """Validate, grade, and freeze one run's results into an immutable imported document."""
    run = read_json(Path(args.run))
    if run.get('schema') != RUN_REQUEST_SCHEMA or run.get('content_sha256') != digest(
        {key: value for key, value in run.items() if key != 'content_sha256'}
    ):
        message = 'run manifest is not a valid immutable run request'
        raise ContractError(message)
    if (
        not isinstance(run.get('evaluation'), dict)
        or 'corpus_digest' not in run['evaluation']
    ):
        message = 'run manifest has no evaluation corpus identity; re-prepare it against the central evals/ corpus'
        raise ContractError(message)
    incoming = read_json(Path(args.input))
    if (
        not isinstance(incoming, dict)
        or incoming.get('schema') != RUN_RESULT_SCHEMA
        or incoming.get('run_id') != run['run_id']
    ):
        message = 'input must be a matching skill-evals/run-result-v1 document'
        raise ContractError(message)
    raw_results = incoming.get('results')
    if not isinstance(raw_results, list):
        message = 'run results must contain a results list'
        raise ContractError(message)
    case_map = {
        (case['skill_name'], str(case['case_id'])): case for case in run['cases']
    }
    agents = set(run['agents'])
    rubric_map = load_rubric_map(
        [Path(path) for path in getattr(args, 'rubric', [])],
        run['run_id'],
        case_map,
        agents,
    )
    imported = []
    seen: set[tuple[str, str, str]] = set()
    for raw in raw_results:
        result = validate_result(raw, case_map, agents)
        key = (result['agent'], result['skill_name'], str(result['case_id']))
        if key in seen:
            message = f'duplicate result for {key[0]}/{key[1]}/{key[2]}'
            raise ContractError(message)
        seen.add(key)
        result = dict(result)
        result['case_id'] = str(result['case_id'])
        case = case_map[(key[1], key[2])]
        deterministic = grade(result, case.get('grading', []))
        result['grade'] = combine_grade(
            case, deterministic, rubric_map.get(key), result.get('status')
        )
        imported.append(result)
    expected = {
        (agent, skill, case_id) for agent in agents for skill, case_id in case_map
    }
    if seen != expected:
        missing = sorted(
            f'{agent}/{skill}/{case_id}' for agent, skill, case_id in expected - seen
        )
        message = f'results must cover every requested agent and case; missing: {", ".join(missing)}'
        raise ContractError(message)
    unused_rubrics = sorted(
        f'{a}/{s}/{c}' for a, s, c in rubric_map if (a, s, c) not in seen
    )
    if unused_rubrics:
        message = f'rubric submissions reference results not present in this import: {", ".join(unused_rubrics)}'
        raise ContractError(message)
    document = {
        'schema': IMPORTED_RESULT_SCHEMA,
        'run': {
            key: run[key]
            for key in (
                'run_id',
                'role',
                'model',
                'comparison_key',
                'baseline_run_id',
                'repository',
                'evaluation',
            )
        },
        'results': sorted(
            imported,
            key=lambda item: (item['agent'], item['skill_name'], item['case_id']),
        ),
    }
    document['run']['critical_cases'] = [
        {
            'skill_name': case['skill_name'],
            'case_id': case['case_id'],
            'critical_expectations': case.get('critical_expectations', []),
        }
        for case in run['cases']
        if case.get('critical')
    ]
    document['content_sha256'] = digest(document)
    write_immutable(Path(args.output), document)
    return document


def metric_totals(results: list[dict[str, Any]]) -> dict[str, float]:
    """Sum every reported runner metric across `results`."""
    names = (
        'input_tokens',
        'output_tokens',
        'duration_ms',
        'tool_calls',
        'subagent_calls',
    )
    return {
        name: sum(result.get('metrics', {}).get(name, 0) for result in results)
        for name in names
    }


def summary(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Tally case coverage.

    `not_run` is counted separately from `ungraded`: a not_run result still counts toward
    `cases` (it covers the requested agent/case, satisfying run coverage) but reports why it
    has no verdict distinctly from a case that ran and simply had no applicable grading --
    the two are not interchangeable for a maintainer reading this summary.
    """
    grades = defaultdict(int)
    not_run = 0
    for result in results:
        if result.get('status') == 'not_run':
            not_run += 1
            continue
        grades[result['grade']['status']] += 1
    graded = grades['passed'] + grades['failed']
    return {
        'cases': len(results),
        'passed': grades['passed'],
        'failed': grades['failed'],
        'ungraded': grades['ungraded'],
        'not_run': not_run,
        'pass_rate': grades['passed'] / graded if graded else None,
        'metrics': metric_totals(results),
    }


def critical_outcome(case: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    """Summarize how one critical case fared, including its critical expectation indexes."""
    issues: list[dict[str, Any]] = []
    grade_status = result['grade']['status']
    critical_expectations = case.get('critical_expectations', [])
    if result.get('status') == 'not_run':
        issues.append(
            {
                'type': 'not_run',
                'reason': result.get('refusal_reason', 'critical case was not run'),
            }
        )
    elif grade_status == 'ungraded':
        issues.append({'type': 'grade', 'status': grade_status})
    deterministic = result['grade'].get('deterministic')
    if isinstance(deterministic, dict) and deterministic.get('status') == 'failed':
        issues.append({'type': 'deterministic', 'status': 'failed'})

    rubric = result['grade'].get('rubric')
    rubric_expectations = (
        rubric.get('expectations', []) if isinstance(rubric, dict) else []
    )
    not_applicable_expectations = []
    expectation_statuses = []
    for index in critical_expectations:
        if index >= len(rubric_expectations):
            issues.append(
                {'type': 'critical_expectation', 'index': index, 'status': 'missing'}
            )
            expectation_statuses.append({'index': index, 'status': 'missing'})
            continue
        expectation = rubric_expectations[index]
        if expectation.get('applicable') is False:
            not_applicable_expectations.append(index)
            expectation_statuses.append({'index': index, 'status': 'not_applicable'})
        elif expectation.get('passed') is not True:
            issues.append(
                {'type': 'critical_expectation', 'index': index, 'status': 'failed'}
            )
            expectation_statuses.append({'index': index, 'status': 'failed'})
        else:
            expectation_statuses.append({'index': index, 'status': 'passed'})
    if not critical_expectations and grade_status != 'passed':
        issues.append({'type': 'grade', 'status': grade_status})

    return {
        'passed': not issues,
        'execution_status': result.get('status'),
        'grade_status': grade_status,
        'not_applicable_expectations': not_applicable_expectations,
        'expectation_statuses': expectation_statuses,
        'issues': issues,
    }


def collect_aggregate_runs(
    documents: list[Any],
) -> tuple[
    dict[str, dict[str, Any]],
    dict[tuple[str, str, str, str, str], list[dict[str, Any]]],
]:
    """Index imported result documents by run id and group their results for summarizing."""
    groups: dict[tuple[str, str, str, str, str], list[dict[str, Any]]] = defaultdict(
        list
    )
    runs: dict[str, dict[str, Any]] = {}
    for document in documents:
        run = document['run']
        if document.get('content_sha256') != digest(
            {key: value for key, value in document.items() if key != 'content_sha256'}
        ):
            message = 'aggregate input has an invalid immutable result digest'
            raise ContractError(message)
        if run['run_id'] in runs:
            message = f'aggregate input repeats run {run["run_id"]}'
            raise ContractError(message)
        runs[run['run_id']] = {**run, 'results': document['results']}
        for result in document['results']:
            groups[
                (
                    result['skill_name'],
                    result['agent'],
                    run['model']['id'],
                    run['model']['config_id'],
                    run['role'],
                )
            ].append(result)
    return runs, groups


def validate_pair_compatibility(
    candidate: dict[str, Any], baseline: dict[str, Any], baseline_id: str
) -> None:
    """Check that a candidate run may be paired with the baseline run it names.

    Runtime skill trees are exactly what a comparison is allowed to differ on, so the runtime
    digest is deliberately not compared here. The evaluation corpus is not: different cases,
    fixtures, or suites make a paired delta meaningless.
    """
    for checked in (candidate, baseline):
        if (
            not isinstance(checked.get('evaluation'), dict)
            or 'corpus_digest' not in checked['evaluation']
        ):
            message = (
                f'run {checked["run_id"]} has no evaluation corpus identity; '
                're-run it against the central evals/ corpus'
            )
            raise ContractError(message)
        if not isinstance(checked.get('critical_cases'), list):
            message = f'run {checked["run_id"]} has no critical-case metadata; re-import it with the current harness'
            raise ContractError(message)
    compatible = (
        candidate['role'] == 'candidate'
        and baseline['role'] == 'baseline'
        and candidate['comparison_key']
        and candidate['comparison_key'] == baseline['comparison_key']
        and candidate['model']['id'] == baseline['model']['id']
        and candidate['model']['config_id'] == baseline['model']['config_id']
    )
    if not compatible:
        message = f'candidate {candidate["run_id"]} is incompatible with baseline {baseline_id}'
        raise ContractError(message)
    if (
        candidate['evaluation']['corpus_digest']
        != baseline['evaluation']['corpus_digest']
    ):
        message = (
            f'candidate {candidate["run_id"]} and baseline {baseline_id} were graded against different '
            'evaluation corpora (corpus_digest mismatch)'
        )
        raise ContractError(message)
    if candidate['evaluation'].get('suite_digests') != baseline['evaluation'].get(
        'suite_digests'
    ):
        message = (
            f'candidate {candidate["run_id"]} and baseline {baseline_id} used different suites '
            '(suite_digests mismatch)'
        )
        raise ContractError(message)


def critical_checks_for_pair(
    keys: list[tuple[str, str, str]],
    case_metadata: dict[tuple[str, str], dict[str, Any]],
    base: dict[tuple[str, str, str], dict[str, Any]],
    cand: dict[tuple[str, str, str], dict[str, Any]],
) -> list[dict[str, Any]]:
    """Compare every critical case's baseline and candidate outcome, flagging regressions."""
    critical_checks: list[dict[str, Any]] = []
    for key in keys:
        case = case_metadata.get((key[1], key[2]))
        if case is None:
            continue
        baseline_outcome = critical_outcome(case, base[key])
        candidate_outcome = critical_outcome(case, cand[key])
        baseline_expectations = {
            item['index']: item['status']
            for item in baseline_outcome['expectation_statuses']
        }
        candidate_expectations = {
            item['index']: item['status']
            for item in candidate_outcome['expectation_statuses']
        }
        expectation_regressions = [
            index
            for index, status in baseline_expectations.items()
            if status == 'passed' and candidate_expectations.get(index) != 'passed'
        ]
        critical_checks.append(
            {
                'agent': key[0],
                'skill_name': key[1],
                'case_id': key[2],
                'baseline': baseline_outcome,
                'candidate': candidate_outcome,
                'expectation_regressions': expectation_regressions,
                'regression': (
                    (baseline_outcome['passed'] and not candidate_outcome['passed'])
                    or bool(expectation_regressions)
                ),
            }
        )
    return critical_checks


def paired_delta(
    candidate: dict[str, Any], baseline: dict[str, Any], baseline_id: str
) -> dict[str, Any]:
    """Build the paired baseline/candidate delta, including the critical-case gate."""
    validate_pair_compatibility(candidate, baseline, baseline_id)
    base = {(r['agent'], r['skill_name'], r['case_id']): r for r in baseline['results']}
    cand = {
        (r['agent'], r['skill_name'], r['case_id']): r for r in candidate['results']
    }
    if set(base) != set(cand):
        message = f'candidate {candidate["run_id"]} and baseline {baseline_id} cover different cases'
        raise ContractError(message)
    keys = sorted(base)
    case_metadata = {
        (case['skill_name'], case['case_id']): case
        for case in candidate['critical_cases']
    }
    critical_checks = critical_checks_for_pair(keys, case_metadata, base, cand)
    graded_keys = [
        key
        for key in keys
        if base[key]['grade']['status'] in {'passed', 'failed'}
        and cand[key]['grade']['status'] in {'passed', 'failed'}
    ]
    base_score = sum(
        1 for key in graded_keys if base[key]['grade']['status'] == 'passed'
    )
    cand_score = sum(
        1 for key in graded_keys if cand[key]['grade']['status'] == 'passed'
    )
    base_metrics, cand_metrics = (
        metric_totals([base[k] for k in keys]),
        metric_totals([cand[k] for k in keys]),
    )
    return {
        'baseline_run_id': baseline_id,
        'candidate_run_id': candidate['run_id'],
        'comparison_key': candidate.get('comparison_key'),
        'matched_cases': len(keys),
        'graded_pairs': len(graded_keys),
        'pass_delta': cand_score - base_score,
        'pass_rate_delta': (cand_score - base_score) / len(graded_keys)
        if graded_keys
        else None,
        'metric_deltas': {
            name: cand_metrics[name] - base_metrics[name] for name in base_metrics
        },
        'critical_gate_passed': (
            not any(check['regression'] for check in critical_checks)
            and not any(
                check['candidate']['execution_status'] == 'not_run'
                or check['candidate']['grade_status'] == 'ungraded'
                for check in critical_checks
            )
        ),
        'critical_checks': critical_checks,
        'critical_candidate_failures': [
            {
                'agent': check['agent'],
                'skill_name': check['skill_name'],
                'case_id': check['case_id'],
            }
            for check in critical_checks
            if not check['candidate']['passed']
        ],
        'critical_regressions': [
            {
                'agent': check['agent'],
                'skill_name': check['skill_name'],
                'case_id': check['case_id'],
            }
            for check in critical_checks
            if check['regression']
        ],
    }


def aggregate(args: argparse.Namespace) -> dict[str, Any]:
    """Aggregate imported runs into per-group summaries and paired baseline/candidate deltas."""
    documents = [read_json(Path(path)) for path in args.input]
    for document in documents:
        if document.get('schema') != IMPORTED_RESULT_SCHEMA:
            message = 'aggregate inputs must be imported results'
            raise ContractError(message)
    runs, groups = collect_aggregate_runs(documents)
    group_list = [
        {
            'skill_name': key[0],
            'agent': key[1],
            'model': key[2],
            'config_id': key[3],
            'role': key[4],
            **summary(value),
        }
        for key, value in sorted(groups.items())
    ]
    paired = []
    for candidate in runs.values():
        baseline_id = candidate.get('baseline_run_id')
        if not baseline_id:
            continue
        baseline = runs.get(baseline_id)
        if not baseline:
            message = f'candidate {candidate["run_id"]} names unavailable baseline {baseline_id}'
            raise ContractError(message)
        paired.append(paired_delta(candidate, baseline, baseline_id))
    document = {
        'schema': AGGREGATE_SCHEMA,
        'groups': group_list,
        'paired_deltas': paired,
    }
    document['content_sha256'] = digest(document)
    write_immutable(Path(args.output), document)
    return document


def main(argv: list[str] | None = None) -> int:
    """Parse arguments and dispatch to the requested harness subcommand."""
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    validate = sub.add_parser(
        'validate', help='validate skills, evals, frontmatter, and bundled references'
    )
    validate.add_argument('--repo', required=True)
    validate.add_argument(
        '--suite',
        action='append',
        default=[],
        help='also validate trigger/composition suite JSON',
    )
    footprint_parser = sub.add_parser(
        'footprint',
        help='write immutable provider-neutral static context footprint metrics from a profile configuration',
    )
    footprint_parser.add_argument('--repo', required=True)
    footprint_parser.add_argument(
        '--profiles', required=True, help='footprint profile JSON configuration'
    )
    footprint_parser.add_argument(
        '--profile',
        action='append',
        default=[],
        help='measure only this named profile (repeatable)',
    )
    footprint_parser.add_argument('--output', required=True)
    prepare = sub.add_parser(
        'prepare', help='write an immutable runner-neutral run request'
    )
    prepare.add_argument('--repo', required=True)
    prepare.add_argument('--output', required=True)
    prepare.add_argument('--role', choices=('baseline', 'candidate'), required=True)
    prepare.add_argument(
        '--model', required=True, help='fixed provider/model identifier'
    )
    prepare.add_argument(
        '--config-json', default='{}', help='fixed model settings JSON object'
    )
    prepare.add_argument('--skill', action='append', default=[])
    prepare.add_argument(
        '--suite',
        action='append',
        default=[],
        help='repeatable trigger/composition suite JSON; cases are namespaced as suite:<suite_name> '
        'and never affect installed-copy selection',
    )
    prepare.add_argument(
        '--suite-only',
        action='store_true',
        help="skip the real skills' behavior cases (evals/<skill>/evals.json) and only include --suite cases; "
        'requires at least one --suite; the selected real skills are still snapshotted and installed',
    )
    prepare.add_argument(
        '--agent', action='append', required=True, help='target agent identifier'
    )
    prepare.add_argument('--comparison-key', required=True)
    prepare.add_argument('--baseline-run-id', default=None)
    prepare.add_argument('--run-id', default=None)
    imported = sub.add_parser(
        'import-results', help='validate, grade, and freeze runner results'
    )
    imported.add_argument('--run', required=True)
    imported.add_argument('--input', required=True)
    imported.add_argument('--output', required=True)
    imported.add_argument(
        '--rubric',
        action='append',
        default=[],
        help='repeatable external/blind rubric-grader document (skill-evals/rubric-input-v1) '
        'supplying per-expectation {text,passed,evidence} and an overall status',
    )
    aggregate_parser = sub.add_parser(
        'aggregate', help='aggregate imported runs and paired deltas'
    )
    aggregate_parser.add_argument('--input', action='append', required=True)
    aggregate_parser.add_argument('--output', required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == 'validate':
            repo = Path(args.repo).resolve()
            errors = validate_repository(repo)
            full_universe = {path.name for path in skill_directories(repo)}
            for suite in [*bundled_suites(repo), *(Path(path) for path in args.suite)]:
                errors.extend(validate_suite(suite, full_universe))
            if errors:
                print('INVALID\n' + '\n'.join(errors), file=sys.stderr)
                return 1
            print('VALID')
        elif args.command == 'footprint':
            document = footprint(args)
            print(
                json.dumps(
                    {
                        'output': args.output,
                        'profiles': len(document['profiles']),
                        'content_sha256': document['content_sha256'],
                    }
                )
            )
        elif args.command == 'prepare':
            print(
                json.dumps(
                    {'run_id': prepare_run(args)['run_id'], 'output': args.output}
                )
            )
        elif args.command == 'import-results':
            print(
                json.dumps(
                    {'output': args.output, **summary(import_results(args)['results'])}
                )
            )
        elif args.command == 'aggregate':
            print(
                json.dumps(
                    {'output': args.output, 'groups': len(aggregate(args)['groups'])}
                )
            )
    except (ContractError, json.JSONDecodeError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
