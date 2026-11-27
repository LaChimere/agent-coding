import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const hook = resolve(import.meta.dir, '../../config/antigravity/hooks/git-guard.py');
const claudeHook = resolve(import.meta.dir, '../../config/claude/hooks/git-guard.py');
const systemPython = '/usr/bin/python3';

async function decisionRaw(stdin: string, python = 'python3'): Promise<string | undefined> {
  const child = Bun.spawn([python, '-I', hook], {
    stdin: new Blob([stdin]),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);

  expect(code).toBe(0);

  if (output.trim().length === 0) {
    return undefined;
  }

  const parsed = JSON.parse(output) as {
    decision: string;
    reason?: string;
  };
  if (parsed.decision === 'force_ask') {
    expect(Object.keys(parsed).sort()).toEqual(['decision', 'reason']);
    expect(parsed.reason?.startsWith('git-guard: ')).toBeTrue();
  } else {
    expect(Object.keys(parsed)).toEqual(['decision']);
    expect(parsed.reason).toBeUndefined();
  }

  return parsed.decision;
}

async function decision(payload: unknown, python = 'python3'): Promise<string | undefined> {
  return decisionRaw(JSON.stringify(payload), python);
}

function payload(tool: string, args: Record<string, string>): unknown {
  return {
    hookEventName: 'PreToolUse',
    toolCall: {
      id: 'toolu_01',
      name: tool,
      args,
    },
  };
}

function runCommand(commandLine: string): unknown {
  return payload('run_command', Object.fromEntries([['CommandLine', commandLine]]));
}

const guarded = [
  'git add -A',
  'git add --all',
  'git add .',
  'git add -u',
  'git -C /tmp/repo add -A',
  'git -c core.quotepath=off add --all',
  'env GIT_DIR=x git add .',
  '/usr/bin/git add -A',
  'npm test && git add -A && git commit -m done',
  'git commit -am "message"',
  'git commit --all -m x',
  'git reset --hard',
  'git reset --hard HEAD~1',
  'git clean -fd',
  'git clean -xfd',
  'git checkout -- src/a.ts',
  'git checkout .',
  'git checkout -f main',
  'git restore src/a.ts',
  'git restore --staged --worktree a.ts',
  'git switch -f main',
  'git switch --discard-changes main',
  'git branch -D old',
  'git branch --delete --force old',
  'git stash drop',
  'git stash clear',
  'git push --force',
  'git push -f origin main',
  'git push --force-with-lease',
  'git push origin +main',
  'git push origin --delete feature',
  'git push origin :feature',
  // Forms that hid the command from the first version.
  '# Stage everything\ngit add -A',
  'git log --grep=#12 && git reset --hard',
  'git status\ngit clean -fd',
  "echo don't && git add -A",
  'for f in a b; do git checkout -- "$f"; done',
  'if true; then git reset --hard; fi',
  'ls | xargs git checkout --',
  'timeout 5 git clean -fd',
  'echo $(git add -A)',
  'echo `git add -A`',
  // Accepted over-asking: comments are not stripped, so a commented-out command still asks.
  'ls -la # git add -A',
];

const passed = [
  'git status',
  'git diff --stat',
  'git add src/a.ts docs/b.md',
  'git add -p src/a.ts',
  'git commit -m "add all the things"',
  'git commit -m "git reset --hard"',
  'git reset HEAD a.ts',
  'git reset --soft HEAD~1',
  'git clean -n',
  'git clean --dry-run -d',
  'git checkout -b feature',
  'git checkout main',
  'git restore --staged a.ts',
  'git switch main',
  'git branch -d merged',
  'git stash',
  'git stash list',
  'git push -u origin feature',
  'git log --oneline -5',
  'echo "git add -A"',
  'grep -rn git docs',
  "echo don't",
];

test('Antigravity and Claude git-guard scripts stay identical', async () => {
  const [antigravityScript, claudeScript] = await Promise.all([
    Bun.file(hook).text(),
    Bun.file(claudeHook).text(),
  ]);

  expect(antigravityScript).toBe(claudeScript);
});

test.each(guarded)('Antigravity git-guard force-asks before %s', async (command) => {
  expect(await decision(runCommand(command))).toBe('force_ask');
});

test.each(passed)(
  'Antigravity git-guard allows %s to follow the normal permission flow',
  async (command) => {
    expect(await decision(runCommand(command))).toBe('allow');
  },
);

test('Antigravity git-guard ignores other tools and malformed input', async () => {
  expect(
    await decision(payload('write_file', Object.fromEntries([['Path', 'git add -A']]))),
  ).toBeUndefined();
  expect(await decision('not an object')).toBeUndefined();
  expect(await decisionRaw('{invalid json')).toBeUndefined();
  expect(
    await decision({
      hookEventName: 'PreToolUse',
      toolCall: { name: 'run_command' },
    }),
  ).toBeUndefined();
  expect(
    await decision({
      hookEventName: 'PreToolUse',
      toolCall: { name: 'run_command', args: 'git add -A' },
    }),
  ).toBeUndefined();
  expect(
    await decision({
      hookEventName: 'PreToolUse',
      toolCall: {
        name: 'run_command',
        args: Object.fromEntries([['CommandLine', ['git', 'add', '-A']]]),
      },
    }),
  ).toBeUndefined();
  expect(
    await decision({ hookEventName: 'PreToolUse', toolCall: { name: 'run_command', args: {} } }),
  ).toBe('allow');
  expect(await decision(runCommand(''))).toBe('allow');
  expect(
    await decision({
      hookEventName: 'PreToolUse',
      toolCall: {
        name: 'run_command',
        args: Object.fromEntries([['CommandLine', null]]),
      },
    }),
  ).toBe('allow');
});

test.skipIf(!existsSync(systemPython))(
  'Antigravity git-guard runs on the macOS system Python',
  async () => {
    expect(await decision(runCommand('git add -A'), systemPython)).toBe('force_ask');
    expect(await decision(runCommand('git status'), systemPython)).toBe('allow');
  },
);
