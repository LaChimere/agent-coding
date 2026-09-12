import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, readdir, rm, stat, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prepareNativeTrial } from '../../src/preparation/native.ts';

const roots: string[] = [];

interface IFixture {
  root: string;
  directory: string;
  runtimeDirectory: string;
  profileDirectory: string;
  codexExecutable: string;
}

async function write(path: string, content: string, mode?: number): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true });
  await Bun.write(path, content);
  if (mode !== undefined) {
    await chmod(path, mode);
  }
}

async function fixture(options: { sandbox?: string } = {}): Promise<IFixture> {
  const root = await mkdtemp(resolve('.cache/native-preparation-test-'));
  roots.push(root);
  const directory = resolve(root, 'trial');
  const runtimeDirectory = resolve(root, 'runtime');
  const profileDirectory = resolve(root, 'profile');
  await Promise.all([
    mkdir(resolve(directory, 'workspace/bin'), { recursive: true }),
    mkdir(resolve(runtimeDirectory, 'skills/example'), { recursive: true }),
    mkdir(resolve(runtimeDirectory, 'plugins/review/skills/reviewer'), { recursive: true }),
    mkdir(resolve(runtimeDirectory, 'config/codex/agents'), { recursive: true }),
    mkdir(resolve(runtimeDirectory, '.agents/plugins'), { recursive: true }),
    mkdir(resolve(profileDirectory, 'agents'), { recursive: true }),
  ]);

  await write(
    resolve(profileDirectory, 'config.toml'),
    [
      'model = "fixture-model"',
      'model_provider = "fixture-provider"',
      'sandbox_mode = "workspace-write"',
      '',
      '[model_providers.fixture-provider]',
      'name = "Fixture"',
      'base_url = "http://127.0.0.1:4141/v1"',
      'env_key = "TEST_SECRET"',
      'wire_api = "responses"',
      '',
    ].join('\n'),
  );

  await write(resolve(profileDirectory, 'AGENTS.md'), 'stale baseline agents\n');
  await write(resolve(profileDirectory, 'agents/stale.toml'), 'sandbox_mode = "read-only"\n');
  await write(
    resolve(runtimeDirectory, 'config/codex/config.toml'),
    `sandbox_mode = "${options.sandbox ?? 'workspace-write'}"\n`,
  );

  await write(resolve(runtimeDirectory, 'config/codex/AGENTS.md'), 'candidate agents\n');
  await write(
    resolve(runtimeDirectory, 'config/codex/agents/worker.toml'),
    'model = "fixture-worker"\nsandbox_mode = "read-only"\n',
  );

  await write(
    resolve(runtimeDirectory, 'skills/example/SKILL.md'),
    '---\nname: example\ndescription: Example.\n---\n',
  );

  await write(
    resolve(runtimeDirectory, 'plugins/review/.codex-plugin/plugin.json'),
    '{"name":"review","version":"1.2.3","skills":"./skills/"}\n',
  );

  await write(
    resolve(runtimeDirectory, 'plugins/review/skills/reviewer/SKILL.md'),
    '---\nname: reviewer\ndescription: Review.\n---\n',
  );

  await write(
    resolve(runtimeDirectory, '.agents/plugins/marketplace.json'),
    JSON.stringify({
      name: 'fixture-marketplace',
      plugins: [
        {
          name: 'review',
          source: { source: 'local', path: './plugins/review' },
          policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
        },
      ],
    }),
  );

  await write(resolve(directory, 'workspace/bin/trivy'), '#!/bin/sh\necho fixture\n', 0o755);
  const launcher = resolve(root, 'fake-codex');
  await write(
    launcher,
    `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(`${import.meta.dir}/../fixtures/fake-preparation.ts`)} "$@"\n`,
    0o755,
  );

  const codexExecutable = resolve(root, 'codex-link');
  await symlink(launcher, codexExecutable);

  return {
    root,
    directory,
    runtimeDirectory,
    profileDirectory,
    codexExecutable,
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('prepares an isolated native thread and records verified repository capabilities', async () => {
  const input = await fixture();

  const result = await prepareNativeTrial({
    ...input,
    credentials: Object.fromEntries([['TEST_SECRET', 'do-not-persist']]),
    networkAccess: false,
    pathPrepend: ['bin'],
    executableFiles: ['bin/trivy'],
  });

  expect(result.status).toBe('ready');
  if (result.status !== 'ready') {
    throw new Error(result.reason);
  }

  expect(result.thread).toMatchObject({
    id: 'prepared-thread',
    model: 'fixture-model',
    reasoningEffort: 'high',
  });

  const codexHome = result.codexHome;
  const derived = Bun.TOML.parse(
    await Bun.file(resolve(codexHome, 'config.toml')).text(),
  ) as Record<string, unknown>;

  expect(derived).not.toHaveProperty('sandbox_mode');
  const { default_permissions: defaultPermissions, permissions, web_search: webSearch } = derived;

  expect(defaultPermissions).toBe('eval');
  expect(webSearch).toBe('disabled');
  expect(permissions).toMatchObject({ eval: { network: { enabled: false } } });
  expect(await Bun.file(resolve(codexHome, 'AGENTS.md')).text()).toBe('candidate agents\n');
  expect(await readdir(resolve(codexHome, 'agents'))).toEqual(['worker.toml']);
  expect(await Bun.file(resolve(codexHome, 'agents/worker.toml')).text()).toContain(
    'default_permissions = "eval-read-only"',
  );
  const evidence = await Bun.file(result.evidencePath).text();
  const protocol = await Bun.file(result.protocolPath).text();

  expect(evidence).toContain('<credential-redacted>');
  expect(evidence).not.toContain('do-not-persist');
  expect(protocol).toContain('<credential-redacted>');
  expect(protocol).not.toContain('do-not-persist');
  expect(evidence).toContain('skill:example');
  expect(evidence).toContain('plugin:review');
  expect(evidence).toContain(input.codexExecutable);
  expect(evidence).toContain(resolve(input.root, 'fake-codex'));
  const finalized = result.finalize();

  expect(result.finalize()).toBe(finalized);
  await finalized;
  const originalProtocol = await Bun.file(result.protocolPath).text();

  await expect(
    prepareNativeTrial({
      ...input,
      credentials: {},
      networkAccess: false,
    }),
  ).rejects.toThrow();

  expect(await Bun.file(result.protocolPath).text()).toBe(originalProtocol);
});

test('refuses before a model turn when discovery exposes an undeclared capability', async () => {
  const input = await fixture();

  const result = await prepareNativeTrial({
    ...input,
    credentials: Object.fromEntries([
      ['TEST_SECRET', 'hidden-secret'],
      ['TEST_FAKE_MODE', 'extra-skill'],
    ]),
    networkAccess: false,
  });

  expect(result).toMatchObject({ status: 'not-run' });
  if (result.status !== 'not-run') {
    throw new Error('Expected not-run');
  }

  expect(result.reason).toContain('Undeclared enabled skill');
  const evidence = await Bun.file(result.evidencePath).text();

  expect(evidence).toContain('"status": "not-run"');
  expect(evidence).not.toContain('hidden-secret');
  expect(evidence).not.toContain('prepared-thread');
});

test('rejects unsupported permission modes before starting Codex', async () => {
  const input = await fixture({ sandbox: 'danger-full-access' });

  const result = await prepareNativeTrial({
    ...input,
    credentials: Object.fromEntries([['TEST_SECRET', 'hidden-secret']]),
    networkAccess: false,
  });

  expect(result).toMatchObject({
    status: 'not-run',
    reason: 'Only workspace-write and read-only sandbox modes are supported.',
  });

  expect(await Bun.file(resolve(input.directory, 'native/protocol.jsonl')).text()).toBe('');
});

test('refuses unapproved credential destinations and external configuration before launch', async () => {
  const cases = [
    {
      path: 'config/codex/config.toml',
      content: '[model_providers.fixture-provider]\nbase_url="https://unapproved.invalid/v1"\n',
      reason: 'outside the approved profile origin',
    },
    {
      path: 'config/codex/config.toml',
      content: 'model_instructions_file="/outside/instructions.md"\n',
      reason: 'model_instructions_file',
    },
    {
      path: 'plugins/review/.mcp.json',
      content: '{}',
      reason: 'unqualified execution dependency',
    },
  ];
  for (const item of cases) {
    const input = await fixture();
    await write(resolve(input.runtimeDirectory, item.path), item.content);

    const result = await prepareNativeTrial({
      ...input,
      credentials: Object.fromEntries([['TEST_SECRET', 'private-credential']]),
      networkAccess: false,
    });

    expect(result.status).toBe('not-run');
    if (result.status !== 'not-run') {
      throw new Error('Expected refusal');
    }

    expect(result.reason).toContain(item.reason);
    expect(await Bun.file(resolve(input.directory, 'native/protocol.jsonl')).text()).toBe('');
  }
});

test('preserves disabled candidate features and plugin activation with an empty role replacement', async () => {
  const input = await fixture({ sandbox: 'read-only' });
  await rm(resolve(input.runtimeDirectory, 'config/codex/agents/worker.toml'));
  await Bun.write(
    resolve(input.runtimeDirectory, 'config/codex/config.toml'),
    'sandbox_mode="read-only"\n[features]\nprevent_idle_sleep=false\n[plugins."review@fixture-marketplace"]\nenabled=false\n',
  );

  const result = await prepareNativeTrial({
    ...input,
    credentials: {},
    networkAccess: true,
  });

  if (result.status !== 'ready') {
    throw new Error(result.reason);
  }

  try {
    const config = Bun.TOML.parse(await Bun.file(resolve(result.codexHome, 'config.toml')).text());

    expect(config).toMatchObject(
      Bun.TOML.parse('[features]\nprevent_idle_sleep=false\nmemories=false'),
    );
    expect(await readdir(resolve(result.codexHome, 'agents'))).toEqual([]);
    const evidence = await Bun.file(result.evidencePath).json();

    expect(evidence.discovery.plugins.marketplaces[0].plugins[0].enabled).toBeFalse();
    expect(evidence.probes.network.observedRequests).toBe(1);
    expect(evidence.probes.writes.workspace.exitCode).toBe(1);
    expect(evidence.probes.writes.temporary.exitCode).toBe(1);
  } finally {
    await result.finalize();
  }
});

test('keeps fixture executable restoration independent of PATH precedence', async () => {
  const input = await fixture();
  await write(resolve(input.directory, 'workspace/direct.sh'), '#!/bin/sh\nexit 0\n', 0o644);

  const result = await prepareNativeTrial({
    ...input,
    credentials: {},
    networkAccess: false,
    executableFiles: ['direct.sh'],
  });

  if (result.status !== 'ready') {
    throw new Error(result.reason);
  }

  try {
    expect(await Bun.file(result.evidencePath).text()).toContain(
      'Restored declared executable mode: direct.sh',
    );
  } finally {
    await result.finalize();
  }
});

test('refuses executable symlinks without modifying an external target', async () => {
  for (const ancestor of [false, true]) {
    const input = await fixture();
    const outside = resolve(input.root, 'private/tool');
    await write(outside, '#!/bin/sh\nexit 0\n', 0o640);
    await symlink(
      ancestor ? resolve(input.root, 'private') : outside,
      resolve(input.directory, 'workspace/linked'),
    );

    const result = await prepareNativeTrial({
      ...input,
      credentials: {},
      networkAccess: false,
      executableFiles: [ancestor ? 'linked/tool' : 'linked'],
    });

    expect(result.status).toBe('not-run');
    expect((await stat(outside)).mode & 0o777).toBe(0o640);
    expect(await Bun.file(resolve(input.directory, 'native/protocol.jsonl')).text()).toBe('');
  }
});

test('rejects escaped plugin sources before installation and unexpected installed plugins before a turn', async () => {
  const escaped = await fixture();
  const marketplacePath = resolve(escaped.runtimeDirectory, '.agents/plugins/marketplace.json');
  const marketplace = await Bun.file(marketplacePath).json();
  marketplace.plugins[0].source.path = '../outside';
  await Bun.write(marketplacePath, JSON.stringify(marketplace));

  const refusal = await prepareNativeTrial({
    ...escaped,
    credentials: {},
    networkAccess: false,
  });

  expect(refusal.status).toBe('not-run');
  expect(await Bun.file(resolve(escaped.directory, 'native/protocol.jsonl')).text()).toBe('');

  const extra = await fixture();

  const unexpected = await prepareNativeTrial({
    ...extra,
    credentials: Object.fromEntries([['TEST_FAKE_MODE', 'extra-plugin']]),
    networkAccess: false,
  });

  expect(unexpected).toMatchObject({
    status: 'not-run',
    reason: 'Unexpected or duplicate installed plugin.',
  });
});

test('drains protocol evidence before closing the writer and exposes finalization errors', async () => {
  const input = await fixture();

  const result = await prepareNativeTrial({
    ...input,
    credentials: Object.fromEntries([['TEST_FAKE_MODE', 'bad-close']]),
    networkAccess: false,
  });

  if (result.status !== 'ready') {
    throw new Error(result.reason);
  }

  await expect(result.finalize()).rejects.toThrow('Native finalization failed');
  expect(await Bun.file(result.protocolPath).text()).toContain('{malformed final event}');
  expect(await Bun.file(resolve(input.directory, 'native/finalization.json')).json()).toMatchObject(
    { status: 'failed' },
  );
});
