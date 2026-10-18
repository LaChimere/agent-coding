import { expect, test } from 'bun:test';
import { lstat, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { snapshotDirectory } from '../src/preparation/snapshot.ts';

const repository = resolve(import.meta.dir, '../..');
const codexCatalog = (await Bun.file(
  resolve(repository, '.agents/plugins/marketplace.json'),
).json()) as {
  name: string;
  plugins: { name: string; source: { source: string; path: string } }[];
};
const sharedCatalog = (await Bun.file(
  resolve(repository, '.claude-plugin/marketplace.json'),
).json()) as {
  name: string;
  owner: { name: string };
  plugins: { name: string; source: string }[];
};
const pluginNames = codexCatalog.plugins.map((plugin) => plugin.name);

test('Codex and Claude catalogs distribute the same local plugin roots', async () => {
  const directories = await readdir(resolve(repository, 'plugins'), { withFileTypes: true });

  const available = directories
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  expect([...pluginNames].sort()).toEqual(available);
  expect(sharedCatalog.name).toBe(codexCatalog.name);
  expect(sharedCatalog.owner.name.length).toBeGreaterThan(0);
  const codexRoots = Object.fromEntries(
    codexCatalog.plugins.map((plugin) => [plugin.name, plugin.source.path]),
  );
  const sharedRoots = Object.fromEntries(
    sharedCatalog.plugins.map((plugin) => [plugin.name, plugin.source]),
  );

  expect(codexRoots).toEqual(sharedRoots);

  for (const plugin of codexCatalog.plugins) {
    expect(plugin.source.source).toBe('local');
    expect(resolve(repository, plugin.source.path)).toBe(
      resolve(repository, 'plugins', plugin.name),
    );
  }
});

test('the engineering package exposes the complete approved skill set to Pi and native plugins', async () => {
  const root = resolve(repository, 'plugins/engineering');
  const manifest = (await Bun.file(resolve(root, 'package.json')).json()) as {
    version: string;
    files: string[];
    pi: { skills: string[] };
  };
  const native = (await Bun.file(resolve(root, '.codex-plugin/plugin.json')).json()) as {
    version: string;
    skills: string;
  };
  const expected = [
    'code-review',
    'create-verification-skill',
    'design-solution',
    'implement-task',
    'maintain-verification-skill',
    'prevent-recurring-mistakes',
    'release-software',
    'rubber-duck',
    'spar',
    'understand-codebase',
    'verify-behavior',
  ];

  expect(manifest.version).toBe(native.version);
  expect(manifest.pi.skills.map((path) => resolve(root, path))).toEqual([
    resolve(root, native.skills),
  ]);
  expect((await readdir(resolve(root, 'skills'))).sort()).toEqual(expected);
  expect(manifest.files).toContain('skills');
  expect(manifest.files).toContain('references');
  expect(manifest.files).not.toContain('evals');
  await expect(stat(resolve(root, 'references/working-agreement.md'))).resolves.toBeDefined();
});

test('personal Codex configuration retains selected capabilities outside portable method policy', async () => {
  const config = Bun.TOML.parse(
    await Bun.file(resolve(repository, 'config/codex/config.toml')).text(),
  );

  const expected = Bun.TOML.parse(`
sandbox_mode = "workspace-write"
approval_policy = "on-request"
approvals_reviewer = "auto_review"
[sandbox_workspace_write]
network_access = true
[features]
api_key_model_discovery = true
chronicle = false
memories = true
prevent_idle_sleep = true
[features.code_mode]
enabled = true
[agents]
enabled = true
max_concurrent_threads_per_session = 6
default_subagent_model = "gpt-6-luna"
default_subagent_reasoning_effort = "max"
[plugins."engineering@agent-coding"]
enabled = true
`);

  expect(config).toMatchObject(expected);
  expect((await readdir(resolve(repository, 'config/codex/agents'))).sort()).toEqual([
    'complex_worker.toml',
    'critical_reviewer.toml',
    'deep_critical_reviewer.toml',
    'ordinary_worker.toml',
  ]);
});

test('every supported host retains its adapter artifacts', async () => {
  const adapters = {
    codex: ['AGENTS.md', 'config.toml'],
    claude: ['CLAUDE.md'],
    pi: ['AGENTS.md'],
    'grok-bot': ['INSTRUCTIONS.md', 'routines.md'],
    copilot: ['copilot-instructions.md'],
  };
  const root = resolve(repository, 'config');
  const directories = await readdir(root, { withFileTypes: true });

  expect(
    directories
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(),
  ).toEqual(Object.keys(adapters).sort());

  for (const [host, files] of Object.entries(adapters)) {
    for (const file of files) {
      const path = resolve(root, host, file);

      expect((await lstat(path)).isFile(), path).toBeTrue();
      expect((await Bun.file(path).text()).trim().length, path).toBeGreaterThan(0);
    }
  }
});

test.each(pluginNames)(
  'plugin %s retains common native metadata and self-contained resources',
  async (name) => {
    const root = await mkdtemp(resolve('.cache/distribution-test-'));
    try {
      const installed = resolve(root, name);
      const snapshot = await snapshotDirectory(resolve(repository, 'plugins', name), installed, {
        symlinks: 'reject',
      });
      const codex = (await Bun.file(
        resolve(installed, '.codex-plugin/plugin.json'),
      ).json()) as Record<string, unknown>;
      const shared = (await Bun.file(
        resolve(installed, '.claude-plugin/plugin.json'),
      ).json()) as Record<string, unknown>;

      const common = [
        'name',
        'version',
        'description',
        'author',
        'homepage',
        'repository',
        'keywords',
      ];

      expect(Object.keys(shared).sort()).toEqual([...common].sort());
      expect(Object.fromEntries(common.map((key) => [key, codex[key]]))).toEqual(shared);
      const { name: declaredName, version, skills, interface: ui } = codex;

      expect(declaredName).toBe(name);
      expect(version).toMatch(/^\d+\.\d+\.\d+$/u);
      expect(skills).toBe('./skills/');
      const { defaultPrompt } = (ui ?? {}) as { defaultPrompt?: unknown };
      if (defaultPrompt !== undefined) {
        const prompts =
          typeof defaultPrompt === 'string' ? [defaultPrompt] : (defaultPrompt as string[]);

        expect(Array.isArray(prompts)).toBeTrue();
        expect(prompts.length).toBeGreaterThanOrEqual(1);
        expect(prompts.length).toBeLessThanOrEqual(3);
        expect(
          prompts.every(
            (prompt) =>
              typeof prompt === 'string' && prompt.trim().length > 0 && prompt.length <= 128,
          ),
        ).toBeTrue();
      }

      expect(
        snapshot.entries.some((entry) =>
          /(?:^|\/)evals(?:\/|\.json$)|(?:^|\/)manifest\.json$/u.test(entry.path),
        ),
      ).toBeFalse();

      expect(
        snapshot.entries.some((entry) => /^skills\/[^/]+\/SKILL\.md$/u.test(entry.path)),
      ).toBeTrue();

      for (const entry of snapshot.entries) {
        if (entry.kind !== 'file' || !entry.path.endsWith('.md')) {
          continue;
        }
        const document = resolve(installed, entry.path);
        for (const match of (await Bun.file(document).text()).matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
          const target = match[1];
          if (target === undefined || /^(?:https?:\/\/|#)/u.test(target)) {
            continue;
          }

          const resource = resolve(dirname(document), target.split('#')[0] ?? '');
          const difference = relative(installed, resource);

          expect(
            difference === '..' || difference.startsWith(`..${sep}`) || isAbsolute(difference),
          ).toBeFalse();
          await expect(stat(resource)).resolves.toBeDefined();
        }
      }
    } finally {
      await rm(root, { recursive: true });
    }
  },
);

// Prose words that look like skill names but are not; extend deliberately.
const nonSkillCompounds = new Set([
  'double-confirms',
  'evidence-checked',
  'on-demand',
  'project-docs',
  'routing-only',
]);

function proseOf(manifest: Record<string, unknown>): string[] {
  const { description, interface: ui } = manifest;
  const values: unknown[] = [description, ...Object.values((ui ?? {}) as Record<string, unknown>)];
  return values.flat().filter((value): value is string => typeof value === 'string');
}

test.each(pluginNames)('plugin %s manifests reference only existing skills', async (name) => {
  const pluginRoot = resolve(repository, 'plugins', name);
  const codex = (await Bun.file(resolve(pluginRoot, '.codex-plugin/plugin.json')).json()) as Record<
    string,
    unknown
  >;
  const shared = (await Bun.file(
    resolve(pluginRoot, '.claude-plugin/plugin.json'),
  ).json()) as Record<string, unknown>;
  const skillsRoot = resolve(pluginRoot, String(codex['skills']));
  const skills = new Set<string>();

  for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const document = Bun.file(resolve(skillsRoot, entry.name, 'SKILL.md'));

    expect(await document.exists(), `${name}/skills/${entry.name}/SKILL.md`).toBeTrue();
    expect((await document.text()).match(/^name:\s*(\S+)\s*$/mu)?.[1]).toBe(entry.name);
    skills.add(entry.name);
  }

  expect(skills.size).toBeGreaterThan(0);

  for (const prose of [...proseOf(codex), ...proseOf(shared)]) {
    for (const [, sigil, token] of prose.matchAll(/(\$?)\b([a-z0-9]+(?:-[a-z0-9]+)+)\b/gu)) {
      if (token === undefined || (sigil === '' && nonSkillCompounds.has(token))) {
        continue;
      }

      expect([...skills], `manifest reference "${sigil}${token}" in plugin ${name}`).toContain(
        token,
      );
    }
  }
});
