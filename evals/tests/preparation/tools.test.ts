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
