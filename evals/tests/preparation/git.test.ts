import { afterEach, expect, test } from 'bun:test';
import { chmod, lstat, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { type FixtureGitEvidence, initializeFixtureGit } from '../../src/preparation/git.ts';

const roots: string[] = [];

async function fixture(): Promise<{ root: string; workspace: string }> {
  const root = await mkdtemp(resolve('.cache/git-preparation-test-'));
  roots.push(root);
  const workspace = resolve(root, 'workspace');
  await mkdir(workspace);
  return { root, workspace };
}

async function write(path: string, content: string, mode?: number): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, content);
  if (mode !== undefined) {
    await chmod(path, mode);
  }
}

async function actualGit(
  command: readonly [string, ...string[]],
  environmentOverrides?: Readonly<Record<string, string>>,
) {
  const child = Bun.spawn({
    cmd: [...command],
    cwd: process.cwd(),
    env: { ...process.env, ...environmentOverrides },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { command, exitCode, stdout, stderr };
}

async function gitOutput(workspace: string, ...args: string[]): Promise<string> {
  const evidence = await actualGit(['git', '-C', workspace, ...args]);
  if (evidence.exitCode !== 0) {
    throw new Error(`Git inspection failed: ${evidence.stderr}`);
  }
  return evidence.stdout;
}

function environmentValue(
  environment: Readonly<Record<string, string>>,
  name: string,
): string | undefined {
  return environment[name];
}

function baseline(evidence: FixtureGitEvidence) {
  if (!('baseline' in evidence)) {
    throw new Error('Expected explicit Git baseline evidence.');
  }
  return evidence.baseline;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('omitting baseline files preserves the git-init-only call and result', async () => {
  const { workspace } = await fixture();
  await write(resolve(workspace, 'src/existing.ts'), 'export const existing = true;\n');
  let returned: Awaited<ReturnType<typeof actualGit>> | undefined;
  const calls: { command: readonly string[]; overrides?: Readonly<Record<string, string>> }[] = [];

  const evidence = await initializeFixtureGit({
    workspace,
    run: async (command, overrides) => {
      calls.push({ command, ...(overrides === undefined ? {} : { overrides }) });
      returned = await actualGit(command, overrides);
      return returned;
    },
  });

  if (returned === undefined) {
    throw new Error('The Git runner did not return initialization evidence.');
  }
  expect(evidence).toBe(returned);
  expect(calls).toEqual([
    {
      command: ['git', '-c', 'init.templateDir=', 'init', '--quiet', workspace],
    },
  ]);
  expect(await gitOutput(workspace, 'status', '--short', '--untracked-files=all')).toBe(
    '?? src/existing.ts\n',
  );
  expect(
    (await actualGit(['git', '-C', workspace, 'rev-parse', '--verify', 'HEAD'])).exitCode,
  ).not.toBe(0);
});

test('commits every declared baseline file and proves a clean tracked worktree', async () => {
  const { workspace } = await fixture();
  await write(resolve(workspace, 'src/existing.ts'), 'export const existing = true;\n');
  await write(resolve(workspace, 'README.md'), 'fixture\n');
  const overridesSeen: Readonly<Record<string, string>>[] = [];

  const evidence = await initializeFixtureGit({
    workspace,
    baselineFiles: ['README.md', 'src/existing.ts'],
    run: async (command, overrides) => {
      if (overrides !== undefined) {
        overridesSeen.push(overrides);
      }
      return await actualGit(command, overrides);
    },
  });
  const observed = baseline(evidence);

  expect(observed.files).toEqual(['README.md', 'src/existing.ts']);
  expect(observed.commit).toMatch(/^(?:[a-f\d]{40}|[a-f\d]{64})$/u);
  expect(observed.tree).toMatch(/^(?:[a-f\d]{40}|[a-f\d]{64})$/u);
  expect(observed.observed).toEqual({
    head: observed.commit,
    tree: observed.tree,
    trackedFiles: ['README.md', 'src/existing.ts'],
    untrackedFiles: [],
    trackedWorktreeClean: true,
  });
  const addCommand = observed.commands.find(({ command }) => command.includes('add'))?.command;
  if (addCommand === undefined) {
    throw new Error('The explicit baseline did not record a git add command.');
  }
  expect(addCommand.slice(addCommand.indexOf('--') + 1)).toEqual(['README.md', 'src/existing.ts']);
  expect(addCommand).not.toContain('-A');
  expect(addCommand).not.toContain('.');
  expect(await gitOutput(workspace, 'status', '--porcelain=v1', '--untracked-files=all')).toBe('');
  expect(
    await gitOutput(
      workspace,
      'diff-tree',
      '--root',
      '--no-commit-id',
      '--name-only',
      '-r',
      'HEAD',
    ),
  ).toBe('README.md\nsrc/existing.ts\n');
  const commitObject = await gitOutput(workspace, 'cat-file', 'commit', observed.commit);
  expect(commitObject).toContain(
    'author Codex Eval Fixture <codex-eval-fixture@example.invalid> 946684800 +0000\n',
  );
  expect(commitObject).toContain(
    'committer Codex Eval Fixture <codex-eval-fixture@example.invalid> 946684800 +0000\n',
  );
  expect(commitObject).not.toContain('gpgsig ');
  expect(overridesSeen.length).toBeGreaterThan(1);
  const initialOverrides = overridesSeen[0];
  if (initialOverrides === undefined) {
    throw new Error('The Git runner did not receive explicit isolation settings.');
  }
  const globalConfig = environmentValue(initialOverrides, 'GIT_CONFIG_GLOBAL');
  expect(environmentValue(initialOverrides, 'GIT_CONFIG_NOSYSTEM')).toBe('1');
  expect(globalConfig).toBe(resolve(workspace, '.git', 'eval-global-config-not-present'));
  expect(globalConfig).not.toBe('/dev/null');
  expect(await exists(globalConfig ?? '')).toBe(false);
});

test('committing a subset leaves every other fixture file as an untracked addition', async () => {
  const { workspace } = await fixture();
  await write(resolve(workspace, 'src/base.ts'), 'export const base = true;\n');
  await write(resolve(workspace, 'src/new-feature.ts'), 'export const feature = true;\n');
  await write(resolve(workspace, 'docs/notes.md'), 'pending\n');

  const evidence = await initializeFixtureGit({
    workspace,
    baselineFiles: ['src/base.ts'],
    run: actualGit,
  });

  expect(baseline(evidence).observed).toMatchObject({
    trackedFiles: ['src/base.ts'],
    untrackedFiles: ['docs/notes.md', 'src/new-feature.ts'],
    trackedWorktreeClean: true,
  });
  expect(await gitOutput(workspace, 'ls-files', '--cached')).toBe('src/base.ts\n');
  expect(await gitOutput(workspace, 'ls-files', '--others', '--exclude-standard')).toBe(
    'docs/notes.md\nsrc/new-feature.ts\n',
  );
  expect(await gitOutput(workspace, 'status', '--short', '--untracked-files=all')).toBe(
    '?? docs/notes.md\n?? src/new-feature.ts\n',
  );
});

test('treats pathspec-looking baseline names as literal file paths', async () => {
  const { workspace } = await fixture();
  await write(resolve(workspace, 'src/[target].ts'), 'literal target\n');
  await write(resolve(workspace, 'src/t.ts'), 'glob match\n');

  const evidence = await initializeFixtureGit({
    workspace,
    baselineFiles: ['src/[target].ts'],
    run: actualGit,
  });

  expect(baseline(evidence).observed.trackedFiles).toEqual(['src/[target].ts']);
  expect(baseline(evidence).observed.untrackedFiles).toEqual(['src/t.ts']);
});

test('refuses contradictory observed HEAD tree evidence', async () => {
  const { workspace } = await fixture();
  await write(resolve(workspace, 'src/base.ts'), 'baseline\n');

  await expect(
    initializeFixtureGit({
      workspace,
      baselineFiles: ['src/base.ts'],
      run: async (command, overrides) => {
        const evidence = await actualGit(command, overrides);
        if (command.includes('rev-parse') && command.includes('HEAD^{tree}')) {
          return { ...evidence, stdout: `${'0'.repeat(40)}\n` };
        }
        return evidence;
      },
    }),
  ).rejects.toThrow('Git HEAD does not reference the declared baseline commit and tree.');
});

test('an explicit empty baseline makes an empty commit and leaves all files untracked', async () => {
  const { workspace } = await fixture();
  await write(resolve(workspace, 'src/one.ts'), 'one\n');
  await write(resolve(workspace, 'src/two.ts'), 'two\n');

  const evidence = await initializeFixtureGit({
    workspace,
    baselineFiles: [],
    run: actualGit,
  });
  const observed = baseline(evidence);

  expect(observed.files).toEqual([]);
  expect(observed.observed.trackedFiles).toEqual([]);
  expect(observed.observed.untrackedFiles).toEqual(['src/one.ts', 'src/two.ts']);
  expect(observed.commands.some(({ command }) => command.includes('add'))).toBe(false);
  expect(await gitOutput(workspace, 'ls-tree', '-r', '--name-only', 'HEAD')).toBe('');
});

test('creates identical baseline commits for identical fixture contents', async () => {
  const first = await fixture();
  const second = await fixture();
  for (const workspace of [first.workspace, second.workspace]) {
    await write(resolve(workspace, 'src/module.ts'), 'export const value = 42;\n');
    await write(resolve(workspace, 'README.md'), 'fixture\n');
  }

  const firstEvidence = await initializeFixtureGit({
    workspace: first.workspace,
    baselineFiles: ['README.md', 'src/module.ts'],
    run: actualGit,
  });
  const secondEvidence = await initializeFixtureGit({
    workspace: second.workspace,
    baselineFiles: ['src/module.ts', 'README.md'],
    run: actualGit,
  });

  expect(baseline(firstEvidence).tree).toBe(baseline(secondEvidence).tree);
  expect(baseline(firstEvidence).commit).toBe(baseline(secondEvidence).commit);
});

test('rejects unsafe baseline paths, symlinks and an existing repository before initialization', async () => {
  const invalidWorkspace = await fixture();
  await write(resolve(invalidWorkspace.workspace, 'file.ts'), 'content\n');
  const outside = resolve(invalidWorkspace.root, 'outside.ts');
  await write(outside, 'outside\n');
  await symlink(outside, resolve(invalidWorkspace.workspace, 'linked-file.ts'));
  await mkdir(resolve(invalidWorkspace.workspace, 'directory'));
  await write(resolve(invalidWorkspace.workspace, 'directory/file.ts'), 'nested\n');
  await symlink(
    resolve(invalidWorkspace.root, 'outside-directory'),
    resolve(invalidWorkspace.workspace, 'linked-directory'),
  );
  await mkdir(resolve(invalidWorkspace.root, 'outside-directory'));
  await write(resolve(invalidWorkspace.root, 'outside-directory/file.ts'), 'outside\n');

  const invalidLists = [
    ['/absolute.ts'],
    ['../outside.ts'],
    ['directory/../file.ts'],
    ['.git/config'],
    ['file.ts', 'file.ts'],
    ['directory'],
    ['file.ts/child.ts'],
    ['linked-file.ts'],
    ['linked-directory/file.ts'],
  ];
  for (const baselineFiles of invalidLists) {
    await expect(
      initializeFixtureGit({
        workspace: invalidWorkspace.workspace,
        baselineFiles,
        run: actualGit,
      }),
    ).rejects.toThrow();
    expect(await exists(resolve(invalidWorkspace.workspace, '.git'))).toBe(false);
  }

  const existing = await fixture();
  await mkdir(resolve(existing.workspace, '.git'));
  await write(resolve(existing.workspace, 'file.ts'), 'content\n');
  await expect(
    initializeFixtureGit({
      workspace: existing.workspace,
      baselineFiles: ['file.ts'],
      run: actualGit,
    }),
  ).rejects.toThrow('existing Git metadata');
});

test('refuses a nonzero initialization command and does not continue', async () => {
  const { workspace } = await fixture();
  await write(resolve(workspace, 'file.ts'), 'content\n');
  const calls: string[][] = [];

  await expect(
    initializeFixtureGit({
      workspace,
      baselineFiles: ['file.ts'],
      run: async (command) => {
        calls.push([...command]);
        return { command, exitCode: 7, stdout: '', stderr: 'fixture failure' };
      },
    }),
  ).rejects.toThrow('failed (7): fixture failure');

  expect(calls).toHaveLength(1);
  expect(await exists(resolve(workspace, '.git'))).toBe(false);
});

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
