import { afterAll, afterEach, expect, mock, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { contentHash } from '../../src/preparation/snapshot.ts';
import type { IPromptfooArtifacts, IPromptfooBatch } from '../../src/promptfoo/batch.ts';

const batchModulePath = resolve(import.meta.dir, '../../src/promptfoo/batch.ts');
const originalBatchModule = await import('../../src/promptfoo/batch.ts');
const originalRunPromptfooBatch = originalBatchModule.runPromptfooBatch;

let batchCalls = 0;
let observedTestCounts: number[] = [];

mock.module(batchModulePath, () => ({
  runPromptfooBatch: async (input: IPromptfooBatch): Promise<IPromptfooArtifacts> => {
    batchCalls += 1;
    observedTestCounts.push(input.tests.length);

    for (const testCase of input.tests) {
      const assertion = testCase.assert?.[0] as { value?: unknown } | undefined;
      if (typeof assertion?.value === 'function') {
        await (assertion.value as () => Promise<unknown>)();
      }
    }

    return {
      evaluationId: 'calibration-unit-batch',
      rows: input.tests.length,
      jsonPath: resolve(input.directory, 'native.json'),
      htmlPath: resolve(input.directory, 'native.html'),
      durationMs: 1,
    };
  },
}));

const { calibrateGraders } = await import('../../src/grading/calibration.ts');

const roots: string[] = [];

async function calibrationProject(labels: 'none' | 'confirmed' | 'mismatch'): Promise<string> {
  const root = await mkdtemp(resolve('.cache/calibration-unit-'));
  roots.push(root);
  await mkdir(resolve(root, 'src/grading'), { recursive: true });
  await mkdir(resolve(root, 'profiles/default'), { recursive: true });
  await mkdir(resolve(root, 'calibration'), { recursive: true });
  await mkdir(resolve(root, 'pricing'), { recursive: true });

  const samples = [
    {
      id: 'unit-pass',
      description: 'A deterministic passing calibration sample.',
      rubric: 'pass',
      files: [],
      textEvidence: 'complete pass evidence',
      artifactEvidence: 'complete pass evidence',
      proposedLabel: 'passed',
    },
    {
      id: 'unit-fail',
      description: 'A deterministic failing calibration sample.',
      rubric: 'fail',
      files: [],
      textEvidence: 'complete fail evidence',
      artifactEvidence: 'complete fail evidence',
      proposedLabel: 'failed',
    },
  ];

  await Bun.write(resolve(root, 'calibration/samples.json'), JSON.stringify(samples));
  if (labels !== 'none') {
    await Bun.write(
      resolve(root, 'calibration/labels.json'),
      JSON.stringify({
        sampleHash:
          labels === 'mismatch' ? 'wrong-sample-hash' : contentHash(JSON.stringify(samples)),
        confirmedAt: '2026-09-13T00:00:00Z',
        source: 'repository-owner',
        methods: ['text-rubric', 'artifact-rubric'],
        labels: { 'unit-pass': 'passed', 'unit-fail': 'failed' },
      }),
    );
  }

  await Bun.write(
    resolve(root, 'pricing/openai-standard.json'),
    JSON.stringify({
      source: 'calibration unit test',
      version: 'fixture',
      currency: 'USD',
      rates: {},
      modelMapping: {},
    }),
  );
  await Bun.write(
    resolve(root, 'profiles/default/runtime.json'),
    JSON.stringify({ codexExecutable: process.execPath, authentication: [] }),
  );
  await Bun.write(
    resolve(root, 'src/grading/rubric.ts'),
    `export async function gradeRubric(input) {
  const status = input.rubric === "fail" ? "failed" : "passed";
  return {
    status,
    reason: "fixture " + status,
    evidence: ["fixture-evidence"],
    error: null,
    grader: { model: "fixture-grader", reasoningEffort: "high", route: "fixture", definitionId: "fixture-grader-v1" },
    operation: {
      id: input.id,
      trialId: input.trialId,
      phase: "grading",
      status: "completed",
      usesModel: true,
      startedAt: 1,
      endedAt: 2,
      observations: [{
        id: input.id,
        actorId: input.id,
        model: "fixture-grader",
        threadId: null,
        turnId: null,
        kind: "delta",
        observedAt: 1,
        evidenceSource: "fixture-evidence",
        includedActorIds: [],
        usage: { input: 1, cachedInput: 0, output: 1, reasoningOutput: 0 }
      }]
    }
  };
}
`,
  );

  return root;
}

afterEach(async () => {
  batchCalls = 0;
  observedTestCounts = [];
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

afterAll(() => {
  mock.module(batchModulePath, () => ({ runPromptfooBatch: originalRunPromptfooBatch }));
});

test('calibration records both grader methods and leaves absent labels unconfirmed', async () => {
  const project = await calibrationProject('none');
  const reportPath = await calibrateGraders(project, new AbortController().signal);
  const report = await Bun.file(reportPath).json();

  expect(batchCalls).toBe(1);
  expect(observedTestCounts).toEqual([4]);
  expect(report).toMatchObject({
    planned: 4,
    graded: 4,
    labelsConfirmed: false,
    agreementCount: null,
  });
  expect(report.observations).toHaveLength(4);
  expect(report.resources.operationCount).toBe(4);
});

test('calibration confirms labels only when both methods match the owner record', async () => {
  const project = await calibrationProject('confirmed');
  const report = await Bun.file(
    await calibrateGraders(project, new AbortController().signal),
  ).json();

  expect(report).toMatchObject({ planned: 4, graded: 4, labelsConfirmed: true, agreementCount: 4 });
});

test('calibration rejects a mismatched label snapshot before scheduling graders', async () => {
  const project = await calibrationProject('mismatch');

  await expect(calibrateGraders(project, new AbortController().signal)).rejects.toThrow(
    'Human calibration labels do not match',
  );
  expect(batchCalls).toBe(0);
});
