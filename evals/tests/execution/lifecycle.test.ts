import { afterAll, afterEach, expect, mock, test } from 'bun:test';
import { appendFile, chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ICaseAssertion, ICaseMetadata, ILoadedCase } from '../../src/corpus/cases.ts';
import type {
  INativePreparationInput,
  IReadyNativeTrial,
  NativePreparationResult,
} from '../../src/preparation/native.ts';
import { writeJsonRecord } from '../../src/preparation/snapshot.ts';
import type { IPromptfooArtifacts, IPromptfooBatch } from '../../src/promptfoo/batch.ts';
import type { IPlannedTrial, IRunManifest } from '../../src/results/records.ts';

const roots: string[] = [];
const nativeModulePath = resolve(import.meta.dir, '../../src/preparation/native.ts');
const batchModulePath = resolve(import.meta.dir, '../../src/promptfoo/batch.ts');
const originalNativeModule = await import('../../src/preparation/native.ts');
const originalBatchModule = await import('../../src/promptfoo/batch.ts');
const originalPrepareNativeTrial = originalNativeModule.prepareNativeTrial;
const originalRunPromptfooBatch = originalBatchModule.runPromptfooBatch;

type TurnStatus = 'completed' | 'failed' | 'interrupted';

interface ITurnStep {
  id: string;
  status: TurnStatus;
  output: string;
}

interface IFakePreparationOptions {
  steps: readonly ITurnStep[];
  writeArtifact?: boolean;
  sessionTail?: string;
}

let preparationFactory: (input: INativePreparationInput) => Promise<NativePreparationResult> =
  async () => {
    throw new Error('The native preparation fixture was not configured.');
  };
let batchMode: 'success' | 'failure' = 'success';
let batchCalls = 0;

mock.module(nativeModulePath, () => ({
  prepareNativeTrial: (input: INativePreparationInput) => preparationFactory(input),
}));

mock.module(batchModulePath, () => ({
  runPromptfooBatch: async (input: IPromptfooBatch): Promise<IPromptfooArtifacts> => {
    batchCalls += 1;
    if (batchMode === 'failure') {
      throw new Error('fixture Promptfoo batch failed');
    }

    const provider = input.providers[0];
    if (provider === undefined) {
      throw new Error('Missing worker provider fixture.');
    }
    await provider.callApi('worker fixture', { testIdx: 0, repeatIndex: 0 } as never);

    return {
      evaluationId: 'fixture-evaluation',
      rows: 1,
      jsonPath: resolve(input.directory, 'promptfoo-results.json'),
      htmlPath: resolve(input.directory, 'promptfoo-results.html'),
      durationMs: 1,
    };
  },
}));

const { executeTrial } = await import('../../src/codex/trial.ts');
const { runWorker } = await import('../../src/execution/worker.ts');

class FakeSession {
  private _index = 0;
  private readonly _protocolPath: string;
  private readonly _codexHome: string;
  private readonly _workspace: string;
  private readonly _steps: readonly ITurnStep[];
  private readonly _writeArtifact: boolean;

  constructor(
    protocolPath: string,
    codexHome: string,
    workspace: string,
    steps: readonly ITurnStep[],
    writeArtifact: boolean,
  ) {
    this._protocolPath = protocolPath;
    this._codexHome = codexHome;
    this._workspace = workspace;
    this._steps = steps;
    this._writeArtifact = writeArtifact;
  }

  async runTurn(_text: string): Promise<{ id: string; status: TurnStatus; response: unknown }> {
    const step = this._steps[this._index];
    if (step === undefined) {
      throw new Error('Fake session received an unexpected turn.');
    }
    this._index += 1;
    if (this._writeArtifact && this._index === 1) {
      await Bun.write(resolve(this._workspace, 'candidate-output.txt'), 'candidate artifact\n');
    }

    const time = new Date(1_000 + this._index * 1_000).toISOString();

    const usage = {
      direction: 'incoming',
      stream: 'stdout',
      time,
      raw: 'fixture token usage',
      parsed: {
        method: 'thread/tokenUsage/updated',
        params: {
          threadId: 'thread-1',
          turnId: step.id,
          tokenUsage: { total: { inputTokens: 3, outputTokens: 2 } },
        },
      },
    };

    const item = {
      direction: 'incoming',
      stream: 'stdout',
      time,
      raw: 'fixture item',
      parsed: {
        method: 'item/completed',
        params: {
          threadId: 'thread-1',
          turnId: step.id,
          item: {
            id: `item-${step.id}`,
            type: 'agentMessage',
            phase: 'final_answer',
            text: step.output,
          },
        },
      },
    };

    await appendFile(this._protocolPath, `${JSON.stringify(usage)}\n${JSON.stringify(item)}\n`);

    return {
      id: step.id,
      status: step.status,
      response: { id: step.id, status: step.status },
    };
  }

  async close(): Promise<void> {}

  async writeSessionHistory(): Promise<void> {
    const lines = [
      { type: 'session_meta', payload: { id: 'thread-1' } },
      ...this._steps.map((step) => ({
        type: 'turn_context',
        payload: Object.fromEntries([
          ['turn_id', step.id],
          ['model', 'gpt-6-astra'],
        ]),
      })),
    ];
    await Bun.write(
      resolve(this._codexHome, 'sessions/fixture.jsonl'),
      `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`,
    );
  }
}

function onlyCandidate(manifest: IRunManifest) {
  const candidate = manifest.candidates[0];
  if (candidate === undefined) {
    throw new Error('Missing candidate fixture.');
  }
  return candidate;
}

function metadata(): ICaseMetadata {
  return {
    id: 'execution-fixture',
    group: 'integration',
    kind: 'task',
    requirements: ['output'],
    fixture: [{ source: 'input.txt', target: 'copied.txt' }],
    execution: {
      networkAccess: false,
      pathPrepend: [],
      executableFiles: [],
    },
    reference: 'execution fixture',
    requiredSkills: [],
    turns: [
      {
        when: 'after-turn',
        match: 'first output',
        reply: 'second task',
      },
    ],
    authorization: { scope: 'fixture', approvals: [] },
    outputSchema: null,
  };
}

function loadedCase(): ILoadedCase {
  const check: ICaseAssertion = {
    type: 'javascript',
    value: 'file://src/grading/assertion.ts',
    metric: 'output',
    config: {
      core: true,
      method: 'programmatic',
      requirements: ['output'],
      rubric: 'The fixture output contains the expected text.',
      rule: { type: 'text-contains', value: 'output' },
    },
  };
  const definition = {
    description: 'execution fixture',
    vars: { task: 'first task' },
    metadata: metadata(),
    assert: [check],
  };
  return {
    definition,
    version: 'case-v1',
    executionVersion: 'execution-v1',
    source: 'cases/fixture.json',
  };
}

function candidate() {
  const inventory = { sha256: 'candidate-inventory', entries: [] };
  return {
    id: 'candidate-1',
    label: 'candidate fixture',
    source: 'fixture',
    runtimeDirectory: 'inputs/candidate-1/runtime',
    profileDirectory: 'private/profiles/default',
    inventory,
    profileInventory: inventory,
  };
}

function manifest(trial: IPlannedTrial, loaded: ILoadedCase): IRunManifest {
  return {
    schema: 'codex-evals/run-v1',
    id: 'run-execution',
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
    cases: [loaded],
    trials: [trial],
  };
}

async function executeFixture(): Promise<{
  root: string;
  runDirectory: string;
  manifest: IRunManifest;
  trial: IPlannedTrial;
  loaded: ILoadedCase;
}> {
  const root = await mkdtemp(resolve('.cache/execution-test-'));
  roots.push(root);
  const runDirectory = resolve(root, 'run');
  const loaded = loadedCase();

  const trial: IPlannedTrial = {
    id: 'trial-execution',
    caseId: loaded.definition.metadata.id,
    candidateId: 'candidate-1',
    caseVersion: loaded.version,
    executionVersion: loaded.executionVersion,
    repetition: 0,
    criteria: [
      {
        id: 'output',
        definitionId: 'criterion-v1',
        core: true,
      },
    ],
  };

  const currentCandidate = candidate();
  await mkdir(resolve(runDirectory, 'private/fixtures'), { recursive: true });
  await mkdir(resolve(runDirectory, currentCandidate.runtimeDirectory, 'config/codex'), {
    recursive: true,
  });
  await mkdir(resolve(runDirectory, currentCandidate.profileDirectory), { recursive: true });
  await Bun.write(resolve(runDirectory, 'private/fixtures/input.txt'), 'fixture input\n');
  await chmod(resolve(runDirectory, 'private/fixtures/input.txt'), 0o644);
  await Bun.write(
    resolve(runDirectory, currentCandidate.profileDirectory, 'runtime.json'),
    '{"authentication":[]}\n',
  );

  await Bun.write(
    resolve(runDirectory, currentCandidate.runtimeDirectory, 'config/codex/config.toml'),
    '',
  );

  await writeJsonRecord(resolve(runDirectory, 'manifest.json'), manifest(trial, loaded));

  return {
    root,
    runDirectory,
    manifest: manifest(trial, loaded),
    trial,
    loaded,
  };
}

function readyFactory(options: IFakePreparationOptions) {
  return async (input: INativePreparationInput): Promise<NativePreparationResult> => {
    const nativeDirectory = resolve(input.directory, 'native');
    const codexHome = resolve(nativeDirectory, 'home/.codex');
    const protocolPath = resolve(nativeDirectory, 'protocol.jsonl');
    const evidencePath = resolve(nativeDirectory, 'preparation.json');
    await mkdir(codexHome, { recursive: true });
    await Bun.write(
      evidencePath,
      JSON.stringify({
        installation: { runtimeTools: [{ name: 'fixture' }] },
        probes: { runtimeTools: [{ name: 'fixture', version: '1' }] },
        discovery: { skills: { data: [] } },
      }),
    );

    await Bun.write(protocolPath, '');

    const fakeSession = new FakeSession(
      protocolPath,
      codexHome,
      resolve(input.directory, 'workspace'),
      options.steps,
      options.writeArtifact ?? false,
    );

    await fakeSession.writeSessionHistory();
    if (options.sessionTail !== undefined) {
      await appendFile(resolve(codexHome, 'sessions/fixture.jsonl'), `${options.sessionTail}\n`);
    }

    return {
      status: 'ready',
      session: fakeSession as never,
      thread: {
        id: 'thread-1',
        model: 'gpt-6-astra',
        modelProvider: 'fixture',
        reasoningEffort: 'high',
        response: {},
      },
      evidencePath,
      protocolPath,
      codexHome,
      workspace: resolve(input.directory, 'workspace'),
      finalize: async () => undefined,
    } as IReadyNativeTrial;
  };
}

afterEach(async () => {
  preparationFactory = async () => {
    throw new Error('The native preparation fixture was not configured.');
  };
  batchMode = 'success';
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

afterAll(() => {
  mock.module(nativeModulePath, () => ({ prepareNativeTrial: originalPrepareNativeTrial }));
  mock.module(batchModulePath, () => ({ runPromptfooBatch: originalRunPromptfooBatch }));
});

test('executes completed scripted turns in one native thread and records evidence and consumption', async () => {
  const fixture = await executeFixture();
  preparationFactory = readyFactory({
    writeArtifact: true,
    steps: [
      {
        id: 'turn-1',
        status: 'completed',
        output: 'first output',
      },
      {
        id: 'turn-2',
        status: 'completed',
        output: 'second output',
      },
    ],
  });

  const result = await executeTrial({
    runDirectory: fixture.runDirectory,
    manifest: fixture.manifest,
    trial: fixture.trial,
    candidate: onlyCandidate(fixture.manifest),
    case: fixture.loaded,
    credentials: Object.fromEntries([['TOKEN', 'fixture-secret']]),
  });

  expect(result).toMatchObject({
    status: 'completed',
    output: 'second output',
    threadIds: ['thread-1'],
    turnIds: ['turn-1', 'turn-2'],
    operationIds: ['trial-execution-preparation', 'trial-execution-candidate'],
  });

  expect(result.evidencePath).toBe('trials/trial-execution/evidence.json');
  expect(
    await Bun.file(
      resolve(fixture.runDirectory, 'trials/trial-execution/workspace/copied.txt'),
    ).text(),
  ).toBe('fixture input\n');

  expect(
    await Bun.file(
      resolve(fixture.runDirectory, 'trials/trial-execution/artifacts/candidate-output.txt'),
    ).text(),
  ).toBe('candidate artifact\n');

  const evidencePath = result.evidencePath;
  if (evidencePath === null) {
    throw new Error('Missing execution evidence.');
  }

  const evidence = await Bun.file(resolve(fixture.runDirectory, evidencePath)).json();

  expect(evidence).toMatchObject({
    threadIds: ['thread-1'],
    turnIds: ['turn-1', 'turn-2'],
    output: 'second output',
  });

  expect(evidence.actors[0]).toMatchObject({
    modelsByTurn: { 'turn-1': 'gpt-6-astra', 'turn-2': 'gpt-6-astra' },
  });
  expect(evidence.actors[0].contexts).toHaveLength(2);
  const candidateOperation = await Bun.file(
    resolve(fixture.runDirectory, 'operations/trial-execution-candidate/record.json'),
  ).json();

  expect(candidateOperation).toMatchObject({ status: 'completed', usesModel: true });
  expect(candidateOperation.observations).toHaveLength(2);
});

test('records a prerequisite refusal without starting a candidate operation', async () => {
  const fixture = await executeFixture();
  preparationFactory = async (input) => ({
    status: 'not-run',
    reason: 'fixture prerequisite refused',
    evidencePath: resolve(input.directory, 'native/preparation.json'),
  });

  const result = await executeTrial({
    runDirectory: fixture.runDirectory,
    manifest: fixture.manifest,
    trial: fixture.trial,
    candidate: onlyCandidate(fixture.manifest),
    case: fixture.loaded,
    credentials: {},
  });

  expect(result).toMatchObject({ status: 'not-run', errors: ['fixture prerequisite refused'] });
  expect(result.operationIds).toEqual(['trial-execution-preparation']);
  expect(
    await Bun.file(
      resolve(fixture.runDirectory, 'operations/trial-execution-preparation/record.json'),
    ).json(),
  ).toMatchObject({
    status: 'failed',
    phase: 'preparation',
    usesModel: false,
  });

  expect(
    await Bun.file(
      resolve(fixture.runDirectory, 'trials/trial-execution/candidate-started.json'),
    ).exists(),
  ).toBeFalse();
});

test('cancellation during preparation never starts a candidate turn', async () => {
  const fixture = await executeFixture();
  const controller = new AbortController();
  const prepare = readyFactory({ steps: [] });
  preparationFactory = async (input) => {
    const ready = await prepare(input);
    controller.abort(new Error('Cancel during preparation'));
    return ready;
  };

  const result = await executeTrial({
    runDirectory: fixture.runDirectory,
    manifest: fixture.manifest,
    trial: fixture.trial,
    candidate: onlyCandidate(fixture.manifest),
    case: fixture.loaded,
    credentials: {},
    signal: controller.signal,
  });

  expect(result.status).toBe('not-run');
  expect(result.operationIds).toEqual(['trial-execution-preparation']);
  expect(
    await Bun.file(
      resolve(fixture.runDirectory, 'trials/trial-execution/candidate-started.json'),
    ).exists(),
  ).toBeFalse();
});

test('an unmatched native question interrupts the current turn instead of inventing a reply', async () => {
  const fixture = await executeFixture();
  const prepare = readyFactory({ steps: [] });
  let interrupted = false;
  preparationFactory = async (input) => {
    const ready = await prepare(input);
    if (ready.status !== 'ready') {
      throw new Error('Missing ready fixture.');
    }
    ready.session.runTurn = async (_text, options) => {
      if (input.onServerRequest === undefined) {
        throw new Error('Missing scripted user handler.');
      }
      await input.onServerRequest(
        'item/tool/requestUserInput',
        { questions: [{ id: 'region', question: 'Which region?' }] },
        'question-1',
      );

      interrupted = options?.signal?.aborted ?? false;

      return {
        id: 'turn-1',
        status: interrupted ? 'interrupted' : 'completed',
        response: {},
      };
    };

    return ready;
  };

  const result = await executeTrial({
    runDirectory: fixture.runDirectory,
    manifest: fixture.manifest,
    trial: fixture.trial,
    candidate: onlyCandidate(fixture.manifest),
    case: fixture.loaded,
    credentials: {},
  });

  expect(interrupted).toBeTrue();
  expect(result.status).toBe('incomplete');
  expect(result.errors).toContain('No declared user reply matches this native question set.');
  expect(
    await Bun.file(
      resolve(fixture.runDirectory, 'trials/trial-execution/interaction.jsonl'),
    ).text(),
  ).toContain('item/tool/requestUserInput');
});

test.each([
  ['failed', 'error'],
  ['interrupted', 'incomplete'],
] as const)(
  'retains evidence and marks candidate consumption incomplete after %s turn',
  async (turnStatus, resultStatus) => {
    const fixture = await executeFixture();
    preparationFactory = readyFactory({
      steps: [
        {
          id: 'turn-1',
          status: turnStatus,
          output: 'partial output',
        },
      ],
    });

    const result = await executeTrial({
      runDirectory: fixture.runDirectory,
      manifest: fixture.manifest,
      trial: fixture.trial,
      candidate: onlyCandidate(fixture.manifest),
      case: fixture.loaded,
      credentials: {},
    });

    expect(result).toMatchObject({
      status: resultStatus,
      errors: [`Native turn turn-1: ${turnStatus}`],
    });

    expect(result.evidencePath).toBe('trials/trial-execution/evidence.json');
    expect(
      await Bun.file(
        resolve(fixture.runDirectory, 'operations/trial-execution-candidate/record.json'),
      ).json(),
    ).toMatchObject({ status: 'incomplete', usesModel: true });

    const candidateOperation = await Bun.file(
      resolve(fixture.runDirectory, 'operations/trial-execution-candidate/record.json'),
    ).json();

    expect(candidateOperation.observations[0]).toMatchObject({ usage: { input: 3, output: 2 } });
  },
);

test('persists live failed-turn evidence when an auxiliary session log is truncated', async () => {
  const fixture = await executeFixture();
  preparationFactory = readyFactory({
    steps: [
      {
        id: 'turn-1',
        status: 'failed',
        output: 'partial output',
      },
    ],
    sessionTail: '{"truncated":',
  });

  const result = await executeTrial({
    runDirectory: fixture.runDirectory,
    manifest: fixture.manifest,
    trial: fixture.trial,
    candidate: onlyCandidate(fixture.manifest),
    case: fixture.loaded,
    credentials: {},
  });

  expect(result).toMatchObject({
    status: 'error',
    output: 'partial output',
    evidencePath: 'trials/trial-execution/evidence.json',
    threadIds: ['thread-1'],
    turnIds: ['turn-1'],
  });

  expect(result.errors).toEqual(['Native turn turn-1: failed']);
  const evidencePath = result.evidencePath;
  if (evidencePath === null) {
    throw new Error('Missing execution evidence.');
  }

  const evidence = await Bun.file(resolve(fixture.runDirectory, evidencePath)).json();

  expect(evidence.output).toBe('partial output');
  expect(evidence.issues).toEqual([expect.stringContaining('sessions/fixture.jsonl#L3')]);
  expect(
    await Bun.file(
      resolve(fixture.runDirectory, 'operations/trial-execution-candidate/record.json'),
    ).json(),
  ).toMatchObject({
    status: 'incomplete',
    observations: [{ usage: { input: 3, output: 2 } }],
  });
});

test('keeps completed execution errors separate from auxiliary evidence warnings', async () => {
  const fixture = await executeFixture();
  preparationFactory = readyFactory({
    steps: [
      {
        id: 'turn-1',
        status: 'completed',
        output: 'first output',
      },
      {
        id: 'turn-2',
        status: 'completed',
        output: 'complete output',
      },
    ],
    sessionTail: '{"truncated":',
  });

  const result = await executeTrial({
    runDirectory: fixture.runDirectory,
    manifest: fixture.manifest,
    trial: fixture.trial,
    candidate: onlyCandidate(fixture.manifest),
    case: fixture.loaded,
    credentials: {},
  });

  expect(result).toMatchObject({
    status: 'completed',
    output: 'complete output',
    evidencePath: 'trials/trial-execution/evidence.json',
    threadIds: ['thread-1'],
    turnIds: ['turn-1', 'turn-2'],
    errors: [],
  });

  const evidencePath = result.evidencePath;
  if (evidencePath === null) {
    throw new Error('Missing execution evidence.');
  }

  const evidence = await Bun.file(resolve(fixture.runDirectory, evidencePath)).json();

  expect(evidence.issues).toEqual([expect.stringContaining('sessions/fixture.jsonl#L4')]);
  const operation = await Bun.file(
    resolve(fixture.runDirectory, 'operations/trial-execution-candidate/record.json'),
  ).json();

  expect(operation).toMatchObject({ status: 'completed' });
  expect(operation.observations).toHaveLength(2);
  expect(operation.observations[0]).toMatchObject({ usage: { input: 3, output: 2 } });
});

async function createWorkerFixture(): Promise<{ root: string; directory: string }> {
  const root = await mkdtemp(resolve('.cache/worker-test-'));
  roots.push(root);
  const directory = resolve(root, 'run');
  const loaded = loadedCase();

  const trial: IPlannedTrial = {
    id: 'worker-trial',
    caseId: loaded.definition.metadata.id,
    candidateId: 'candidate-1',
    caseVersion: loaded.version,
    executionVersion: loaded.executionVersion,
    repetition: 0,
    criteria: [
      {
        id: 'worker',
        definitionId: 'worker-criterion',
        core: true,
      },
    ],
  };

  const workerCandidate = candidate();
  await mkdir(resolve(directory, workerCandidate.profileDirectory), { recursive: true });
  await Bun.write(
    resolve(directory, workerCandidate.profileDirectory, 'runtime.json'),
    '{"authentication":[]}\n',
  );

  await writeJsonRecord(resolve(directory, 'manifest.json'), {
    ...manifest(trial, loaded),
    id: 'worker-run',
    trials: [trial],
    cases: [loaded],
  });

  await writeJsonRecord(resolve(directory, 'operations/worker-freeze/record.json'), {
    id: 'worker-freeze',
    trialId: null,
    phase: 'preparation',
    status: 'completed',
    usesModel: false,
    startedAt: 1,
    endedAt: 2,
    observations: [],
  });

  return { root, directory };
}

test('worker wires deterministic batch export and failure records into reports', async () => {
  const previousExitCode = process.exitCode;
  try {
    for (const mode of ['success', 'failure'] as const) {
      const fixture = await createWorkerFixture();
      batchMode = mode;
      batchCalls = 0;
      preparationFactory = async (input) => ({
        status: 'not-run',
        reason: 'worker fixture prerequisite refusal',
        evidencePath: resolve(input.directory, 'native/preparation.json'),
      });

      process.exitCode = 0;
      const reportPath = await runWorker(fixture.directory, new AbortController().signal);

      expect(batchCalls).toBe(1);
      expect(await Bun.file(resolve(fixture.directory, 'run-started.json')).exists()).toBeTrue();
      expect(await Bun.file(reportPath).exists()).toBeTrue();
      const finished = await Bun.file(resolve(fixture.directory, 'run-finished.json')).json();

      expect(finished.status).toBe(mode === 'success' ? 'completed' : 'error');
      const report = await Bun.file(reportPath).json();

      expect(report.runOutcome).toEqual({
        status: finished.status,
        error: finished.error,
        evidence: 'run-finished.json',
      });

      if (mode === 'success') {
        const nativeExport = await Bun.file(
          resolve(fixture.directory, 'native-export.json'),
        ).json();

        expect(nativeExport).toMatchObject({ evaluationId: 'fixture-evaluation', rows: 1 });
        expect(report.definition.nativeExport).toEqual({
          jsonPath: nativeExport.jsonPath,
          htmlPath: nativeExport.htmlPath,
        });

        expect(process.exitCode).toBe(0);
      } else {
        expect(
          await Bun.file(resolve(fixture.directory, 'native-export.json')).exists(),
        ).toBeFalse();
        expect(finished.error).toBe('fixture Promptfoo batch failed');
        expect(await Bun.file(reportPath.replace(/\.json$/u, '.md')).text()).toContain(
          'Run error: fixture Promptfoo batch failed',
        );
        expect(process.exitCode).toBe(1);
      }
    }
  } finally {
    process.exitCode = previousExitCode ?? 0;
  }
});
