import { afterEach, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadLedger, selectGrades } from '../../src/execution/ledger.ts';
import { saveReport } from '../../src/execution/worker.ts';
import { buildQualityReport } from '../../src/results/quality.ts';
import type {
  IPlannedTrial,
  IRunManifest,
  IStoredGrade,
  ITrialResult,
} from '../../src/results/records.ts';
import { accountResources, type IResourceOperation } from '../../src/results/resources.ts';

const roots: string[] = [];
const inventory = { sha256: 'inventory', entries: [] } as const;

function trial(id: string): IPlannedTrial {
  return {
    id,
    caseId: 'case-ledger',
    candidateId: 'candidate',
    caseVersion: 'case-v1',
    executionVersion: 'execution-v1',
    repetition: 0,
    criteria: [
      {
        id: 'criterion',
        definitionId: 'criterion-v1',
        core: true,
      },
    ],
  };
}

function manifest(trials: readonly IPlannedTrial[]): IRunManifest {
  return {
    schema: 'codex-evals/run-v1',
    id: 'run-ledger',
    createdAt: 1,
    concurrency: 1,
    repetitions: 1,
    codexExecutable: '/codex',
    codexVersion: 'fixture',
    framework: {
      bun: '1.4.2',
      promptfoo: '0.123.0',
      implementationHash: 'implementation',
    },
    judge: {
      model: 'gpt-6-astra',
      reasoningEffort: 'high',
      definitionId: 'judge-v1',
    },
    candidates: [
      {
        id: 'candidate',
        label: 'candidate',
        source: 'fixture',
        runtimeDirectory: 'inputs/candidate/runtime',
        profileDirectory: 'private/profiles/default',
        inventory,
        profileInventory: inventory,
      },
    ],
    cases: [],
    trials: [...trials],
  };
}

function operation(id: string, startedAt: number): IResourceOperation {
  return {
    id,
    trialId: 'trial-candidate',
    phase: 'candidate',
    status: 'completed',
    usesModel: true,
    startedAt,
    endedAt: startedAt + 1,
    observations: [],
  };
}

function grade(id: string, status: IStoredGrade['status'], operationId: string): IStoredGrade {
  return {
    id,
    trialId: 'trial-candidate',
    criterionId: 'criterion',
    definitionId: 'criterion-v1',
    status,
    reason: status,
    evidence: [],
    operationId,
    method: 'programmatic',
    grader: {
      model: null,
      reasoningEffort: null,
      route: 'programmatic',
      definitionId: 'judge-v1',
    },
    error: null,
  };
}

function result(id: string, operationIds: string[]): ITrialResult {
  return {
    id,
    status: 'completed',
    queuedAt: 1,
    startedAt: 10,
    endedAt: 20,
    errors: [],
    output: 'Recorded output',
    evidencePath: null,
    protocolPath: null,
    artifacts: null,
    threadIds: [],
    turnIds: [],
    operationIds,
    environmentFingerprint: null,
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true });
  await Bun.write(path, `${JSON.stringify(value)}\n`);
}

function interceptFileExists(
  path: string,
  onExists: (file: Bun.BunFile) => Promise<boolean>,
): () => void {
  const originalFile = Bun.file;
  Bun.file = new Proxy(originalFile, {
    apply(target, receiver, args) {
      const file: Bun.BunFile = Reflect.apply(target, receiver, args);
      if (args[0] !== path) {
        return file;
      }

      return new Proxy(file, {
        get(targetFile, property) {
          if (property === 'exists') {
            return () => onExists(targetFile);
          }

          const value = Reflect.get(targetFile, property, targetFile);
          return typeof value === 'function' ? value.bind(targetFile) : value;
        },
      });
    },
  });

  return () => {
    Bun.file = originalFile;
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('reconstructs unfinished candidate and preparation trials without retrying either one', async () => {
  const root = await mkdtemp(resolve('.cache/ledger-test-'));
  roots.push(root);
  const candidateTrial = trial('trial-candidate');
  const preparationTrial = trial('trial-preparation');
  await writeJson(resolve(root, 'manifest.json'), manifest([candidateTrial, preparationTrial]));
  await writeJson(resolve(root, 'trials/trial-candidate/started.json'), { startedAt: 10 });
  await writeJson(resolve(root, 'trials/trial-candidate/candidate-started.json'), {
    id: 'trial-candidate-candidate',
    trialId: 'trial-candidate',
    phase: 'candidate',
    status: 'running',
    usesModel: true,
    startedAt: 20,
    endedAt: null,
    observations: [],
  });

  await writeJson(resolve(root, 'trials/trial-preparation/started.json'), { startedAt: 30 });
  await writeJson(resolve(root, 'operations/shared/record.json'), {
    ...operation('shared', 1),
    trialId: null,
    phase: 'preparation',
    usesModel: false,
  });

  await writeJson(resolve(root, 'operations/shared/operation-started.json'), {
    ...operation('shared', 1),
    trialId: null,
    phase: 'preparation',
    usesModel: false,
    status: 'running',
  });

  const ledger = await loadLedger(root);

  expect(ledger.trials).toHaveLength(2);
  expect(ledger.trials).toContainEqual(
    expect.objectContaining({
      id: 'trial-candidate',
      status: 'incomplete',
      operationIds: ['trial-candidate-preparation', 'trial-candidate-candidate'],
      errors: ['The trial started but has no final execution record. No retry was performed.'],
    }),
  );

  expect(ledger.trials).toContainEqual(
    expect.objectContaining({
      id: 'trial-preparation',
      status: 'incomplete',
      operationIds: ['trial-preparation-preparation'],
    }),
  );

  expect(ledger.operations.filter((item) => item.id === 'shared')).toHaveLength(1);
  expect(ledger.operations.find((item) => item.id === 'trial-candidate-preparation')).toMatchObject(
    {
      status: 'completed',
      phase: 'preparation',
      usesModel: false,
      startedAt: 10,
      endedAt: 20,
    },
  );

  expect(ledger.operations.find((item) => item.id === 'trial-candidate-candidate')).toMatchObject({
    status: 'incomplete',
    phase: 'candidate',
  });

  expect(
    ledger.operations.find((item) => item.id === 'trial-preparation-preparation'),
  ).toMatchObject({
    status: 'incomplete',
    phase: 'preparation',
    usesModel: false,
  });
});

test('refuses concurrent result publication, then includes its operations in a fresh read', async () => {
  const root = await mkdtemp(resolve('.cache/ledger-test-'));
  roots.push(root);
  await writeJson(resolve(root, 'manifest.json'), manifest([trial('trial-candidate')]));
  const resultPath = resolve(root, 'trials/trial-candidate/result.json');
  const candidate: IResourceOperation = {
    ...operation('candidate-operation', 10),
    observations: [
      {
        id: 'usage',
        actorId: 'candidate',
        threadId: 'thread',
        turnId: 'turn',
        kind: 'delta',
        observedAt: 11,
        model: 'gpt-6-astra',
        evidenceSource: 'fixture',
        usage: { input: 10, cachedInput: 0, output: 2, reasoningOutput: 0 },
        includedActorIds: [],
      },
    ],
  };

  const restoreFile = interceptFileExists(resultPath, async (file) => {
    await writeJson(resolve(root, 'operations/candidate-operation/record.json'), candidate);
    await writeJson(resultPath, result('trial-candidate', [candidate.id]));
    return file.exists();
  });

  try {
    await expect(loadLedger(root)).rejects.toThrow('Run records changed while being read');
  } finally {
    restoreFile();
  }

  const ledger = await loadLedger(root);
  const resources = accountResources({
    operations: ledger.operations,
    selectedOperationIds: ledger.operations.map((item) => item.id),
  });

  expect(ledger.trials[0]?.status).toBe('completed');
  expect(resources.operationCount).toBe(1);
  expect(resources.usage.total).toMatchObject({ value: 12, coverage: 'complete' });
});

test('refuses a candidate start published after checking its marker instead of reporting complete zero usage', async () => {
  const root = await mkdtemp(resolve('.cache/ledger-test-'));
  roots.push(root);
  await writeJson(resolve(root, 'manifest.json'), manifest([trial('trial-candidate')]));
  await writeJson(resolve(root, 'trials/trial-candidate/started.json'), { startedAt: 10 });
  const startPath = resolve(root, 'trials/trial-candidate/candidate-started.json');
  const restoreFile = interceptFileExists(startPath, async (file) => {
    const exists = await file.exists();
    await writeJson(startPath, {
      ...operation('trial-candidate-candidate', 20),
      status: 'running',
      endedAt: null,
    });
    return exists;
  });

  try {
    await expect(saveReport({ directory: root })).rejects.toThrow(
      'Run records changed while being read',
    );
    expect(await Array.fromAsync(new Bun.Glob('reports/*.json').scan(root))).toEqual([]);
  } finally {
    restoreFile();
  }

  const ledger = await loadLedger(root);
  const resources = accountResources({
    operations: ledger.operations,
    selectedOperationIds: ledger.operations.map((item) => item.id),
  });

  expect(resources.usage.total.coverage).toBe('partial');
  expect(resources.phases.find((phase) => phase.phase === 'candidate')?.usage.total).toMatchObject({
    value: null,
    coverage: 'unknown',
  });
  expect(
    resources.phases.find((phase) => phase.phase === 'preparation')?.operationDuration,
  ).toMatchObject({
    value: 10,
    coverage: 'complete',
  });
});

test('uses the ledger cutoff rather than the later report creation time', async () => {
  const root = await mkdtemp(resolve('.cache/ledger-test-'));
  roots.push(root);
  await writeJson(resolve(root, 'manifest.json'), manifest([trial('trial-candidate')]));
  const clock = spyOn(Date, 'now').mockReturnValueOnce(40).mockReturnValue(50);

  try {
    const reportPath = await saveReport({ directory: root });
    const report = await Bun.file(reportPath).json();

    expect(report.definition.accountingPolicy.cutoffAt).toBe(40);
    expect(report.createdAt).toBe(50);
  } finally {
    clock.mockRestore();
  }
});

test.each([
  {
    path: 'trials/trial-candidate/result.json',
    record: result('trial-other', []),
    message: 'Stored trial id does not match its directory',
  },
  {
    path: 'operations/op/record.json',
    record: operation('wrong-operation', 10),
    message: 'Stored operation identity does not match the run',
  },
  {
    path: 'grades/grade.json',
    record: grade('wrong-grade', 'passed', 'op'),
    message: 'Stored grade identity does not match the run',
  },
])('rejects misplaced stored identity at $path', async ({ path, record, message }) => {
  const root = await mkdtemp(resolve('.cache/ledger-test-'));
  roots.push(root);
  await writeJson(
    resolve(root, 'manifest.json'),
    manifest([trial('trial-candidate'), trial('trial-other')]),
  );
  await writeJson(resolve(root, path), record);

  await expect(loadLedger(root)).rejects.toThrow(message);
});

test.each(['missing', 'another-trial'])(
  'rejects a %s operation referenced by a result or grade',
  async (kind) => {
    const root = await mkdtemp(resolve('.cache/ledger-test-'));
    roots.push(root);
    await writeJson(
      resolve(root, 'manifest.json'),
      manifest([trial('trial-candidate'), trial('trial-other')]),
    );
    if (kind === 'another-trial') {
      await writeJson(resolve(root, 'operations/op/record.json'), {
        ...operation('op', 10),
        trialId: 'trial-other',
      });
    }

    await writeJson(
      resolve(root, 'trials/trial-candidate/result.json'),
      result('trial-candidate', ['op']),
    );
    await expect(loadLedger(root)).rejects.toThrow(
      'Stored operation reference does not match its trial',
    );

    await writeJson(
      resolve(root, 'trials/trial-candidate/result.json'),
      result('trial-candidate', []),
    );
    await writeJson(resolve(root, 'grades/grade.json'), grade('grade', 'passed', 'op'));

    await expect(loadLedger(root)).rejects.toThrow(
      'Stored operation reference does not match its trial',
    );
  },
);

test('selects only the latest matching grade, including later failed or unknown outcomes', () => {
  const definitions = [trial('trial-candidate')];

  const operations = [
    operation('op-old', 10),
    operation('op-failed', 20),
    operation('op-unknown', 30),
  ];

  const grades = [
    grade('grade-passed', 'passed', 'op-old'),
    grade('grade-failed', 'failed', 'op-failed'),
    grade('grade-unknown', 'unknown', 'op-unknown'),
  ];

  const selection = selectGrades(definitions, grades, operations);

  expect(selection).toEqual({ 'trial-candidate': { criterion: 'grade-unknown' } });
  expect(Object.values(selection['trial-candidate'] ?? {})).toEqual(['grade-unknown']);
});

test.each(['constructor', '__proto__'])('selects and serializes a valid check named %s', (id) => {
  const definition = {
    ...trial('trial-candidate'),
    criteria: [{ id, definitionId: 'criterion-v1', core: true }],
  };
  const storedGrade = { ...grade('selected-grade', 'passed', 'op'), criterionId: id };

  const selection = selectGrades([definition], [storedGrade], [operation('op', 10)]);
  const report = buildQualityReport(
    [definition],
    [storedGrade],
    JSON.parse(JSON.stringify(selection)),
  );

  expect(Object.hasOwn(selection['trial-candidate'] ?? {}, id)).toBe(true);
  expect(report.summary.passed).toBe(1);
});
