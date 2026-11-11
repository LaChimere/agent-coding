import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const hook = resolve(import.meta.dir, '../../config/claude/hooks/git-guard.py');
const systemPython = '/usr/bin/python3';

async function decision(payload: unknown, python = 'python3'): Promise<string | undefined> {
  const child = Bun.spawn([python, '-I', hook], {
    stdin: new Blob([JSON.stringify(payload)]),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);

  expect(code).toBe(0);
  if (output.trim().length === 0) {
    return undefined;
  }
  const parsed = JSON.parse(output) as {
    hookSpecificOutput: { hookEventName: string; permissionDecision: string };
  };
  expect(parsed.hookSpecificOutput.hookEventName).toBe('PreToolUse');
  return parsed.hookSpecificOutput.permissionDecision;
}

function payload(tool: string, input: Record<string, string>): unknown {
  return Object.fromEntries([
    ['hook_event_name', 'PreToolUse'],
    ['tool_name', tool],
    ['tool_input', input],
  ]);
}

function bash(command: string): unknown {
  return payload('Bash', { command });
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

test.each(guarded)('git-guard asks before %s', async (command) => {
  expect(await decision(bash(command))).toBe('ask');
});

test.each(passed)('git-guard leaves %s to the normal permission flow', async (command) => {
  expect(await decision(bash(command))).toBeUndefined();
});

test('git-guard ignores other tools and malformed input', async () => {
  expect(
    await decision(payload('Write', Object.fromEntries([['file_path', 'git add -A']]))),
  ).toBeUndefined();
  expect(await decision('not an object')).toBeUndefined();
  expect(
    await decision(
      Object.fromEntries([
        ['tool_name', 'Bash'],
        ['tool_input', 'git add -A'],
      ]),
    ),
  ).toBeUndefined();
});

test.skipIf(!existsSync(systemPython))('git-guard runs on the macOS system Python', async () => {
  expect(await decision(bash('git add -A'), systemPython)).toBe('ask');
  expect(await decision(bash('git status'), systemPython)).toBeUndefined();
});
