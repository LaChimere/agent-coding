import { afterAll, afterEach, expect, mock, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ApiProvider } from 'promptfoo';
import type { ILoadedCase } from '../../src/corpus/cases.ts';
import type { IRunManifest } from '../../src/results/records.ts';
import { collection, loadedCase, priceBook } from '../fixtures/contracts.ts';

const ledgerModulePath = resolve(import.meta.dir, '../../src/execution/ledger.ts');
const batchModulePath = resolve(import.meta.dir, '../../src/promptfoo/batch.ts');
const workerModulePath = resolve(import.meta.dir, '../../src/execution/worker.ts');
const originalLedger = await import('../../src/execution/ledger.ts');
const originalBatch = await import('../../src/promptfoo/batch.ts');
const originalWorker = await import('../../src/execution/worker.ts');
const originalLoadLedger = originalLedger.loadLedger;
const originalRunPromptfooBatch = originalBatch.runPromptfooBatch;
const originalSaveReport = originalWorker.saveReport;

let activeLedger: {
  manifest: IRunManifest;
  trials: { id: string; status: string; output: string }[];
};
let lastProvider: ApiProvider | undefined;
let batchCalls = 0;
let saveReportCalls: unknown[] = [];

mock.module(ledgerModulePath, () => ({
  ...originalLedger,
  loadLedger: async () => activeLedger,
}));

mock.module(batchModulePath, () => ({
  ...originalBatch,
  runPromptfooBatch: async (input: {
    directory: string;
    providers: readonly ApiProvider[];
    tests: readonly unknown[];
  }) => {
    batchCalls += 1;
    lastProvider = input.providers[0];
    if (lastProvider === undefined) {
      throw new Error('Missing provider fixture.');
    }
    for (let index = 0; index < input.tests.length; index += 1) {
      await lastProvider.callApi('fixture prompt', { testIdx: index, repeatIndex: 0 } as never);
    }
    return {
      evaluationId: 'regrade-unit-batch',
      rows: input.tests.length,
      jsonPath: resolve(input.directory, 'native.json'),
      htmlPath: resolve(input.directory, 'native.html'),
      durationMs: 1,
    };
  },
}));

mock.module(workerModulePath, () => ({
  ...originalWorker,
  saveReport: async (input: unknown) => {
    saveReportCalls.push(input);
    return '/tmp/regrade-unit-report.json';
  },
}));

const { regradeRun } = await import('../../src/execution/regrade.ts');

const roots: string[] = [];

function trial(caseId: string, id: string): IRunManifest['trials'][number] {
  return {
    id,
    caseId,
    candidateId: 'candidate',
    repetition: 0,
    caseVersion: 'fixture',
    executionVersion: 'fixture',
    criteria: [{ id: 'result', core: true, definitionId: 'criterion-version' }],
  };
}

function manifest(cases: ILoadedCase[], trials: ReturnType<typeof trial>[]): IRunManifest {
  return {
    schema: 'codex-evals/run-v2',
    collection: collection(cases),
    id: 'run-fixture',
    createdAt: 1,
    concurrency: 1,
    repetitions: 1,
    codexExecutable: process.execPath,
    codexVersion: 'fixture',
    framework: { bun: 'fixture', promptfoo: 'fixture', implementationHash: 'fixture' },
    judge: { model: 'gpt-6-astra', reasoningEffort: 'high', definitionId: 'judge-fixture' },
    candidates: [
      {
        id: 'candidate',
        label: 'candidate',
        source: 'candidate',
        runtimeDirectory: 'runtime',
        profileDirectory: 'profile',
        inventory: { sha256: 'candidate', entries: [] },
        profileInventory: { sha256: 'profile', entries: [] },
      },
    ],
    cases,
    trials,
    priceBook,
  };
}

async function setup(caseCount = 2) {
  const root = await mkdtemp(resolve('.cache/regrade-unit-'));
  roots.push(root);
  const project = resolve(root, 'project');
  const runDirectory = resolve(root, 'run');
  await mkdir(resolve(project, 'src/grading'), { recursive: true });
  await mkdir(runDirectory, { recursive: true });
  await Bun.write(
    resolve(project, 'src/grading/assertion.ts'),
    'export function setGradingSignal() {}\n',
  );

  const cases = Array.from({ length: caseCount }, (_, index) => loadedCase(`fixture/${index}`));
  const trials = cases.map((item, index) => trial(item.definition.metadata.id, `trial-${index}`));
  activeLedger = {
    manifest: manifest(cases, trials),
    trials: trials.map((item) => ({
      id: item.id,
      status: 'completed',
      output: `output-${item.id}`,
    })),
  };
  batchCalls = 0;
  lastProvider = undefined;
  saveReportCalls = [];
  return { project, runDirectory, cases, trials };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

afterAll(() => {
  mock.module(ledgerModulePath, () => ({ ...originalLedger, loadLedger: originalLoadLedger }));
  mock.module(batchModulePath, () => ({
    ...originalBatch,
    runPromptfooBatch: originalRunPromptfooBatch,
  }));
  mock.module(workerModulePath, () => ({ ...originalWorker, saveReport: originalSaveReport }));
});

test('regrade selects requested rows, preserves collection scope, and binds saved evidence providers', async () => {
  const input = await setup();
  const report = await regradeRun(input.project, input.runDirectory, new AbortController().signal, [
    'fixture/0',
  ]);

  expect(report).toBe('/tmp/regrade-unit-report.json');
  expect(batchCalls).toBe(1);
  expect(saveReportCalls).toHaveLength(1);
  expect(lastProvider).toBeDefined();
  await expect(
    lastProvider?.callApi('fixture', { testIdx: 9, repeatIndex: 0 } as never),
  ).rejects.toThrow('Saved evidence does not match the planned row');

  const regradeManifestPath = (
    await Array.fromAsync(new Bun.Glob('regrades/*/manifest.json').scan(input.runDirectory))
  )[0];
  if (regradeManifestPath === undefined) {
    throw new Error('Missing regrade manifest.');
  }
  const regradeManifest = await Bun.file(resolve(input.runDirectory, regradeManifestPath)).json();
  expect(regradeManifest.cases).toHaveLength(1);
  expect(regradeManifest.trials).toHaveLength(1);
  expect(regradeManifest.collection.id).toBe('development');
});

test('regrade rejects duplicate and unknown selections before scheduling or writing', async () => {
  const input = await setup();

  await expect(
    regradeRun(input.project, input.runDirectory, new AbortController().signal, [
      'fixture/0',
      'fixture/0',
    ]),
  ).rejects.toThrow('Duplicate selected regrading case');
  await expect(
    regradeRun(input.project, input.runDirectory, new AbortController().signal, ['missing']),
  ).rejects.toThrow('Case is outside the original run');
  expect(batchCalls).toBe(0);
  expect(saveReportCalls).toHaveLength(0);
});

test('regrade preserves not-run candidate evidence as an explicit provider error', async () => {
  const input = await setup(1);
  activeLedger.trials = [{ id: 'trial-0', status: 'not-run', output: '' }];

  await regradeRun(input.project, input.runDirectory, new AbortController().signal);

  expect(batchCalls).toBe(1);
  await expect(
    lastProvider?.callApi('fixture', { testIdx: 0, repeatIndex: 0 } as never),
  ).resolves.toMatchObject({
    error: 'No candidate evidence is available for regrading.',
    output: '',
  });
});

test('regrade applies a scoped reference correction without changing execution identity', async () => {
  const input = await setup(1);
  const grading = resolve(input.project, 'grading.json');
  await Bun.write(`${grading}.collection.json`, JSON.stringify(activeLedger.manifest.collection));
  await Bun.write(
    grading,
    JSON.stringify({
      schema: 'codex-evals/grading-v1',
      collection: activeLedger.manifest.collection,
      cases: [{ caseId: 'fixture/0', metadata: { reference: 'corrected guidance' } }],
    }),
  );

  await regradeRun(input.project, input.runDirectory, new AbortController().signal, [], {
    grading,
  });

  const path = (
    await Array.fromAsync(new Bun.Glob('regrades/*/manifest.json').scan(input.runDirectory))
  )[0] as string;
  const regradeManifest = await Bun.file(resolve(input.runDirectory, path)).json();
  expect(regradeManifest.cases[0].definition.metadata.reference).toBe('corrected guidance');
  expect(regradeManifest.cases[0].executionVersion).toBe('fixture');
});
