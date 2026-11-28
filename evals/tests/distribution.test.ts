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
const modelInvokedSkills = [
  'code-review',
  'create-verification-skill',
  'design-solution',
  'implement-task',
  'maintain-verification-skill',
  'prevent-recurring-mistakes',
  'release-and-rollout',
  'rubber-duck',
  'spar',
  'understand-codebase',
  'verify-behavior',
];
// D-014: pstack-derived methods are user-invoked.
const userInvokedSkills = [
  'arena',
  'create-formal-verification-skill',
  'figure-it-out',
  'interrogate',
  'maintain-formal-verification-skill',
  'no-comments',
  'optimize-metric',
  'reflect',
  'reframe',
  'resume-work',
  'sharpen',
  'swarm',
  'teach',
  'technical-writing',
  'unslop',
];
// Cursor's pstack setup references these; they mean nothing on the package's hosts.
const cursorOnlyReference =
  /\.cursor\/|\bcursor-team-kit\b|\bpstack-models\b|\bpoteto-mode\b|\bgeneralPurpose\b|\bAskQuestion\b|environment: "cloud"|\bbugbot\b/iu;
// A model slug: a family with a version-bearing suffix, an o-series slug or a bare Claude tier.
const modelSlug =
  /\b(?:claude|gemini|grok|gpt|composer)-(?=[a-z0-9.-]*\d)[a-z0-9][a-z0-9.-]*|\bo[1-9]-(?:mini|pro)\b|\b(?:opus|sonnet|haiku)\b/iu;

// Bun keeps the last of duplicate keys while other hosts' parsers reject them, so reject them here.
function parseUniqueYaml(text: string, label: string): unknown {
  const scopes: { indent: number; keys: Set<string> }[] = [];

  for (const line of text.split('\n')) {
    const match = line.match(/^( *)([\w-]+):/u);

    if (match === null) {
      continue;
    }

    const indent = match[1]?.length ?? 0;
    const key = match[2] ?? '';

    while ((scopes.at(-1)?.indent ?? -1) > indent) {
      scopes.pop();
    }

    if (scopes.at(-1)?.indent !== indent) {
      scopes.push({ indent, keys: new Set() });
    }

    const keys = scopes.at(-1)?.keys;

    if (keys?.has(key)) {
      throw new Error(`${label} repeats the key ${key}`);
    }

    keys?.add(key);
  }

  return Bun.YAML.parse(text);
}

async function skillFrontmatter(skill: string): Promise<Record<string, unknown>> {
  const path = resolve(repository, 'plugins/engineering/skills', skill, 'SKILL.md');
  const block = (await Bun.file(path).text()).match(/^---\n([\s\S]*?)\n---\n/u)?.[1];

  if (block === undefined) {
    throw new Error(`${skill}/SKILL.md has no frontmatter`);
  }

  return parseUniqueYaml(block, `${skill}/SKILL.md`) as Record<string, unknown>;
}

async function codexImplicitInvocation(skill: string): Promise<unknown> {
  const file = Bun.file(
    resolve(repository, 'plugins/engineering/skills', skill, 'agents/openai.yaml'),
  );

  if (!(await file.exists())) {
    return undefined;
  }

  const metadata = parseUniqueYaml(await file.text(), `${skill}/agents/openai.yaml`) as {
    policy?: Record<string, unknown>;
  };

  return metadata.policy?.['allow_implicit_invocation'];
}

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
  const expected = [...modelInvokedSkills, ...userInvokedSkills].sort();

  expect(manifest.version).toBe(native.version);
  expect(manifest.pi.skills.map((path) => resolve(root, path))).toEqual([
    resolve(root, native.skills),
  ]);
  expect((await readdir(resolve(root, 'skills'))).sort()).toEqual(expected);
  expect(manifest.files).toContain('skills');
  expect(manifest.files).toContain('references');
  expect(manifest.files).toContain('.antigravity-plugin');
  expect(manifest.files).toContain('LICENSE');
  expect(manifest.files).not.toContain('evals');
  await expect(stat(resolve(root, 'references/working-agreement.md'))).resolves.toBeDefined();
  expect(await Bun.file(resolve(root, 'LICENSE')).text()).toBe(
    await Bun.file(resolve(repository, 'LICENSE')).text(),
  );
});

test.each(userInvokedSkills)(
  'user-invoked skill %s opts out of model invocation in frontmatter and Codex policy',
  async (skill) => {
    const metadata = await skillFrontmatter(skill);
    const implicitInvocation = await codexImplicitInvocation(skill);

    expect(metadata['disable-model-invocation']).toBe(true);
    expect(implicitInvocation).toBe(false);
  },
);

test.each(modelInvokedSkills)(
  'lifecycle skill %s keeps model invocation enabled',
  async (skill) => {
    const metadata = await skillFrontmatter(skill);
    const implicitInvocation = await codexImplicitInvocation(skill);

    expect(metadata['disable-model-invocation'] ?? false).toBe(false);
    expect(implicitInvocation ?? true).toBe(true);
  },
);

test.each([
  '~/.cursor/rules/pstack-models.mdc',
  'install cursor-team-kit',
  'subagent_type: "generalPurpose"',
  'call AskQuestion first',
  'environment: "cloud"',
  'wait for BugBot',
  'follow poteto-mode',
])('the Cursor-only guard flags %p', (text) => {
  expect(cursorOnlyReference.test(text)).toBeTrue();
});

test.each([
  'claude-opus-4-5',
  'claude-4.5-sonnet',
  'gemini-2.5-pro',
  'gpt-5',
  'gpt-5.1-codex',
  'grok-4',
  'grok-code-fast-1',
  'composer-1',
  'o3-mini',
  'Sonnet',
])('the model-slug guard flags %p', (text) => {
  expect(modelSlug.test(text)).toBeTrue();
});

test.each([
  'Claude Code',
  '.claude-plugin/plugin.json',
  'claude-code',
  'Grok Bot',
  'grok-bot',
  'gemini-cli',
  'move the cursor',
  'the pstack `statechart` skill',
])('the Cursor-only and model-slug guards allow %p', (text) => {
  expect(cursorOnlyReference.test(text)).toBeFalse();
  expect(modelSlug.test(text)).toBeFalse();
});

test('the engineering package names no Cursor-only resources or model slugs', async () => {
  const root = resolve(repository, 'plugins/engineering');
  const offenders: string[] = [];

  for await (const path of new Bun.Glob('**/*').scan({ cwd: root, dot: true })) {
    const text = await Bun.file(resolve(root, path)).text();

    if (cursorOnlyReference.test(text) || modelSlug.test(text)) {
      offenders.push(path);
    }
  }

  expect(offenders).toEqual([]);
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
    antigravity: ['AGENTS.md', 'hooks.json', 'hooks/git-guard.py', 'plugins.json'],
    codex: ['AGENTS.md', 'config.toml'],
    claude: ['CLAUDE.md', 'agents/reviewer.md', 'settings.json', 'hooks/git-guard.py'],
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

  expect((await readdir(resolve(root, 'antigravity/hooks'))).sort()).toEqual(['git-guard.py']);
  expect((await readdir(resolve(root, 'claude/agents'))).sort()).toEqual(['reviewer.md']);
  expect((await readdir(resolve(root, 'claude/hooks'))).sort()).toEqual(['git-guard.py']);
});

test('Antigravity JSON adapter configs declare valid hook and plugin entries', async () => {
  const root = resolve(repository, 'config/antigravity');
  const hooks = (await Bun.file(resolve(root, 'hooks.json')).json()) as Record<
    string,
    Record<string, { matcher?: string; hooks?: { type?: string; command?: string }[] }[]>
  >;
  const plugins = (await Bun.file(resolve(root, 'plugins.json')).json()) as {
    entries?: Record<string, unknown>[];
  };

  const preToolUse = hooks['git-guard']?.['PreToolUse'];
  expect(preToolUse).toBeDefined();
  expect(preToolUse?.length).toBe(1);
  expect(preToolUse?.[0]?.matcher).toBe('run_command');
  expect(preToolUse?.[0]?.hooks).toEqual([
    {
      type: 'command',
      command: 'python3 -I ./hooks/git-guard.py',
    },
  ]);

  expect(plugins.entries?.length).toBe(1);
  expect(plugins.entries?.[0]?.['path']).toBe('/absolute/path/to/agent-coding/plugins');
  expect(plugins.entries?.[0]?.['include_only']).toEqual(['engineering']);
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
      const antigravity = (await Bun.file(
        resolve(installed, '.antigravity-plugin/plugin.json'),
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
      const antigravityCommon = [
        'name',
        'version',
        'description',
        'author',
        'homepage',
        'repository',
      ];

      expect(Object.keys(shared).sort()).toEqual([...common].sort());
      expect(Object.fromEntries(common.map((key) => [key, codex[key]]))).toEqual(shared);
      expect(Object.keys(antigravity).sort()).toEqual([...antigravityCommon].sort());
      expect(Object.fromEntries(antigravityCommon.map((key) => [key, shared[key]]))).toEqual(
        antigravity,
      );
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
  const antigravity = (await Bun.file(
    resolve(pluginRoot, '.antigravity-plugin/plugin.json'),
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

  for (const prose of [...proseOf(codex), ...proseOf(shared), ...proseOf(antigravity)]) {
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
