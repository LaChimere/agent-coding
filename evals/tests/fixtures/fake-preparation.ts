import { cp, mkdir, readdir, stat, symlink, unlink } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

interface IRequest {
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}

const send = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);
const {
  CODEX_HOME: codexHome,
  HOME: home,
  PATH: searchPath,
  TEST_FAKE_MODE: fakeMode,
  TEST_SECRET: secret,
  TMPDIR: temporary,
} = process.env;
if (home === undefined || codexHome === undefined) {
  throw new Error('Missing isolated home');
}
const config = Bun.TOML.parse(await Bun.file(resolve(codexHome, 'config.toml')).text()) as Record<
  string,
  unknown
>;
const { shell_environment_policy: shellPolicy } = config;
const { set: environmentOverrides } = (shellPolicy ?? {}) as { set?: Record<string, unknown> };
const { PATH: configuredPath } = environmentOverrides ?? {};
// Native Codex adds internal launchers unless the shell policy explicitly sets PATH.
const effectiveSearchPath =
  typeof configuredPath === 'string' ? configuredPath : `/native/internal:${searchPath ?? ''}`;
const installedPlugins: {
  name: string;
  version: string;
  root: string;
  source: string;
  enabled: boolean;
}[] = [];
const disabledSystemSkills = new Set<string>();

const contains = (root: string, path: string) => {
  const difference = relative(root, path);
  return difference === '' || (difference !== '..' && !difference.startsWith(`..${sep}`));
};

const readMarketplace = async (path: string) => {
  const marketplace = (await Bun.file(path).json()) as {
    name: string;
    plugins: { name: string; source: { path: string } }[];
  };
  return marketplace;
};

const listSkillFiles = async () => {
  const skills: Record<string, unknown>[] = [];
  const standaloneRoot = resolve(home, '.agents/skills');
  if (
    await stat(standaloneRoot)
      .then((info) => info.isDirectory())
      .catch(() => false)
  ) {
    for (const name of (await readdir(standaloneRoot)).sort()) {
      skills.push({
        name,
        path: resolve(standaloneRoot, name, 'SKILL.md'),
        scope: 'user',
        enabled: true,
        pluginId: null,
      });
    }
  }

  for (const plugin of installedPlugins) {
    if (!plugin.enabled) {
      continue;
    }
    for await (const path of new Bun.Glob('*/SKILL.md').scan(resolve(plugin.root, 'skills'))) {
      const skillName = path.split('/')[0];
      skills.push({
        name: `${plugin.name}:${skillName}`,
        path: resolve(plugin.root, 'skills', path),
        scope: 'user',
        enabled: true,
        pluginId: `${plugin.name}@fixture-marketplace`,
      });
    }
  }

  const systemPath = resolve(codexHome, 'skills/.system/fake/SKILL.md');
  skills.push({
    name: 'fake-system',
    path: systemPath,
    scope: 'system',
    enabled: !disabledSystemSkills.has(systemPath),
    pluginId: null,
  });

  if (fakeMode === 'extra-skill') {
    skills.push({
      name: 'undeclared',
      path: resolve(home, '.agents/skills/undeclared/SKILL.md'),
      scope: 'user',
      enabled: true,
      pluginId: null,
    });
  }

  return skills;
};

const commandResult = async (command: string[], profile: string) => {
  const { permissions } = config as {
    permissions: Record<
      string,
      { filesystem: Record<string, string>; network: { enabled: boolean } }
    >;
  };

  const selected = permissions[profile];
  if (selected === undefined) {
    throw new Error('Unknown fixture permission profile');
  }

  const access = (path: string) =>
    Object.entries(selected.filesystem)
      .map(
        ([root, mode]) =>
          [root === ':tmpdir' ? temporary : root === ':root' ? '/' : root, mode] as const,
      )
      .filter(
        (entry): entry is readonly [string, string] =>
          typeof entry[0] === 'string' && entry[0].startsWith('/') && contains(entry[0], path),
      )
      .sort((left, right) => right[0].length - left[0].length)[0]?.[1];

  const [program, ...args] = command;
  if (program === '/bin/cat') {
    const path = args[0];
    if (path === undefined) {
      return {
        exitCode: 2,
        stdout: '',
        stderr: 'missing path',
      };
    }

    const allowed = access(path) === 'write' || access(path) === 'read';
    if (!allowed) {
      if (fakeMode === 'private-readable') {
        return { exitCode: 0, stdout: await Bun.file(path).text(), stderr: '' };
      }
      if (fakeMode === 'private-missing') {
        await unlink(path);
      }
      if (fakeMode === 'private-changed') {
        await Bun.write(path, 'changed');
      }
      if (fakeMode === 'private-symlink') {
        await unlink(path);
        await symlink(resolve(home, '.codex/AGENTS.md'), path);
      }
      return {
        exitCode: fakeMode === 'private-launcher-failure' ? 127 : 1,
        stdout: fakeMode === 'private-output-leak' ? await Bun.file(path).text() : '',
        stderr:
          fakeMode === 'private-unrelated-failure'
            ? 'unrelated command failure'
            : fakeMode?.startsWith('private-') || fakeMode?.startsWith('linux-')
              ? `cat: ${path}: No such file or directory\n`
              : 'sandbox denied',
      };
    }

    return {
      exitCode: 0,
      stdout: await Bun.file(path).text(),
      stderr: '',
    };
  }
  if (program === '/usr/bin/curl') {
    const url = args.at(-1);
    if (!selected.network.enabled || url === undefined) {
      return {
        exitCode: fakeMode === 'network-launcher-failure' ? 127 : 7,
        stdout: '',
        stderr: 'network denied',
      };
    }
    return {
      exitCode: 0,
      stdout: await (await fetch(url)).text(),
      stderr: '',
    };
  }
  if (program === '/bin/sh') {
    const path = args[3];
    const value = args[4];
    const started = args[5];
    if (path === undefined || value === undefined) {
      throw new Error('Invalid write probe');
    }
    if (fakeMode === 'write-launcher-failure') {
      return { exitCode: 1, stdout: '', stderr: 'No such file or directory' };
    }
    const privatePath = access(path) === 'deny';
    if (
      privatePath &&
      (fakeMode === 'linux-shadow' || fakeMode === 'private-shadow-missing-readback')
    ) {
      return {
        exitCode: 0,
        stdout: `${started}${fakeMode === 'linux-shadow' ? value : ''}`,
        stderr: '',
      };
    }
    if (
      access(path) !== 'write' &&
      fakeMode !== 'outside-write-escape' &&
      !(privatePath && fakeMode === 'private-shadow-host-escape')
    ) {
      return {
        exitCode: fakeMode === 'linux-masked' ? 2 : 1,
        stdout: started,
        stderr: fakeMode === 'linux-masked' ? 'No such file or directory' : 'sandbox denied',
      };
    }
    await Bun.write(path, value);

    return {
      exitCode: 0,
      stdout: args[1]?.includes('/bin/cat') ? `${started}${value}` : started,
      stderr: '',
    };
  }
  if (program === '/usr/bin/printenv') {
    return {
      exitCode: 0,
      stdout: `${effectiveSearchPath}\n`,
      stderr: '',
    };
  }
  if (program === '/usr/bin/which') {
    const name = args[0];
    if (name === undefined) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: '',
      };
    }

    for (const directory of effectiveSearchPath.split(':')) {
      const path = resolve(directory, name);
      if (await Bun.file(path).exists()) {
        return {
          exitCode: 0,
          stdout: `${path}\n`,
          stderr: '',
        };
      }
    }

    return {
      exitCode: 1,
      stdout: '',
      stderr: '',
    };
  }

  return {
    exitCode: 127,
    stdout: '',
    stderr: `unsupported ${String(program)}`,
  };
};

for await (const line of console) {
  if (line.trim().length === 0) {
    continue;
  }

  const request = JSON.parse(line) as IRequest;
  if (request.id === undefined) {
    continue;
  }

  const reply = (result: unknown) => send({ id: request.id, result });
  const params = request.params ?? {};

  switch (request.method) {
    case 'initialize':
      reply({ userAgent: 'fake-preparation/0.154.0', secretEcho: secret });
      break;
    case 'marketplace/add': {
      const { source } = params;
      if (typeof source !== 'string') {
        throw new Error('Missing marketplace source');
      }

      const marketplace = await readMarketplace(
        resolve(source, '.agents/plugins/marketplace.json'),
      );
      reply({
        marketplaceName: marketplace.name,
        installedRoot: source,
        alreadyAdded: false,
      });

      break;
    }
    case 'plugin/install': {
      const { marketplacePath, pluginName } = params;
      if (typeof marketplacePath !== 'string' || typeof pluginName !== 'string') {
        throw new Error('Invalid plugin install');
      }

      const marketplace = await readMarketplace(marketplacePath);
      const entry = marketplace.plugins.find((plugin) => plugin.name === pluginName);
      if (entry === undefined) {
        throw new Error('Unknown plugin');
      }

      const source = resolve(marketplacePath, '../../..', entry.source.path);
      const manifest = (await Bun.file(resolve(source, '.codex-plugin/plugin.json')).json()) as {
        version: string;
      };

      const root = resolve(
        codexHome,
        'plugins/cache',
        marketplace.name,
        pluginName,
        manifest.version,
      );

      await mkdir(resolve(root, '..'), { recursive: true });
      await cp(source, root, {
        recursive: true,
        force: false,
        errorOnExist: true,
      });

      installedPlugins.push({
        name: pluginName,
        version: manifest.version,
        root,
        source,
        enabled: true,
      });

      reply({ authPolicy: 'ON_INSTALL', appsNeedingAuth: [] });
      break;
    }
    case 'skills/list': {
      const { cwds } = params;
      reply({
        data: [
          {
            cwd: Array.isArray(cwds) ? cwds[0] : undefined,
            skills: await listSkillFiles(),
            errors: [],
          },
        ],
      });
      break;
    }
    case 'skills/config/write': {
      const { path } = params;
      if (typeof path !== 'string') {
        throw new Error('Missing system skill path');
      }
      disabledSystemSkills.add(path);
      reply({});
      break;
    }
    case 'plugin/installed':
      if (fakeMode === 'extra-plugin') {
        reply({
          marketplaces: [
            {
              name: 'fixture-marketplace',
              plugins: [{ id: 'unexpected@fixture-marketplace', installed: true }],
            },
          ],
          marketplaceLoadErrors: [],
        });
        break;
      }
      reply({
        marketplaces: [
          {
            name: 'fixture-marketplace',
            path: resolve(
              installedPlugins[0]?.source ?? '',
              '../../.agents/plugins/marketplace.json',
            ),
            plugins: installedPlugins.map((plugin) => ({
              id: `${plugin.name}@fixture-marketplace`,
              name: plugin.name,
              localVersion: plugin.version,
              installed: true,
              enabled: plugin.enabled,
              source: { type: 'local', path: plugin.source },
            })),
          },
        ],
        marketplaceLoadErrors: [],
      });
      break;
    case 'config/value/write': {
      const { keyPath, value } = params;
      if (typeof keyPath !== 'string' || typeof value !== 'boolean') {
        throw new Error('Invalid config update');
      }

      const id = keyPath.slice('plugins.'.length, -'.enabled'.length);
      const pluginId: unknown = JSON.parse(id);
      const plugin = installedPlugins.find(
        (item) => `${item.name}@fixture-marketplace` === pluginId,
      );
      if (plugin === undefined) {
        throw new Error('Unknown plugin activation');
      }
      plugin.enabled = value;
      reply({});
      break;
    }
    case 'config/read':
      reply({ config, layers: [{ config }] });
      break;
    case 'command/exec': {
      const { command, permissionProfile } = params;
      if (!Array.isArray(command) || !command.every((part) => typeof part === 'string')) {
        throw new Error('Invalid command probe');
      }
      if (typeof permissionProfile !== 'string') {
        throw new Error('Missing selected profile');
      }
      reply(await commandResult(command, permissionProfile));
      break;
    }
    case 'thread/start': {
      const { permissions } = params;
      reply({
        thread: { id: 'prepared-thread' },
        model: 'fixture-model',
        modelProvider: 'fixture-provider',
        reasoningEffort: 'high',
        activePermissionProfile: { id: permissions, parent: ':workspace' },
      });
      break;
    }
    default:
      send({ id: request.id, error: { code: -32601, message: `Unknown ${request.method}` } });
  }
}

if (fakeMode === 'bad-close') {
  process.stdout.write('{malformed final event}\n');
}
