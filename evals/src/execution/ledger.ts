import { basename, dirname, resolve } from 'node:path';
import type { GradingSelection } from '../results/quality.ts';
import type {
  IPlannedTrial,
  IRunManifest,
  IStoredGrade,
  ITrialResult,
} from '../results/records.ts';
import type { IResourceOperation } from '../results/resources.ts';

export interface IRunLedger {
  manifest: IRunManifest;
  trials: ITrialResult[];
  grades: IStoredGrade[];
  operations: IResourceOperation[];
  cutoffAt: number;
  publishedPaths: ReadonlySet<string>;
}

async function publishedRecords(directory: string): Promise<string[]> {
  const patterns = [
    'run-finished.json',
    'native-export.json',
    'regrades/*/native-export.json',
    'trials/*/started.json',
    'trials/*/candidate-started.json',
    'trials/*/result.json',
    'grades/*.json',
    'operations/*/record.json',
    'operations/*/operation-started.json',
  ];
  const paths = await Promise.all(
    patterns.map((pattern) => Array.fromAsync(new Bun.Glob(pattern).scan(directory))),
  );

  return paths.flat().sort();
}

export async function loadLedger(directory: string): Promise<IRunLedger> {
  const manifest = (await Bun.file(resolve(directory, 'manifest.json')).json()) as IRunManifest;
  if (manifest.schema !== 'codex-evals/run-v1') {
    throw new Error('Unsupported run manifest.');
  }

  const publishedPaths = await publishedRecords(directory);
  const trials: ITrialResult[] = [];
  const grades: IStoredGrade[] = [];
  const operations = new Map<string, IResourceOperation>();
  const recoveredOperations: IResourceOperation[] = [];
  const trialIds = new Set(manifest.trials.map((trial) => trial.id));

  // Publishers write operations before their results/grades. Read those dependents first.
  for (const trial of manifest.trials) {
    const root = resolve(directory, 'trials', trial.id);
    const resultFile = Bun.file(resolve(root, 'result.json'));
    if (await resultFile.exists()) {
      const result = (await resultFile.json()) as ITrialResult;
      if (result.id !== trial.id) {
        throw new Error(`Stored trial id does not match its directory: ${trial.id}`);
      }
      trials.push(result);
      continue;
    }

    const started = Bun.file(resolve(root, 'started.json'));
    if (!(await started.exists())) {
      continue;
    }

    const { startedAt } = (await started.json()) as { startedAt: number };
    const candidateStart = Bun.file(resolve(root, 'candidate-started.json'));
    let candidate: IResourceOperation | null = null;
    if (await candidateStart.exists()) {
      candidate = (await candidateStart.json()) as IResourceOperation;
      if (candidate.id !== `${trial.id}-candidate` || candidate.trialId !== trial.id) {
        throw new Error(`Stored candidate start does not match its trial: ${trial.id}`);
      }
    }

    const preparation: IResourceOperation = {
      id: `${trial.id}-preparation`,
      trialId: trial.id,
      phase: 'preparation',
      status: candidate?.startedAt == null ? 'incomplete' : 'completed',
      usesModel: false,
      startedAt,
      endedAt: candidate?.startedAt ?? null,
      observations: [],
    };
    const recovered =
      candidate === null
        ? [preparation]
        : [preparation, { ...candidate, status: 'incomplete' as const }];
    recoveredOperations.push(...recovered);

    trials.push({
      id: trial.id,
      status: 'incomplete',
      queuedAt: manifest.createdAt,
      startedAt,
      endedAt: null,
      errors: ['The trial started but has no final execution record. No retry was performed.'],
      output: '',
      evidencePath: null,
      protocolPath: `trials/${trial.id}/native/protocol.jsonl`,
      artifacts: null,
      threadIds: [],
      turnIds: [],
      operationIds: recovered.map((operation) => operation.id),
      environmentFingerprint: null,
    });
  }

  for await (const path of new Bun.Glob('grades/*.json').scan(directory)) {
    const grade = (await Bun.file(resolve(directory, path)).json()) as IStoredGrade;
    if (grade.id !== basename(path, '.json') || !trialIds.has(grade.trialId)) {
      throw new Error(`Stored grade identity does not match the run: ${path}`);
    }
    grades.push(grade);
  }

  for (const name of ['record.json', 'operation-started.json']) {
    for await (const path of new Bun.Glob(`operations/*/${name}`).scan(directory)) {
      const record = (await Bun.file(resolve(directory, path)).json()) as IResourceOperation;
      if (
        record.id !== basename(dirname(path)) ||
        (record.trialId !== null && !trialIds.has(record.trialId))
      ) {
        throw new Error(`Stored operation identity does not match the run: ${path}`);
      }
      if (name === 'record.json' && operations.has(record.id)) {
        throw new Error(`Duplicate operation: ${record.id}`);
      }
      if (!operations.has(record.id)) {
        operations.set(
          record.id,
          name === 'record.json' ? record : { ...record, status: 'incomplete' },
        );
      }
    }
  }

  for (const operation of recoveredOperations) {
    if (!operations.has(operation.id)) {
      operations.set(operation.id, operation);
    }
  }

  for (const reference of [
    ...trials.flatMap((trial) =>
      trial.operationIds.map((operationId) => ({ operationId, trialId: trial.id })),
    ),
    ...grades.map((grade) => ({ operationId: grade.operationId, trialId: grade.trialId })),
  ]) {
    const operation = operations.get(reference.operationId);
    if (operation === undefined || operation.trialId !== reference.trialId) {
      throw new Error(
        `Stored operation reference does not match its trial: ${reference.operationId}`,
      );
    }
  }

  // Published records are immutable. An unchanged inventory brackets a consistent read;
  // concurrent additions require another report read, never another candidate execution.
  const cutoffAt = Date.now();
  const finalPaths = await publishedRecords(directory);
  if (
    publishedPaths.length !== finalPaths.length ||
    publishedPaths.some((path, index) => path !== finalPaths[index])
  ) {
    throw new Error('Run records changed while being read. Generate the report again.');
  }

  return {
    manifest,
    trials,
    grades,
    operations: [...operations.values()],
    cutoffAt,
    publishedPaths: new Set(publishedPaths),
  };
}

/** Outcome-independent rule: the latest matching attempt by start time, then stable ID. */
export function selectGrades(
  definitions: readonly IPlannedTrial[],
  grades: readonly IStoredGrade[],
  operations: readonly IResourceOperation[],
): GradingSelection {
  const starts = new Map(operations.map((operation) => [operation.id, operation.startedAt ?? -1]));
  const selections: Record<string, Record<string, string>> = Object.create(null);

  for (const trial of definitions) {
    const selected: Record<string, string> = Object.create(null);
    for (const criterion of trial.criteria) {
      const matching = grades.filter(
        (grade) =>
          grade.trialId === trial.id &&
          grade.criterionId === criterion.id &&
          grade.definitionId === criterion.definitionId,
      );

      matching.sort(
        (left, right) =>
          (starts.get(left.operationId) ?? -1) - (starts.get(right.operationId) ?? -1) ||
          left.id.localeCompare(right.id),
      );

      const latest = matching.at(-1);
      if (latest !== undefined) {
        selected[criterion.id] = latest.id;
      }
    }
    selections[trial.id] = selected;
  }

  return selections;
}
