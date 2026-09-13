import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadCases } from '../../src/corpus/cases.ts';
import { selectCollection } from '../../src/corpus/collections.ts';
import { applyGradingOverrides } from '../../src/corpus/grading.ts';
import { buildCoverageReport } from '../../src/results/coverage.ts';
import { collection, loadedCase } from '../fixtures/contracts.ts';

const roots: string[] = [];

async function fixture(original = loadedCase()) {
  await mkdir(resolve('.cache'), { recursive: true });
  const root = await mkdtemp(resolve('.cache/grading-override-'));
  roots.push(root);
  const scope = collection([original]);
  const path = resolve(root, 'grading.json');
  await Bun.write(`${path}.collection.json`, JSON.stringify(scope));

  const write = async (cases: unknown[]) =>
    Bun.write(path, JSON.stringify({ schema: 'codex-evals/grading-v1', collection: scope, cases }));

  return { original, scope, path, write };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true })));
});

test('corrects reference guidance without changing the frozen task or execution identity', async () => {
  const { original, scope, path, write } = await fixture();
  await write([
    { caseId: 'fixture', metadata: { reference: 'done is a sufficient concise answer.' } },
  ]);

  const corrected = (await applyGradingOverrides([original], scope, path))[0];

  expect(corrected?.executionVersion).toBe(original.executionVersion);
  expect(corrected?.version).not.toBe(original.version);
  expect(corrected?.definition.vars).toEqual(original.definition.vars);
  expect(corrected?.definition.metadata.requirements).toEqual(
    original.definition.metadata.requirements,
  );
  expect(original.definition.metadata.reference).toBe('');
  expect(await applyGradingOverrides([original], scope, undefined)).toEqual([original]);
});

test('removing a diagnostic does not leave its retired scoring prose in requirements or coverage', async () => {
  const project = resolve(import.meta.dir, '../..');
  const original = (await loadCases(project, await selectCollection(project), ['anti-slop/0']))[0];
  if (original === undefined) {
    throw new Error('The readiness-review regression case is missing.');
  }

  const diagnostic = original.definition.assert.find(
    (assertion) => assertion.metric === 'criterion-003-presentation',
  );
  if (diagnostic === undefined) {
    throw new Error('The shared-requirement diagnostic is missing.');
  }

  const { scope, path, write } = await fixture(original);
  await write([
    {
      caseId: original.definition.metadata.id,
      assert: original.definition.assert.filter((assertion) => assertion !== diagnostic),
    },
  ]);

  const corrected = (await applyGradingOverrides([original], scope, path))[0];
  if (corrected === undefined) {
    throw new Error('The corrected case is missing.');
  }

  const coverage = buildCoverageReport({
    cases: [corrected],
    trials: [
      {
        id: 'trial',
        caseId: corrected.definition.metadata.id,
        candidateId: 'candidate',
        caseVersion: original.version,
        executionVersion: original.executionVersion,
        repetition: 0,
        criteria: corrected.definition.assert.map((assertion) => ({
          id: assertion.metric,
          definitionId: assertion.metric,
          core: assertion.config.core,
        })),
      },
    ],
    observedTrials: [],
  });

  expect(corrected.executionVersion).toBe(original.executionVersion);
  expect(corrected.definition.metadata.requirements).toEqual(
    original.definition.metadata.requirements,
  );
  expect(JSON.stringify(corrected.definition.metadata.requirements)).not.toContain(
    diagnostic.config.rubric,
  );
  expect(JSON.stringify(coverage.requirements)).not.toContain(diagnostic.config.rubric);
  expect(original.definition.assert).toContain(diagnostic);
});

test('rejects changed obligations, unknown requirements, unsafe grader paths and unrelated case IDs', async () => {
  const { original, scope, path, write } = await fixture();

  for (const override of [
    { caseId: 'fixture', vars: { task: 'A different task.' } },
    { caseId: 'fixture', metadata: { requirements: [] } },
    { caseId: 'fixture', metadata: { authorization: {} } },
    { caseId: 'other', metadata: { reference: 'different' } },
    {
      caseId: 'fixture',
      assert: [{ ...original.definition.assert[0], value: 'file://holdout/grader.ts' }],
    },
  ]) {
    await write([override]);
    await expect(applyGradingOverrides([original], scope, path)).rejects.toThrow();
  }
});

test('checks grading-file scope before reading invalid JSON payloads', async () => {
  const { original, scope, path } = await fixture();
  await Bun.write(
    `${path}.collection.json`,
    JSON.stringify({ ...scope, id: 'holdout', selection: 'explicit' }),
  );
  await Bun.write(path, 'This must not be parsed.');

  await expect(applyGradingOverrides([original], scope, path)).rejects.toThrow(
    '--collection holdout',
  );
});
