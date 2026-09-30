import { expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveCodexExecutable, resolveRuntimeTools } from '../../src/preparation/tools.ts';

test('uses the explicit Codex reference before PATH and resolves launcher links', async () => {
  const root = await mkdtemp(resolve('.cache/tools-test-'));
  try {
    const link = resolve(root, 'codex');
    await symlink(process.execPath, link);
    await Bun.write(resolve(root, 'runtime.json'), JSON.stringify({ codexExecutable: link }));

    expect(await resolveCodexExecutable(root)).toBe(process.execPath);
    expect(await resolveCodexExecutable(root, process.execPath)).toBe(process.execPath);
    await Bun.write(resolve(root, 'runtime.json'), JSON.stringify({ codexExecutable: 42 }));

    await expect(resolveCodexExecutable(root)).rejects.toThrow('path or command');
    await expect(resolveCodexExecutable(root, 'no-such-eval-codex-binary')).rejects.toThrow(
      'not found',
    );
  } finally {
    await rm(root, { recursive: true });
  }
});

test('resolves declared tools and code roots without inheriting a complete host environment', async () => {
  const root = await mkdtemp(resolve('.cache/tools-test-'));
  try {
    const absent = await resolveRuntimeTools(root);

    expect(absent).toEqual({
      tools: [],
      readPaths: [],
      pathDirectories: [],
    });

    const binary = resolve(root, 'binary');
    await Bun.write(binary, '#!/bin/sh\nexit 0\n');
    await chmod(binary, 0o755);
    const link = resolve(root, 'tool');
    await symlink(binary, link);
    await Bun.write(
      resolve(root, 'runtime.json'),
      JSON.stringify({
        toolReadPaths: [root],
        tools: [
          {
            name: 'example',
            executable: link,
            probe: ['--version'],
          },
        ],
      }),
    );

    const result = await resolveRuntimeTools(root);

    expect(result.tools).toEqual([
      {
        name: 'example',
        executable: link,
        resolvedExecutable: binary,
        probe: ['--version'],
      },
    ]);

    expect(result.pathDirectories).toEqual([root]);
    expect(result.readPaths).toEqual([root, link, binary]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('rejects malformed, missing and ambiguous runtime tools before native launch', async () => {
  const root = await mkdtemp(resolve('.cache/tools-test-'));
  try {
    await mkdir(resolve(root, 'code'));
    const cases = [
      { tools: 'wrong' },
      { toolReadPaths: [true] },
      {
        tools: [
          {
            name: 'bad',
            executable: 'no-such-eval-runtime-tool',
            probe: [],
          },
        ],
      },
      {
        tools: [
          {
            name: 'bad',
            executable: process.execPath,
            probe: [true],
          },
        ],
      },
      {
        tools: Array.from({ length: 2 }, () => ({
          name: 'duplicate',
          executable: process.execPath,
          probe: [],
        })),
      },
    ];
    for (const value of cases) {
      await Bun.write(resolve(root, 'runtime.json'), JSON.stringify(value));

      await expect(resolveRuntimeTools(root)).rejects.toThrow();
    }
  } finally {
    await rm(root, { recursive: true });
  }
});

test('adds only the selected platform dependencies to common tool paths', async () => {
  const root = await mkdtemp(resolve('.cache/tools-test-'));
  try {
    const common = resolve(root, 'common');
    const darwin = resolve(root, 'darwin');
    await mkdir(common);
    await mkdir(darwin);
    await Bun.write(
      resolve(root, 'runtime.json'),
      JSON.stringify({
        toolReadPaths: [common],
        toolReadPathsByPlatform: { darwin: [darwin], linux: ['/not-an-installed-linux-tool'] },
      }),
    );

    const selected = await resolveRuntimeTools(root, 'darwin');

    expect(selected.readPaths).toEqual([common, darwin]);
    expect(selected.tools).toEqual([]);

    await Bun.write(
      resolve(root, 'runtime.json'),
      JSON.stringify({
        toolReadPaths: [common],
        toolReadPathsByPlatform: { darwin: ['/not-an-installed-mac-tool'], linux: [] },
      }),
    );

    expect((await resolveRuntimeTools(root, 'linux')).readPaths).toEqual([common]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('refuses absent platform declarations and malformed dependency maps', async () => {
  const root = await mkdtemp(resolve('.cache/tools-test-'));
  try {
    for (const toolReadPathsByPlatform of [
      {},
      { darwin: [] },
      null,
      [],
      'not-a-map',
      { linux: 'not-an-array' },
      { linux: [42] },
      { linux: [], darwin: [false] },
    ]) {
      await Bun.write(resolve(root, 'runtime.json'), JSON.stringify({ toolReadPathsByPlatform }));

      await expect(resolveRuntimeTools(root, 'linux')).rejects.toThrow('platform');
    }

    await Bun.write(
      resolve(root, 'runtime.json'),
      JSON.stringify({ toolReadPathsByPlatform: { darwin: [], linux: [] } }),
    );

    await expect(resolveRuntimeTools(root, 'win32')).rejects.toThrow('platform');
  } finally {
    await rm(root, { recursive: true });
  }
});

test('preserves symlink launcher layout only for explicitly declared code dependencies', async () => {
  const root = await mkdtemp(resolve('.cache/tools-test-'));
  try {
    const launcherDirectory = resolve(root, 'bin');
    const codeRoot = resolve(root, 'package');
    const executable = resolve(codeRoot, 'bin/entry.js');
    const launcher = resolve(launcherDirectory, 'tool');
    await mkdir(launcherDirectory);
    await mkdir(resolve(codeRoot, 'bin'), { recursive: true });
    await mkdir(resolve(codeRoot, 'lib'));
    await Bun.write(executable, '#!/usr/bin/env node\nrequire("../lib/helper.js")\n');
    await Bun.write(resolve(codeRoot, 'lib/helper.js'), 'console.log("fixture-tool")\n');
    await chmod(executable, 0o755);
    await symlink('../package/bin/entry.js', launcher);
    const tool = { name: 'example', executable: launcher, probe: ['--version'] };
    await Bun.write(resolve(root, 'runtime.json'), JSON.stringify({ tools: [tool] }));

    const legacy = await resolveRuntimeTools(root);

    expect(legacy.readPaths).toEqual([launcher, executable]);

    await Bun.write(
      resolve(root, 'runtime.json'),
      JSON.stringify({ tools: [{ ...tool, codeReadPaths: [] }] }),
    );

    expect((await resolveRuntimeTools(root)).readPaths).toEqual(legacy.readPaths);

    await Bun.write(
      resolve(root, 'runtime.json'),
      JSON.stringify({ tools: [{ ...tool, codeReadPaths: ['..'] }] }),
    );

    const declared = await resolveRuntimeTools(root);

    expect(declared.tools[0]).toMatchObject({
      executable: launcher,
      resolvedExecutable: executable,
    });
    expect(declared.readPaths).toEqual([codeRoot, launcherDirectory]);
    expect(declared.pathDirectories).toEqual([launcherDirectory]);

    await Bun.write(
      resolve(root, 'runtime.json'),
      JSON.stringify({ tools: [{ ...tool, executable, codeReadPaths: ['..'] }] }),
    );

    expect((await resolveRuntimeTools(root)).readPaths).toEqual([codeRoot]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('rejects malformed or missing explicitly declared tool code dependencies', async () => {
  const root = await mkdtemp(resolve('.cache/tools-test-'));
  try {
    for (const codeReadPaths of [null, 'not-an-array', [false], [''], ['/']]) {
      await Bun.write(
        resolve(root, 'runtime.json'),
        JSON.stringify({
          tools: [{ name: 'example', executable: process.execPath, probe: [], codeReadPaths }],
        }),
      );

      await expect(resolveRuntimeTools(root)).rejects.toThrow('codeReadPaths');
    }

    await Bun.write(
      resolve(root, 'runtime.json'),
      JSON.stringify({
        tools: [
          {
            name: 'example',
            executable: process.execPath,
            probe: [],
            codeReadPaths: ['missing-tool-code-fixture-791330'],
          },
        ],
      }),
    );

    await expect(resolveRuntimeTools(root)).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true });
  }
});
