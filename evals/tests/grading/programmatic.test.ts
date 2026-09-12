import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkProgrammatic, parseRule } from '../../src/grading/programmatic.ts';
import { inventoryDirectory } from '../../src/preparation/snapshot.ts';

const roots: string[] = [];

async function root(): Promise<string> {
  const directory = await mkdtemp(resolve('.cache/programmatic-test-'));
  roots.push(directory);
  return directory;
}

function input(
  rule: ReturnType<typeof parseRule>,
  overrides: Partial<Parameters<typeof checkProgrammatic>[0]> = {},
): Parameters<typeof checkProgrammatic>[0] {
  return {
    rule,
    output: 'output text',
    completed: true,
    artifactsDirectory: null,
    outputReference: 'trials/trial/result.json#output',
    artifactReference: null,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test('reports success, failure, and unknown for complete and incomplete output checks', async () => {
  const rule = parseRule({ type: 'text-contains', value: 'needle' });

  await expect(
    checkProgrammatic(input(rule, { output: 'contains needle', completed: true })),
  ).resolves.toMatchObject({ status: 'passed', evidence: ['trials/trial/result.json#output'] });
  await expect(
    checkProgrammatic(input(rule, { output: 'does not match', completed: true })),
  ).resolves.toMatchObject({ status: 'failed' });
  await expect(
    checkProgrammatic(input(rule, { output: 'does not match', completed: false })),
  ).resolves.toMatchObject({ status: 'unknown' });
  expect(
    parseRule({
      type: 'text-regex',
      pattern: '^needle$',
      flags: 'i',
    }),
  ).toEqual({
    type: 'text-regex',
    pattern: '^needle$',
    flags: 'i',
  });
});

test('matches route names by identity and plugin namespace without substring matches', async () => {
  const rule = parseRule({
    type: 'route',
    expected: ['review', 'standalone'],
    forbidden: ['blocked'],
  });

  await expect(
    checkProgrammatic(
      input(rule, { output: JSON.stringify({ skills: ['plugin:review', 'standalone'] }) }),
    ),
  ).resolves.toMatchObject({ status: 'passed' });

  await expect(
    checkProgrammatic(
      input(rule, { output: JSON.stringify({ skills: ['plugin:review', 'blocked'] }) }),
    ),
  ).resolves.toMatchObject({ status: 'failed' });

  await expect(
    checkProgrammatic(
      input(rule, { output: JSON.stringify({ skills: ['review-extra', 'standalone'] }) }),
    ),
  ).resolves.toMatchObject({ status: 'failed' });
});

test('grades native conversation counts using the native evidence reference', async () => {
  const rule = parseRule({
    type: 'native-conversation',
    turns: 2,
    threads: 1,
  });

  const nativeReference = 'trials/trial/native-evidence.json';

  await expect(
    checkProgrammatic(
      input(rule, {
        nativeEvidence: { turnIds: ['turn-1', 'turn-2'], threadIds: ['thread-1'] },
        nativeReference,
      }),
    ),
  ).resolves.toMatchObject({ status: 'passed', evidence: [nativeReference] });

  await expect(
    checkProgrammatic(
      input(rule, {
        nativeEvidence: { turnIds: ['turn-1'], threadIds: ['thread-1'] },
        nativeReference,
      }),
    ),
  ).resolves.toMatchObject({ status: 'failed', evidence: [nativeReference] });

  await expect(
    checkProgrammatic(input(rule, { nativeEvidence: null, nativeReference: null })),
  ).resolves.toMatchObject({
    status: 'unknown',
    reason: 'Native conversation evidence is unavailable.',
    evidence: [],
  });
});

test('treats missing and symlinked artifact references as unknown frozen evidence', async () => {
  const directory = await root();
  await mkdir(resolve(directory, 'nested'));
  await Bun.write(resolve(directory, 'nested/present.txt'), 'present\n');
  const fileRule = parseRule({ type: 'file-exists', path: 'nested/present.txt' });

  await expect(
    checkProgrammatic(
      input(fileRule, {
        artifactsDirectory: directory,
        artifactReference: 'trials/trial/artifacts',
      }),
    ),
  ).resolves.toMatchObject({
    status: 'passed',
    evidence: ['trials/trial/artifacts/nested/present.txt'],
  });

  const missingRule = parseRule({ type: 'file-exists', path: 'missing.txt' });

  await expect(
    checkProgrammatic(
      input(missingRule, {
        artifactsDirectory: directory,
        artifactReference: 'trials/trial/artifacts',
        completed: true,
      }),
    ),
  ).resolves.toMatchObject({ status: 'failed' });

  await expect(
    checkProgrammatic(
      input(missingRule, {
        artifactsDirectory: directory,
        artifactReference: 'trials/trial/artifacts',
        completed: false,
      }),
    ),
  ).resolves.toMatchObject({ status: 'unknown' });

  await expect(
    checkProgrammatic(input(missingRule, { artifactsDirectory: null, artifactReference: null })),
  ).resolves.toMatchObject({ status: 'unknown', evidence: [] });

  await symlink(resolve(directory, 'nested/present.txt'), resolve(directory, 'nested/link.txt'));
  const symlinkRule = parseRule({ type: 'file-exists', path: 'nested/link.txt' });

  await expect(
    checkProgrammatic(
      input(symlinkRule, {
        artifactsDirectory: directory,
        artifactReference: 'trials/trial/artifacts',
      }),
    ),
  ).resolves.toMatchObject({
    status: 'unknown',
    reason: 'The artifact path contains a symbolic link; its referent is not frozen evidence.',
    evidence: ['trials/trial/artifacts'],
  });
});

test('requires the isolated verifier for command rules and rejects invalid rule shapes', async () => {
  const commandRule = parseRule({ type: 'command', command: ['fixture', 'check'] });

  expect(commandRule).toEqual({
    type: 'command',
    command: ['fixture', 'check'],
    expectedExitCode: 0,
  });

  await expect(checkProgrammatic(input(commandRule))).rejects.toThrow(
    'Command checks require the isolated native verifier.',
  );
  expect(() => parseRule({ type: 'command', command: [] })).toThrow(
    'Invalid or unsupported programmatic rule.',
  );
  expect(() => parseRule({ type: 'file-exists', path: '../outside.txt' })).toThrow(
    'Path escapes its root',
  );
});

test('matches generated file paths in the frozen inventory without treating links or directories as files', async () => {
  const directory = await root();
  await mkdir(resolve(directory, 'generated-random'));
  await Bun.write(resolve(directory, 'generated-random/report.json'), '{}');
  await symlink('report.json', resolve(directory, 'generated-random/link.json'));
  const artifactInventory = await inventoryDirectory(directory, { symlinks: 'preserve' });

  const overrides = {
    artifactInventory,
    artifactReference: 'trials/trial/artifacts',
  };

  await expect(
    checkProgrammatic(
      input(parseRule({ type: 'file-pattern', pattern: '**/report.json' }), overrides),
    ),
  ).resolves.toMatchObject({
    status: 'passed',
    evidence: ['trials/trial/artifacts/generated-random/report.json'],
  });

  for (const pattern of ['**/absent.json', 'generated-random']) {
    await expect(
      checkProgrammatic(input(parseRule({ type: 'file-pattern', pattern }), overrides)),
    ).resolves.toMatchObject({ status: 'failed', evidence: ['trials/trial/artifacts'] });
  }

  await expect(
    checkProgrammatic(
      input(parseRule({ type: 'file-pattern', pattern: '**/link.json' }), overrides),
    ),
  ).resolves.toMatchObject({ status: 'unknown' });

  await expect(
    checkProgrammatic(input(parseRule({ type: 'file-pattern', pattern: '**/report.json' }))),
  ).resolves.toMatchObject({ status: 'unknown', evidence: [] });
  expect(() => parseRule({ type: 'file-pattern', pattern: '../outside/*.json' })).toThrow();
});
