import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ICaseMetadata } from '../../src/corpus/cases.ts';
import { initialFixtureEvidence } from '../../src/grading/initial-evidence.ts';
import { contentHash, inventoryDirectory } from '../../src/preparation/snapshot.ts';

const roots: string[] = [];

function metadata(fixture: ICaseMetadata['fixture']): ICaseMetadata {
  return {
    id: 'initial-evidence',
    group: 'integration',
    kind: 'task',
    requirements: ['evidence'],
    fixture,
    execution: {
      networkAccess: false,
      pathPrepend: [],
      executableFiles: ['restored.sh', 'preserved.sh'],
    },
    reference: '',
    requiredSkills: [],
    turns: [],
    authorization: { scope: 'fixture evidence', approvals: [] },
    outputSchema: null,
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('reconstructs original text, bytes, hashes, modes, and final unchanged state', async () => {
  const root = await mkdtemp(resolve('.cache/initial-evidence-test-'));
  roots.push(root);
  const runDirectory = resolve(root, 'run');
  const sourceDirectory = resolve(runDirectory, 'private/fixtures');
  const artifactsDirectory = resolve(runDirectory, 'trials/trial/artifacts');
  await Promise.all([
    mkdir(sourceDirectory, { recursive: true }),
    mkdir(artifactsDirectory, { recursive: true }),
  ]);

  const text = new TextEncoder().encode('original section\n');
  const changed = new TextEncoder().encode('before change\n');
  const binary = new Uint8Array([0xff, 0xfe, 0x00, 0x01]);
  await Bun.write(resolve(sourceDirectory, 'text.txt'), text);
  await Bun.write(resolve(sourceDirectory, 'changed.txt'), changed);
  await Bun.write(resolve(sourceDirectory, 'missing.txt'), 'missing at final snapshot\n');
  await Bun.write(resolve(sourceDirectory, 'binary.bin'), binary);
  await Bun.write(resolve(sourceDirectory, 'restored.sh'), '#!/bin/sh\n');
  await Bun.write(resolve(sourceDirectory, 'preserved.sh'), '#!/bin/sh\n');
  await Promise.all([
    chmod(resolve(sourceDirectory, 'text.txt'), 0o644),
    chmod(resolve(sourceDirectory, 'changed.txt'), 0o644),
    chmod(resolve(sourceDirectory, 'missing.txt'), 0o644),
    chmod(resolve(sourceDirectory, 'binary.bin'), 0o644),
    chmod(resolve(sourceDirectory, 'restored.sh'), 0o644),
    chmod(resolve(sourceDirectory, 'preserved.sh'), 0o750),
  ]);

  await Bun.write(resolve(artifactsDirectory, 'text.txt'), text);
  await Bun.write(resolve(artifactsDirectory, 'changed.txt'), 'after change\n');
  await Bun.write(resolve(artifactsDirectory, 'binary.bin'), binary);
  await Bun.write(resolve(artifactsDirectory, 'restored.sh'), '#!/bin/sh\n');
  await Bun.write(resolve(artifactsDirectory, 'preserved.sh'), '#!/bin/sh\n');
  await Promise.all([
    chmod(resolve(artifactsDirectory, 'text.txt'), 0o644),
    chmod(resolve(artifactsDirectory, 'changed.txt'), 0o644),
    chmod(resolve(artifactsDirectory, 'binary.bin'), 0o644),
    chmod(resolve(artifactsDirectory, 'restored.sh'), 0o755),
    chmod(resolve(artifactsDirectory, 'preserved.sh'), 0o750),
  ]);

  const fixtures = [
    { source: 'text.txt', target: 'text.txt' },
    { source: 'changed.txt', target: 'changed.txt' },
    { source: 'missing.txt', target: 'missing.txt' },
    { source: 'binary.bin', target: 'binary.bin' },
    { source: 'restored.sh', target: 'restored.sh' },
    { source: 'preserved.sh', target: 'preserved.sh' },
  ];

  const evidence = await initialFixtureEvidence(
    runDirectory,
    metadata(fixtures),
    await inventoryDirectory(artifactsDirectory),
  );

  expect(evidence).toHaveLength(6);
  expect(evidence[0]).toMatchObject({
    path: 'text.txt',
    source: 'private/fixtures/text.txt',
    initial: {
      sha256: contentHash(text),
      bytes: text.length,
      mode: 0o644,
      text: 'original section\n',
    },
    unchanged: true,
  });

  expect(evidence[1]).toMatchObject({
    initial: { sha256: contentHash(changed), text: 'before change\n' },
    unchanged: false,
  });

  expect(evidence[2]).toMatchObject({ final: null, unchanged: false });
  expect(evidence[3]).toMatchObject({
    initial: {
      sha256: contentHash(binary),
      bytes: binary.length,
      text: null,
    },
    unchanged: true,
  });

  expect(evidence[4]).toMatchObject({
    initial: { mode: 0o755 },
    final: { mode: 0o755 },
    unchanged: true,
  });

  expect(evidence[5]).toMatchObject({
    initial: { mode: 0o750 },
    final: { mode: 0o750 },
    unchanged: true,
  });
});

test('rejects a symlink source instead of treating its referent as frozen fixture bytes', async () => {
  const root = await mkdtemp(resolve('.cache/initial-evidence-link-test-'));
  roots.push(root);
  const runDirectory = resolve(root, 'run');
  const sourceDirectory = resolve(runDirectory, 'private/fixtures');
  const artifactsDirectory = resolve(runDirectory, 'trials/trial/artifacts');
  await Promise.all([
    mkdir(sourceDirectory, { recursive: true }),
    mkdir(artifactsDirectory, { recursive: true }),
  ]);

  await Bun.write(resolve(sourceDirectory, 'real.txt'), 'real\n');
  await symlink('real.txt', resolve(sourceDirectory, 'link.txt'));

  await expect(
    initialFixtureEvidence(
      runDirectory,
      metadata([{ source: 'link.txt', target: 'link.txt' }]),
      await inventoryDirectory(artifactsDirectory),
    ),
  ).rejects.toThrow('Initial fixture is not a regular file: link.txt');
});
