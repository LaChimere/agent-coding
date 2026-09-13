import { lstat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { containedPath, contentHash } from '../preparation/snapshot.ts';
import type { ILoadedCase } from './cases.ts';

export type CollectionId = 'development' | 'holdout';
export type Exposure = 'seen' | 'unseen' | 'unknown';

export interface ICaseRoots {
  caseRoot: string;
  fixtureRoot: string;
}

export interface ICollectionSource extends ICaseRoots {
  id: CollectionId;
  version: string;
  exposure: Exposure;
}

export interface ICollectionSnapshot extends ICollectionSource {
  schema: 'codex-evals/collection-v1';
  selection: 'default' | 'explicit';
  membership: {
    caseId: string;
    source: string;
    version: string;
    provenance: { source: string; group: string };
  }[];
  membershipHash: string;
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid collection metadata.');
  }

  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Collection metadata requires non-empty text.');
  }

  return value;
}

export function collectionId(value: string | undefined): CollectionId {
  if (value === undefined || value === 'development') {
    return 'development';
  }

  if (value === 'holdout') {
    return 'holdout';
  }

  throw new Error(`Unknown collection: ${value}`);
}

function exposure(value: unknown): Exposure {
  if (value !== 'seen' && value !== 'unseen' && value !== 'unknown') {
    throw new Error('Unknown collection exposure.');
  }

  return value;
}

function source(id: CollectionId, value: unknown): ICollectionSource {
  const { caseRoot: cases, fixtureRoot: fixtures, version, exposure: visibility } = object(value);
  const caseRoot = relative('/collection', containedPath('/collection', text(cases)));
  const fixtureRoot = relative('/collection', containedPath('/collection', text(fixtures)));

  for (const path of [caseRoot, fixtureRoot]) {
    containedPath('/collection', path);
    if (/^(?:src|profiles|pricing|out|node_modules)(?:\/|$)/u.test(path)) {
      throw new Error('Collection inputs must be separate from shared framework and output roots.');
    }
  }

  return {
    id,
    version: text(version),
    caseRoot,
    fixtureRoot,
    exposure: exposure(visibility),
  };
}

/** Read metadata only. No collection root is inspected before selection. */
export async function selectCollection(
  project: string,
  requested: CollectionId = 'development',
): Promise<ICollectionSource> {
  const { schema, collections } = object(
    await Bun.file(resolve(project, 'collections.json')).json(),
  );
  if (schema !== 'codex-evals/collections-v1') {
    throw new Error('Unsupported collection registry.');
  }

  const entries = object(collections);
  const sources = (['development', 'holdout'] as const).map((id) => source(id, entries[id]));
  const roots = sources.flatMap((entry) => [entry.caseRoot, entry.fixtureRoot]);

  for (const [index, root] of roots.entries()) {
    const normalized = containedPath('/collection', root);
    for (const other of roots.slice(index + 1)) {
      const next = containedPath('/collection', other);
      if (
        normalized === next ||
        normalized.startsWith(`${next}/`) ||
        next.startsWith(`${normalized}/`)
      ) {
        throw new Error('Collection roots must not overlap.');
      }
    }
  }

  const selected = sources.find((entry) => entry.id === requested);
  if (selected === undefined) {
    throw new Error(`Unknown collection: ${requested}`);
  }

  return selected;
}

export function freezeCollection(
  selected: ICollectionSource,
  cases: readonly ILoadedCase[],
  explicit: boolean,
): ICollectionSnapshot {
  const membership = cases.map((item) => ({
    caseId: item.definition.metadata.id,
    source: item.source,
    version: item.version,
    provenance: item.definition.metadata.provenance,
  }));

  return {
    ...selected,
    schema: 'codex-evals/collection-v1',
    selection: explicit ? 'explicit' : 'default',
    membership,
    membershipHash: contentHash(JSON.stringify(membership)),
  };
}

export function parseCollectionSnapshot(value: unknown): ICollectionSnapshot {
  const record = object(value);
  const { schema, id: identity, selection, membership: members, membershipHash: hash } = record;
  if (schema !== 'codex-evals/collection-v1') {
    throw new Error('Unsupported collection snapshot.');
  }

  const id = collectionId(text(identity));
  const selected = source(id, record);
  if (selection !== 'default' && selection !== 'explicit') {
    throw new Error('Invalid collection selection.');
  }
  if (id === 'holdout' && selection !== 'explicit') {
    throw new Error('Holdout requires an explicit collection selection.');
  }
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error('Collection membership must not be empty.');
  }

  const membership = members.map((value: unknown) => {
    const { caseId, source, version, provenance } = object(value);
    const { source: origin, group } = object(provenance);

    return {
      caseId: text(caseId),
      source: text(source),
      version: text(version),
      provenance: { source: text(origin), group: text(group) },
    };
  });
  const membershipHash = contentHash(JSON.stringify(membership));
  if (
    hash !== membershipHash ||
    new Set(membership.map((member) => member.caseId)).size !== membership.length
  ) {
    throw new Error('Collection membership identity does not match its records.');
  }

  return {
    ...selected,
    schema: 'codex-evals/collection-v1',
    selection,
    membership,
    membershipHash,
  };
}

/** The small sidecar must pass before any manifest, report or grading payload is read. */
export async function readCollectionScope(
  path: string,
  requested: CollectionId,
): Promise<ICollectionSnapshot> {
  const snapshot = parseCollectionSnapshot(await Bun.file(path).json());
  if (snapshot.id !== requested) {
    throw new Error(`Collection ${snapshot.id} requires --collection ${snapshot.id}.`);
  }

  return snapshot;
}

export function assertCollectionMatch(
  expected: ICollectionSnapshot,
  actual: ICollectionSnapshot,
): void {
  if (
    JSON.stringify(parseCollectionSnapshot(expected)) !==
    JSON.stringify(parseCollectionSnapshot(actual))
  ) {
    throw new Error('Collection scope does not match the saved payload.');
  }
}

/** Reject a linked ancestor before traversing into a different collection. */
export async function requireInputPath(root: string, path: string): Promise<string> {
  const target = containedPath(root, path);
  let current = resolve(root);

  for (const part of relative(current, target).split('/')) {
    current = resolve(current, part);
    if ((await lstat(current)).isSymbolicLink()) {
      throw new Error(`Input symlink is not supported: ${path}`);
    }
  }

  return target;
}
