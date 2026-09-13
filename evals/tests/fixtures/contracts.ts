import { resolve } from 'node:path';
import type { Capability, ILoadedCase, IRequirement } from '../../src/corpus/cases.ts';
import { freezeCollection } from '../../src/corpus/collections.ts';
import { writeJsonRecord } from '../../src/preparation/snapshot.ts';
import type { IRunManifest } from '../../src/results/records.ts';
import type { IPriceBook } from '../../src/results/resources.ts';

export function requirement(id: string, capability: Capability = 'implementation'): IRequirement {
  return {
    id,
    capability,
    authority: 'The explicit task in this isolated test fixture.',
    appliesWhen: 'The fixture task is executed.',
    evidence: 'The retained result and the check declared by this fixture.',
  };
}

export function collection(cases: readonly ILoadedCase[]) {
  return freezeCollection(
    {
      id: 'development',
      version: 'fixture',
      caseRoot: 'cases',
      fixtureRoot: 'fixtures',
      exposure: 'seen',
    },
    cases,
    false,
  );
}

export function loadedCase(id = 'fixture'): ILoadedCase {
  return {
    source: 'cases/fixture.json',
    version: 'fixture',
    executionVersion: 'fixture',
    definition: {
      description: 'A completed result for an isolated framework test.',
      vars: { task: 'Return done.' },
      metadata: {
        id,
        group: 'fixture',
        kind: 'task',
        assessment: 'outcome',
        workFamily: 'implementation',
        provenance: { source: 'unit-test', group: 'fixture' },
        requirements: [requirement('result')],
        fixture: [],
        execution: { networkAccess: false, pathPrepend: [], executableFiles: [] },
        reference: '',
        requiredSkills: [],
        turns: [],
        authorization: { scope: 'Return the answer only.', approvals: [] },
        outputSchema: null,
      },
      assert: [
        {
          type: 'javascript',
          value: 'file://src/grading/assertion.ts',
          metric: 'result',
          config: {
            method: 'programmatic',
            core: true,
            requirements: ['result'],
            rubric: 'The result contains done.',
            rule: { type: 'text-contains', value: 'done' },
          },
        },
      ],
    },
  };
}

export const priceBook: IPriceBook = {
  source: 'Unit test with no model pricing evidence',
  version: 'fixture',
  currency: 'USD',
  rates: {},
  modelMapping: {},
};

export async function writeManifest(directory: string, manifest: IRunManifest): Promise<void> {
  await Bun.write(
    resolve(directory, 'collection.json'),
    `${JSON.stringify(manifest.collection)}\n`,
  );
  await writeJsonRecord(resolve(directory, 'manifest.json'), manifest);
}
