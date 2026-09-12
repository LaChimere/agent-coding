import { expect, test } from 'bun:test';
import { compareReports } from '../../src/results/compare.ts';
import type { IGradingRecord } from '../../src/results/quality.ts';
import type {
  ICandidateSnapshot,
  IPlannedTrial,
  IRunManifest,
  IStoredGrade,
  ITrialResult,
} from '../../src/results/records.ts';
import { buildReport, type IReport } from '../../src/results/report.ts';
import type {
  IActualChargeEvidence,
  IPriceBook,
  IResourceOperation,
  IUsageObservation,
} from '../../src/results/resources.ts';

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

function trial(id: string, caseId: string, executionVersion: string): IPlannedTrial {
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

function manifest(runId: string, trials: readonly IPlannedTrial[], concurrency = 2): IRunManifest {
  return {
    schema: 'codex-evals/run-v1',
    id: runId,
    createdAt: 1,
    concurrency,
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
    evidence: [`evidence/${trialId}.json`],
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

function result(trialId: string): ITrialResult {
  return {
    id: trialId,
    status: 'completed',
    queuedAt: 0,
    startedAt: 10,
    endedAt: 20,
    errors: [],
    output: 'done',
    evidencePath: `evidence/${trialId}.jsonl`,
    protocolPath: null,
    artifacts: null,
    threadIds: [`thread-${trialId}`],
    turnIds: [`turn-${trialId}`],
    operationIds: [`operation-${trialId}`],
    environmentFingerprint: 'same-observed-tools',
  };
}

function observation(trialId: string, input: number): IUsageObservation {
  return {
    id: `usage-${trialId}`,
    actorId: `actor-${trialId}`,
    model: 'gpt-6-astra',
    threadId: `thread-${trialId}`,
    turnId: `turn-${trialId}`,
    kind: 'delta',
    observedAt: 1,
    usage: {
      input,
      output: 1,
      cachedInput: 0,
      reasoningOutput: 0,
    },
    evidenceSource: `events/${trialId}.jsonl`,
    includedActorIds: [],
  };
}

function operation(
  trialId: string,
  observations: readonly IUsageObservation[] = [observation(trialId, 10)],
  id = `operation-${trialId}`,
  usesModel = true,
): IResourceOperation {
  return {
    id,
    trialId,
    phase: usesModel ? 'candidate' : 'verification',
    status: 'completed',
    usesModel,
    startedAt: 10,
    endedAt: 20,
    observations,
  };
}

function priceBook(currency: string): IPriceBook {
  return {
    source: 'test-prices',
    version: '2026-09-12',
    currency,
    rates: {
      standard: {
        input: 1,
        output: 2,
        cachedInput: 0,
      },
    },
    modelMapping: { 'gpt-6-astra': 'standard' },
  };
}

function makeReport(
  runId: string,
  trials: readonly IPlannedTrial[],
  statuses: Readonly<Record<string, IGradingRecord['status']>>,
  operations: readonly IResourceOperation[],
  prices?: IPriceBook,
  concurrency = 2,
  cutoffAt = 100,
  graderOverrides: Readonly<Record<string, Partial<IStoredGrade['grader']>>> = {},
  actualCharges?: readonly IActualChargeEvidence[],
): IReport {
  const grades = trials
    .filter((item) => statuses[item.id] !== undefined)
    .map((item) => {
      const status = statuses[item.id];
      if (status === undefined) {
        throw new Error(`Missing status for ${item.id}.`);
      }

      const base = grade(`grade-${item.id}`, item.id, status, `operation-${item.id}`);
      const override = graderOverrides[item.id];

      return override === undefined ? base : { ...base, grader: { ...base.grader, ...override } };
    });
  const gradingSelection = Object.fromEntries(
    grades.map((item) => [item.trialId, { task: item.id }]),
  );
  return buildReport({
    definition: {
      id: `${runId}-report`,
      runId,
      createdAt: 2,
      gradingSelection,
      operationIds: operations.map((item) => item.id),
      accountingPolicy: { mode: 'all-available' as const, cutoffAt },
      ...(prices === undefined ? {} : { priceBook: prices }),
      ...(actualCharges === undefined ? {} : { actualCharges }),
    },
    manifest: manifest(runId, trials, concurrency),
    trialResults: trials.map((item) => result(item.id)),
    grades,
    operations,
  });
}

test('uses only explicit pairs and counts jointly decidable quality observations', () => {
  const leftTrials = [
    trial('left-1', 'case-1', 'execution-1'),
    trial('left-2', 'case-2', 'execution-2'),
    trial('left-3', 'case-3', 'execution-3'),
  ];

  const rightTrials = [
    trial('right-1', 'case-1', 'execution-1'),
    trial('right-2', 'case-2', 'execution-2'),
    trial('right-3', 'case-3', 'execution-3'),
  ];

  const left = makeReport(
    'left-run',
    leftTrials,
    { 'left-1': 'passed', 'left-2': 'failed' },
    leftTrials.map((item) => operation(item.id)),
  );

  const right = makeReport(
    'right-run',
    rightTrials,
    { 'right-1': 'passed', 'right-3': 'passed' },
    rightTrials.map((item) => operation(item.id)),
  );

  const comparison = compareReports({
    left,
    right,
    pairs: [
      { leftTrialId: 'left-1', rightTrialId: 'right-1' },
      { leftTrialId: 'left-2', rightTrialId: 'right-2' },
      { leftTrialId: 'left-3', rightTrialId: 'right-3' },
    ],
  });

  expect(comparison.conditions.comparable).toBe(true);
  expect(comparison.quality).toMatchObject({
    plannedPairs: 3,
    eligiblePairs: 1,
    leftPassed: 1,
    leftFailed: 0,
    rightPassed: 1,
    rightFailed: 0,
    passRateDelta: 0,
  });

  expect(comparison.left.quality).toMatchObject({
    passed: 1,
    failed: 1,
    unknown: 1,
  });

  expect(comparison.right.quality).toMatchObject({
    passed: 2,
    failed: 0,
    unknown: 1,
  });

  expect(comparison.quality.excludedPairs).toHaveLength(2);
  expect(comparison.quality.excludedPairs[0]?.reasons).toContain(
    'Both selected trial judgments must be decidable.',
  );
  const inputMetric = comparison.resources.find((item) => item.metric === 'usage.input');

  expect(inputMetric?.qualityGroups).toEqual([
    {
      leftStatus: 'passed',
      rightStatus: 'passed',
      pairs: 1,
      leftTotal: 10,
      rightTotal: 10,
      delta: 0,
      qualityComparable: true,
      qualityExclusionReasons: [],
    },
    {
      leftStatus: 'failed',
      rightStatus: 'unknown',
      pairs: 1,
      leftTotal: 10,
      rightTotal: 10,
      delta: 0,
      qualityComparable: false,
      qualityExclusionReasons: [
        'Selected grader configuration differs for task.',
        'Both selected trial judgments must be decidable.',
      ],
    },
    {
      leftStatus: 'unknown',
      rightStatus: 'passed',
      pairs: 1,
      leftTotal: 10,
      rightTotal: 10,
      delta: 0,
      qualityComparable: false,
      qualityExclusionReasons: [
        'Selected grader configuration differs for task.',
        'Both selected trial judgments must be decidable.',
      ],
    },
  ]);
});

test('excludes pairs with changed or missing observed tools even when configured paths match', () => {
  const base = makeReport('run', [trial('a', 'case', 'execution')], { a: 'passed' }, [
    operation('a'),
  ]);
  for (const environmentFingerprint of [null, 'updated-node-version']) {
    const right = structuredClone(base);
    const item = right.trials[0];
    if (item === undefined) {
      throw new Error('Missing trial.');
    }
    item.environmentFingerprint = environmentFingerprint;

    const comparison = compareReports({
      left: base,
      right,
      pairs: [{ leftTrialId: 'a', rightTrialId: 'a' }],
    });

    expect(comparison.quality.eligiblePairs).toBe(0);
    expect(comparison.quality.excludedPairs[0]?.reasons.join(' ')).toContain(
      'runtime tool conditions',
    );
    expect(comparison.resources.every((metric) => metric.eligiblePairs === 0)).toBeTrue();
  }
});

test('keeps resource metric eligibility independent and reports currency exclusions', () => {
  const leftTrials = [
    trial('left-1', 'case-1', 'execution-1'),
    trial('left-2', 'case-2', 'execution-2'),
  ];

  const rightTrials = [
    trial('right-1', 'case-1', 'execution-1'),
    trial('right-2', 'case-2', 'execution-2'),
  ];

  const left = makeReport(
    'left-run',
    leftTrials,
    { 'left-1': 'passed', 'left-2': 'passed' },
    leftTrials.map((item) => operation(item.id)),
    priceBook('USD'),
  );

  const right = makeReport(
    'right-run',
    rightTrials,
    { 'right-1': 'passed', 'right-2': 'passed' },
    [operation('right-1'), operation('right-2', [])],
    priceBook('EUR'),
  );

  const comparison = compareReports({
    left,
    right,
    pairs: [
      { leftTrialId: 'left-1', rightTrialId: 'right-1' },
      { leftTrialId: 'left-2', rightTrialId: 'right-2' },
    ],
  });

  const duration = comparison.resources.find((item) => item.metric === 'operationDuration');
  const input = comparison.resources.find((item) => item.metric === 'usage.input');
  const estimated = comparison.resources.find((item) => item.metric === 'estimatedCost');

  expect(duration).toMatchObject({
    plannedPairs: 2,
    eligiblePairs: 2,
    leftTotal: 20,
    rightTotal: 20,
  });

  expect(input).toMatchObject({
    plannedPairs: 2,
    eligiblePairs: 1,
    leftTotal: 10,
    rightTotal: 10,
  });

  expect(input?.excludedPairs[0]?.reasons).toContain('Right usage.input coverage is unknown.');
  expect(estimated).toMatchObject({
    plannedPairs: 2,
    eligiblePairs: 0,
    leftTotal: null,
    rightTotal: null,
  });

  expect(estimated?.excludedPairs[0]?.reasons).toContain('estimatedCost currencies differ.');
});

test('reports global noncomparability without silently pairing favorable trials', () => {
  const leftTrial = trial('left', 'case', 'execution');
  const rightTrial = trial('right', 'case', 'execution');
  const left = makeReport('left-run', [leftTrial], { left: 'passed' }, [operation('left')]);

  const right = makeReport(
    'right-run',
    [rightTrial],
    { right: 'passed' },
    [operation('right')],
    undefined,
    3,
  );

  const comparison = compareReports({
    left,
    right,
    pairs: [{ leftTrialId: 'left', rightTrialId: 'right' }],
  });

  expect(comparison.conditions).toMatchObject({ comparable: false });
  expect(comparison.conditions.reasons).toContain('Concurrency differs.');
  expect(comparison.quality.eligiblePairs).toBe(0);
  expect(comparison.quality.excludedPairs[0]?.reasons).toContain('Concurrency differs.');
});

test('keeps absolute report timestamps out of quality and resource eligibility', () => {
  const leftTrial = trial('left', 'case', 'execution');
  const rightTrial = trial('right', 'case', 'execution');
  const left = makeReport('left-run', [leftTrial], { left: 'passed' }, [operation('left')]);

  const right = makeReport(
    'right-run',
    [rightTrial],
    { right: 'passed' },
    [operation('right')],
    undefined,
    2,
    101,
  );

  const comparison = compareReports({
    left,
    right,
    pairs: [{ leftTrialId: 'left', rightTrialId: 'right' }],
  });

  expect(comparison.conditions).toMatchObject({ comparable: true, reasons: [] });
  expect(comparison.quality.eligiblePairs).toBe(1);
  const duration = comparison.resources.find((item) => item.metric === 'operationDuration');

  expect(duration).toMatchObject({ eligiblePairs: 1 });
  expect(duration?.qualityGroups[0]).toMatchObject({
    qualityComparable: true,
    qualityExclusionReasons: [],
  });
});

test('compares selected grader configuration per paired trial and check', () => {
  const leftTrial = trial('left', 'case', 'execution');
  const rightTrial = trial('right', 'case', 'execution');

  const left = makeReport(
    'left-run',
    [leftTrial],
    { left: 'passed' },
    [operation('left')],
    undefined,
    2,
    100,
    {
      left: {
        model: 'judge-left',
        reasoningEffort: 'high',
        route: 'route-a',
      },
    },
  );

  const right = makeReport(
    'right-run',
    [rightTrial],
    { right: 'passed' },
    [operation('right')],
    undefined,
    2,
    100,
    {
      right: {
        model: 'judge-right',
        reasoningEffort: 'high',
        route: 'route-a',
      },
    },
  );

  const comparison = compareReports({
    left,
    right,
    pairs: [{ leftTrialId: 'left', rightTrialId: 'right' }],
  });

  expect(comparison.conditions.comparable).toBe(true);
  expect(comparison.quality.excludedPairs[0]?.reasons).toContain(
    'Selected grader configuration differs for task.',
  );
});

test('keeps core quality comparable when a diagnostic has no selected grade on one side', () => {
  const leftTrial = trial('left', 'case', 'execution');
  const rightTrial = trial('right', 'case', 'execution');
  const diagnostic = { id: 'diagnostic', definitionId: 'diagnostic-v1', core: false };
  leftTrial.criteria = [...leftTrial.criteria, diagnostic];
  rightTrial.criteria = [...rightTrial.criteria, diagnostic];
  const base = makeReport('left-run', [leftTrial], { left: 'passed' }, [operation('left')]);
  const diagnosticOperation = operation('left', [], 'diagnostic-op', false);
  const diagnosticGrade = {
    ...grade('diagnostic-grade', 'left', 'failed', diagnosticOperation.id),
    criterionId: diagnostic.id,
    definitionId: diagnostic.definitionId,
  };
  const operations = [operation('left'), diagnosticOperation];
  const left = buildReport({
    definition: {
      ...base.definition,
      operationIds: operations.map((item) => item.id),
      gradingSelection: { left: { task: 'grade-left', diagnostic: diagnosticGrade.id } },
    },
    manifest: base.manifest,
    trialResults: base.trialResults,
    grades: [...base.grades, diagnosticGrade],
    operations,
  });
  const right = makeReport('right-run', [rightTrial], { right: 'passed' }, [operation('right')]);

  const comparison = compareReports({
    left,
    right,
    pairs: [{ leftTrialId: 'left', rightTrialId: 'right' }],
  });

  expect(left.quality.summary.passed).toBe(1);
  expect(right.quality.summary.passed).toBe(1);
  expect(comparison.quality).toMatchObject({ eligiblePairs: 1, excludedPairs: [] });
  expect(
    comparison.resources.find((item) => item.metric === 'usage.input')?.qualityGroups[0],
  ).toMatchObject({
    qualityComparable: true,
    qualityExclusionReasons: [],
  });
});

test('uses the declared accounting rule when extra failed operations change scope counts', () => {
  const leftTrial = trial('left', 'case', 'execution');
  const rightTrial = trial('right', 'case', 'execution');
  const left = makeReport('left-run', [leftTrial], { left: 'passed' }, [operation('left')]);

  const right = makeReport('right-run', [rightTrial], { right: 'passed' }, [
    operation('right'),
    operation('right', [], 'failed-grade', true),
  ]);

  const comparison = compareReports({
    left,
    right,
    pairs: [{ leftTrialId: 'left', rightTrialId: 'right' }],
  });

  const duration = comparison.resources.find((item) => item.metric === 'operationDuration');

  expect(duration).toMatchObject({
    plannedPairs: 1,
    eligiblePairs: 1,
    leftTotal: 10,
    rightTotal: 20,
  });
});

test('rejects estimated-cost pairs when the complete price book differs', () => {
  const leftTrial = trial('left', 'case', 'execution');
  const rightTrial = trial('right', 'case', 'execution');

  const left = makeReport(
    'left-run',
    [leftTrial],
    { left: 'passed' },
    [operation('left')],
    priceBook('USD'),
  );

  const differentRates = {
    ...priceBook('USD'),
    rates: {
      standard: {
        input: 3,
        output: 2,
        cachedInput: 0,
      },
    },
  };

  const right = makeReport(
    'right-run',
    [rightTrial],
    { right: 'passed' },
    [operation('right')],
    differentRates,
  );

  const comparison = compareReports({
    left,
    right,
    pairs: [{ leftTrialId: 'left', rightTrialId: 'right' }],
  });

  const estimated = comparison.resources.find((item) => item.metric === 'estimatedCost');

  expect(estimated?.eligiblePairs).toBe(0);
  expect(estimated?.excludedPairs[0]?.reasons).toContain('estimatedCost price books differ.');
});

test('does not mix currencyless zero charges with known-currency charges', () => {
  const leftTrials = [
    trial('left-zero', 'case-zero', 'execution-zero'),
    trial('left-known', 'case-known', 'execution-known'),
  ];

  const rightTrials = [
    trial('right-zero', 'case-zero', 'execution-zero'),
    trial('right-known', 'case-known', 'execution-known'),
  ];

  const left = makeReport(
    'left-run',
    leftTrials,
    { 'left-zero': 'passed', 'left-known': 'passed' },
    [operation('left-zero', [], undefined, false), operation('left-known')],
    undefined,
    2,
    100,
    {},
    [
      {
        id: 'left-known-charge',
        operationId: 'operation-left-known',
        amount: 1,
        currency: 'USD',
        source: 'billing',
        attributable: true,
        reason: null,
      },
    ],
  );

  const right = makeReport(
    'right-run',
    rightTrials,
    { 'right-zero': 'passed', 'right-known': 'passed' },
    [operation('right-zero', [], undefined, false), operation('right-known')],
    undefined,
    2,
    100,
    {},
    [
      {
        id: 'right-known-charge',
        operationId: 'operation-right-known',
        amount: 1,
        currency: 'USD',
        source: 'billing',
        attributable: true,
        reason: null,
      },
    ],
  );

  const comparison = compareReports({
    left,
    right,
    pairs: [
      { leftTrialId: 'left-zero', rightTrialId: 'right-zero' },
      { leftTrialId: 'left-known', rightTrialId: 'right-known' },
    ],
  });

  const actual = comparison.resources.find((item) => item.metric === 'actualCost');

  expect(actual).toMatchObject({
    plannedPairs: 2,
    eligiblePairs: 2,
    currency: 'USD',
    leftTotal: 1,
    rightTotal: 1,
    delta: 0,
    excludedPairs: [],
  });

  const reversed = compareReports({
    left,
    right,
    pairs: [...comparison.pairs].reverse(),
  });

  expect(reversed.resources.find((item) => item.metric === 'actualCost')).toEqual(actual);
});

test('makes a multi-currency resource aggregate unavailable instead of depending on pair order', () => {
  const leftTrials = [
    trial('left-usd', 'case-usd', 'execution-usd'),
    trial('left-eur', 'case-eur', 'execution-eur'),
  ];

  const rightTrials = [
    trial('right-usd', 'case-usd', 'execution-usd'),
    trial('right-eur', 'case-eur', 'execution-eur'),
  ];

  const left = makeReport(
    'left-run',
    leftTrials,
    { 'left-usd': 'passed', 'left-eur': 'passed' },
    [operation('left-usd'), operation('left-eur')],
    undefined,
    2,
    100,
    {},
    [
      {
        id: 'left-usd-charge',
        operationId: 'operation-left-usd',
        amount: 1,
        currency: 'USD',
        source: 'billing',
        attributable: true,
        reason: null,
      },
      {
        id: 'left-eur-charge',
        operationId: 'operation-left-eur',
        amount: 1,
        currency: 'EUR',
        source: 'billing',
        attributable: true,
        reason: null,
      },
    ],
  );

  const right = makeReport(
    'right-run',
    rightTrials,
    { 'right-usd': 'passed', 'right-eur': 'passed' },
    [operation('right-usd'), operation('right-eur')],
    undefined,
    2,
    100,
    {},
    [
      {
        id: 'right-usd-charge',
        operationId: 'operation-right-usd',
        amount: 1,
        currency: 'USD',
        source: 'billing',
        attributable: true,
        reason: null,
      },
      {
        id: 'right-eur-charge',
        operationId: 'operation-right-eur',
        amount: 1,
        currency: 'EUR',
        source: 'billing',
        attributable: true,
        reason: null,
      },
    ],
  );

  const comparison = compareReports({
    left,
    right,
    pairs: [
      { leftTrialId: 'left-usd', rightTrialId: 'right-usd' },
      { leftTrialId: 'left-eur', rightTrialId: 'right-eur' },
    ],
  });

  const actual = comparison.resources.find((item) => item.metric === 'actualCost');

  expect(actual).toMatchObject({
    eligiblePairs: 0,
    leftTotal: null,
    rightTotal: null,
  });

  expect(actual?.excludedPairs[0]?.reasons).toContain(
    'actualCost has multiple eligible currencies; aggregate unavailable.',
  );
});

test('rejects duplicate or unknown pair mappings', () => {
  const leftTrial = trial('left', 'case', 'execution');
  const rightTrial = trial('right', 'case', 'execution');
  const left = makeReport('left-run', [leftTrial], { left: 'passed' }, [operation('left')]);
  const right = makeReport('right-run', [rightTrial], { right: 'passed' }, [operation('right')]);

  expect(() =>
    compareReports({
      left,
      right,
      pairs: [
        { leftTrialId: 'left', rightTrialId: 'right' },
        { leftTrialId: 'left', rightTrialId: 'right' },
      ],
    }),
  ).toThrow('Duplicate left trial pairing');

  expect(() =>
    compareReports({
      left,
      right,
      pairs: [{ leftTrialId: 'missing', rightTrialId: 'right' }],
    }),
  ).toThrow('Unknown left trial');
});

test('reports pair-level execution and criterion incompatibility', () => {
  const leftTrial = trial('left', 'case-a', 'execution-a');
  const rightTrial = trial('right', 'case-b', 'execution-b');
  const left = makeReport('left-run', [leftTrial], { left: 'passed' }, [operation('left')]);
  const right = makeReport('right-run', [rightTrial], { right: 'passed' }, [operation('right')]);

  const comparison = compareReports({
    left,
    right,
    pairs: [{ leftTrialId: 'left', rightTrialId: 'right' }],
  });

  expect(comparison.conditions.comparable).toBe(true);
  expect(comparison.quality.eligiblePairs).toBe(0);
  expect(comparison.quality.excludedPairs[0]?.reasons).toEqual([
    'Execution version differs.',
    'Case id differs.',
  ]);
});
