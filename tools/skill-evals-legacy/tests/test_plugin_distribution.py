"""Check this repository's native plugin packages, not host runtime behavior."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
PLUGIN_SKILLS = {
    'pr-review': {'pr-review', 'spar', 'rubber-duck'},
    'workflow': {
        'workflow-orchestrator',
        'execute-plan-loop',
        'anti-slop',
        'decompose-feature',
        'plan-parallel-work',
        'ensure-atomic-pr',
        'refresh-related-docs',
    },
}


def read_json(path: Path) -> dict:
    """Read a native manifest for comparison."""
    return json.loads(path.read_text(encoding='utf-8'))


def test_workflow_default_prompts_follow_codex_contract() -> None:
    """Keep workflow starter prompts within Codex's documented UI limits."""
    manifest = read_json(REPO / 'plugins/workflow/.codex-plugin/plugin.json')
    prompts = manifest['interface']['defaultPrompt']
    assert isinstance(prompts, list)
    assert 1 <= len(prompts) <= 3
    assert all(isinstance(prompt, str) and prompt.strip() and len(prompt) <= 128 for prompt in prompts)


def test_marketplaces_share_plugin_roots() -> None:
    """Resolve both native catalogs to the same plugin directories."""
    codex = read_json(REPO / '.agents/plugins/marketplace.json')
    claude = read_json(REPO / '.claude-plugin/marketplace.json')
    assert codex['name'] == claude['name'] == 'agent-coding'
    assert claude['owner']['name']
    assert len(codex['plugins']) == len(claude['plugins']) == len(PLUGIN_SKILLS)
    codex_roots = {entry['name']: entry['source']['path'] for entry in codex['plugins']}
    claude_roots = {entry['name']: entry['source'] for entry in claude['plugins']}
    assert codex_roots == claude_roots
    assert set(codex_roots) == set(PLUGIN_SKILLS)
    for name, relative in codex_roots.items():
        assert (REPO / relative).resolve() == REPO / 'plugins' / name
    assert all(entry['source']['source'] == 'local' for entry in codex['plugins'])


@pytest.mark.parametrize('name', PLUGIN_SKILLS)
def test_native_manifests_agree(name: str) -> None:
    """Keep common release metadata consistent without foreign host fields."""
    plugin = REPO / 'plugins' / name
    codex = read_json(plugin / '.codex-plugin/plugin.json')
    claude = read_json(plugin / '.claude-plugin/plugin.json')
    common = {
        'name',
        'version',
        'description',
        'author',
        'homepage',
        'repository',
        'keywords',
    }
    assert set(claude) == common
    assert {key: codex[key] for key in common} == claude
    assert claude['name'] == name
    assert re.fullmatch(r'\d+\.\d+\.\d+', claude['version'])
    assert codex['skills'] == './skills/'


@pytest.mark.parametrize('name', PLUGIN_SKILLS)
def test_copied_plugin_is_self_contained(name: str, tmp_path: Path) -> None:
    """Resolve packaged skills and references without access to the source tree."""
    original = REPO / 'plugins' / name
    # Disallow links that could hide dependencies on a mutable source checkout.
    assert not any(path.is_symlink() for path in original.rglob('*'))
    installed = tmp_path / name
    shutil.copytree(original, installed)
    skills = list((installed / 'skills').glob('*/SKILL.md'))
    assert {skill.parent.name for skill in skills} == PLUGIN_SKILLS[name]
    assert not any(
        path.name in {'evals', 'evals.json', 'manifest.json'}
        for path in installed.rglob('*')
    )
    for document in installed.rglob('*.md'):
        for target in re.findall(
            r'\[[^\]]*\]\(([^)]+)\)', document.read_text(encoding='utf-8')
        ):
            if target.startswith(('https://', 'http://', '#')):
                continue
            resource = (document.parent / target.split('#', 1)[0]).resolve()
            assert resource.is_relative_to(installed), (document, target)
            assert resource.exists(), (document, target)
