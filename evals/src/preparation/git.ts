import { lstat, readdir, realpath } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

export interface IGitCommandEvidence {
  command: readonly string[];
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface IGitBaselineEvidence {
  files: readonly string[];
  commit: string;
  tree: string;
  commands: readonly IGitCommandEvidence[];
  observed: {
    head: string;
    tree: string;
    trackedFiles: readonly string[];
    untrackedFiles: readonly string[];
    trackedWorktreeClean: true;
  };
}

export type FixtureGitEvidence =
  | IGitCommandEvidence
  | (IGitCommandEvidence & { baseline: IGitBaselineEvidence });

export interface IInitializeFixtureGitInput {
  workspace: string;
  baselineFiles?: readonly string[] | undefined;
  run: (
    command: readonly [string, ...string[]],
    environmentOverrides?: Readonly<Record<string, string>>,
  ) => Promise<IGitCommandEvidence>;
}

const initializationCommand = (workspace: string): readonly [string, ...string[]] => [
  'git',
  '-c',
  'init.templateDir=',
  'init',
  '--quiet',
  workspace,
];

const baselineMessage = 'Create deterministic eval fixture baseline';
const fixtureIdentity = Object.fromEntries([
  ['GIT_AUTHOR_NAME', 'Codex Eval Fixture'],
  ['GIT_AUTHOR_EMAIL', 'codex-eval-fixture@example.invalid'],
  ['GIT_AUTHOR_DATE', '946684800 +0000'],
  ['GIT_COMMITTER_NAME', 'Codex Eval Fixture'],
  ['GIT_COMMITTER_EMAIL', 'codex-eval-fixture@example.invalid'],
  ['GIT_COMMITTER_DATE', '946684800 +0000'],
]);

function sorted(paths: readonly string[]): string[] {
  return [...paths].sort();
}

function samePaths(actual: readonly string[], expected: readonly string[]): boolean {
  const left = sorted(actual);
  const right = sorted(expected);
  return left.length === right.length && left.every((path, index) => path === right[index]);
}

function nulSeparatedPaths(output: string, label: string): string[] {
  if (output.length === 0) {
    return [];
  }
  if (!output.endsWith('\0')) {
    throw new Error(`Git returned malformed ${label} evidence.`);
  }
  return output.slice(0, -1).split('\0');
}

function objectId(output: string, label: string): string {
  const value = output.trim();
  if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/u.test(value)) {
    throw new Error(`Git returned an invalid ${label} object ID.`);
  }
  return value;
}

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

function normalizedFixturePath(root: string, path: string): string {
  if (
    path.length === 0 ||
    path.startsWith('/') ||
    path.startsWith('\\') ||
    /^[a-z]:/iu.test(path) ||
    path.includes('\\')
  ) {
    throw new Error(`Baseline path must be a contained relative file path: ${path}`);
  }

  const components = path.split('/');
  if (
    components.some(
      (component) => component.length === 0 || component === '.' || component === '..',
    )
  ) {
    throw new Error(`Baseline path must be normalized: ${path}`);
  }
  if (components.some((component) => component.toLowerCase() === '.git')) {
    throw new Error(`Baseline path cannot target Git metadata: ${path}`);
  }

  const target = resolve(root, ...components);
  const difference = relative(root, target);
  if (difference === '' || difference === '..' || difference.startsWith(`..${sep}`)) {
    throw new Error(`Baseline path escapes the fixture workspace: ${path}`);
  }

  return components.join('/');
}

async function validateRegularFixtureFile(root: string, path: string): Promise<void> {
  const components = path.split('/');
  let current = root;

  for (const [index, component] of components.entries()) {
    current = resolve(current, component);
    const info = await lstat(current);
    if (info.isSymbolicLink()) {
      throw new Error(`Baseline path has a symlink component: ${path}`);
    }
    if (index < components.length - 1 && !info.isDirectory()) {
      throw new Error(`Baseline path ancestor is not a directory: ${path}`);
    }
    if (index === components.length - 1 && !info.isFile()) {
      throw new Error(`Baseline path is not a regular file: ${path}`);
    }
  }
}

async function workspaceFiles(workspace: string): Promise<string[]> {
  const files: string[] = [];

  const visit = async (directory: string): Promise<void> => {
    for (const name of (await readdir(directory)).sort()) {
      if (directory === workspace && name.toLowerCase() === '.git') {
        throw new Error('Fixture workspace already contains Git metadata.');
      }

      const path = resolve(directory, name);
      const info = await lstat(path);
      if (info.isDirectory()) {
        await visit(path);
      } else if (info.isFile() || info.isSymbolicLink()) {
        files.push(relative(workspace, path).split(sep).join('/'));
      } else {
        throw new Error(`Fixture workspace contains an unsupported filesystem entry: ${path}`);
      }
    }
  };

  await visit(workspace);
  return sorted(files);
}

function isolatedEnvironment(workspace: string): Readonly<Record<string, string>> {
  const gitDirectory = resolve(workspace, '.git');
  return Object.fromEntries([
    ['GIT_CONFIG_NOSYSTEM', '1'],
    ['GIT_CONFIG_GLOBAL', resolve(gitDirectory, 'eval-global-config-not-present')],
    ['GIT_CONFIG_COUNT', '0'],
  ]);
}

function explicitGitCommand(
  workspace: string,
  args: readonly string[],
): readonly [string, ...string[]] {
  const hooksPath = resolve(workspace, '.git', 'eval-hooks-disabled');
  return [
    'git',
    '-C',
    workspace,
    '-c',
    `core.hooksPath=${hooksPath}`,
    '-c',
    'commit.gpgSign=false',
    ...args,
  ];
}

function failedCommand(evidence: IGitCommandEvidence): never {
  const detail = evidence.stderr.trim() || evidence.stdout.trim();
  throw new Error(
    `Git fixture preparation command failed (${evidence.exitCode}): ${detail || evidence.command.join(' ')}`,
  );
}

async function runChecked(
  run: IInitializeFixtureGitInput['run'],
  command: readonly [string, ...string[]],
  environment: Readonly<Record<string, string>>,
): Promise<IGitCommandEvidence> {
  const evidence = await run(command, environment);
  if (evidence.exitCode !== 0) {
    failedCommand(evidence);
  }
  return evidence;
}

/** Initialize a fixture repository, optionally committing an explicit source baseline. */
export async function initializeFixtureGit(
  input: IInitializeFixtureGitInput,
): Promise<FixtureGitEvidence> {
  if (input.baselineFiles === undefined) {
    return await input.run(initializationCommand(input.workspace));
  }

  const workspace = await realpath(input.workspace);
  const workspaceInfo = await lstat(workspace);
  if (!workspaceInfo.isDirectory()) {
    throw new Error('Fixture workspace must be a directory.');
  }

  if (await exists(resolve(workspace, '.git'))) {
    throw new Error(
      'Cannot initialize an explicit baseline in a workspace with existing Git metadata.',
    );
  }

  const files = sorted(input.baselineFiles.map((path) => normalizedFixturePath(workspace, path)));
  if (new Set(files).size !== files.length) {
    throw new Error('Baseline file paths must be unique.');
  }
  for (const path of files) {
    await validateRegularFixtureFile(workspace, path);
  }

  const originalFiles = await workspaceFiles(workspace);
  const selected = new Set(files);
  const expectedUntracked = originalFiles.filter((path) => !selected.has(path));
  const environment = { ...isolatedEnvironment(workspace), ...fixtureIdentity };

  const initialization = await runChecked(input.run, initializationCommand(workspace), environment);
  const commands: IGitCommandEvidence[] = [];
  const runGit = async (args: readonly string[]): Promise<IGitCommandEvidence> => {
    const evidence = await runChecked(input.run, explicitGitCommand(workspace, args), environment);
    commands.push(evidence);
    return evidence;
  };

  if (files.length > 0) {
    await runGit(['--literal-pathspecs', 'add', '--force', '--', ...files]);
  }

  const indexEvidence = await runGit(['ls-files', '--cached', '-z']);
  const indexFiles = nulSeparatedPaths(indexEvidence.stdout, 'index path');
  if (!samePaths(indexFiles, files)) {
    throw new Error('Git index does not contain exactly the declared baseline files.');
  }

  const untrackedBeforeCommit = await runGit(['ls-files', '--others', '--exclude-standard', '-z']);
  const observedUntrackedBeforeCommit = nulSeparatedPaths(
    untrackedBeforeCommit.stdout,
    'untracked path',
  );
  if (!samePaths(observedUntrackedBeforeCommit, expectedUntracked)) {
    throw new Error(
      'Files outside the declared baseline are not all visible as untracked additions.',
    );
  }

  const treeEvidence = await runGit(['write-tree']);
  const tree = objectId(treeEvidence.stdout, 'tree');
  const treeFilesEvidence = await runGit(['ls-tree', '-r', '--name-only', '-z', tree]);
  const treeFiles = nulSeparatedPaths(treeFilesEvidence.stdout, 'tree path');
  if (!samePaths(treeFiles, files)) {
    throw new Error('Git tree does not contain exactly the declared baseline files.');
  }

  const commitEvidence = await runGit(['commit-tree', tree, '-m', baselineMessage]);
  const commit = objectId(commitEvidence.stdout, 'commit');
  await runGit(['update-ref', 'HEAD', commit]);

  const headEvidence = await runGit(['rev-parse', 'HEAD']);
  const head = objectId(headEvidence.stdout, 'HEAD');
  const observedTreeEvidence = await runGit(['rev-parse', 'HEAD^{tree}']);
  const observedTree = objectId(observedTreeEvidence.stdout, 'HEAD tree');
  if (head !== commit || observedTree !== tree) {
    throw new Error('Git HEAD does not reference the declared baseline commit and tree.');
  }

  const trackedFilesEvidence = await runGit(['ls-tree', '-r', '--name-only', '-z', 'HEAD']);
  const trackedFiles = nulSeparatedPaths(trackedFilesEvidence.stdout, 'tracked path');
  if (!samePaths(trackedFiles, files)) {
    throw new Error('Git HEAD does not contain exactly the declared baseline files.');
  }

  await runGit(['diff', '--quiet', 'HEAD', '--']);

  const untrackedEvidence = await runGit(['ls-files', '--others', '--exclude-standard', '-z']);
  const untrackedFiles = nulSeparatedPaths(untrackedEvidence.stdout, 'untracked path');
  if (!samePaths(untrackedFiles, expectedUntracked)) {
    throw new Error('Files outside the declared baseline changed during Git preparation.');
  }

  const globalConfig = resolve(workspace, '.git', 'eval-global-config-not-present');
  const hooksPath = resolve(workspace, '.git', 'eval-hooks-disabled');
  if ((await exists(globalConfig)) || (await exists(hooksPath))) {
    throw new Error('Git isolation paths unexpectedly exist in the fixture repository.');
  }

  return {
    ...initialization,
    baseline: {
      files: sorted(files),
      commit,
      tree,
      commands,
      observed: {
        head,
        tree: observedTree,
        trackedFiles: sorted(trackedFiles),
        untrackedFiles: sorted(untrackedFiles),
        trackedWorktreeClean: true,
      },
    },
  };
}
