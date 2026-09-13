import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertCollectionMatch,
  collectionId,
  freezeCollection,
  parseCollectionSnapshot,
  readCollectionScope,
  selectCollection,
} from '../../src/corpus/collections.ts';

const roots: string[] = [];

async function fixture() {
  await mkdir(resolve('.cache'), { recursive: true });
  const root = await mkdtemp(resolve('.cache/collections-'));
  roots.push(root);
  const registry = await Bun.file(resolve(import.meta.dir, '../../collections.json')).json();
  await Bun.write(resolve(root, 'collections.json'), JSON.stringify(registry));

  return { root, registry };
}

function snapshot() {
  return freezeCollection(
    {
      id: 'holdout',
      version: 'one',
      caseRoot: 'holdout/cases',
      fixtureRoot: 'holdout/fixtures',
      exposure: 'unseen',
    },
    [
      {
        source: 'cases/example.json',
        version: 'version',
        executionVersion: 'execution',
        definition: {
          description: 'unused',
          vars: { task: 'unused' },
          metadata: {
            id: 'example',
            group: 'group',
            kind: 'task',
            assessment: 'outcome',
            workFamily: 'planning',
            provenance: { source: 'independent-author', group: 'example' },
            requirements: [],
            fixture: [],
            execution: { networkAccess: false, pathPrepend: [], executableFiles: [] },
            reference: '',
            requiredSkills: [],
            turns: [],
            authorization: { scope: 'read-only', approvals: [] },
            outputSchema: null,
          },
          assert: [],
        },
      },
    ],
    true,
  );
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true })));
});

test('selects metadata without touching either absent collection root', async () => {
  const { root } = await fixture();

  expect((await selectCollection(root)).id).toBe('development');
  expect((await selectCollection(root, 'holdout')).caseRoot).toBe('holdout/cases');
  expect(collectionId(undefined)).toBe('development');
  expect(() => collectionId('unregistered')).toThrow('Unknown collection');
});

test('rejects overlapping and shared framework roots without inspecting their contents', async () => {
  const { root, registry } = await fixture();
  registry.collections.holdout.caseRoot = 'cases/hidden';
  await Bun.write(resolve(root, 'collections.json'), JSON.stringify(registry));

  await expect(selectCollection(root)).rejects.toThrow('overlap');

  registry.collections.holdout.caseRoot = 'src/hidden';
  await Bun.write(resolve(root, 'collections.json'), JSON.stringify(registry));

  await expect(selectCollection(root)).rejects.toThrow('separate');
});

test('requires explicit matching scope before a caller can read a saved payload', async () => {
  const { root } = await fixture();
  const scope = snapshot();
  const path = resolve(root, 'report.json.collection.json');
  await Bun.write(path, JSON.stringify(scope));

  await expect(readCollectionScope(path, 'development')).rejects.toThrow('--collection holdout');
  expect(await readCollectionScope(path, 'holdout')).toEqual(scope);
  expect(() => parseCollectionSnapshot({ ...scope, selection: 'default' })).toThrow('explicit');
  expect(() => parseCollectionSnapshot({ ...scope, membershipHash: 'changed' })).toThrow(
    'identity',
  );
  expect(() => assertCollectionMatch(scope, { ...scope, exposure: 'seen' })).toThrow(
    'does not match',
  );
  expect(scope.exposure).toBe('unseen');
});

test('rejects absent provenance and unsupported schemas instead of inventing defaults', () => {
  const scope = snapshot();

  expect(() => parseCollectionSnapshot({})).toThrow('Unsupported');
  expect(() => parseCollectionSnapshot({ ...scope, exposure: undefined })).toThrow('exposure');
  expect(() => parseCollectionSnapshot({ ...scope, membership: [] })).toThrow('empty');
});
