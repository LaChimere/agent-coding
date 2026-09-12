import { expect, test } from 'bun:test';
import type { IGradingRecord } from '../../src/results/quality.ts';
import type {
  ICandidateSnapshot,
  IPlannedTrial,
  IRunManifest,
  IStoredGrade,
  ITrialResult,
} from '../../src/results/records.ts';
import {
  buildReport,
  type IReportDefinitionInput,
  renderReportMarkdown,
} from '../../src/results/report.ts';
import type { IResourceOperation, IUsageObservation } from '../../src/results/resources.ts';

const inventory = { sha256: 'inventory', entries: [] };
const candidate: ICandidateSnapshot = {
  id: 'candidate',
  label: 'candidate',
  source: 'fixture',
  runtimeDirectory: '/runtime',
  profileDirectory: '/profile',
  inventory,
  profileInventory: inventory,
};

function trial(id: string, caseId = id, executionVersion = `${id}-execution`): IPlannedTrial {
  return {
    id,
    caseId,
    candidateId: 'candidate',
    caseVersion: `${caseId}-v1`,
    executionVersion,
    repetition: 0,
    criteria: [
      {
        id: 'task',
        definitionId: 'rubric-v1',
        core: true,
      },
    ],
  };
}

function manifest(runId: string, trials: readonly IPlannedTrial[]): IRunManifest {
  return {
    schema: 'codex-evals/run-v1',
    id: runId,
    createdAt: 1,
    concurrency: 2,
    repetitions: 1,
    codexExecutable: 'codex',
    codexVersion: '0.154.0',
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
    candidates: [candidate],
    cases: [],
    trials: [...trials],
  };
}

function grade(
  id: string,
  trialId: string,
  status: IGradingRecord['status'],
  operationId: string,
): IStoredGrade {
  return {
    id,
    trialId,
    criterionId: 'task',
    definitionId: 'rubric-v1',
    status,
    reason: `Grade ${status}.`,
    evidence: ['trials/example/result.json#output'],
    operationId,
    method: 'programmatic',
    grader: {
      model: null,
      reasoningEffort: null,
      route: 'local',
      definitionId: 'judge-v1',
    },
    error: null,
  };
}

function result(trialId: string, status: ITrialResult['status'] = 'completed'): ITrialResult {
  const notRun = status === 'not-run';
  return {
    id: trialId,
    status,
    queuedAt: 0,
    startedAt: notRun ? null : 10,
    endedAt: notRun ? null : 20,
    errors: status === 'completed' ? [] : ['execution error'],
    output: 'done',
    evidencePath: `trials/${trialId}/evidence.json`,
    protocolPath: `trials/${trialId}/native/protocol.jsonl`,
    artifacts: null,
    threadIds: [`thread-${trialId}`],
    turnIds: [`turn-${trialId}`],
    operationIds: [`operation-${trialId}`],
    environmentFingerprint: 'same-observed-tools',
  };
}

function observation(id: string, input: number): IUsageObservation {
  return {
    id,
    actorId: `actor-${id}`,
    model: 'gpt-6-astra',
    threadId: `thread-${id}`,
    turnId: `turn-${id}`,
    kind: 'delta',
    observedAt: 1,
    usage: {
      input,
      output: 1,
      cachedInput: 0,
      reasoningOutput: 0,
    },
    evidenceSource: `events/${id}.jsonl`,
    includedActorIds: [],
  };
}

function operation(trialId: string, observations = [observation(trialId, 10)]): IResourceOperation {
  return {
    id: `operation-${trialId}`,
    trialId,
    phase: 'candidate',
    status: 'completed',
    usesModel: true,
    startedAt: 10,
    endedAt: 20,
    observations,
  };
}

function inputFor(
  runId: string,
  trials: readonly IPlannedTrial[],
  grades: readonly IStoredGrade[],
  operations: readonly IResourceOperation[],
  results: readonly ITrialResult[] = trials.map((item) => result(item.id)),
): {
  definition: IReportDefinitionInput;
  manifest: IRunManifest;
  trialResults: readonly ITrialResult[];
  grades: readonly IStoredGrade[];
  operations: readonly IResourceOperation[];
} {
  return {
    definition: {
      id: `${runId}-report`,
      runId,
      createdAt: 2,
      gradingSelection: Object.fromEntries(
        trials.map((item) => [item.id, { task: `grade-${item.id}` }]),
      ),
      operationIds: operations.map((item) => item.id),
      accountingPolicy: { mode: 'all-available', cutoffAt: 100 },
    },
    manifest: manifest(runId, trials),
    trialResults: results,
    grades,
    operations,
  };
}

test('builds an immutable report from explicit grading and resource selections', () => {
  const trials = [trial('trial-a')];
  const grades = [grade('grade-trial-a', 'trial-a', 'passed', 'operation-trial-a')];
  const operations = [operation('trial-a')];
  const source = inputFor('run-a', trials, grades, operations);

  const report = buildReport({
    ...source,
    definition: {
      ...source.definition,
      trialDefinitions: trials,
      wallClock: { startedAt: 0, endedAt: 30 },
    },
  });

  expect(report.definition.definitionSource).toBe('explicit');
  expect(report.definition.operationIds).toEqual(['operation-trial-a']);
  expect(report.quality.summary).toMatchObject({
    planned: 1,
    passed: 1,
    decisionCoverage: 1,
  });

  expect(report.trials[0]).toMatchObject({
    id: 'trial-a',
    execution: { status: 'completed', queueDuration: { value: 10 } },
    resources: { operationCount: 1 },
  });

  expect(renderReportMarkdown(report)).toContain(
    '[trials/trial-a/evidence.json](<../trials/trial-a/evidence.json>)',
  );
  expect(renderReportMarkdown(report)).toContain('Input tokens: 10 tokens');
  expect(renderReportMarkdown(report)).toContain('Estimated cost: unknown');
  expect(Object.isFrozen(report)).toBe(true);

  grades.push(grade('later', 'trial-a', 'failed', 'operation-trial-a'));
  const firstOperation = operations[0];
  if (firstOperation === undefined) {
    throw new Error('Test operation missing.');
  }
  firstOperation.observations = [observation('changed', 999)];

  expect(report.quality.summary.passed).toBe(1);
  expect(report.resources.usage.input.value).toBe(10);
});

test('renders phase token/cost coverage, check reasons, evidence and execution errors', () => {
  const source = inputFor(
    'run-a',
    [trial('trial-a')],
    [grade('grade-trial-a', 'trial-a', 'failed', 'operation-trial-a')],
    [operation('trial-a')],
    [result('trial-a', 'error')],
  );

  const report = buildReport(source);
  const markdown = renderReportMarkdown(report);

  expect(report.trials[0]?.execution.evidence.every((path) => typeof path === 'string')).toBe(true);
  expect(markdown).toContain('## Resources by phase');
  expect(markdown).toContain('### candidate');
  expect(markdown).toContain('Input tokens: 10 tokens');
  expect(markdown).toContain('Estimated cost: unknown');
  expect(markdown).toContain('Check task: failed — Grade failed.');
  expect(markdown).toContain(
    'Evidence: [trials/example/result.json#output](<../trials/example/result.json#output>)',
  );
  expect(markdown).toContain('Execution errors: execution error');
});

test('defaults to manifest rubric definitions and rejects selected grades outside the operation scope', () => {
  const trials = [trial('trial-a')];

  const source = inputFor(
    'run-a',
    trials,
    [grade('grade-trial-a', 'trial-a', 'passed', 'other-operation')],
    [operation('trial-a')],
  );

  expect(() => buildReport(source)).toThrow('outside the report operation scope');

  const valid = inputFor(
    'run-a',
    trials,
    [grade('grade-trial-a', 'trial-a', 'passed', 'operation-trial-a')],
    [operation('trial-a')],
  );

  const report = buildReport(valid);

  expect(report.definition.definitionSource).toBe('manifest');
  expect(report.definition.trialDefinitions).toEqual(valid.manifest.trials);
});

test('allows explicit rubric changes only when the planned execution identity is unchanged', () => {
  const source = inputFor(
    'run-a',
    [trial('trial-a')],
    [grade('grade-trial-a', 'trial-a', 'passed', 'operation-trial-a')],
    [operation('trial-a')],
  );

  const manifestTrial = source.manifest.trials[0];
  if (manifestTrial === undefined) {
    throw new Error('Test manifest trial missing.');
  }

  const changedExecution = {
    ...manifestTrial,
    executionVersion: 'different-execution',
  };

  expect(() =>
    buildReport({
      ...source,
      definition: { ...source.definition, trialDefinitions: [changedExecution] },
    }),
  ).toThrow('does not match manifest trial');

  const explicit = {
    ...manifestTrial,
    criteria: [
      {
        id: 'task',
        definitionId: 'rubric-v2',
        core: true,
      },
    ],
  };

  const changedGrade = {
    ...grade('grade-v2', 'trial-a', 'passed', 'operation-trial-a'),
    definitionId: 'rubric-v2',
  };

  const report = buildReport({
    ...source,
    definition: {
      ...source.definition,
      trialDefinitions: [explicit],
      gradingSelection: { 'trial-a': { task: 'grade-v2' } },
    },
    grades: [changedGrade],
  });

  expect(report.definition.definitionSource).toBe('explicit');
});

test('keeps missing execution records and selected grade absence unknown', () => {
  const trials = [trial('trial-a'), trial('trial-b')];

  const source = inputFor(
    'run-a',
    trials,
    [grade('grade-trial-a', 'trial-a', 'passed', 'operation-trial-a')],
    [operation('trial-a'), operation('trial-b')],
    [result('trial-a')],
  );

  source.definition.gradingSelection = { 'trial-a': { task: 'grade-trial-a' } };
  const report = buildReport(source);

  expect(report.summary.execution).toMatchObject({
    planned: 2,
    recorded: 1,
    notRecorded: 1,
    notRun: 0,
  });

  expect(report.quality.summary).toMatchObject({
    passed: 1,
    unknown: 1,
    decisionCoverage: 0.5,
  });

  expect(report.trials[1]?.execution.status).toBe('not-recorded');
  expect(report.trials[1]?.execution.executionDuration.coverage).toBe('unknown');
});

test('counts explicit not-run results separately from trials without a result', () => {
  const trials = [trial('trial-a'), trial('trial-b'), trial('trial-c')];

  const source = inputFor(
    'run-a',
    trials,
    [grade('grade-trial-a', 'trial-a', 'passed', 'operation-trial-a')],
    trials.map((item) => operation(item.id)),
    [result('trial-a'), result('trial-b', 'not-run')],
  );

  source.definition.gradingSelection = { 'trial-a': { task: 'grade-trial-a' } };
  const report = buildReport(source);

  expect(report.summary.execution).toMatchObject({
    planned: 3,
    recorded: 2,
    notRecorded: 1,
    notRun: 1,
  });

  expect(report.trials[1]?.execution.status).toBe('not-run');
});

test('filters per-trial charge evidence after validating the global ledger', () => {
  const trials = [trial('trial-a'), trial('trial-b')];

  const source = inputFor(
    'run-a',
    trials,
    [
      grade('grade-trial-a', 'trial-a', 'passed', 'operation-trial-a'),
      grade('grade-trial-b', 'trial-b', 'passed', 'operation-trial-b'),
    ],
    trials.map((item) => operation(item.id)),
  );

  const report = buildReport({
    ...source,
    definition: {
      ...source.definition,
      actualCharges: [
        {
          id: 'charge-a',
          operationId: 'operation-trial-a',
          amount: 1,
          currency: 'USD',
          source: 'billing',
          attributable: true,
          reason: null,
        },
        {
          id: 'charge-b',
          operationId: 'operation-trial-b',
          amount: 2,
          currency: 'USD',
          source: 'billing',
          attributable: true,
          reason: null,
        },
      ],
    },
  });

  expect(report.trials[0]?.resources.actualCost.value).toBe(1);
  expect(report.trials[1]?.resources.actualCost.value).toBe(2);
});

test('requires selected grading operations to belong to the graded trial and manifest', () => {
  const trials = [trial('trial-a'), trial('trial-b')];

  const source = inputFor(
    'run-a',
    trials,
    [grade('grade-trial-a', 'trial-a', 'passed', 'operation-trial-b')],
    trials.map((item) => operation(item.id)),
  );

  expect(() => buildReport(source)).toThrow('does not match its trial operation');

  expect(() =>
    buildReport({
      ...inputFor(
        'run-a',
        [trial('trial-a')],
        [grade('grade-trial-a', 'trial-a', 'passed', 'operation-other-trial')],
        [operation('other-trial')],
      ),
    }),
  ).toThrow('unknown trial');
});

test('requires the saved operation scope to cover every available operation through its cutoff', () => {
  const source = inputFor(
    'run-a',
    [trial('trial-a'), trial('trial-b')],
    [grade('grade-trial-a', 'trial-a', 'passed', 'operation-trial-a')],
    [operation('trial-a'), operation('trial-b')],
  );
  source.definition.gradingSelection = { 'trial-a': { task: 'grade-trial-a' } };

  expect(() =>
    buildReport({
      ...source,
      definition: { ...source.definition, operationIds: ['operation-trial-a'] },
    }),
  ).toThrow('omits available operation');
});

test('rejects duplicate and unknown report operations before accounting', () => {
  const trials = [trial('trial-a')];

  const source = inputFor(
    'run-a',
    trials,
    [grade('grade-trial-a', 'trial-a', 'passed', 'operation-trial-a')],
    [operation('trial-a')],
  );

  expect(() =>
    buildReport({
      ...source,
      definition: {
        ...source.definition,
        operationIds: ['operation-trial-a', 'operation-trial-a'],
      },
    }),
  ).toThrow('Duplicate report operation id');

  expect(() =>
    buildReport({
      ...source,
      definition: { ...source.definition, operationIds: ['missing'] },
    }),
  ).toThrow('Unknown report operation');
});
