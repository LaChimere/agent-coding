from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import TYPE_CHECKING, Any, Protocol, cast
from unittest import mock

import pytest

if TYPE_CHECKING:
    from types import ModuleType

HARNESS = Path(__file__).parents[1] / 'skill_evals.py'


class FixtureGenerator(Protocol):
    """Describe the scanner fixture generator interface used by this test."""

    ROOT: Path

    def main(self) -> None:
        """Generate scanner fixtures below ``ROOT``."""


def _load_module(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        msg = f'cannot load {name} from {path}'
        raise ImportError(msg)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


harness = _load_module('skill_evals', HARNESS)

INVALID_FIXTURE_PREFIXES = (
    ('fixture_prefix must be a non-empty relative directory path', ''),
    (
        'fixture_prefix must be relative and stay inside the eval corpus: /files',
        '/files',
    ),
    (
        'fixture_prefix must be relative and stay inside the eval corpus: ../../skills',
        '../../skills',
    ),
    (
        'fixture_prefix directory is missing from the eval corpus: absent',
        'absent',
    ),
)
INVALID_EXECUTION_HINTS = (
    ('execution must be an object', 'not-an-object'),
    ('unknown execution keys: sandbox', {'sandbox': 'docker'}),
    ('execution.network must be one of', {'network': 'sometimes'}),
    (
        'workspace-relative path that does not escape: /usr/local/bin',
        {'path_prepend': ['/usr/local/bin'], 'executable_files': []},
    ),
    (
        'workspace-relative path that does not escape: ../../skills/example',
        {'path_prepend': ['../../skills/example']},
    ),
    (
        'execution.path_prepend directory is missing from the eval corpus: files/absent',
        {'path_prepend': ['files/absent']},
    ),
    (
        'execution.executable_files entry is missing from the eval corpus: files/bin/ghost',
        {'executable_files': ['files/bin/ghost']},
    ),
    (
        'execution.path_prepend must be a list of non-empty strings',
        {'path_prepend': 'files/bin'},
    ),
)
INVALID_RUN_IDS = ('../escape', '/absolute/escape', 'nested/escape', ' space')
GENERATED_ARTIFACT_NAMES = (
    'grading.json',
    'timing.json',
    'benchmark-2024.json',
    'benchmark.md',
    'review-2024.html',
)


class TestHarness:
    """Exercise the skill evaluation harness."""

    @pytest.fixture(autouse=True)
    def _setup(self, tmp_path: Path) -> None:
        self.temp_path = tmp_path
        self.repo = tmp_path / 'repo'
        self.skill_dir = self.repo / 'skills' / 'example'
        self.eval_dir = self.repo / 'evals' / 'example'
        (self.eval_dir / 'files').mkdir(parents=True)
        self.skill_dir.mkdir(parents=True)
        (self.skill_dir / 'SKILL.md').write_text(
            '---\nname: example\ndescription: Example skill.\n---\n',
            encoding='utf-8',
        )
        (self.eval_dir / 'files' / 'fixture.ts').write_text(
            'export const fixture = 1;\n', encoding='utf-8'
        )
        self.case = {
            'id': 1,
            'prompt': 'Route this example.',
            'expected_output': 'Routes the example.',
            'files': ['files/fixture.ts'],
            'expectations': ['Names example.'],
            'grading': [
                {'type': 'exit_status', 'equals': 0},
                {'type': 'text_contains', 'value': 'example'},
                {
                    'type': 'json_shape',
                    'path': 'response_json',
                    'required': {'route': 'example'},
                },
            ],
        }
        (self.eval_dir / 'evals.json').write_text(
            json.dumps({'skill_name': 'example', 'evals': [self.case]}),
            encoding='utf-8',
        )
        (self.eval_dir / 'manifest.json').write_text(
            json.dumps(
                {
                    'skill_name': 'example',
                    'default_category': 'regression_guard',
                    'critical_ids': [1],
                    'critical_expectations': {'1': [0]},
                    'behavior_change_ids': [],
                    'redundant_ids': [],
                    'deterministic_ids': [1],
                    'behavior_change_rationale': {},
                }
            ),
            encoding='utf-8',
        )
        self.suite = self.repo / 'suite.json'
        self.suite.write_text(
            json.dumps(
                {
                    'schema': 'skill-evals/trigger-suite-v1',
                    'suite_name': 'routing-seeds',
                    'cases': [
                        {
                            'id': 'route-example',
                            'prompt': 'Route to the example skill.',
                            'expected_skills': ['example'],
                            'expectations': ['Names example.'],
                            'grading': [{'type': 'text_contains', 'value': 'example'}],
                        }
                    ],
                }
            ),
            encoding='utf-8',
        )

    def _invoke(self, *argv: str) -> None:
        assert harness.main(list(argv)) == 0

    def _prepare(
        self, role: str, output: Path, extra: tuple[str, ...] = ()
    ) -> dict[str, Any]:
        self._invoke(
            'prepare',
            '--repo',
            str(self.repo),
            '--role',
            role,
            '--model',
            'test/model@1',
            '--config-json',
            '{"temperature":0}',
            '--agent',
            'test-agent',
            '--comparison-key',
            'test',
            '--output',
            str(output),
            *extra,
        )
        return json.loads(output.read_text())

    def _runner_result(
        self,
        run: dict[str, Any],
        agent: str = 'test-agent',
        skill_name: str = 'example',
        case_id: str = '1',
        response: str = 'example route',
        duration: int = 10,
    ) -> dict[str, Any]:
        return {
            'schema': harness.RUN_RESULT_SCHEMA,
            'run_id': run['run_id'],
            'results': [
                {
                    'agent': agent,
                    'skill_name': skill_name,
                    'case_id': case_id,
                    'status': 'completed',
                    'exit_status': 0,
                    'response_text': response,
                    'response_json': {'route': 'example'},
                    'artifacts': {'out.txt': {}},
                    'metrics': {
                        'input_tokens': 3,
                        'output_tokens': 5,
                        'duration_ms': duration,
                        'tool_calls': 1,
                        'subagent_calls': 0,
                    },
                }
            ],
        }

    def _rubric_document(
        self,
        run: dict[str, Any],
        *,
        passed: bool = True,
        agent: str = 'test-agent',
        skill_name: str = 'example',
        case_id: str = '1',
    ) -> dict[str, Any]:
        return {
            'schema': harness.RUBRIC_INPUT_SCHEMA,
            'run_id': run['run_id'],
            'rubrics': [
                {
                    'agent': agent,
                    'skill_name': skill_name,
                    'case_id': case_id,
                    'expectations': [
                        {
                            'text': 'Names example.',
                            'passed': passed,
                            'evidence': 'response cites example',
                        }
                    ],
                    'status': 'passed' if passed else 'failed',
                }
            ],
        }

    def _rubric_document_with_expectations(
        self,
        run: dict[str, Any],
        expectations: list[dict[str, Any]],
        status: str,
        agent: str = 'test-agent',
        skill_name: str = 'example',
        case_id: str = '1',
    ) -> dict[str, Any]:
        return {
            'schema': harness.RUBRIC_INPUT_SCHEMA,
            'run_id': run['run_id'],
            'rubrics': [
                {
                    'agent': agent,
                    'skill_name': skill_name,
                    'case_id': case_id,
                    'expectations': expectations,
                    'status': status,
                }
            ],
        }

    def _write_case_expectations(self, expectations: list[str]) -> None:
        """Rewrite the sole case's free-text expectations list (used for N/A rubric tests)."""
        eval_path = self.eval_dir / 'evals.json'
        data = json.loads(eval_path.read_text())
        data['evals'][0]['expectations'] = list(expectations)
        eval_path.write_text(json.dumps(data), encoding='utf-8')

    def test_invalid_schema_is_reported(self):
        """Verify invalid schema is reported."""
        eval_path = self.eval_dir / 'evals.json'
        data = json.loads(eval_path.read_text())
        del data['evals'][0]['prompt']
        eval_path.write_text(json.dumps(data), encoding='utf-8')
        errors = harness.validate_repository(self.repo)
        assert any('prompt' in error for error in errors)

    def test_central_corpus_layout_is_required(self):
        # A runtime skill without a central eval directory is invalid.
        """Verify central corpus layout is required."""
        (self.repo / 'skills' / 'orphan-skill').mkdir()
        (self.repo / 'skills' / 'orphan-skill' / 'SKILL.md').write_text(
            '---\nname: orphan-skill\ndescription: No corpus.\n---\n', encoding='utf-8'
        )
        errors = harness.validate_repository(self.repo)
        assert any('requires evals.json and manifest.json' in error for error in errors)
        # A central eval directory with no runtime skill is equally invalid.
        (self.repo / 'evals' / 'ghost').mkdir()
        errors = harness.validate_repository(self.repo)
        assert any('no matching runtime skill' in error for error in errors)

    def test_legacy_in_skill_eval_directory_is_rejected(self):
        """Verify legacy in skill eval directory is rejected."""
        legacy = self.skill_dir / 'evals'
        legacy.mkdir()
        (legacy / 'evals.json').write_text(
            json.dumps({'skill_name': 'example', 'evals': []}), encoding='utf-8'
        )
        errors = harness.validate_repository(self.repo)
        assert any(
            'legacy in-skill eval corpus is not allowed' in error for error in errors
        )
        assert any('evals/example/' in error for error in errors)

    def test_repository_corpus_is_valid_and_lives_outside_skills(self):
        """Verify repository corpus is valid and lives outside skills."""
        real_repo = HARNESS.parents[2]
        assert harness.validate_repository(real_repo) == []
        for skill in harness.skill_directories(real_repo):
            assert not (skill / 'evals').exists(), (
                f'{skill} must not carry an eval corpus'
            )
            assert (real_repo / 'evals' / skill.name / 'evals.json').is_file()

    def test_fixture_paths_resolve_inside_the_central_eval_directory(self):
        """Verify fixture paths resolve inside the central eval directory."""
        eval_path = self.eval_dir / 'evals.json'
        data = json.loads(eval_path.read_text())
        data['evals'][0]['files'] = ['../../skills/example/SKILL.md']
        eval_path.write_text(json.dumps(data), encoding='utf-8')
        errors = harness.validate_repository(self.repo)
        assert any('escapes the eval corpus' in error for error in errors)

    def test_frontmatter_name_and_description_limits_are_enforced(self):
        """Verify frontmatter name and description limits are enforced."""
        skill_dir = self.repo / 'skills' / 'example'
        (skill_dir / 'SKILL.md').write_text(
            '---\nname: Example_Bad\ndescription: ' + 'x' * 1025 + '\n---\n',
            encoding='utf-8',
        )
        errors: list[str] = []
        harness.validate_frontmatter(skill_dir, errors)
        joined = '\n'.join(errors)
        assert 'name must equal' in joined
        assert any('64 characters' in error for error in errors)
        assert any('1024 characters' in error for error in errors)

    def test_frontmatter_empty_description_is_rejected(self):
        """Verify frontmatter empty description is rejected."""
        skill_dir = self.repo / 'skills' / 'example'
        (skill_dir / 'SKILL.md').write_text(
            '---\nname: example\ndescription:   \n---\n', encoding='utf-8'
        )
        errors: list[str] = []
        harness.validate_frontmatter(skill_dir, errors)
        assert any('non-empty description' in error for error in errors)

    def _write_shim(self, relative: str = 'files/bin/tool') -> Path:
        """Write a local executable stand-in for an external CLI."""
        path = self.eval_dir / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('#!/usr/bin/env bash\necho fixture\n', encoding='utf-8')
        path.chmod(0o755)
        return path

    def _write_case_execution(
        self,
        execution: object,
        files: tuple[str, ...] | list[str] = ('files/fixture.ts',),
        fixture_prefix: str | None = None,
    ) -> None:
        eval_path = self.eval_dir / 'evals.json'
        data = json.loads(eval_path.read_text())
        data['evals'][0]['files'] = list(files)
        data['evals'][0]['execution'] = execution
        if fixture_prefix is not None:
            data['evals'][0]['fixture_prefix'] = fixture_prefix
        eval_path.write_text(json.dumps(data), encoding='utf-8')

    def _write_manifest_execution(self, execution: object) -> None:
        manifest_path = self.eval_dir / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['default_execution'] = execution
        manifest_path.write_text(json.dumps(manifest), encoding='utf-8')

    @pytest.mark.parametrize(('expected', 'prefix'), INVALID_FIXTURE_PREFIXES)
    def test_fixture_prefix_is_validated_as_a_relative_containing_directory(
        self, expected: str, prefix: str
    ):
        """Verify fixture prefix is validated as a relative containing directory."""
        self._write_shim()
        self._write_case_execution(
            {
                'network': 'disabled',
                'path_prepend': ['bin'],
                'executable_files': ['bin/tool'],
            },
            files=['files/fixture.ts', 'files/bin/tool'],
            fixture_prefix=prefix,
        )
        errors = harness.validate_repository(self.repo)
        assert any(expected in error for error in errors), errors

    def test_fixture_prefix_requires_every_fixture_beneath_it(self):
        """Verify fixture prefix requires every fixture beneath it."""
        self._write_shim()
        outside = self.eval_dir / 'state' / 'outside.txt'
        outside.parent.mkdir(parents=True, exist_ok=True)
        outside.write_text('outside the prefix\n', encoding='utf-8')
        self._write_case_execution(
            {
                'network': 'disabled',
                'path_prepend': ['bin'],
                'executable_files': ['bin/tool'],
            },
            files=['files/fixture.ts', 'files/bin/tool', 'state/outside.txt'],
            fixture_prefix='files',
        )
        errors = harness.validate_repository(self.repo)
        assert any(
            "must live under fixture_prefix 'files': state/outside.txt" in e
            for e in errors
        ), errors

    def test_fixture_prefix_rebases_workspace_paths_and_execution_hints(self):
        """Verify fixture prefix rebases workspace paths and execution hints."""
        self._write_shim()
        self._write_case_execution(
            {
                'network': 'disabled',
                'path_prepend': ['bin'],
                'executable_files': ['bin/tool'],
            },
            files=['files/fixture.ts', 'files/bin/tool'],
            fixture_prefix='files',
        )
        assert harness.validate_repository(self.repo) == []
        baseline = self._prepare('baseline', self.repo / 'baseline.json')
        case = next(
            case for case in baseline['cases'] if case['skill_name'] == 'example'
        )
        assert case['fixture_prefix'] == 'files'
        fixtures = {fixture['path']: fixture for fixture in case['fixtures']}
        # `path` stays corpus-relative; `workspace_path` is exactly where the adapter writes it.
        assert fixtures['files/bin/tool']['workspace_path'] == 'bin/tool'
        assert fixtures['files/fixture.ts']['workspace_path'] == 'fixture.ts'
        # Hints are written in the same workspace coordinates, so no adapter has to guess.
        assert case['execution']['path_prepend'] == ['bin']
        assert case['execution']['executable_files'] == ['bin/tool']
        # Hints are still resolved back to the corpus: a workspace path with no fixture fails.
        self._write_case_execution(
            {
                'network': 'disabled',
                'path_prepend': ['bin'],
                'executable_files': ['bin/ghost'],
            },
            files=['files/fixture.ts', 'files/bin/tool'],
            fixture_prefix='files',
        )
        errors = harness.validate_repository(self.repo)
        assert any(
            'executable_files entry is missing from the eval corpus: bin/ghost' in e
            for e in errors
        )
        # Pre-prefix hint coordinates are now wrong, and are reported as such.
        self._write_case_execution(
            {
                'network': 'disabled',
                'path_prepend': ['files/bin'],
                'executable_files': ['files/bin/tool'],
            },
            files=['files/fixture.ts', 'files/bin/tool'],
            fixture_prefix='files',
        )
        errors = harness.validate_repository(self.repo)
        assert any(
            'path_prepend directory is missing from the eval corpus: files/bin' in e
            for e in errors
        )

    def test_fixtures_without_a_prefix_keep_their_corpus_path_in_the_workspace(self):
        """Backward compatibility: no `fixture_prefix` means the workspace path is unchanged."""
        baseline = self._prepare('baseline', self.repo / 'baseline.json')
        case = next(
            case for case in baseline['cases'] if case['skill_name'] == 'example'
        )
        assert 'fixture_prefix' not in case
        assert [
            (fixture['path'], fixture['workspace_path']) for fixture in case['fixtures']
        ] == [('files/fixture.ts', 'files/fixture.ts')]

    @pytest.mark.parametrize(('expected', 'execution'), INVALID_EXECUTION_HINTS)
    def test_execution_hints_reject_unsafe_or_unknown_requirements(
        self, expected: str, execution: object
    ):
        """Verify execution hints reject unsafe or unknown requirements."""
        self._write_shim()
        files = ['files/fixture.ts', 'files/bin/tool']
        self._write_case_execution(execution, files)
        errors = harness.validate_repository(self.repo)
        assert any(expected in error for error in errors), errors

    def test_execution_hints_must_be_materialized_by_the_case_fixtures(self):
        # A PATH directory or executable the runner never writes into the workspace would let
        # the case silently fall back to whatever real binary the host happens to have.
        """Verify execution hints must be materialized by the case fixtures."""
        self._write_shim()
        self._write_case_execution(
            {
                'network': 'disabled',
                'path_prepend': ['files/bin'],
                'executable_files': ['files/bin/tool'],
            },
            files=['files/fixture.ts'],
        )
        errors = harness.validate_repository(self.repo)
        assert any(
            'execution.path_prepend directory has no fixture in files: files/bin' in e
            for e in errors
        )
        assert any(
            'executable_files entry must also be listed in files: files/bin/tool' in e
            for e in errors
        )
        # Listing the shim as a fixture satisfies both requirements.
        self._write_case_execution(
            {
                'network': 'disabled',
                'path_prepend': ['files/bin'],
                'executable_files': ['files/bin/tool'],
            },
            files=['files/fixture.ts', 'files/bin/tool'],
        )
        assert harness.validate_repository(self.repo) == []

    def test_execution_hints_require_an_executable_bit_in_the_corpus(self):
        """Verify execution hints require an executable bit in the corpus."""
        shim = self._write_shim()
        shim.chmod(0o644)
        self._write_case_execution(
            {
                'network': 'disabled',
                'path_prepend': ['files/bin'],
                'executable_files': ['files/bin/tool'],
            },
            files=['files/fixture.ts', 'files/bin/tool'],
        )
        errors = harness.validate_repository(self.repo)
        assert any(
            'must be executable in the eval corpus: files/bin/tool' in error
            for error in errors
        )

    def test_manifest_default_execution_is_validated_and_inherited(self):
        """Verify manifest default execution is validated and inherited."""
        self._write_shim()
        # Shape problems are reported against the manifest itself.
        self._write_manifest_execution({'network': 'sometimes', 'sandbox': 'docker'})
        errors = harness.validate_repository(self.repo)
        assert any(
            'default_execution' in error and 'network must be one of' in error
            for error in errors
        )
        assert any(
            'default_execution' in error and 'unknown execution keys' in error
            for error in errors
        )
        # Paths are workspace-relative, so they are resolved against each inheriting case's
        # own fixture_prefix and reported against that case.
        self._write_manifest_execution(
            {'network': 'disabled', 'path_prepend': ['files/nowhere']}
        )
        errors = harness.validate_repository(self.repo)
        assert any(
            'evals[0]' in error and 'files/nowhere' in error for error in errors
        ), errors
        # A valid default is inherited by every case, so each case must materialize it.
        self._write_manifest_execution(
            {
                'network': 'disabled',
                'path_prepend': ['files/bin'],
                'executable_files': ['files/bin/tool'],
            }
        )
        errors = harness.validate_repository(self.repo)
        assert any(
            'execution.path_prepend directory has no fixture in files' in error
            for error in errors
        )

    def test_execution_hints_are_carried_into_the_run_manifest(self):
        """Verify execution hints are carried into the run manifest."""
        self._write_shim()
        default_execution = {
            'network': 'disabled',
            'path_prepend': ['files/bin'],
            'executable_files': ['files/bin/tool'],
        }
        self._write_manifest_execution(default_execution)
        eval_path = self.eval_dir / 'evals.json'
        data = json.loads(eval_path.read_text())
        data['evals'][0]['files'] = ['files/fixture.ts', 'files/bin/tool']
        data['evals'].append(
            {
                'id': 2,
                'prompt': 'Run the local tool.',
                'expected_output': 'Runs the local tool.',
                'files': ['files/bin/tool'],
                'expectations': ['Uses the local tool.'],
                'execution': {'network': 'enabled', 'path_prepend': ['files/bin']},
            }
        )
        eval_path.write_text(
            json.dumps({'skill_name': 'example', 'evals': data['evals']}),
            encoding='utf-8',
        )
        assert harness.validate_repository(self.repo) == []
        baseline = self._prepare('baseline', self.repo / 'baseline.json')
        cases = {
            case['case_id']: case
            for case in baseline['cases']
            if case['skill_name'] == 'example'
        }
        assert cases['1']['execution'] == default_execution
        assert cases['1']['execution_source'] == 'manifest_default'
        # A case-level block replaces the manifest default outright rather than merging.
        assert cases['2']['execution'] == {
            'network': 'enabled',
            'path_prepend': ['files/bin'],
        }
        assert cases['2']['execution_source'] == 'case'
        # The hinted PATH directory and executable are materialized from the evaluation snapshot.
        fixtures = {fixture['path']: fixture for fixture in cases['2']['fixtures']}
        assert 'files/bin/tool' in fixtures
        source = Path(fixtures['files/bin/tool']['source'])
        source.relative_to(Path(baseline['evaluation_snapshot']['root']))
        assert os.access(source, os.X_OK)

    def test_scanner_cases_are_hermetic_and_never_reach_live_systems(self):
        """Every scanner case must run with network disabled and only local fixture binaries."""
        repository = HARNESS.parents[2]
        eval_dir = repository / 'evals' / 'scan-image-vulnerabilities'
        cases = json.loads((eval_dir / 'evals.json').read_text())['evals']
        default_execution = json.loads((eval_dir / 'manifest.json').read_text()).get(
            'default_execution'
        )
        shims = ['bin/trivy', 'bin/kubectl', 'bin/docker']
        for case in cases:
            prefix = harness.fixture_prefix_of(case)
            assert prefix == 'files'
            execution = harness.resolve_execution(case, default_execution)
            assert execution['network'] == 'disabled'
            assert 'bin' in execution['path_prepend']
            assert sorted(execution['executable_files']) == sorted(shims)
            workspace_files = [
                harness.fixture_workspace_path(prefix, path) for path in case['files']
            ]
            for shim in shims:
                assert shim in workspace_files
                assert os.access(eval_dir / prefix / shim, os.X_OK)
        for shim in shims:
            text = (eval_dir / 'files' / shim).read_text()
            for forbidden in (
                'curl',
                'wget',
                'nc ',
                'ssh ',
                'openssl s_client',
                'pip install',
                'npm install',
            ):
                assert forbidden not in text, f'{shim} must not reach the network'

    def test_scanner_shims_answer_deterministically_from_fixture_data(self):
        """Run the shims for real: fixture data in, deterministic output out, nothing external."""
        repository = HARNESS.parents[2]
        source = repository / 'evals' / 'scan-image-vulnerabilities' / 'files'
        workspace = self.repo / 'scanner-workspace'
        # Materialize the way an adapter must: `fixture_prefix` "files" is stripped, so the
        # shims land at the workspace-relative paths the execution hints name (`bin/...`).
        shutil.copytree(source, workspace)
        environment = {
            **os.environ,
            'PATH': f'{workspace / "bin"}{os.pathsep}{os.environ["PATH"]}',
            'SCAN_FIXTURE_CALL_LOG_DIR': str(workspace / 'calls'),
        }

        def run(*argv: str) -> subprocess.CompletedProcess[str]:
            return subprocess.run(  # noqa: S603 - controlled fixture executables.
                argv,
                cwd=workspace,
                env=environment,
                capture_output=True,
                text=True,
            )

        version = run('trivy', '--version')
        assert version.returncode == 0
        assert 'Version: 0.72.0' in version.stdout

        images = run(
            'kubectl',
            'get',
            'pods',
            '-n',
            'payments',
            '-o',
            'jsonpath={range .items[*]}{range .spec.containers[*]}{.image}{"\\n"}{end}{end}',
        )
        assert images.returncode == 0, images.stderr
        discovered = sorted(line for line in images.stdout.splitlines() if line)
        assert len(discovered) == 2
        assert any('@sha256:' in reference for reference in discovered)
        assert all(
            reference.startswith('registry.example.com/payments/')
            for reference in discovered
        )

        scanned = run(
            'trivy',
            'image',
            '--format',
            'json',
            'registry.example.com/coverage/app:1.0.0',
        )
        assert scanned.returncode == 0, scanned.stderr
        results = json.loads(scanned.stdout)['Results']
        assert [result['Type'] for result in results] == ['alpine', 'npm']

        # A guessed tag is an inspect failure, never a silent clean result.
        guessed = run(
            'trivy',
            'image',
            '--format',
            'json',
            'registry.example.com/payments/api:latest',
        )
        assert guessed.returncode == 1
        assert guessed.stdout == ''
        assert 'no such image' in guessed.stderr

        # Recorded failures are exact and reproducible.
        unauthorized = run(
            'trivy', 'image', 'registry.example.com/private/billing:5.0.0'
        )
        assert unauthorized.returncode == 1
        assert 'UNAUTHORIZED' in unauthorized.stderr

        # The DB-refresh marker is a per-case fixture, so it only fails where a case ships it.
        marker = workspace / 'trivy-fixture' / 'db-refresh-fails'
        recorded_failure = marker.read_text()
        marker.unlink()
        assert run('trivy', 'image', '--download-db-only').returncode == 0
        marker.write_text(recorded_failure, encoding='utf-8')
        refresh = run('trivy', 'image', '--download-db-only', '--skip-db-update=false')
        assert refresh.returncode == 1
        assert 'failed to download vulnerability DB' in refresh.stderr

        # No Docker daemon exists, and every attempted call is recorded.
        daemon = run('docker', 'ps')
        assert daemon.returncode == 1
        assert 'Cannot connect to the Docker daemon' in daemon.stderr
        calls = (workspace / 'calls' / 'trivy.log').read_text()
        assert (
            'trivy image --format json registry.example.com/coverage/app:1.0.0' in calls
        )

        # Security review fix: credential-shaped flags must never reach the call log
        # verbatim. Each shim's log_invocation redacts the value following
        # --password/--token/--registry-token/--username/--kubeconfig, and the
        # --flag=value form of each, before appending to its log file. Exercise the
        # space-separated form on trivy, the --flag=value form on kubectl and docker,
        # and cover all four flag names between the three shims.
        raw_value_0 = 'Sup3rSecretPassw0rd!'
        raw_value_1 = 'ghp_1234567890abcdefTOKEN'
        raw_value_2 = 'definitely-secret-user'
        raw_value_3 = '/definitely/secret/kubeconfig.yaml'
        raw_values = (raw_value_0, raw_value_1, raw_value_2, raw_value_3)

        run(
            'trivy',
            'image',
            '--username',
            raw_value_2,
            '--password',
            raw_value_0,
            f'--registry-token={raw_value_1}',
            '--format',
            'json',
            'registry.example.com/coverage/app:1.0.0',
        )
        run(
            'kubectl',
            'version',
            '--kubeconfig',
            raw_value_3,
            f'--username={raw_value_2}',
            f'--password={raw_value_0}',
            f'--token={raw_value_1}',
        )
        run(
            'docker',
            'login',
            '--username',
            raw_value_2,
            '--password',
            raw_value_0,
            f'--registry-token={raw_value_1}',
        )

        for shim in ('trivy', 'kubectl', 'docker'):
            log_text = (workspace / 'calls' / f'{shim}.log').read_text()
            for secret in raw_values:
                assert secret not in log_text, (
                    f'{shim}.log must never record a raw credential value'
                )
            # The log is written through `printf ' %q'`, which shell-escapes the literal
            # "<redacted>" placeholder (e.g. "\<redacted\>"), so match on the word alone.
            assert 'redacted' in log_text, (
                f'{shim}.log must record a redacted placeholder'
            )

    def test_scanner_fixture_generator_writes_all_images(self):
        """Verify scanner fixture generator writes all images."""
        generator_path = HARNESS.parent / 'generate_scanner_fixtures.py'
        generator = cast(
            'FixtureGenerator',
            _load_module('generate_scanner_fixtures', generator_path),
        )
        generator.ROOT = self.temp_path / 'scanner-fixtures'
        generator.ROOT.mkdir()
        stale = generator.ROOT / 'stale-image.json'
        stale.write_text('{}\n', encoding='utf-8')
        generator.main()
        fixtures = sorted(generator.ROOT.glob('*.json'))
        assert len(fixtures) == 8
        assert not stale.exists()
        for fixture in fixtures:
            parsed = json.loads(fixture.read_text(encoding='utf-8'))
            assert parsed['SchemaVersion'] == 2
            assert parsed['ArtifactType'] == 'container_image'

    def _write_footprint_profiles(self, profiles: list[dict[str, Any]]) -> Path:
        path = self.repo / 'footprint-profiles.json'
        path.write_text(
            json.dumps(
                {'schema': harness.FOOTPRINT_PROFILES_SCHEMA, 'profiles': profiles}
            ),
            encoding='utf-8',
        )
        return path

    def test_footprint_writes_valid_profile_metrics(self):
        """Verify footprint writes valid profile metrics."""
        source = self.repo / 'skills' / 'example' / 'SKILL.md'
        source.write_text('one two\nthree\n', encoding='utf-8')
        config = self._write_footprint_profiles(
            [
                {
                    'name': 'example-profile',
                    'files': ['skills/example/SKILL.md'],
                }
            ]
        )
        output = self.repo / 'footprint.json'
        self._invoke(
            'footprint',
            '--repo',
            str(self.repo),
            '--profiles',
            str(config),
            '--output',
            str(output),
        )
        document = json.loads(output.read_text())
        profile = document['profiles'][0]
        assert document['schema'] == harness.FOOTPRINT_SCHEMA
        assert document['measurement'] == 'static-context-proxy'
        assert profile['lines'] == 2
        assert profile['words'] == 3
        assert profile['bytes'] == len(b'one two\nthree\n')
        assert (
            profile['files'][0]['sha256']
            == hashlib.sha256(b'one two\nthree\n').hexdigest()
        )
        assert profile['sha256'] == harness.digest(
            {
                'name': 'example-profile',
                'files': [
                    {
                        'path': 'skills/example/SKILL.md',
                        'sha256': profile['files'][0]['sha256'],
                    }
                ],
            }
        )
        assert document['content_sha256']

    def test_footprint_rejects_missing_and_escaping_paths(self):
        """Verify footprint rejects missing and escaping paths."""
        outside = self.temp_path / 'outside.md'
        outside.write_text('outside', encoding='utf-8')
        for filename in ('missing.md', '../outside.md'):
            config = self._write_footprint_profiles(
                [{'name': 'invalid', 'files': [filename]}]
            )
            with pytest.raises(harness.ContractError):
                harness.footprint(
                    type(
                        'Args',
                        (),
                        {
                            'repo': str(self.repo),
                            'profiles': str(config),
                            'profile': [],
                            'output': str(self.repo / 'out.json'),
                        },
                    )()
                )

    def test_footprint_output_is_immutable(self):
        """Verify footprint output is immutable."""
        config = self._write_footprint_profiles(
            [{'name': 'example-profile', 'files': ['skills/example/SKILL.md']}]
        )
        output = self.repo / 'footprint.json'
        args = type(
            'Args',
            (),
            {
                'repo': str(self.repo),
                'profiles': str(config),
                'profile': [],
                'output': str(output),
            },
        )()
        harness.footprint(args)
        with pytest.raises(harness.ContractError):
            harness.footprint(args)

    def test_bundled_footprint_profile_schema_is_valid(self):
        """Verify bundled footprint profile schema is valid."""
        repository = HARNESS.parents[2]
        profiles = harness.load_footprint_profiles(
            repository, HARNESS.parent / 'footprint-profiles.json'
        )
        assert [profile['name'] for profile in profiles] == [
            'orchestrator-contract',
            'execute-anti-slop-checklist',
            'goal-orchestrator-execute',
        ]

    def test_invalid_result_metric_is_rejected(self):
        """Verify invalid result metric is rejected."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        input_path = self.repo / 'runner.json'
        input_path.write_text(
            json.dumps(
                {
                    'schema': harness.RUN_RESULT_SCHEMA,
                    'run_id': baseline['run_id'],
                    'results': [
                        {
                            'agent': 'test-agent',
                            'skill_name': 'example',
                            'case_id': '1',
                            'status': 'completed',
                            'exit_status': 0,
                            'response_text': 'example',
                            'metrics': {
                                'input_tokens': 1,
                                'output_tokens': 1,
                                'duration_ms': 1,
                                'tool_calls': 1,
                                'subagent_calls': -1,
                            },
                        }
                    ],
                }
            ),
            encoding='utf-8',
        )
        with pytest.raises(harness.ContractError):
            harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(input_path),
                        'output': str(self.repo / 'imported.json'),
                    },
                )()
            )

    def test_trigger_suite_schema_is_reported(self):
        """Verify trigger suite schema is reported."""
        suite = self.repo / 'bad-suite.json'
        suite.write_text(
            json.dumps(
                {
                    'schema': 'skill-evals/trigger-suite-v1',
                    'suite_name': 'example',
                    'cases': [
                        {
                            'id': 'bad',
                            'prompt': '',
                            'expected_skills': ['example'],
                            'expectations': [],
                        }
                    ],
                }
            ),
            encoding='utf-8',
        )
        assert harness.validate_suite(suite)

    def test_trigger_suite_rejects_empty_expected_skills_for_near_miss_cases(self):
        # A should-not-trigger case with an empty expected_skills would be ungradable: it must
        # still name the actual correct route (a competing skill, or the literal "none").
        """Verify trigger suite rejects empty expected skills for near miss cases."""
        suite = self.repo / 'near-miss-suite.json'
        suite.write_text(
            json.dumps(
                {
                    'schema': 'skill-evals/trigger-suite-v1',
                    'suite_name': 'near-miss',
                    'cases': [
                        {
                            'id': 'no-route-named',
                            'prompt': 'Do something unrelated to example.',
                            'expected_skills': [],
                            'forbidden_skills': ['example'],
                            'expectations': ['Does not invoke example.'],
                            'grading': [{'type': 'text_contains', 'value': 'none'}],
                        }
                    ],
                }
            ),
            encoding='utf-8',
        )
        errors = harness.validate_suite(suite)
        assert any(
            'expected_skills must be a non-empty list' in error for error in errors
        )

    def test_trigger_suite_direction_is_cross_checked(self):
        """Verify trigger suite direction is cross checked."""
        base_case = {
            'prompt': 'Route this request.',
            'expectations': ['Routes correctly.'],
            'grading': [{'type': 'text_contains', 'value': 'x'}],
        }
        overlapping = self.repo / 'overlap-suite.json'
        overlapping.write_text(
            json.dumps(
                {
                    'schema': 'skill-evals/trigger-suite-v1',
                    'suite_name': 'overlap',
                    'cases': [
                        {
                            **base_case,
                            'id': 'overlap',
                            'expected_skills': ['a'],
                            'forbidden_skills': ['a'],
                        }
                    ],
                }
            ),
            encoding='utf-8',
        )
        assert any(
            'must not overlap' in error for error in harness.validate_suite(overlapping)
        )

        should_trigger_none = self.repo / 'trigger-none-suite.json'
        should_trigger_none.write_text(
            json.dumps(
                {
                    'schema': 'skill-evals/trigger-suite-v1',
                    'suite_name': 'trigger-none',
                    'cases': [
                        {
                            **base_case,
                            'id': 'bad',
                            'direction': 'should_trigger',
                            'expected_skills': ['none'],
                        }
                    ],
                }
            ),
            encoding='utf-8',
        )
        assert any(
            'should_trigger cases must expect a real skill' in error
            for error in harness.validate_suite(should_trigger_none)
        )

        missing_forbidden = self.repo / 'missing-forbidden-suite.json'
        missing_forbidden.write_text(
            json.dumps(
                {
                    'schema': 'skill-evals/trigger-suite-v1',
                    'suite_name': 'missing-forbidden',
                    'cases': [
                        {
                            **base_case,
                            'id': 'bad',
                            'direction': 'should_not_trigger',
                            'expected_skills': ['none'],
                        }
                    ],
                }
            ),
            encoding='utf-8',
        )
        assert any(
            'should_not_trigger cases must name at least one forbidden_skills entry'
            in error
            for error in harness.validate_suite(missing_forbidden)
        )

    def test_bundled_trigger_matrix_suite_is_schema_valid_and_covers_all_skills(self):
        """Verify bundled trigger matrix suite is schema valid and covers all skills."""
        matrix_path = Path(__file__).parents[1] / 'suites' / 'trigger-matrix.json'
        assert harness.validate_suite(matrix_path) == []
        suite = json.loads(matrix_path.read_text())
        real_repo_root = HARNESS.parents[2]
        real_skills = {path.name for path in harness.skill_directories(real_repo_root)}
        per_skill_trigger = dict.fromkeys(real_skills, 0)
        per_skill_forbidden = dict.fromkeys(real_skills, 0)
        for case in suite['cases']:
            if case.get('direction') == 'should_trigger':
                for name in case['expected_skills']:
                    if name in per_skill_trigger:
                        per_skill_trigger[name] += 1
            if case.get('direction') == 'should_not_trigger':
                for name in case.get('forbidden_skills', []):
                    if name in per_skill_forbidden:
                        per_skill_forbidden[name] += 1
        for name in real_skills:
            assert per_skill_trigger[name] >= 8, (
                f'{name} needs >= 8 should-trigger cases'
            )
            assert per_skill_forbidden[name] >= 8, (
                f'{name} needs >= 8 should-not-trigger cases'
            )

    def test_selected_skill_run_filters_unobservable_suite_cases(self):
        """Verify selected skill run filters unobservable suite cases."""
        other_skill = self.repo / 'skills' / 'other'
        other_eval = self.repo / 'evals' / 'other'
        other_skill.mkdir()
        other_eval.mkdir()
        (other_skill / 'SKILL.md').write_text(
            '---\nname: other\ndescription: Other skill.\n---\n',
            encoding='utf-8',
        )
        (other_eval / 'evals.json').write_text(
            json.dumps({'skill_name': 'other', 'evals': []}),
            encoding='utf-8',
        )
        (other_eval / 'manifest.json').write_text(
            json.dumps(
                {
                    'skill_name': 'other',
                    'default_category': 'regression_guard',
                    'critical_ids': [],
                    'critical_expectations': {},
                    'behavior_change_ids': [],
                    'redundant_ids': [],
                    'deterministic_ids': [],
                    'behavior_change_rationale': {},
                }
            ),
            encoding='utf-8',
        )
        suite = self.repo / 'selected-suite.json'
        suite.write_text(
            json.dumps(
                {
                    'schema': 'skill-evals/trigger-suite-v1',
                    'suite_name': 'selected-routing',
                    'cases': [
                        {
                            'id': 'example',
                            'prompt': 'Use example.',
                            'direction': 'should_trigger',
                            'expected_skills': ['example'],
                            'expectations': ['Uses example.'],
                            'grading': [{'type': 'text_contains', 'value': 'example'}],
                        },
                        {
                            'id': 'other',
                            'prompt': 'Use other.',
                            'direction': 'should_trigger',
                            'expected_skills': ['other'],
                            'expectations': ['Uses other.'],
                            'grading': [{'type': 'text_contains', 'value': 'other'}],
                        },
                        {
                            'id': 'composition',
                            'prompt': 'Use both.',
                            'direction': 'should_trigger',
                            'expected_skills': ['example', 'other'],
                            'expectations': ['Uses both.'],
                            'grading': [{'type': 'text_contains', 'value': 'both'}],
                        },
                        {
                            'id': 'forbid-example',
                            'prompt': 'Do not use example.',
                            'direction': 'should_not_trigger',
                            'expected_skills': ['none'],
                            'forbidden_skills': ['example'],
                            'expectations': ['Avoids example.'],
                            'grading': [{'type': 'text_contains', 'value': 'avoid'}],
                        },
                        {
                            'id': 'forbid-other',
                            'prompt': 'Do not use other.',
                            'direction': 'should_not_trigger',
                            'expected_skills': ['none'],
                            'forbidden_skills': ['other'],
                            'expectations': ['Avoids other.'],
                            'grading': [{'type': 'text_contains', 'value': 'avoid'}],
                        },
                        {
                            'id': 'forbid-external',
                            'prompt': 'Do not use source security.',
                            'direction': 'should_not_trigger',
                            'expected_skills': ['none'],
                            'forbidden_skills': ['security-review'],
                            'expectations': ['Avoids source security.'],
                            'grading': [{'type': 'text_contains', 'value': 'avoid'}],
                        },
                    ],
                }
            ),
            encoding='utf-8',
        )
        output = self.repo / 'selected-run.json'
        run = self._prepare(
            'baseline',
            output,
            ('--skill', 'example', '--suite', str(suite), '--suite-only'),
        )
        assert [case['case_id'] for case in run['cases']] == [
            'example',
            'forbid-example',
            'forbid-external',
        ]

    def test_prepares_immutable_baseline_and_candidate_with_snapshot(self):
        """Verify prepares immutable baseline and candidate with snapshot."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        assert baseline['schema'] == harness.RUN_REQUEST_SCHEMA
        assert baseline['repository']['path'] == str(self.repo.resolve())
        assert 'selected_skill_tree_digest' in baseline['repository']
        assert baseline['model']['settings'] == {'temperature': 0}
        argv = baseline['installed_copy_steps'][0]['argv']
        assert argv[0:3] == ['npx', 'skills', 'add']
        assert '--agent' in argv
        assert 'test-agent' in argv
        assert '--copy' in argv
        assert '--yes' in argv
        # installed-copy target must be the immutable snapshot copy, not the mutable repo path.
        snapshot_root = Path(baseline['snapshot']['root'])
        assert Path(argv[3]).resolve() == (snapshot_root / 'example').resolve()
        assert (snapshot_root / 'example' / 'SKILL.md').is_file()
        candidate_path = self.repo / 'candidate.json'
        candidate = self._prepare(
            'candidate', candidate_path, ('--baseline-run-id', baseline['run_id'])
        )
        assert candidate['baseline_run_id'] == baseline['run_id']
        with pytest.raises(harness.ContractError):
            harness.write_immutable(baseline_path, {})

    @pytest.mark.parametrize('run_id', INVALID_RUN_IDS)
    def test_custom_run_id_cannot_escape_artifact_directory(self, run_id: str):
        """Verify custom run id cannot escape artifact directory."""
        with pytest.raises(harness.ContractError):
            harness.prepare_run(
                type(
                    'Args',
                    (),
                    {
                        'repo': str(self.repo),
                        'output': str(self.repo / 'run.json'),
                        'role': 'baseline',
                        'model': 'test/model@1',
                        'config_json': '{"temperature":0}',
                        'skill': [],
                        'suite': [],
                        'suite_only': False,
                        'agent': ['test-agent'],
                        'comparison_key': 'test',
                        'baseline_run_id': None,
                        'run_id': run_id,
                    },
                )()
            )

    def test_runtime_and_evaluation_snapshots_are_separate(self):
        """Verify runtime and evaluation snapshots are separate."""
        baseline = self._prepare('baseline', self.repo / 'baseline.json')
        runtime_root = Path(baseline['snapshot']['root'])
        evaluation_root = Path(baseline['evaluation_snapshot']['root'])
        assert runtime_root != evaluation_root
        # Runtime snapshot: only distributed content.
        assert (runtime_root / 'example' / 'SKILL.md').is_file()
        assert not (runtime_root / 'example' / 'evals').exists()
        # Evaluation snapshot: cases and fixtures, mapped per skill for any adapter.
        evaluation_skill = Path(baseline['evaluation_snapshot']['skills']['example'])
        assert (evaluation_skill / 'evals.json').is_file()
        assert (evaluation_skill / 'manifest.json').is_file()
        assert (evaluation_skill / 'files' / 'fixture.ts').is_file()
        # Digests are computed and reported separately.
        assert (
            baseline['repository']['selected_skill_tree_digest']
            != baseline['evaluation']['corpus_digest']
        )
        assert 'example' in baseline['evaluation']['eval_tree_digests']

    def test_installed_runtime_snapshot_contains_no_eval_material(self):
        """Verify installed runtime snapshot contains no eval material."""
        baseline = self._prepare('baseline', self.repo / 'baseline.json')
        runtime_root = Path(baseline['snapshot']['root'])
        installed_targets = {
            Path(step['argv'][3]).resolve() for step in baseline['installed_copy_steps']
        }
        assert installed_targets == {(runtime_root / 'example').resolve()}
        leaked = [
            path.relative_to(runtime_root).as_posix()
            for path in runtime_root.rglob('*')
            if path.name in {'evals', 'evals.json', 'manifest.json'}
        ]
        assert leaked == []
        harness.assert_no_eval_material(runtime_root)
        # The guard is real: a snapshot that did carry eval material is rejected.
        (runtime_root / 'example' / 'evals').mkdir()
        with pytest.raises(harness.ContractError):
            harness.assert_no_eval_material(runtime_root)

    def test_runtime_digest_and_snapshot_exclude_generated_python_artifacts(self):
        """Keep runtime identities and installed copies free of local Python artifacts."""
        digest_before = harness.runtime_tree_digest(self.repo, ['example'])
        cache = self.skill_dir / 'scripts' / '__pycache__'
        cache.mkdir(parents=True)
        (cache / 'helper.cpython-314.pyc').write_bytes(b'local-bytecode')
        (self.skill_dir / '.pytest_cache' / 'state').mkdir(parents=True)
        (self.skill_dir / '.pytest_cache' / 'state' / 'lastfailed').write_text(
            '{}',
            encoding='utf-8',
        )
        assert harness.runtime_tree_digest(self.repo, ['example']) == digest_before

        baseline = self._prepare('baseline', self.repo / 'runtime-clean.json')
        runtime_root = Path(baseline['snapshot']['root'])
        leaked = [
            path.relative_to(runtime_root).as_posix()
            for path in runtime_root.rglob('*')
            if harness.is_generated_runtime_artifact(path.relative_to(runtime_root))
        ]
        assert leaked == []
        harness.assert_no_runtime_artifacts(runtime_root)

        generated = runtime_root / 'example' / '__pycache__' / 'injected.pyc'
        generated.parent.mkdir()
        generated.write_bytes(b'injected')
        with pytest.raises(harness.ContractError):
            harness.assert_no_runtime_artifacts(runtime_root)

    def test_case_fixtures_point_at_the_immutable_evaluation_snapshot(self):
        """Verify case fixtures point at the immutable evaluation snapshot."""
        baseline = self._prepare('baseline', self.repo / 'baseline.json')
        case = next(
            case for case in baseline['cases'] if case['skill_name'] == 'example'
        )
        evaluation_root = Path(baseline['evaluation_snapshot']['root']).resolve()
        runtime_root = Path(baseline['snapshot']['root']).resolve()
        assert case['files'] == ['files/fixture.ts']
        fixture = case['fixtures'][0]
        source = Path(fixture['source']).resolve()
        assert source.is_file()
        source.relative_to(evaluation_root)
        with pytest.raises(ValueError, match='is not in the subpath of'):
            source.relative_to(runtime_root)
        with pytest.raises(ValueError, match='is not in the subpath of'):
            source.relative_to(self.repo.resolve() / 'evals')
        assert fixture['sha256'] == hashlib.sha256(source.read_bytes()).hexdigest()
        assert Path(case['fixture_root']).resolve() == source.parent.parent

    def test_installed_copy_steps_run_against_a_recorded_cli(self):
        """Repeatable local smoke: execute installed_copy_steps with a fake `npx` on PATH.

        The real command is `npx skills add <snapshot> --agent <agent> --copy --yes`; this
        records the exact argv and copies the snapshot the way the real CLI would, then
        asserts the installed copy carries no eval material.
        """
        baseline = self._prepare('baseline', self.repo / 'baseline.json')
        bin_dir = self.repo / 'fake-bin'
        bin_dir.mkdir()
        log = self.repo / 'npx-calls.log'
        installed_home = self.repo / 'installed-home'
        fake = bin_dir / 'npx'
        fake.write_text(
            '#!/usr/bin/env python3\n'
            'import shutil, sys\n'
            'from pathlib import Path\n'
            f'log = Path({str(log)!r})\n'
            f'home = Path({str(installed_home)!r})\n'
            "log.open('a').write(' '.join(sys.argv[1:]) + '\\n')\n"
            "assert sys.argv[1:3] == ['skills', 'add'], sys.argv\n"
            "assert '--copy' in sys.argv and '--yes' in sys.argv, sys.argv\n"
            'source = Path(sys.argv[3])\n'
            "agent = sys.argv[sys.argv.index('--agent') + 1]\n"
            'destination = home / agent / source.name\n'
            'destination.parent.mkdir(parents=True, exist_ok=True)\n'
            'shutil.copytree(source, destination)\n',
            encoding='utf-8',
        )
        fake.chmod(0o755)
        environment = {**os.environ, 'PATH': f'{bin_dir}:{os.environ["PATH"]}'}
        for step in baseline['installed_copy_steps']:
            completed = subprocess.run(  # noqa: S603 - harness-generated recorded CLI.
                step['argv'],
                env=environment,
                capture_output=True,
                text=True,
            )
            assert completed.returncode == 0, completed.stderr
        installed = installed_home / 'test-agent' / 'example'
        assert (installed / 'SKILL.md').is_file()
        assert not (installed / 'evals').exists()
        assert [
            path.name
            for path in installed.rglob('*')
            if path.name in {'evals', 'evals.json', 'manifest.json'}
        ] == []
        assert 'skills add' in log.read_text()

    def test_prepare_refuses_to_overwrite_existing_snapshot(self):
        """Verify prepare refuses to overwrite existing snapshot."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        snapshot_root = Path(baseline['snapshot']['root'])
        assert snapshot_root.is_dir()
        second_output = self.repo / 'baseline-2.json'
        with pytest.raises(harness.ContractError):
            harness.prepare_run(
                type(
                    'Args',
                    (),
                    {
                        'repo': str(self.repo),
                        'output': str(second_output),
                        'role': 'baseline',
                        'model': 'test/model@1',
                        'config_json': '{"temperature":0}',
                        'skill': [],
                        'suite': [],
                        'agent': ['test-agent'],
                        'comparison_key': 'test',
                        'baseline_run_id': None,
                        'run_id': baseline['run_id'],
                    },
                )()
            )

    def test_prepare_with_suite_adds_namespaced_cases_without_expanding_installed_copies(
        self,
    ):
        """Verify prepare with suite adds namespaced cases without expanding installed copies."""
        baseline_path = self.repo / 'baseline-suite.json'
        baseline = self._prepare(
            'baseline', baseline_path, ('--suite', str(self.suite))
        )
        assert len(baseline['suites']) == 1
        assert baseline['suites'][0]['suite_name'] == 'routing-seeds'
        suite_cases = [
            case
            for case in baseline['cases']
            if case['skill_name'].startswith('suite:')
        ]
        assert len(suite_cases) == 1
        assert suite_cases[0]['skill_name'] == 'suite:routing-seeds'
        assert suite_cases[0]['suite_identity']['suite_name'] == 'routing-seeds'
        # The suite itself is frozen into the evaluation snapshot and identified by digest.
        snapshot_path = Path(baseline['evaluation_snapshot']['suites']['routing-seeds'])
        assert snapshot_path.is_file()
        snapshot_path.resolve().relative_to(
            Path(baseline['evaluation_snapshot']['root']).resolve()
        )
        assert suite_cases[0]['suite_identity']['snapshot_path'] == str(snapshot_path)
        assert (
            baseline['evaluation']['suite_digests']['routing-seeds']
            == suite_cases[0]['suite_identity']['content_sha256']
        )
        # installed-copy steps must still cover only the real selected skill, not the suite.
        installed_skills = {
            step['skill_name'] for step in baseline['installed_copy_steps']
        }
        assert installed_skills == {'example'}

    def test_prepare_suite_only_omits_behavior_cases_but_still_installs_real_skills(
        self,
    ):
        """Verify prepare suite only omits behavior cases but still installs real skills."""
        baseline_path = self.repo / 'baseline-suite-only.json'
        baseline = self._prepare(
            'baseline', baseline_path, ('--suite', str(self.suite), '--suite-only')
        )
        # No real skill_name=="example" behavior cases from evals.json should be present.
        skill_cases = [
            case
            for case in baseline['cases']
            if not case['skill_name'].startswith('suite:')
        ]
        assert skill_cases == []
        suite_cases = [
            case
            for case in baseline['cases']
            if case['skill_name'].startswith('suite:')
        ]
        assert len(suite_cases) == 1
        # The real selected skill is still snapshotted and installed.
        installed_skills = {
            step['skill_name'] for step in baseline['installed_copy_steps']
        }
        assert installed_skills == {'example'}
        snapshot_root = Path(baseline['snapshot']['root'])
        assert (snapshot_root / 'example' / 'SKILL.md').is_file()

    def test_prepare_suite_only_requires_a_suite(self):
        """Verify prepare suite only requires a suite."""
        baseline_path = self.repo / 'baseline-suite-only-missing.json'
        with pytest.raises(harness.ContractError):
            harness.prepare_run(
                type(
                    'Args',
                    (),
                    {
                        'repo': str(self.repo),
                        'output': str(baseline_path),
                        'role': 'baseline',
                        'model': 'test/model@1',
                        'config_json': '{"temperature":0}',
                        'skill': [],
                        'suite': [],
                        'suite_only': True,
                        'agent': ['test-agent'],
                        'comparison_key': 'test',
                        'baseline_run_id': None,
                        'run_id': None,
                    },
                )()
            )

    def test_skill_selection_check_validates_arrays_names_and_non_overlap(self):
        """Verify skill selection check validates arrays names and non overlap."""
        base = {
            'type': 'skill_selection',
            'expected': ['a'],
            'forbidden': ['b'],
            'universe': ['a', 'b'],
        }
        assert harness.valid_grading_check(dict(base))
        # "none" is only legal as the sole expected entry.
        assert harness.valid_grading_check({**base, 'expected': ['none']})
        assert not harness.valid_grading_check({**base, 'expected': ['none', 'a']})
        # Names must match the skill-name pattern (no uppercase, spaces, or empty entries).
        assert not harness.valid_grading_check({**base, 'expected': ['Not_A_Skill']})
        assert not harness.valid_grading_check({**base, 'universe': ['']})
        # Arrays must be non-empty (universe, expected) or absent-defaults-to-empty (forbidden).
        assert not harness.valid_grading_check({**base, 'universe': []})
        assert not harness.valid_grading_check({**base, 'expected': []})
        assert harness.valid_grading_check({**base, 'forbidden': []})
        # Duplicates within a single array are rejected.
        assert not harness.valid_grading_check({**base, 'universe': ['a', 'a', 'b']})
        assert not harness.valid_grading_check({**base, 'expected': ['a', 'a']})
        assert not harness.valid_grading_check({**base, 'forbidden': ['b', 'b']})
        # expected and forbidden must never overlap.
        assert not harness.valid_grading_check(
            {**base, 'expected': ['a'], 'forbidden': ['a']}
        )
        # forbidden is optional (defaults to empty) but universe and expected are required.
        assert harness.valid_grading_check(
            {'type': 'skill_selection', 'expected': ['a'], 'universe': ['a']}
        )
        assert not harness.valid_grading_check(
            {'type': 'skill_selection', 'forbidden': ['b'], 'universe': ['a', 'b']}
        )
        assert not harness.valid_grading_check(
            {'type': 'skill_selection', 'expected': ['a'], 'forbidden': []}
        )

    def test_skill_selection_grading_pass_fail_none_and_universe_filtering(self):
        """Verify skill selection grading pass fail none and universe filtering."""
        check = {
            'type': 'skill_selection',
            'expected': ['achieve-goal', 'execute-plan-loop'],
            'forbidden': ['workflow-orchestrator'],
            'universe': ['achieve-goal', 'execute-plan-loop', 'workflow-orchestrator'],
        }
        # Both expected skills activated, nothing forbidden: passes.
        passing = harness.grade(
            {'activated_skills': ['achieve-goal', 'execute-plan-loop']}, [check]
        )
        assert passing['status'] == 'passed'
        # Missing one expected skill: fails (expected is a required subset of activated).
        missing = harness.grade({'activated_skills': ['achieve-goal']}, [check])
        assert missing['status'] == 'failed'
        # A forbidden skill activated alongside every expected skill still fails.
        forbidden_hit = harness.grade(
            {
                'activated_skills': [
                    'achieve-goal',
                    'execute-plan-loop',
                    'workflow-orchestrator',
                ]
            },
            [check],
        )
        assert forbidden_hit['status'] == 'failed'
        # A skill outside the declared universe (e.g. some unrelated globally-installed skill)
        # never affects the verdict either way -- it is filtered out before scoring.
        filtered = harness.grade(
            {
                'activated_skills': [
                    'achieve-goal',
                    'execute-plan-loop',
                    'some-unrelated-global-skill',
                ]
            },
            [check],
        )
        assert filtered['status'] == 'passed'
        external_forbidden = {
            'type': 'skill_selection',
            'expected': ['scan-image-vulnerabilities'],
            'forbidden': ['security-review'],
            'universe': ['scan-image-vulnerabilities'],
        }
        assert (
            harness.grade(
                {'activated_skills': ['scan-image-vulnerabilities']},
                [external_forbidden],
            )['status']
            == 'passed'
        )
        assert (
            harness.grade(
                {'activated_skills': ['scan-image-vulnerabilities', 'security-review']},
                [external_forbidden],
            )['status']
            == 'failed'
        )
        none_check = {
            'type': 'skill_selection',
            'expected': ['none'],
            'forbidden': ['achieve-goal'],
            'universe': ['achieve-goal', 'execute-plan-loop'],
        }
        # expected == ["none"] passes only when no universe skill activated at all.
        none_passes = harness.grade(
            {'activated_skills': ['some-unrelated-global-skill']}, [none_check]
        )
        assert none_passes['status'] == 'passed'
        none_fails_any_universe_skill = harness.grade(
            {'activated_skills': ['execute-plan-loop']}, [none_check]
        )
        assert none_fails_any_universe_skill['status'] == 'failed'
        none_fails_forbidden = harness.grade(
            {'activated_skills': ['achieve-goal']}, [none_check]
        )
        assert none_fails_forbidden['status'] == 'failed'

    def test_activated_skills_result_field_validates_uniqueness_and_type(self):
        """Verify activated skills result field validates uniqueness and type."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        # A behavior case (no skill_selection grading) may omit activated_skills entirely.
        base_input = self.repo / 'no-activated.json'
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--output',
            str(self.repo / 'no-activated-import.json'),
        )
        # A non-list, non-string-entry, or duplicate-entry activated_skills is rejected outright.
        for bad_value in (
            ['achieve-goal', 'achieve-goal'],
            'achieve-goal',
            ['achieve-goal', ''],
            [1, 2],
        ):
            result = self._runner_result(baseline)
            result['results'][0]['activated_skills'] = bad_value
            bad_input = self.repo / 'bad-activated.json'
            bad_input.write_text(json.dumps(result), encoding='utf-8')
            with pytest.raises(harness.ContractError):
                harness.import_results(
                    type(
                        'Args',
                        (),
                        {
                            'run': str(baseline_path),
                            'input': str(bad_input),
                            'output': str(
                                self.repo / f'bad-activated-import-{bad_value!r}.json'
                            ),
                            'rubric': [],
                        },
                    )()
                )

    def test_activated_skills_required_for_skill_selection_graded_cases(self):
        """Verify activated skills required for skill selection graded cases."""
        baseline_path = self.repo / 'baseline-suite.json'
        baseline = self._prepare(
            'baseline', baseline_path, ('--suite', str(self.suite))
        )
        suite_case = next(
            case
            for case in baseline['cases']
            if case['skill_name'].startswith('suite:')
        )
        missing_input = self.repo / 'missing-activated.json'
        missing_input.write_text(
            json.dumps(
                {
                    'schema': harness.RUN_RESULT_SCHEMA,
                    'run_id': baseline['run_id'],
                    'results': [
                        {
                            'agent': 'test-agent',
                            'skill_name': suite_case['skill_name'],
                            'case_id': suite_case['case_id'],
                            'status': 'completed',
                            'exit_status': 0,
                            'response_text': 'example',
                            'metrics': {
                                'input_tokens': 1,
                                'output_tokens': 1,
                                'duration_ms': 1,
                                'tool_calls': 0,
                                'subagent_calls': 0,
                            },
                        }
                    ],
                }
            ),
            encoding='utf-8',
        )
        with pytest.raises(harness.ContractError) as context:
            harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(missing_input),
                        'output': str(self.repo / 'missing-activated-import.json'),
                        'rubric': [],
                    },
                )()
            )
        assert 'requires activated_skills' in str(context.value)

    def test_prepare_suite_case_grading_is_replaced_with_skill_selection_and_rubric_not_required(
        self,
    ):
        """Verify prepare suite case grading is replaced with skill selection and rubric not required."""
        original_suite = json.loads(self.suite.read_text())
        baseline_path = self.repo / 'baseline-suite.json'
        baseline = self._prepare(
            'baseline', baseline_path, ('--suite', str(self.suite))
        )
        suite_case = next(
            case
            for case in baseline['cases']
            if case['skill_name'].startswith('suite:')
        )
        assert suite_case['grading'] == [
            {
                'type': 'skill_selection',
                'expected': ['example'],
                'forbidden': [],
                'universe': ['example'],
            }
        ]
        assert not suite_case['rubric_required']
        # The free-text expectations are preserved as documentation, unchanged.
        assert suite_case['expectations'] == ['Names example.']
        # The source suite file on disk is never mutated by prepare.
        assert json.loads(self.suite.read_text()) == original_suite
        assert original_suite['cases'][0]['grading'] == [
            {'type': 'text_contains', 'value': 'example'}
        ]

    def test_import_suite_like_result_without_rubric_gets_deterministic_verdict(self):
        """Verify import suite like result without rubric gets deterministic verdict."""
        baseline_path = self.repo / 'baseline-suite.json'
        baseline = self._prepare(
            'baseline', baseline_path, ('--suite', str(self.suite))
        )
        suite_case = next(
            case
            for case in baseline['cases']
            if case['skill_name'].startswith('suite:')
        )
        behavior_case = next(
            case for case in baseline['cases'] if case['skill_name'] == 'example'
        )

        def result_document(activated_skills: list[str]) -> dict[str, Any]:
            return {
                'schema': harness.RUN_RESULT_SCHEMA,
                'run_id': baseline['run_id'],
                'results': [
                    {
                        'agent': 'test-agent',
                        'skill_name': suite_case['skill_name'],
                        'case_id': suite_case['case_id'],
                        'status': 'completed',
                        'exit_status': 0,
                        'response_text': 'example',
                        'activated_skills': activated_skills,
                        'metrics': {
                            'input_tokens': 1,
                            'output_tokens': 1,
                            'duration_ms': 1,
                            'tool_calls': 0,
                            'subagent_calls': 0,
                        },
                    },
                    {
                        'agent': 'test-agent',
                        'skill_name': behavior_case['skill_name'],
                        'case_id': behavior_case['case_id'],
                        'status': 'completed',
                        'exit_status': 0,
                        'response_text': 'example',
                        'response_json': {'route': 'example'},
                        'artifacts': {'out.txt': {}},
                        'metrics': {
                            'input_tokens': 1,
                            'output_tokens': 1,
                            'duration_ms': 1,
                            'tool_calls': 0,
                            'subagent_calls': 0,
                        },
                    },
                ],
            }

        passing_input = self.repo / 'suite-pass.json'
        passing_input.write_text(
            json.dumps(result_document(['example'])), encoding='utf-8'
        )
        passing = harness.import_results(
            type(
                'Args',
                (),
                {
                    'run': str(baseline_path),
                    'input': str(passing_input),
                    'output': str(self.repo / 'suite-pass-import.json'),
                    'rubric': [],
                },
            )()
        )
        suite_result = next(
            r for r in passing['results'] if r['skill_name'].startswith('suite:')
        )
        # Deterministic skill_selection alone decides the verdict -- no rubric was submitted,
        # yet the case is a final "passed", not "ungraded", because rubric_required is false.
        assert suite_result['grade']['status'] == 'passed'
        assert suite_result['grade']['rubric'] is None
        behavior_result = next(
            r for r in passing['results'] if r['skill_name'] == 'example'
        )
        # Behavior cases are untouched: expectations still require a rubric, so this stays ungraded.
        assert behavior_result['grade']['status'] == 'ungraded'

        failing_input = self.repo / 'suite-fail.json'
        failing_input.write_text(
            json.dumps(result_document(['some-other-skill'])), encoding='utf-8'
        )
        failing = harness.import_results(
            type(
                'Args',
                (),
                {
                    'run': str(baseline_path),
                    'input': str(failing_input),
                    'output': str(self.repo / 'suite-fail-import.json'),
                    'rubric': [],
                },
            )()
        )
        suite_failed = next(
            r for r in failing['results'] if r['skill_name'].startswith('suite:')
        )
        assert suite_failed['grade']['status'] == 'failed'

    def test_combine_grade_honors_explicit_rubric_required_false(self):
        """Verify combine grade honors explicit rubric required false."""
        case_without_rubric_required = {
            'grading': [{'type': 'exit_status', 'equals': 0}],
            'expectations': ['Does the thing.'],
        }
        # Default behavior (no rubric_required key) is unchanged: a missing rubric is ungraded
        # even though the deterministic check passed, so behavior cases can't silently pass.
        deterministic_pass = {'status': 'passed', 'checks': []}
        assert (
            harness.combine_grade(
                case_without_rubric_required, deterministic_pass, None
            )['status']
            == 'ungraded'
        )
        case_rubric_not_required = {
            **case_without_rubric_required,
            'rubric_required': False,
        }
        # rubric_required: false makes the deterministic check alone decide the case, with or
        # without a submitted rubric.
        assert (
            harness.combine_grade(case_rubric_not_required, deterministic_pass, None)[
                'status'
            ]
            == 'passed'
        )
        deterministic_fail = {'status': 'failed', 'checks': []}
        assert (
            harness.combine_grade(case_rubric_not_required, deterministic_fail, None)[
                'status'
            ]
            == 'failed'
        )

    def test_import_grades_combine_deterministic_and_rubric(self):
        """Verify import grades combine deterministic and rubric."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_input = self.repo / 'base-runner.json'
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )
        base_import = self.repo / 'base-import.json'

        # Without a rubric submission, a case with free-text expectations is ungraded even
        # though its deterministic checks pass.
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--output',
            str(base_import),
        )
        imported = json.loads(base_import.read_text())
        assert imported['results'][0]['grade']['status'] == 'ungraded'

        rubric_path = self.repo / 'rubric.json'
        rubric_path.write_text(
            json.dumps(self._rubric_document(baseline, passed=True)), encoding='utf-8'
        )
        base_import_2 = self.repo / 'base-import-2.json'
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--rubric',
            str(rubric_path),
            '--output',
            str(base_import_2),
        )
        imported_2 = json.loads(base_import_2.read_text())
        assert imported_2['results'][0]['grade']['status'] == 'passed'
        assert imported_2['results'][0]['grade']['rubric']['status'] == 'passed'

        # A failing rubric verdict fails the case even though deterministic checks pass.
        failing_rubric_path = self.repo / 'rubric-fail.json'
        failing_rubric_path.write_text(
            json.dumps(self._rubric_document(baseline, passed=False)), encoding='utf-8'
        )
        base_import_3 = self.repo / 'base-import-3.json'
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--rubric',
            str(failing_rubric_path),
            '--output',
            str(base_import_3),
        )
        imported_3 = json.loads(base_import_3.read_text())
        assert imported_3['results'][0]['grade']['status'] == 'failed'

    def test_rubric_text_and_count_are_strictly_validated(self):
        """Verify rubric text and count are strictly validated."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_input = self.repo / 'base-runner.json'
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )

        mismatched_text = self._rubric_document(baseline, passed=True)
        mismatched_text['rubrics'][0]['expectations'][0]['text'] = (
            'A different expectation.'
        )
        rubric_path = self.repo / 'rubric-bad-text.json'
        rubric_path.write_text(json.dumps(mismatched_text), encoding='utf-8')
        with pytest.raises(harness.ContractError):
            harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(base_input),
                        'output': str(self.repo / 'out.json'),
                        'rubric': [str(rubric_path)],
                    },
                )()
            )

        wrong_count = self._rubric_document(baseline, passed=True)
        wrong_count['rubrics'][0]['expectations'].append(
            {'text': 'Extra.', 'passed': True, 'evidence': 'n/a'}
        )
        rubric_path_2 = self.repo / 'rubric-bad-count.json'
        rubric_path_2.write_text(json.dumps(wrong_count), encoding='utf-8')
        with pytest.raises(harness.ContractError):
            harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(base_input),
                        'output': str(self.repo / 'out2.json'),
                        'rubric': [str(rubric_path_2)],
                    },
                )()
            )

    def test_rubric_backward_compatible_legacy_shape_without_applicable(self):
        # The legacy {text, passed, evidence} shape (no "applicable" key at all) must keep
        # working exactly as before, and is normalized to an explicit applicable: true.
        """Verify rubric backward compatible legacy shape without applicable."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_input = self.repo / 'base-runner.json'
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )
        rubric_path = self.repo / 'rubric.json'
        rubric_path.write_text(
            json.dumps(self._rubric_document(baseline, passed=True)), encoding='utf-8'
        )
        base_import = self.repo / 'base-import.json'
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--rubric',
            str(rubric_path),
            '--output',
            str(base_import),
        )
        imported = json.loads(base_import.read_text())
        assert imported['results'][0]['grade']['status'] == 'passed'
        rubric_expectation = imported['results'][0]['grade']['rubric']['expectations'][
            0
        ]
        assert rubric_expectation == {
            'text': 'Names example.',
            'applicable': True,
            'passed': True,
            'evidence': 'response cites example',
        }

    def test_rubric_mixed_pass_and_na_expectations_passes_overall(self):
        # A conditional expectation that did not apply (applicable: false) alongside a
        # passing applicable expectation: overall status is "passed" (N/A doesn't block it).
        """Verify rubric mixed pass and na expectations passes overall."""
        self._write_case_expectations(
            ['Names example.', 'Flags a conflict, only if one was reported.']
        )
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_input = self.repo / 'base-runner.json'
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )
        rubric = self._rubric_document_with_expectations(
            baseline,
            [
                {
                    'text': 'Names example.',
                    'passed': True,
                    'evidence': 'response cites example',
                },
                {
                    'text': 'Flags a conflict, only if one was reported.',
                    'applicable': False,
                    'evidence': 'no conflict was reported in this run',
                },
            ],
            status='passed',
        )
        rubric_path = self.repo / 'rubric.json'
        rubric_path.write_text(json.dumps(rubric), encoding='utf-8')
        base_import = self.repo / 'base-import.json'
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--rubric',
            str(rubric_path),
            '--output',
            str(base_import),
        )
        imported = json.loads(base_import.read_text())
        assert imported['results'][0]['grade']['status'] == 'passed'
        assert imported['results'][0]['grade']['rubric']['status'] == 'passed'
        assert imported['results'][0]['grade']['rubric']['expectations'][1] == {
            'text': 'Flags a conflict, only if one was reported.',
            'applicable': False,
            'evidence': 'no conflict was reported in this run',
        }

    def test_rubric_all_na_expectations_is_ungraded_not_passed(self):
        # If every expectation is N/A, the rubric's own status must be "ungraded", and the
        # combined case grade stays "ungraded" too, even though deterministic checks pass.
        """Verify rubric all na expectations is ungraded not passed."""
        self._write_case_expectations(['Flags a conflict, only if one was reported.'])
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_input = self.repo / 'base-runner.json'
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )
        rubric = self._rubric_document_with_expectations(
            baseline,
            [
                {
                    'text': 'Flags a conflict, only if one was reported.',
                    'applicable': False,
                    'evidence': 'no conflict was reported in this run',
                },
            ],
            status='ungraded',
        )
        rubric_path = self.repo / 'rubric.json'
        rubric_path.write_text(json.dumps(rubric), encoding='utf-8')
        base_import = self.repo / 'base-import.json'
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--rubric',
            str(rubric_path),
            '--output',
            str(base_import),
        )
        imported = json.loads(base_import.read_text())
        assert imported['results'][0]['grade']['rubric']['status'] == 'ungraded'
        assert imported['results'][0]['grade']['status'] == 'ungraded'

        # Status inconsistent with an all-N/A rubric (claiming "passed") must be rejected.
        bad_status = self._rubric_document_with_expectations(
            baseline,
            [
                {
                    'text': 'Flags a conflict, only if one was reported.',
                    'applicable': False,
                    'evidence': 'no conflict was reported in this run',
                },
            ],
            status='passed',
        )
        bad_status_path = self.repo / 'rubric-bad-status.json'
        bad_status_path.write_text(json.dumps(bad_status), encoding='utf-8')
        with pytest.raises(harness.ContractError):
            harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(base_input),
                        'output': str(self.repo / 'out.json'),
                        'rubric': [str(bad_status_path)],
                    },
                )()
            )

    def test_deterministic_failure_still_fails_even_with_all_na_rubric(self):
        # An all-N/A rubric (ungraded) must not mask a failing deterministic check: the
        # combined status is still "failed", not "ungraded".
        """Verify deterministic failure still fails even with all na rubric."""
        self._write_case_expectations(['Flags a conflict, only if one was reported.'])
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_input = self.repo / 'base-runner.json'
        # response omits "example", failing the deterministic text_contains/json_shape checks.
        base_input.write_text(
            json.dumps(
                self._runner_result(
                    baseline,
                    response='no match here',
                )
            ).replace('"route": "example"', '"route": "other"'),
            encoding='utf-8',
        )
        rubric = self._rubric_document_with_expectations(
            baseline,
            [
                {
                    'text': 'Flags a conflict, only if one was reported.',
                    'applicable': False,
                    'evidence': 'no conflict was reported in this run',
                }
            ],
            status='ungraded',
        )
        rubric_path = self.repo / 'rubric.json'
        rubric_path.write_text(json.dumps(rubric), encoding='utf-8')
        base_import = self.repo / 'base-import.json'
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--rubric',
            str(rubric_path),
            '--output',
            str(base_import),
        )
        imported = json.loads(base_import.read_text())
        assert imported['results'][0]['grade']['deterministic']['status'] == 'failed'
        assert imported['results'][0]['grade']['rubric']['status'] == 'ungraded'
        assert imported['results'][0]['grade']['status'] == 'failed'

    def test_rubric_na_expectation_rejects_passed_field(self):
        # applicable: false must not carry a passed verdict at all.
        """Verify rubric na expectation rejects passed field."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_input = self.repo / 'base-runner.json'
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )
        rubric = self._rubric_document_with_expectations(
            baseline,
            [
                {
                    'text': 'Names example.',
                    'applicable': False,
                    'passed': True,
                    'evidence': "shouldn't be here",
                }
            ],
            status='ungraded',
        )
        rubric_path = self.repo / 'rubric-invalid-na.json'
        rubric_path.write_text(json.dumps(rubric), encoding='utf-8')
        with pytest.raises(harness.ContractError) as raised:
            harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(base_input),
                        'output': str(self.repo / 'out.json'),
                        'rubric': [str(rubric_path)],
                    },
                )()
            )
        assert 'must not include passed' in str(raised.value)

    def test_rubric_applicable_expectation_requires_passed(self):
        # Whether "applicable" is omitted (legacy) or explicitly true, a missing passed
        # verdict is rejected rather than silently treated as N/A.
        """Verify rubric applicable expectation requires passed."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_input = self.repo / 'base-runner.json'
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )

        missing_passed = self._rubric_document_with_expectations(
            baseline,
            [{'text': 'Names example.', 'evidence': 'response cites example'}],
            status='ungraded',
        )
        rubric_path = self.repo / 'rubric-missing-passed.json'
        rubric_path.write_text(json.dumps(missing_passed), encoding='utf-8')
        with pytest.raises(harness.ContractError) as raised:
            harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(base_input),
                        'output': str(self.repo / 'out.json'),
                        'rubric': [str(rubric_path)],
                    },
                )()
            )
        assert 'passed must be a boolean' in str(raised.value)

        explicit_applicable_missing_passed = self._rubric_document_with_expectations(
            baseline,
            [
                {
                    'text': 'Names example.',
                    'applicable': True,
                    'evidence': 'response cites example',
                }
            ],
            status='ungraded',
        )
        rubric_path_2 = self.repo / 'rubric-missing-passed-2.json'
        rubric_path_2.write_text(
            json.dumps(explicit_applicable_missing_passed), encoding='utf-8'
        )
        with pytest.raises(harness.ContractError) as raised_2:
            harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(base_input),
                        'output': str(self.repo / 'out2.json'),
                        'rubric': [str(rubric_path_2)],
                    },
                )()
            )
        assert 'passed must be a boolean' in str(raised_2.value)

    def test_aggregate_does_not_count_all_na_rubric_pass_rate_as_failed(self):
        # An explicitly-submitted all-N/A rubric (status "ungraded") must be excluded from
        # the paired pass rate exactly like a missing rubric, not counted as a failure.
        """Verify aggregate does not count all na rubric pass rate as failed."""
        self._write_case_expectations(['Flags a conflict, only if one was reported.'])
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        candidate_path = self.repo / 'candidate.json'
        candidate = self._prepare(
            'candidate', candidate_path, ('--baseline-run-id', baseline['run_id'])
        )
        base_input, candidate_input = (
            self.repo / 'base-runner.json',
            self.repo / 'candidate-runner.json',
        )
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )
        candidate_input.write_text(
            json.dumps(self._runner_result(candidate)), encoding='utf-8'
        )
        na_expectations = [
            {
                'text': 'Flags a conflict, only if one was reported.',
                'applicable': False,
                'evidence': 'no conflict was reported in this run',
            }
        ]
        base_rubric = self.repo / 'base-rubric.json'
        base_rubric.write_text(
            json.dumps(
                self._rubric_document_with_expectations(
                    baseline, na_expectations, status='ungraded'
                )
            ),
            encoding='utf-8',
        )
        candidate_rubric = self.repo / 'candidate-rubric.json'
        candidate_rubric.write_text(
            json.dumps(
                self._rubric_document_with_expectations(
                    candidate, na_expectations, status='ungraded'
                )
            ),
            encoding='utf-8',
        )
        base_import, candidate_import = (
            self.repo / 'base-import.json',
            self.repo / 'candidate-import.json',
        )
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--rubric',
            str(base_rubric),
            '--output',
            str(base_import),
        )
        self._invoke(
            'import-results',
            '--run',
            str(candidate_path),
            '--input',
            str(candidate_input),
            '--rubric',
            str(candidate_rubric),
            '--output',
            str(candidate_import),
        )
        aggregate_path = self.repo / 'aggregate.json'
        self._invoke(
            'aggregate',
            '--input',
            str(base_import),
            '--input',
            str(candidate_import),
            '--output',
            str(aggregate_path),
        )
        aggregate = json.loads(aggregate_path.read_text())
        assert aggregate['paired_deltas'][0]['matched_cases'] == 1
        assert aggregate['paired_deltas'][0]['graded_pairs'] == 0
        assert aggregate['paired_deltas'][0]['pass_rate_delta'] is None
        for group in aggregate['groups']:
            assert group['failed'] == 0
            assert group['ungraded'] == 1

    def test_import_grades_and_aggregate_pairs(self):
        """Verify import grades and aggregate pairs."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        candidate_path = self.repo / 'candidate.json'
        candidate = self._prepare(
            'candidate', candidate_path, ('--baseline-run-id', baseline['run_id'])
        )
        base_input, candidate_input = (
            self.repo / 'base-runner.json',
            self.repo / 'candidate-runner.json',
        )
        base_input.write_text(
            json.dumps(self._runner_result(baseline, duration=10)), encoding='utf-8'
        )
        candidate_input.write_text(
            json.dumps(self._runner_result(candidate, duration=7)), encoding='utf-8'
        )
        base_rubric = self.repo / 'base-rubric.json'
        base_rubric.write_text(
            json.dumps(self._rubric_document(baseline, passed=True)), encoding='utf-8'
        )
        candidate_rubric = self.repo / 'candidate-rubric.json'
        candidate_rubric.write_text(
            json.dumps(self._rubric_document(candidate, passed=True)), encoding='utf-8'
        )
        base_import, candidate_import = (
            self.repo / 'base-import.json',
            self.repo / 'candidate-import.json',
        )
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--rubric',
            str(base_rubric),
            '--output',
            str(base_import),
        )
        self._invoke(
            'import-results',
            '--run',
            str(candidate_path),
            '--input',
            str(candidate_input),
            '--rubric',
            str(candidate_rubric),
            '--output',
            str(candidate_import),
        )
        imported = json.loads(base_import.read_text())
        assert imported['results'][0]['grade']['status'] == 'passed'
        aggregate_path = self.repo / 'aggregate.json'
        self._invoke(
            'aggregate',
            '--input',
            str(base_import),
            '--input',
            str(candidate_import),
            '--output',
            str(aggregate_path),
        )
        aggregate = json.loads(aggregate_path.read_text())
        assert len(aggregate['groups']) == 2
        assert aggregate['paired_deltas'][0]['matched_cases'] == 1
        assert aggregate['paired_deltas'][0]['graded_pairs'] == 1
        assert aggregate['paired_deltas'][0]['metric_deltas']['duration_ms'] == -3
        assert aggregate['paired_deltas'][0]['pass_rate_delta'] == 0

    def _import_run(
        self,
        run_path: Path,
        run: dict[str, Any],
        name: str,
        *,
        passed: bool = True,
    ) -> Path:
        runner_input = self.repo / f'{name}-runner.json'
        runner_input.write_text(json.dumps(self._runner_result(run)), encoding='utf-8')
        rubric_path = self.repo / f'{name}-rubric.json'
        rubric_path.write_text(
            json.dumps(self._rubric_document(run, passed=passed)), encoding='utf-8'
        )
        imported = self.repo / f'{name}-import.json'
        self._invoke(
            'import-results',
            '--run',
            str(run_path),
            '--input',
            str(runner_input),
            '--rubric',
            str(rubric_path),
            '--output',
            str(imported),
        )
        return imported

    def test_aggregate_rejects_pairs_graded_against_different_eval_corpora(self):
        """Verify aggregate rejects pairs graded against different eval corpora."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_import = self._import_run(baseline_path, baseline, 'base')
        # Same cases, different evaluation corpus content (fixture bytes changed).
        (self.eval_dir / 'files' / 'fixture.ts').write_text(
            'export const fixture = 2;\n', encoding='utf-8'
        )
        candidate_path = self.repo / 'candidate.json'
        candidate = self._prepare(
            'candidate', candidate_path, ('--baseline-run-id', baseline['run_id'])
        )
        assert (
            candidate['evaluation']['corpus_digest']
            != baseline['evaluation']['corpus_digest']
        )
        candidate_import = self._import_run(candidate_path, candidate, 'candidate')
        with pytest.raises(harness.ContractError) as raised:
            harness.aggregate(
                type(
                    'Args',
                    (),
                    {
                        'input': [str(base_import), str(candidate_import)],
                        'output': str(self.repo / 'aggregate.json'),
                    },
                )()
            )
        assert 'different evaluation corpora' in str(raised.value)

    def test_aggregate_pairs_runs_whose_runtime_skill_trees_differ(self):
        """Verify aggregate pairs runs whose runtime skill trees differ."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        base_import = self._import_run(baseline_path, baseline, 'base')
        # Only the distributed runtime skill changes: that is exactly what a candidate tests.
        (self.skill_dir / 'SKILL.md').write_text(
            '---\nname: example\ndescription: Example skill, revised.\n---\n',
            encoding='utf-8',
        )
        candidate_path = self.repo / 'candidate.json'
        candidate = self._prepare(
            'candidate', candidate_path, ('--baseline-run-id', baseline['run_id'])
        )
        assert (
            candidate['repository']['selected_skill_tree_digest']
            != baseline['repository']['selected_skill_tree_digest']
        )
        assert (
            candidate['evaluation']['corpus_digest']
            == baseline['evaluation']['corpus_digest']
        )
        candidate_import = self._import_run(candidate_path, candidate, 'candidate')
        aggregate_path = self.repo / 'aggregate.json'
        self._invoke(
            'aggregate',
            '--input',
            str(base_import),
            '--input',
            str(candidate_import),
            '--output',
            str(aggregate_path),
        )
        aggregate = json.loads(aggregate_path.read_text())
        assert aggregate['paired_deltas'][0]['matched_cases'] == 1

    def test_paired_pass_rate_excludes_ungraded_cases(self):
        """Verify paired pass rate excludes ungraded cases."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        candidate_path = self.repo / 'candidate.json'
        candidate = self._prepare(
            'candidate', candidate_path, ('--baseline-run-id', baseline['run_id'])
        )
        base_input, candidate_input = (
            self.repo / 'base-runner.json',
            self.repo / 'candidate-runner.json',
        )
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )
        candidate_input.write_text(
            json.dumps(self._runner_result(candidate)), encoding='utf-8'
        )
        base_import, candidate_import = (
            self.repo / 'base-import.json',
            self.repo / 'candidate-import.json',
        )
        # No rubric submitted: the only case stays "ungraded" on both sides.
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--output',
            str(base_import),
        )
        self._invoke(
            'import-results',
            '--run',
            str(candidate_path),
            '--input',
            str(candidate_input),
            '--output',
            str(candidate_import),
        )
        aggregate_path = self.repo / 'aggregate.json'
        self._invoke(
            'aggregate',
            '--input',
            str(base_import),
            '--input',
            str(candidate_import),
            '--output',
            str(aggregate_path),
        )
        aggregate = json.loads(aggregate_path.read_text())
        assert aggregate['paired_deltas'][0]['matched_cases'] == 1
        assert aggregate['paired_deltas'][0]['graded_pairs'] == 0
        assert aggregate['paired_deltas'][0]['pass_rate_delta'] is None

    def test_aggregate_critical_gate_fails_when_candidate_is_not_run(self):
        """Verify aggregate critical gate fails when candidate is not run."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        candidate_path = self.repo / 'candidate.json'
        candidate = self._prepare(
            'candidate', candidate_path, ('--baseline-run-id', baseline['run_id'])
        )
        base_import = self._import_run(baseline_path, baseline, 'baseline')

        candidate_result = self._runner_result(candidate)
        candidate_result['results'][0]['status'] = 'not_run'
        candidate_result['results'][0]['refusal_reason'] = 'provider unavailable'
        candidate_input = self.repo / 'candidate-not-run.json'
        candidate_input.write_text(json.dumps(candidate_result), encoding='utf-8')
        candidate_import = self.repo / 'candidate-not-run-import.json'
        self._invoke(
            'import-results',
            '--run',
            str(candidate_path),
            '--input',
            str(candidate_input),
            '--output',
            str(candidate_import),
        )

        aggregate_path = self.repo / 'critical-not-run-aggregate.json'
        self._invoke(
            'aggregate',
            '--input',
            str(base_import),
            '--input',
            str(candidate_import),
            '--output',
            str(aggregate_path),
        )
        paired = json.loads(aggregate_path.read_text())['paired_deltas'][0]
        assert not paired['critical_gate_passed']
        assert paired['critical_regressions'] == [
            {'agent': 'test-agent', 'skill_name': 'example', 'case_id': '1'}
        ]
        assert (
            paired['critical_checks'][0]['candidate']['issues'][0]['type'] == 'not_run'
        )

    def test_aggregate_baseline_passing_critical_expectation_cannot_become_na(self):
        """Verify aggregate baseline passing critical expectation cannot become na."""
        self._write_case_expectations(['Critical behavior.', 'Optional detail.'])
        manifest_path = self.eval_dir / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['critical_expectations'] = {'1': [0]}
        manifest_path.write_text(json.dumps(manifest), encoding='utf-8')

        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        candidate_path = self.repo / 'candidate.json'
        candidate = self._prepare(
            'candidate', candidate_path, ('--baseline-run-id', baseline['run_id'])
        )
        base_input = self.repo / 'critical-base-runner.json'
        candidate_input = self.repo / 'critical-candidate-runner.json'
        base_input.write_text(
            json.dumps(self._runner_result(baseline)), encoding='utf-8'
        )
        candidate_input.write_text(
            json.dumps(self._runner_result(candidate)), encoding='utf-8'
        )
        base_rubric = self.repo / 'critical-base-rubric.json'
        base_rubric.write_text(
            json.dumps(
                self._rubric_document_with_expectations(
                    baseline,
                    [
                        {
                            'text': 'Critical behavior.',
                            'passed': True,
                            'evidence': 'critical behavior observed',
                        },
                        {
                            'text': 'Optional detail.',
                            'passed': True,
                            'evidence': 'detail observed',
                        },
                    ],
                    status='passed',
                )
            ),
            encoding='utf-8',
        )
        candidate_rubric = self.repo / 'critical-candidate-rubric.json'
        candidate_rubric.write_text(
            json.dumps(
                self._rubric_document_with_expectations(
                    candidate,
                    [
                        {
                            'text': 'Critical behavior.',
                            'applicable': False,
                            'evidence': 'not exercised',
                        },
                        {
                            'text': 'Optional detail.',
                            'passed': True,
                            'evidence': 'detail observed',
                        },
                    ],
                    status='passed',
                )
            ),
            encoding='utf-8',
        )
        base_import = self.repo / 'critical-base-import.json'
        candidate_import = self.repo / 'critical-candidate-import.json'
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(base_input),
            '--rubric',
            str(base_rubric),
            '--output',
            str(base_import),
        )
        self._invoke(
            'import-results',
            '--run',
            str(candidate_path),
            '--input',
            str(candidate_input),
            '--rubric',
            str(candidate_rubric),
            '--output',
            str(candidate_import),
        )
        aggregate_path = self.repo / 'critical-expectation-aggregate.json'
        self._invoke(
            'aggregate',
            '--input',
            str(base_import),
            '--input',
            str(candidate_import),
            '--output',
            str(aggregate_path),
        )
        paired = json.loads(aggregate_path.read_text())['paired_deltas'][0]
        assert paired['pass_delta'] == 0
        assert not paired['critical_gate_passed']
        assert paired['critical_checks'][0]['regression']
        assert paired['critical_checks'][0]['expectation_regressions'] == [0]
        assert paired['critical_checks'][0]['candidate']['issues'] == []
        assert paired['critical_checks'][0]['candidate'][
            'not_applicable_expectations'
        ] == [0]

    # -- B1: deterministic_ids must reference cases with non-empty grading -----------------

    def test_manifest_deterministic_ids_require_non_empty_grading(self):
        """Verify manifest deterministic ids require non empty grading."""
        eval_path = self.eval_dir / 'evals.json'
        data = json.loads(eval_path.read_text())
        data['evals'][0]['grading'] = []
        eval_path.write_text(json.dumps(data), encoding='utf-8')
        errors = harness.validate_repository(self.repo)
        assert any(
            'deterministic_ids case(s) have no grading checks' in error and '1' in error
            for error in errors
        )

    # -- B2: "not_run" is coverage-preserving, forced ungraded, and counted separately -----

    def test_not_run_result_is_forced_ungraded_and_never_passes_exit_status(self):
        """Verify not run result is forced ungraded and never passes exit status."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        result = self._runner_result(baseline)
        result['results'][0]['status'] = 'not_run'
        result['results'][0]['refusal_reason'] = 'sandbox unavailable'
        input_path = self.repo / 'not-run.json'
        input_path.write_text(json.dumps(result), encoding='utf-8')
        output_path = self.repo / 'not-run-import.json'
        self._invoke(
            'import-results',
            '--run',
            str(baseline_path),
            '--input',
            str(input_path),
            '--output',
            str(output_path),
        )
        imported = json.loads(output_path.read_text())
        entry = imported['results'][0]
        # The overall grade is forced ungraded even though exit_status == 0 in the payload...
        assert entry['grade']['status'] == 'ungraded'
        # ...and the underlying exit_status check itself never reports passed for a not_run result.
        exit_status_outcome = next(
            c
            for c in entry['grade']['deterministic']['checks']
            if c['type'] == 'exit_status'
        )
        assert not exit_status_outcome['passed']
        # Coverage-preserving: the not_run result still counts as covering this case.
        assert entry['status'] == 'not_run'
        counts = harness.summary(imported['results'])
        assert counts['cases'] == 1
        assert counts['not_run'] == 1
        # not_run is its own bucket, disjoint from "ungraded".
        assert counts['ungraded'] == 0
        assert counts['passed'] == 0
        assert counts['failed'] == 0

    def test_combine_grade_forces_ungraded_for_not_run_regardless_of_rubric_or_deterministic(
        self,
    ):
        """Verify combine grade forces ungraded for not run regardless of rubric or deterministic."""
        case = {
            'grading': [{'type': 'exit_status', 'equals': 0}],
            'expectations': ['x'],
            'rubric_required': True,
        }
        deterministic = {'status': 'passed', 'checks': []}
        rubric_entry = {'status': 'failed'}
        combined = harness.combine_grade(case, deterministic, rubric_entry, 'not_run')
        assert combined['status'] == 'ungraded'

    def test_result_status_must_be_a_known_value(self):
        """Verify result status must be a known value."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        result = self._runner_result(baseline)
        result['results'][0]['status'] = 'skipped'
        input_path = self.repo / 'bad-status.json'
        input_path.write_text(json.dumps(result), encoding='utf-8')
        with pytest.raises(harness.ContractError):
            harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(input_path),
                        'output': str(self.repo / 'bad-status-import.json'),
                        'rubric': [],
                    },
                )()
            )

    # -- N1: execution_honored deep-equal, or not_run with a refusal_reason ----------------

    def test_execution_honored_or_refusal_reason_required_when_case_has_execution(self):
        """Verify execution honored or refusal reason required when case has execution."""
        self._write_shim()
        execution = {
            'network': 'disabled',
            'path_prepend': ['files/bin'],
            'executable_files': ['files/bin/tool'],
        }
        self._write_case_execution(
            execution, files=['files/fixture.ts', 'files/bin/tool']
        )
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)

        def attempt(mutate: Any, output_name: str) -> dict[str, Any]:
            result = self._runner_result(baseline)
            mutate(result)
            input_path = self.repo / f'{output_name}.json'
            input_path.write_text(json.dumps(result), encoding='utf-8')
            return harness.import_results(
                type(
                    'Args',
                    (),
                    {
                        'run': str(baseline_path),
                        'input': str(input_path),
                        'output': str(self.repo / f'{output_name}-import.json'),
                        'rubric': [],
                    },
                )()
            )

        # Missing execution_honored entirely is rejected.
        with pytest.raises(harness.ContractError) as context:
            attempt(lambda _result: None, 'missing-honored')
        assert 'execution_honored' in str(context.value)

        # execution_honored present but not deep-equal to the case's execution block is rejected.
        with pytest.raises(harness.ContractError):
            attempt(
                lambda result: result['results'][0].__setitem__(
                    'execution_honored', {'network': 'enabled'}
                ),
                'mismatched-honored',
            )

        # execution_honored deep-equal to the case's execution block is accepted.
        attempt(
            lambda result: result['results'][0].__setitem__(
                'execution_honored', execution
            ),
            'matching-honored',
        )

        # status not_run with a non-empty refusal_reason is accepted without execution_honored.
        def refuse(result: dict[str, Any]) -> None:
            result['results'][0]['status'] = 'not_run'
            result['results'][0]['refusal_reason'] = 'sandbox unavailable'

        attempt(refuse, 'refused')

        # status not_run without a refusal_reason is rejected.
        with pytest.raises(harness.ContractError):
            attempt(
                lambda result: result['results'][0].__setitem__('status', 'not_run'),
                'refused-missing-reason',
            )

    # -- N2: generated-artifact fixture references are rejected; missing snapshot fixture --
    # -- is converted to a ContractError instead of leaking a raw OSError ------------------

    def test_case_fixture_referencing_generated_artifact_path_is_rejected(self):
        """Verify case fixture referencing generated artifact path is rejected."""
        outputs_dir = self.eval_dir / 'outputs'
        outputs_dir.mkdir()
        (outputs_dir / 'run.log').write_text('log', encoding='utf-8')
        eval_path = self.eval_dir / 'evals.json'
        data = json.loads(eval_path.read_text())
        data['evals'][0]['files'] = ['files/fixture.ts', 'outputs/run.log']
        eval_path.write_text(json.dumps(data), encoding='utf-8')
        errors = harness.validate_repository(self.repo)
        assert any('generated-artifact path' in error for error in errors)

    def test_execution_hint_referencing_generated_artifact_path_is_rejected(self):
        """Verify execution hint referencing generated artifact path is rejected."""
        outputs_dir = self.eval_dir / 'outputs' / 'bin'
        outputs_dir.mkdir(parents=True)
        shim = outputs_dir / 'tool'
        shim.write_text('#!/usr/bin/env bash\necho fixture\n', encoding='utf-8')
        shim.chmod(0o755)
        self._write_case_execution(
            {
                'network': 'disabled',
                'path_prepend': ['outputs/bin'],
                'executable_files': ['outputs/bin/tool'],
            },
            files=['files/fixture.ts'],
        )
        errors = harness.validate_repository(self.repo)
        assert any('generated-artifact path' in error for error in errors)

    def test_bind_case_fixtures_converts_missing_snapshot_file_to_contract_error(self):
        """Verify bind case fixtures converts missing snapshot file to contract error."""
        case = {'skill_name': 'example', 'case_id': '1', 'files': ['files/fixture.ts']}
        evaluation_snapshot = {'skills': {'example': str(self.repo / 'does-not-exist')}}
        with pytest.raises(harness.ContractError) as context:
            harness.bind_case_fixtures([case], evaluation_snapshot)
        assert 'example:1' in str(context.value)

    # -- N3: generated-artifact exclusion mirrors .gitignore (anchored dir, filename globs) -

    @pytest.mark.parametrize('name', GENERATED_ARTIFACT_NAMES)
    def test_generated_artifact_exclusion_is_anchored_and_matches_gitignore_filename_globs(
        self, name: str
    ):
        # Top-level "outputs" is excluded; a nested directory merely named "outputs" is real
        # fixture content and must not be excluded.
        """Verify generated artifact exclusion is anchored and matches gitignore filename globs."""
        assert harness.is_generated_eval_artifact(Path('outputs/run.log'))
        assert not harness.is_generated_eval_artifact(Path('files/outputs/keep.ts'))
        # .gitignore's evals/**/{grading,timing,benchmark*,review*} filename globs match at any depth.
        assert harness.is_generated_eval_artifact(Path('nested/deep') / name)
        assert not harness.is_generated_eval_artifact(Path('files/fixture.ts'))

    def test_copy_tree_skip_generated_respects_anchoring_and_filename_globs(self):
        """Verify copy tree skip generated respects anchoring and filename globs."""
        source = self.temp_path / 'artifact-source'
        (source / 'outputs').mkdir(parents=True)
        (source / 'outputs' / 'run.log').write_text('x', encoding='utf-8')
        (source / 'files' / 'outputs').mkdir(parents=True)
        (source / 'files' / 'outputs' / 'keep.ts').write_text('keep', encoding='utf-8')
        (source / 'files' / 'grading.json').write_text('{}', encoding='utf-8')
        (source / 'files' / 'fixture.ts').write_text('f', encoding='utf-8')
        destination = self.temp_path / 'artifact-dest'
        harness.copy_tree(source, destination, skip_generated=True)
        assert not (destination / 'outputs').exists()
        assert (destination / 'files' / 'outputs' / 'keep.ts').is_file()
        assert not (destination / 'files' / 'grading.json').exists()
        assert (destination / 'files' / 'fixture.ts').is_file()

    # -- N4: trigger expected/forbidden must resolve against the runtime skill universe ----

    def test_suite_validation_against_runtime_universe_allows_none_and_allowlisted_forbidden(
        self,
    ):
        """Verify suite validation against runtime universe allows none and allowlisted forbidden."""
        universe = {'example'}
        assert harness.validate_suite(self.suite, universe) == []

        def suite_with(mutate: Any, name: str) -> Path:
            doc = json.loads(self.suite.read_text())
            mutate(doc['cases'][0])
            path = self.repo / name
            path.write_text(json.dumps(doc), encoding='utf-8')
            return path

        # expected_skills naming a skill outside the universe is rejected.
        unknown_expected = suite_with(
            lambda case: case.__setitem__('expected_skills', ['not-a-real-skill']),
            'bad-suite-expected.json',
        )
        assert any(
            'expected_skills must be' in e
            for e in harness.validate_suite(unknown_expected, universe)
        )

        # forbidden_skills naming an unlisted, non-universe name is rejected...
        unknown_forbidden = suite_with(
            lambda case: case.__setitem__('forbidden_skills', ['not-a-real-skill']),
            'bad-suite-forbidden.json',
        )
        assert any(
            'forbidden_skills must be' in e
            for e in harness.validate_suite(unknown_forbidden, universe)
        )

        # ...but an explicitly allowlisted external capability is accepted.
        allowlisted_forbidden = suite_with(
            lambda case: case.__setitem__(
                'forbidden_skills', sorted(harness.EXTERNAL_FORBIDDEN_CAPABILITIES)
            ),
            'good-suite-forbidden.json',
        )
        assert harness.validate_suite(allowlisted_forbidden, universe) == []

        # "none" is always acceptable for expected_skills regardless of universe.
        none_suite = suite_with(
            lambda case: (
                case.__setitem__('expected_skills', ['none']),
                case.__setitem__('forbidden_skills', ['example']),
            ),
            'none-suite.json',
        )
        assert harness.validate_suite(none_suite, universe) == []

    def test_prepare_revalidates_suites_against_full_universe_then_filters_selected_subset(
        self,
    ):
        # The suite names a real skill ("example") that is not part of a narrower --skill
        # selection; suite validity must not depend on the run's selected subset.
        """Verify prepare revalidates suites against full universe then filters selected subset."""
        (self.repo / 'skills' / 'other').mkdir(parents=True)
        (self.repo / 'skills' / 'other' / 'SKILL.md').write_text(
            '---\nname: other\ndescription: Another skill.\n---\n', encoding='utf-8'
        )
        (self.repo / 'evals' / 'other').mkdir(parents=True)
        (self.repo / 'evals' / 'other' / 'evals.json').write_text(
            json.dumps({'skill_name': 'other', 'evals': []}), encoding='utf-8'
        )
        (self.repo / 'evals' / 'other' / 'manifest.json').write_text(
            json.dumps({'skill_name': 'other', 'default_category': 'regression_guard'}),
            encoding='utf-8',
        )
        baseline_path = self.repo / 'baseline-other-selection.json'
        baseline = self._prepare(
            'baseline', baseline_path, ('--suite', str(self.suite), '--skill', 'other')
        )
        assert not any(
            case['skill_name'].startswith('suite:') for case in baseline['cases']
        )

    # -- N5: unknown case/manifest keys are rejected; documented meta keys are recognized ---

    def test_unknown_case_and_manifest_keys_are_rejected(self):
        """Verify unknown case and manifest keys are rejected."""
        eval_path = self.eval_dir / 'evals.json'
        data = json.loads(eval_path.read_text())
        data['evals'][0]['exceution'] = {'network': 'disabled'}  # typo of "execution"
        eval_path.write_text(json.dumps(data), encoding='utf-8')
        errors = harness.validate_repository(self.repo)
        assert any(
            'unknown case keys' in error and 'exceution' in error for error in errors
        )

        data2 = json.loads(eval_path.read_text())
        del data2['evals'][0]['exceution']
        eval_path.write_text(json.dumps(data2), encoding='utf-8')
        manifest_path = self.eval_dir / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['default_execuiton'] = {}  # typo of "default_execution"
        manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
        errors2 = harness.validate_repository(self.repo)
        assert any(
            'unknown manifest keys' in error and 'default_execuiton' in error
            for error in errors2
        )

    def test_clarification_rationale_maps_known_ids_or_underscored_meta_keys(self):
        """Verify clarification rationale maps known ids or underscored meta keys."""
        manifest_path = self.eval_dir / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['clarification_rationale'] = {
            '1': 'Applies to case 1.',
            '_meta_note': 'Spans several cases.',
        }
        manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
        assert harness.validate_repository(self.repo) == []
        # A non-underscored key naming an unknown case id is still rejected.
        manifest['clarification_rationale'] = {'999': 'Unknown case.'}
        manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
        errors = harness.validate_repository(self.repo)
        assert any('clarification_rationale' in error for error in errors)

    # -- N7: a prepare that fails partway cleans up any snapshot directories it created ----

    def test_prepare_cleans_up_snapshot_dirs_when_it_fails_partway(self):
        """Verify prepare cleans up snapshot dirs when it fails partway."""
        baseline_path = self.repo / 'baseline-cleanup.json'
        run_id = 'fixed-run-id-for-cleanup-test'

        def args() -> Any:
            return type(
                'Args',
                (),
                {
                    'repo': str(self.repo),
                    'output': str(baseline_path),
                    'role': 'baseline',
                    'model': 'test/model@1',
                    'config_json': '{"temperature":0}',
                    'skill': [],
                    'suite': [],
                    'agent': ['test-agent'],
                    'comparison_key': 'test',
                    'baseline_run_id': None,
                    'run_id': run_id,
                },
            )()

        with (
            mock.patch.object(
                harness,
                'assert_no_eval_material',
                side_effect=harness.ContractError('boom'),
            ),
            pytest.raises(harness.ContractError),
        ):
            harness.prepare_run(args())
        assert not (self.repo / f'{run_id}.skills-snapshot').exists()
        assert not (self.repo / f'{run_id}.evaluation-snapshot').exists()
        assert not baseline_path.exists()
        # A retry with the same run_id succeeds now that the partial snapshot was cleaned up.
        baseline = harness.prepare_run(args())
        assert baseline['run_id'] == run_id

    def test_prepare_does_not_delete_a_pre_existing_snapshot_it_did_not_create(self):
        """Verify prepare does not delete a pre existing snapshot it did not create."""
        baseline_path = self.repo / 'baseline-preexisting.json'
        run_id = 'fixed-run-id-preexisting'
        snapshot_root = self.repo / f'{run_id}.skills-snapshot'
        snapshot_root.mkdir()
        (snapshot_root / 'sentinel.txt').write_text('pre-existing', encoding='utf-8')

        def args() -> Any:
            return type(
                'Args',
                (),
                {
                    'repo': str(self.repo),
                    'output': str(baseline_path),
                    'role': 'baseline',
                    'model': 'test/model@1',
                    'config_json': '{"temperature":0}',
                    'skill': [],
                    'suite': [],
                    'agent': ['test-agent'],
                    'comparison_key': 'test',
                    'baseline_run_id': None,
                    'run_id': run_id,
                },
            )()

        with pytest.raises(harness.ContractError):
            harness.prepare_run(args())
        # materialize_snapshot refused to overwrite it; prepare must not have deleted it either.
        assert (snapshot_root / 'sentinel.txt').is_file()

    # -- S2: declarative install_requirements alongside the existing npx argv steps --------

    def test_prepare_emits_declarative_install_requirements_alongside_argv_steps(self):
        """Verify prepare emits declarative install requirements alongside argv steps."""
        baseline_path = self.repo / 'baseline.json'
        baseline = self._prepare('baseline', baseline_path)
        assert 'install_requirements' in baseline
        assert len(baseline['install_requirements']) == len(
            baseline['installed_copy_steps']
        )
        for argv_step, declarative_step in zip(
            baseline['installed_copy_steps'],
            baseline['install_requirements'],
            strict=False,
        ):
            assert declarative_step['agent'] == argv_step['agent']
            assert declarative_step['skill_name'] == argv_step['skill_name']
            assert declarative_step['package_manager'] == 'npx'
            assert declarative_step['package'] == 'skills'
            assert declarative_step['action'] == 'add'
            assert declarative_step['source'] == argv_step['argv'][3]
            assert declarative_step['options'] == {
                'agent': argv_step['agent'],
                'copy': True,
                'yes': True,
            }
        # Backward compatibility: the existing argv shape is completely unchanged.
        assert baseline['installed_copy_steps'][0]['argv'][:3] == [
            'npx',
            'skills',
            'add',
        ]
