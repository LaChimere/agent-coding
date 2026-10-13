import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { withoutInheritedGitEnvironment } from '../../src/preparation/git.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function run(
  command: readonly [string, ...string[]],
  environment: Readonly<Record<string, string | undefined>>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const child = Bun.spawn({
    cmd: [...command],
    cwd: process.cwd(),
    env: { ...environment },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { exitCode, stdout, stderr };
}

test('removes every inherited GIT_ variable and keeps other entries', () => {
  const source: Record<string, string | undefined> = Object.fromEntries([
    ['GIT_DIR', '/caller/.git'],
    ['GIT_WORK_TREE', '/caller'],
    ['GIT_INDEX_FILE', '/caller/.git/index'],
    ['HOME', '/home/user'],
    ['PATH', '/usr/bin'],
    ['UNSET', undefined],
  ]);

  const result = withoutInheritedGitEnvironment(source);

  expect(result).toEqual(
    Object.fromEntries([
      ['HOME', '/home/user'],
      ['PATH', '/usr/bin'],
    ]),
  );
});

test('fixture-based tests pass under inherited GIT_DIR and GIT_WORK_TREE without touching the caller repository', async () => {
  const root = await mkdtemp(resolve('.cache/git-environment-test-'));
  roots.push(root);
  const clean = withoutInheritedGitEnvironment(process.env);
  const initialized = await run(['git', 'init', '--quiet', root], clean);
  expect(initialized.exitCode).toBe(0);
  const caller = {
    ...clean,
    ...Object.fromEntries([
      ['GIT_DIR', resolve(root, '.git')],
      ['GIT_WORK_TREE', root],
      ['GIT_INDEX_FILE', resolve(root, '.git', 'index')],
    ]),
  };

  const nested = await run(
    [
      process.execPath,
      'test',
      '--isolate',
      'tests/preparation/git.test.ts',
      'tests/preparation/native.test.ts',
    ],
    caller,
  );

  expect(nested.exitCode, nested.stderr).toBe(0);
  const head = await run(['git', '-C', root, 'rev-parse', '--verify', '--quiet', 'HEAD'], clean);
  expect(head.exitCode).not.toBe(0);
  const status = await run(['git', '-C', root, 'status', '--porcelain=v1'], clean);
  expect(status.stdout).toBe('');
}, 120_000);
