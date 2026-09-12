import { afterAll, afterEach, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AssertionValueFunctionContext } from 'promptfoo';
import type { ICaseAssertion, ICaseMetadata, ILoadedCase } from '../../src/corpus/cases.ts';
import type { IGradeRubricInput, IGradeRubricResult } from '../../src/grading/rubric.ts';
import { inventoryDirectory, writeJsonRecord } from '../../src/preparation/snapshot.ts';
import type { IPlannedTrial, IRunManifest, ITrialResult } from '../../src/results/records.ts';
import type { IResourceOperation } from '../../src/results/resources.ts';

const roots: string[] = [];
const rubricModulePath = resolve(import.meta.dir, '../../src/grading/rubric.ts');
const commandModulePath = resolve(import.meta.dir, '../../src/grading/command.ts');
const originalRubricModule = await import('../../src/grading/rubric.ts');
const originalCommandModule = await import('../../src/grading/command.ts');
const originalGradeRubric = originalRubricModule.gradeRubric;
const originalRunCommandCheck = originalCommandModule.runCommandCheck;

interface IModelEvidenceInput {
  toolRecords?: unknown;
  initialFixtures?: unknown;
  executionConditions?: unknown;
}

let modelGrade: IGradeRubricResult;
let commandResult = { exitCode: 0, evidence: ['verification.json'] };
const modelEvidence: string[] = [];

mock.module(rubricModulePath, () => ({
  gradeRubric: async (input: IGradeRubricInput): Promise<IGradeRubricResult> => {
    modelEvidence.push(input.evidence);
    return {
      ...modelGrade,
      operation: {
        ...modelGrade.operation,
        id: input.id,
        trialId: input.trialId,
      },
    };
  },
}));

mock.module(commandModulePath, () => ({
  runCommandCheck: async () => commandResult,
}));

const {
  default: gradeAssertion,
  gradeCriterion,
  setGradingSignal,
} = await import('../../src/grading/assertion.ts');

function metadata(fixture: ICaseMetadata['fixture'] = []): ICaseMetadata {
  return {
    id: 'assertion-fixture',
    group: 'integration',
    kind: 'task',
    requirements: ['criterion'],
    fixture,
    execution: {
      networkAccess: false,
      pathPrepend: [],
      executableFiles: [],
    },
    reference: 'assertion fixture',
    requiredSkills: [],
    turns: [],
    authorization: { scope: 'assertion fixture', approvals: [] },
    outputSchema: null,
  };
}

function assertion(
  method: 'programmatic' | 'text-rubric',
  rule?: Record<string, unknown>,
): ICaseAssertion {
  return {
    type: 'javascript',
    value: 'file://src/grading/assertion.ts',
    metric: 'criterion',
    config: {
      core: true,
      method,
      requirements: ['criterion'],
      rubric: 'Fixture rubric',
      ...(rule === undefined ? {} : { rule }),
    },
  };
}

function loadedCase(
  assertionValue: ICaseAssertion,
  fixture: ICaseMetadata['fixture'] = [],
): ILoadedCase {
  return {
    definition: {
      description: 'assertion fixture',
      vars: { task: 'fixture task' },
      metadata: metadata(fixture),
      assert: [assertionValue],
    },
    version: 'case-v1',
    executionVersion: 'execution-v1',
    source: 'cases/fixture.json',
  };
}

function candidate() {
  const inventory = { sha256: 'candidate', entries: [] };
  return {
    id: 'candidate-1',
    label: 'candidate fixture',
    source: 'fixture',
    runtimeDirectory: 'inputs/candidate/runtime',
    profileDirectory: 'private/profiles/default',
    inventory,
    profileInventory: inventory,
  };
}

function trial(assertionValue: ICaseAssertion): IPlannedTrial {
  return {
    id: 'trial-assertion',
    caseId: 'assertion-fixture',
    candidateId: 'candidate-1',
    caseVersion: 'case-v1',
    executionVersion: 'execution-v1',
    repetition: 0,
    criteria: [
      {
        id: assertionValue.metric,
        definitionId: 'criterion-v1',
        core: true,
      },
    ],
  };
}

function manifest(assertionValue: ICaseAssertion): IRunManifest {
  return {
    schema: 'codex-evals/run-v1',
    id: 'run-assertion',
    createdAt: 1,
    concurrency: 1,
    repetitions: 1,
    codexExecutable: process.execPath,
    codexVersion: 'fixture',
    framework: {
      bun: Bun.version,
      promptfoo: '0.123.0',
      implementationHash: 'implementation',
    },
    judge: {
      model: 'gpt-6-astra',
      reasoningEffort: 'high',
      definitionId: 'judge-v1',
    },
    candidates: [candidate()],
    cases: [
      loadedCase(
        assertionValue,
        assertionValue.config.method === 'text-rubric'
          ? [{ source: 'fixture.txt', target: 'fixture.txt' }]
          : [],
      ),
    ],
    trials: [trial(assertionValue)],
  };
}

function onlyTrial(manifestValue: IRunManifest) {
  const current = manifestValue.trials[0];
  if (current === undefined) {
    throw new Error('Missing assertion trial.');
  }
  return current;
}

function result(overrides: Partial<ITrialResult> = {}): ITrialResult {
  return {
    id: 'trial-assertion',
    status: 'completed',
    queuedAt: 1,
    startedAt: 2,
    endedAt: 3,
    errors: [],
    output: 'fixture output',
    evidencePath: null,
    protocolPath: null,
    artifacts: null,
    threadIds: [],
    turnIds: [],
    operationIds: [],
    environmentFingerprint: null,
    ...overrides,
  };
}

function modelOperation(): IResourceOperation {
  return {
    id: 'model-operation',
    trialId: 'trial-assertion',
    phase: 'grading',
    status: 'completed',
    usesModel: true,
    startedAt: 4,
    endedAt: 5,
    observations: [],
  };
}

function modelVerdict(evidence: readonly string[]): IGradeRubricResult {
  return {
    status: 'passed',
    reason: 'Fixture judge passed.',
    evidence,
    operation: modelOperation(),
    grader: {
      model: 'gpt-6-astra',
      reasoningEffort: 'high',
      route: 'fixture-judge',
      definitionId: 'fixture-judge-definition',
    },
    error: null,
  };
}

async function root(): Promise<string> {
  const directory = await mkdtemp(resolve('.cache/assertion-test-'));
  roots.push(directory);
  await mkdir(resolve(directory, 'private/profiles/default'), { recursive: true });
  await Bun.write(
    resolve(directory, 'private/profiles/default/runtime.json'),
    '{"authentication":[]}\n',
  );

  return directory;
}

async function writeArtifact(rootDirectory: string): Promise<{
  directory: string;
  inventory: Awaited<ReturnType<typeof inventoryDirectory>>;
}> {
  const directory = resolve(rootDirectory, 'trials/trial-assertion/artifacts');
  await mkdir(directory, { recursive: true });
  await Bun.write(resolve(directory, 'fixture.txt'), 'fixture artifact\n');

  return {
    directory: 'trials/trial-assertion/artifacts',
    inventory: await inventoryDirectory(directory),
  };
}

async function missingAuthentication(runDirectory: string): Promise<void> {
  await Bun.write(
    resolve(runDirectory, 'private/profiles/default/runtime.json'),
    JSON.stringify({
      authentication: [
        {
          environment: `EVALS_MISSING_${randomUUID().replaceAll('-', '_').toUpperCase()}`,
          jsonFile: { path: resolve(runDirectory, 'missing-key.json'), pointer: '/key' },
        },
      ],
    }),
  );
}

afterEach(async () => {
  modelGrade = modelVerdict(['judge-evidence.json']);
  commandResult = { exitCode: 0, evidence: ['verification.json'] };
  modelEvidence.length = 0;
  setGradingSignal(undefined);
  await Promise.all(
    roots.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

afterAll(() => {
  mock.module(rubricModulePath, () => ({ gradeRubric: originalGradeRubric }));
  mock.module(commandModulePath, () => ({ runCommandCheck: originalRunCommandCheck }));
});

test('propagates a passed programmatic criterion and writes a model-free verification record', async () => {
  const runDirectory = await root();
  const currentAssertion = assertion('programmatic', { type: 'text-contains', value: 'output' });
  const currentManifest = manifest(currentAssertion);
  const currentCase = loadedCase(currentAssertion);

  const grade = await gradeCriterion({
    runDirectory,
    manifest: currentManifest,
    trial: onlyTrial(currentManifest),
    case: currentCase,
    initialMetadata: currentCase.definition.metadata,
    result: result(),
    assertion: currentAssertion,
    credentials: {},
  });

  expect(grade).toMatchObject({
    status: 'passed',
    method: 'programmatic',
    error: null,
  });

  expect(await Bun.file(resolve(runDirectory, 'grades', `${grade.id}.json`)).exists()).toBeTrue();
  expect(
    await Bun.file(resolve(runDirectory, 'operations', grade.operationId, 'record.json')).json(),
  ).toMatchObject({
    phase: 'verification',
    usesModel: false,
    status: 'completed',
  });
});

test('propagates command verification status and evidence without starting a model', async () => {
  const runDirectory = await root();

  const currentAssertion = assertion('programmatic', {
    type: 'command',
    command: ['fixture', 'check'],
    expectedExitCode: 7,
  });

  const currentManifest = manifest(currentAssertion);
  const artifacts = await writeArtifact(runDirectory);
  commandResult = { exitCode: 7, evidence: ['command-result.json'] };

  const grade = await gradeCriterion({
    runDirectory,
    manifest: currentManifest,
    trial: onlyTrial(currentManifest),
    case: loadedCase(currentAssertion),
    initialMetadata: metadata(),
    result: result({ artifacts }),
    assertion: currentAssertion,
    credentials: {},
  });

  expect(grade).toMatchObject({
    status: 'passed',
    reason: 'Verification exited with 7; expected 7.',
    evidence: ['command-result.json'],
  });

  commandResult = { exitCode: 8, evidence: ['command-failure.json'] };

  const failed = await gradeCriterion({
    runDirectory,
    manifest: currentManifest,
    trial: onlyTrial(currentManifest),
    case: loadedCase(currentAssertion),
    initialMetadata: metadata(),
    result: result({ artifacts }),
    assertion: currentAssertion,
    credentials: {},
  });

  expect(failed).toMatchObject({ status: 'failed', evidence: ['command-failure.json'] });
});

test('turns frozen artifact identity errors into an unknown grade and failed operation', async () => {
  const runDirectory = await root();
  const currentAssertion = assertion('programmatic', { type: 'text-contains', value: 'output' });
  const currentManifest = manifest(currentAssertion);
  const artifacts = await writeArtifact(runDirectory);

  const mismatched = {
    directory: artifacts.directory,
    inventory: { ...artifacts.inventory, sha256: 'wrong-inventory' },
  };

  const grade = await gradeCriterion({
    runDirectory,
    manifest: currentManifest,
    trial: onlyTrial(currentManifest),
    case: loadedCase(currentAssertion),
    initialMetadata: metadata(),
    result: result({ artifacts: mismatched }),
    assertion: currentAssertion,
    credentials: {},
  });

  expect(grade).toMatchObject({
    status: 'unknown',
    error: 'Frozen artifacts changed since candidate execution.',
  });

  expect(
    await Bun.file(resolve(runDirectory, 'operations', grade.operationId, 'record.json')).json(),
  ).toMatchObject({
    status: 'failed',
    usesModel: false,
  });
});

test('propagates model grader evidence, initial fixtures, tool records, and missing-evidence downgrade', async () => {
  const runDirectory = await root();
  const currentAssertion = assertion('text-rubric');
  const fixturePath = resolve(runDirectory, 'private/fixtures/fixture.txt');
  await mkdir(resolve(runDirectory, 'private/fixtures'), { recursive: true });
  await Bun.write(fixturePath, 'original fixture\n');
  const artifacts = await writeArtifact(runDirectory);
  const protocolPath = 'trials/trial-assertion/native/protocol.jsonl';
  await mkdir(resolve(runDirectory, 'trials/trial-assertion/native/home/.codex'), {
    recursive: true,
  });
  await Bun.write(resolve(runDirectory, protocolPath), '');
  const evidencePath = 'trials/trial-assertion/evidence.json';
  await writeJsonRecord(resolve(runDirectory, evidencePath), {
    items: [],
    activation: {
      status: 'unknown',
      references: [],
      reason: 'fixture',
    },
    issues: [],
  });

  const currentManifest = manifest(currentAssertion);
  modelGrade = modelVerdict(['judge-evidence.json']);

  const first = await gradeCriterion({
    runDirectory,
    manifest: currentManifest,
    trial: onlyTrial(currentManifest),
    case: loadedCase(currentAssertion, [{ source: 'fixture.txt', target: 'fixture.txt' }]),
    initialMetadata: metadata([{ source: 'fixture.txt', target: 'fixture.txt' }]),
    result: result({
      output: 'model output',
      evidencePath,
      protocolPath,
      threadIds: ['thread-1'],
      artifacts,
    }),
    assertion: currentAssertion,
    credentials: Object.fromEntries([['TOKEN', 'fixture-secret']]),
  });

  expect(first).toMatchObject({
    status: 'passed',
    evidence: ['judge-evidence.json'],
    grader: { definitionId: 'judge-v1' },
  });

  const evidenceInput = JSON.parse(modelEvidence[0] ?? '{}') as IModelEvidenceInput;

  expect(evidenceInput.toolRecords).toEqual([]);
  expect(evidenceInput.executionConditions).toEqual({
    networkAccess: false,
    pathPrepend: [],
    executableFiles: [],
  });

  expect(evidenceInput.initialFixtures).toEqual([
    expect.objectContaining({
      path: 'fixture.txt',
      initial: expect.objectContaining({ text: 'original fixture\n' }),
    }),
  ]);

  modelGrade = modelVerdict([]);

  const noEvidence = await gradeCriterion({
    runDirectory,
    manifest: currentManifest,
    trial: onlyTrial(currentManifest),
    case: loadedCase(currentAssertion, [{ source: 'fixture.txt', target: 'fixture.txt' }]),
    initialMetadata: metadata([{ source: 'fixture.txt', target: 'fixture.txt' }]),
    result: result({
      evidencePath,
      protocolPath,
      threadIds: ['thread-1'],
      artifacts,
    }),
    assertion: currentAssertion,
    credentials: {},
  });

  expect(noEvidence).toMatchObject({
    status: 'unknown',
    reason: 'The model judge returned no concrete evidence reference.',
  });
});

test('exposes the public assertion callback and preserves missing-context errors', async () => {
  const runDirectory = await root();
  await missingAuthentication(runDirectory);
  const currentAssertion = assertion('programmatic', { type: 'text-contains', value: 'output' });
  const currentManifest = manifest(currentAssertion);
  await writeJsonRecord(resolve(runDirectory, 'manifest.json'), currentManifest);
  await writeJsonRecord(resolve(runDirectory, 'trials/trial-assertion/result.json'), result());

  const verdict = await gradeAssertion('ignored output', {
    metadata: { runDirectory, trialId: 'trial-assertion' },
    config: { criterionId: 'criterion' },
  } as unknown as AssertionValueFunctionContext);

  expect(verdict).toMatchObject({
    pass: true,
    score: 1,
    metadata: { status: 'passed' },
  });

  await expect(
    gradeAssertion('ignored output', {} as AssertionValueFunctionContext),
  ).rejects.toThrow('Missing repository grading context.');
});

test('programmatic command grading works with unavailable provider credentials', async () => {
  const runDirectory = await root();
  await missingAuthentication(runDirectory);

  const currentAssertion = assertion('programmatic', {
    type: 'command',
    command: ['fixture-command'],
    expectedExitCode: 7,
  });

  const currentManifest = manifest(currentAssertion);
  const artifacts = await writeArtifact(runDirectory);
  commandResult = { exitCode: 7, evidence: ['command-result.json'] };
  await writeJsonRecord(resolve(runDirectory, 'manifest.json'), currentManifest);
  await writeJsonRecord(
    resolve(runDirectory, 'trials/trial-assertion/result.json'),
    result({ artifacts }),
  );

  const verdict = await gradeAssertion('', {
    metadata: { runDirectory, trialId: 'trial-assertion' },
    config: { criterionId: 'criterion' },
  } as unknown as AssertionValueFunctionContext);

  expect(verdict).toMatchObject({ pass: true, metadata: { evidence: ['command-result.json'] } });
  expect(modelEvidence).toHaveLength(0);
});

test('model authentication failure is retained as an unknown grade before model consumption', async () => {
  const runDirectory = await root();
  await missingAuthentication(runDirectory);
  const currentAssertion = assertion('text-rubric');
  const currentManifest = manifest(currentAssertion);
  const artifacts = await writeArtifact(runDirectory);
  await writeJsonRecord(resolve(runDirectory, 'manifest.json'), currentManifest);
  await writeJsonRecord(
    resolve(runDirectory, 'trials/trial-assertion/result.json'),
    result({ artifacts }),
  );

  const verdict = await gradeAssertion('', {
    metadata: { runDirectory, trialId: 'trial-assertion' },
    config: { criterionId: 'criterion' },
  } as unknown as AssertionValueFunctionContext);

  expect(verdict).toMatchObject({
    pass: false,
    metadata: { status: 'unknown', graderError: true },
  });

  const gradeFiles = await Array.fromAsync(new Bun.Glob('grades/*.json').scan(runDirectory));

  expect(gradeFiles).toHaveLength(1);
  const grade = await Bun.file(resolve(runDirectory, gradeFiles[0] ?? '')).json();

  expect(grade.error).toContain('Cannot read the configured authentication JSON file');
  expect(
    await Bun.file(resolve(runDirectory, 'operations', grade.operationId, 'record.json')).json(),
  ).toMatchObject({
    phase: 'grading',
    status: 'failed',
    usesModel: false,
    observations: [],
  });

  expect(modelEvidence).toHaveLength(0);
});

test('regrading reads initial bindings from the execution manifest after fixture storage moves', async () => {
  const runDirectory = await root();
  const currentAssertion = assertion('text-rubric');
  const original = manifest(currentAssertion);
  original.cases = [
    loadedCase(currentAssertion, [{ source: 'original.fixture', target: 'fixture.txt' }]),
  ];
  const grading = structuredClone(original);
  grading.cases = [
    loadedCase(currentAssertion, [{ source: 'moved.fixture', target: 'fixture.txt' }]),
  ];
  await mkdir(resolve(runDirectory, 'private/fixtures'), { recursive: true });
  await Bun.write(resolve(runDirectory, 'private/fixtures/original.fixture'), 'fixture artifact\n');
  await Bun.write(resolve(runDirectory, 'private/fixtures/moved.fixture'), 'unrelated old file\n');
  const artifacts = await writeArtifact(runDirectory);
  const gradingManifestPath = resolve(runDirectory, 'regrades/moved/manifest.json');
  await writeJsonRecord(resolve(runDirectory, 'manifest.json'), original);
  await writeJsonRecord(gradingManifestPath, grading);
  await writeJsonRecord(
    resolve(runDirectory, 'trials/trial-assertion/result.json'),
    result({ artifacts }),
  );

  modelGrade = modelVerdict(['initial fixture evidence']);
  await gradeAssertion('', {
    metadata: {
      runDirectory,
      trialId: 'trial-assertion',
      gradingManifestPath,
    },
    config: { criterionId: 'criterion' },
  } as unknown as AssertionValueFunctionContext);

  const captured = JSON.parse(modelEvidence[0] ?? '{}') as IModelEvidenceInput;

  expect(captured.initialFixtures).toEqual([
    expect.objectContaining({
      source: 'private/fixtures/original.fixture',
      initial: expect.objectContaining({ text: 'fixture artifact\n' }),
      unchanged: true,
    }),
  ]);
});
