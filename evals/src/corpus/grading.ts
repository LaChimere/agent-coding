import { resolve } from 'node:path';
import { contentHash } from '../preparation/snapshot.ts';
import { type ILoadedCase, parseCase } from './cases.ts';
import {
  assertCollectionMatch,
  type ICollectionSnapshot,
  readCollectionScope,
} from './collections.ts';

function fields(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid grading override object.');
  }

  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(`Grading overrides cannot change ${key}.`);
    }
  }

  return value as Record<string, unknown>;
}

/** A correction changes grading guidance, never the frozen candidate obligations. */
export async function applyGradingOverrides(
  cases: readonly ILoadedCase[],
  collection: ICollectionSnapshot,
  path: string | undefined,
): Promise<ILoadedCase[]> {
  if (path === undefined) {
    return [...cases];
  }

  const file = resolve(path);
  const scope = await readCollectionScope(`${file}.collection.json`, collection.id);
  assertCollectionMatch(collection, scope);
  const {
    schema,
    collection: payloadScope,
    cases: overrides,
  } = fields(await Bun.file(file).json(), ['schema', 'collection', 'cases']);
  if (schema !== 'codex-evals/grading-v1') {
    throw new Error('Unsupported grading overrides.');
  }
  assertCollectionMatch(scope, payloadScope as ICollectionSnapshot);
  if (!Array.isArray(overrides) || overrides.length === 0) {
    throw new Error('Grading overrides must name cases.');
  }

  const corrected = new Map<string, ILoadedCase>();

  for (const value of overrides) {
    const {
      caseId: identity,
      assert,
      metadata: overrideMetadata,
    } = fields(value, ['caseId', 'assert', 'metadata']);
    const original = cases.find((item) => item.definition.metadata.id === identity);
    if (original === undefined) {
      throw new Error('Grading override case is outside the selected frozen run.');
    }

    const caseId = original.definition.metadata.id;
    if (corrected.has(caseId)) {
      throw new Error(`Duplicate grading override: ${caseId}`);
    }

    const { reference } =
      overrideMetadata === undefined ? {} : fields(overrideMetadata, ['reference']);
    if (assert === undefined && reference === undefined) {
      throw new Error('An override must change assertions or reference guidance.');
    }

    const definition = parseCase({
      ...original.definition,
      metadata: {
        ...original.definition.metadata,
        ...(reference === undefined ? {} : { reference }),
      },
      assert: assert ?? original.definition.assert,
    });

    corrected.set(caseId, {
      ...original,
      definition,
      version: contentHash(
        JSON.stringify({
          originalVersion: original.version,
          assert: definition.assert,
          reference: definition.metadata.reference,
        }),
      ),
    });
  }

  return cases.map((item) => corrected.get(item.definition.metadata.id) ?? item);
}
