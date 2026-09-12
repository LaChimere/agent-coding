import { expect, test } from 'bun:test';
import { chmod, lstat, mkdir, mkdtemp, readlink, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  containedPath,
  inventoryDirectory,
  snapshotDirectory,
  writeJsonRecord,
} from '../../src/preparation/snapshot.ts';

async function fixture() {
  const root = await mkdtemp(resolve('.cache/snapshot-test-'));
  const source = `${root}/source`;
  await mkdir(source);

  return { root, source };
}

test('captures untracked content and executable modes, independent of later source edits', async () => {
  const { root, source } = await fixture();
  await Bun.write(`${source}/tool`, '#!/bin/sh\nexit 0\n');
  await chmod(`${source}/tool`, 0o755);
  await Bun.write(`${source}/new.txt`, 'not committed');
  const first = await snapshotDirectory(source, `${root}/first`, { symlinks: 'reject' });
  const second = await snapshotDirectory(source, `${root}/second`, { symlinks: 'reject' });

  expect(first.sha256).toBe(second.sha256);
  expect(await inventoryDirectory(source)).toEqual(first);
  expect(first.entries.map((entry) => entry.path)).toEqual(['new.txt', 'tool']);
  expect((await lstat(`${root}/first/tool`)).mode & 0o777).toBe(0o755);
  await Bun.write(`${source}/new.txt`, 'changed');

  expect(await Bun.file(`${root}/first/new.txt`).text()).toBe('not committed');
  const third = await snapshotDirectory(source, `${root}/third`, { symlinks: 'reject' });

  expect(third.sha256).not.toBe(first.sha256);
});

test('preserves artifact symlinks as evidence without copying private referents', async () => {
  const { root, source } = await fixture();
  await Bun.write(`${root}/private.txt`, 'must not be copied');
  await symlink('../private.txt', `${source}/link`);

  await expect(
    snapshotDirectory(source, `${root}/rejected`, { symlinks: 'reject' }),
  ).rejects.toThrow('Input symlink');
  const snapshot = await snapshotDirectory(source, `${root}/artifact`, { symlinks: 'preserve' });

  expect(snapshot.entries[0]).toMatchObject({ kind: 'symlink', target: '../private.txt' });
  expect(await readlink(`${root}/artifact/link`)).toBe('../private.txt');
  expect(await Bun.file(`${root}/artifact/private.txt`).exists()).toBeFalse();
});

test('records empty directories as part of the initial environment identity', async () => {
  const { root, source } = await fixture();
  const before = await snapshotDirectory(source, `${root}/before`, { symlinks: 'reject' });
  await mkdir(`${source}/empty`, { mode: 0o750 });
  const after = await snapshotDirectory(source, `${root}/after`, { symlinks: 'reject' });

  expect(after.sha256).not.toBe(before.sha256);
  expect(after.entries[0]).toMatchObject({
    path: 'empty',
    kind: 'directory',
    mode: 0o750,
  });

  expect((await lstat(`${root}/after/empty`)).isDirectory()).toBeTrue();
});

test('excludes exact private subtrees and rejects recursive destinations and path escapes', async () => {
  const { root, source } = await fixture();
  await Bun.write(`${source}/public.txt`, 'public');
  await Bun.write(`${source}/private/rubric.txt`, 'private');

  const result = await snapshotDirectory(source, `${root}/copy`, {
    symlinks: 'reject',
    exclude: ['private'],
  });

  expect(result.entries.map((entry) => entry.path)).toEqual(['public.txt']);
  await expect(
    snapshotDirectory(source, `${source}/nested`, { symlinks: 'reject' }),
  ).rejects.toThrow('outside');

  for (const path of ['', '..', '../secret', '/absolute', 'x/../../secret']) {
    expect(() => containedPath(source, path)).toThrow();
  }
});

test('never overwrites an existing report, including concurrent writers', async () => {
  const { root } = await fixture();
  const path = `${root}/report.json`;

  const outcomes = await Promise.allSettled([
    writeJsonRecord(path, { id: 'first' }),
    writeJsonRecord(path, { id: 'second' }),
  ]);

  expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
  const original = await Bun.file(path).text();

  expect(['first', 'second']).toContain((await Bun.file(path).json()).id);
  await expect(writeJsonRecord(path, { id: 'later' })).rejects.toThrow();
  expect(await Bun.file(path).text()).toBe(original);
});
