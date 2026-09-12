import { describe, expect, test } from 'bun:test';
import {
  accountResources,
  type IPriceBook,
  type IResourceOperation,
  type ITokenUsage,
  type IUsageObservation,
} from '../../src/results/resources.ts';

const unknownUsage: ITokenUsage = {
  input: null,
  output: null,
  cachedInput: null,
  reasoningOutput: null,
};

function observation(
  id: string,
  actorId: string,
  kind: IUsageObservation['kind'],
  usage: Partial<ITokenUsage>,
  includedActorIds: readonly string[] | null = [],
  observedAt = 1,
): IUsageObservation {
  return {
    id,
    actorId,
    model: 'gpt-6-astra',
    threadId: `${actorId}-thread`,
    turnId: `${actorId}-turn`,
    kind,
    observedAt,
    usage: { ...unknownUsage, ...usage },
    evidenceSource: `events/${id}.jsonl`,
    includedActorIds,
  };
}

function operation(
  id: string,
  phase: IResourceOperation['phase'],
  observations: readonly IUsageObservation[],
  interval: readonly [number, number | null] | null = [0, 100],
  status: IResourceOperation['status'] = 'completed',
  usesModel = true,
): IResourceOperation {
  return {
    id,
    trialId: `trial-${id}`,
    phase,
    status,
    usesModel,
    startedAt: interval?.[0] ?? null,
    endedAt: interval?.[1] ?? null,
    observations,
  };
}

const priceBook: IPriceBook = {
  source: 'test-price-source',
  version: '2026-09-11',
  currency: 'USD',
  rates: {
    standard: {
      input: 1,
      output: 2,
      cachedInput: 0.5,
    },
  },
  modelMapping: { 'gpt-6-astra': 'standard' },
};

describe('resource usage normalization', () => {
  test('retains observed tokens after interruption without claiming final usage or estimated cost', () => {
    const interrupted = operation(
      'interrupted',
      'candidate',
      [
        observation('before-stop', 'actor', 'cumulative', {
          input: 100,
          output: 20,
          cachedInput: 0,
          reasoningOutput: 5,
        }),
      ],
      [0, 100],
      'interrupted',
    );

    const report = accountResources({
      operations: [interrupted],
      selectedOperationIds: [interrupted.id],
      priceBook,
    });

    expect(report.usage.total).toMatchObject({ value: 120, coverage: 'partial' });
    expect(report.estimatedCost).toMatchObject({ coverage: 'partial' });
    expect(report.usage.input.reason).toContain('final usage');
  });

  test('uses the latest cumulative snapshot to establish category completeness', () => {
    const earlier = observation('earlier', 'actor', 'cumulative', {}, [], 1);
    const latest = observation('latest', 'actor', 'cumulative', { input: 10 }, [], 2);

    const report = accountResources({
      operations: [operation('candidate', 'candidate', [earlier, latest])],
      selectedOperationIds: ['candidate'],
    });

    expect(report.usage.input).toMatchObject({ value: 10, coverage: 'complete' });

    const missingLatest = accountResources({
      operations: [
        operation('candidate', 'candidate', [
          latest,
          {
            ...earlier,
            id: 'last',
            observedAt: 3,
          },
        ]),
      ],
      selectedOperationIds: ['candidate'],
    });

    expect(missingLatest.usage.input).toMatchObject({ value: 10, coverage: 'partial' });
  });

  test('rejects contradictory inclusion scopes instead of returning complete zero or dropping deltas', () => {
    const examples = [
      [observation('self', 'a', 'cumulative', { input: 10 }, ['a'])],
      [
        observation('a', 'a', 'cumulative', { input: 10 }, ['b']),
        observation('b', 'b', 'cumulative', { input: 4 }, ['a']),
      ],
      [
        observation('a', 'a', 'cumulative', { input: 10 }, ['c']),
        observation('b', 'b', 'cumulative', { input: 8 }, ['c']),
        observation('c', 'c', 'cumulative', { input: 4 }),
      ],
      [
        observation('a1', 'a', 'delta', { input: 10 }, ['b']),
        observation('a2', 'a', 'delta', { input: 5 }, [], 2),
        observation('b1', 'b', 'delta', { input: 4 }),
        observation('b2', 'b', 'delta', { input: 3 }, [], 2),
      ],
    ];
    for (const observations of examples) {
      expect(() =>
        accountResources({
          operations: [operation('candidate', 'candidate', observations)],
          selectedOperationIds: ['candidate'],
        }),
      ).toThrow();
    }
  });

  test('deduplicates cumulative snapshots and sums deltas without adding subsets', () => {
    const report = accountResources({
      operations: [
        operation('candidate', 'candidate', [
          observation('a-1', 'actor-a', 'cumulative', {
            input: 5,
            output: 1,
            cachedInput: 1,
            reasoningOutput: 0,
          }),
          observation(
            'a-2',
            'actor-a',
            'cumulative',
            {
              input: 10,
              output: 2,
              cachedInput: 2,
              reasoningOutput: 1,
            },
            [],
            2,
          ),
          observation(
            'a-duplicate',
            'actor-a',
            'cumulative',
            {
              input: 10,
              output: 2,
              cachedInput: 2,
              reasoningOutput: 1,
            },
            [],
            3,
          ),
          observation('b-1', 'actor-b', 'delta', {
            input: 2,
            output: 3,
            cachedInput: 1,
            reasoningOutput: 2,
          }),
          observation(
            'b-2',
            'actor-b',
            'delta',
            {
              input: 0,
              output: 0,
              cachedInput: 0,
              reasoningOutput: 0,
            },
            [],
            2,
          ),
        ]),
      ],
      selectedOperationIds: ['candidate'],
    });

    expect(report.usage.input).toMatchObject({ value: 12, coverage: 'complete' });
    expect(report.usage.output).toMatchObject({ value: 5, coverage: 'complete' });
    expect(report.usage.cachedInput).toMatchObject({ value: 3, coverage: 'complete' });
    expect(report.usage.reasoningOutput).toMatchObject({ value: 3, coverage: 'complete' });
    expect(report.usage.total).toMatchObject({ value: 17, coverage: 'complete' });
  });

  test('does not count a child actor twice when the parent declares inclusion', () => {
    const included = accountResources({
      operations: [
        operation('candidate', 'candidate', [
          observation(
            'parent',
            'parent',
            'cumulative',
            {
              input: 10,
              output: 4,
              cachedInput: 2,
              reasoningOutput: 1,
            },
            ['child'],
          ),
          observation('child', 'child', 'cumulative', {
            input: 4,
            output: 2,
            cachedInput: 1,
            reasoningOutput: 1,
          }),
        ]),
      ],
      selectedOperationIds: ['candidate'],
    });

    expect(included.usage.input.value).toBe(10);
    expect(included.usage.total.value).toBe(14);
    expect(included.usage.input.coverage).toBe('complete');

    const uncertain = accountResources({
      operations: [
        operation('candidate', 'candidate', [
          observation(
            'parent-unknown',
            'parent',
            'cumulative',
            {
              input: 10,
              output: 4,
              cachedInput: 2,
              reasoningOutput: 1,
            },
            null,
          ),
          observation('child-unknown', 'child', 'cumulative', {
            input: 4,
            output: 2,
            cachedInput: 1,
            reasoningOutput: 1,
          }),
        ]),
      ],
      selectedOperationIds: ['candidate'],
    });

    expect(uncertain.usage.input.value).toBe(14);
    expect(uncertain.usage.input.coverage).toBe('partial');
    expect(uncertain.usage.input.reason).toContain('Parent-child usage inclusion');
  });

  test('keeps real zeros distinct from missing observations', () => {
    const report = accountResources({
      operations: [
        operation('zero', 'candidate', [
          observation('zero-event', 'actor', 'delta', {
            input: 0,
            output: 0,
            cachedInput: 0,
            reasoningOutput: null,
          }),
        ]),
        operation('missing', 'candidate', []),
      ],
      selectedOperationIds: ['zero', 'missing'],
    });

    expect(report.usage.input).toMatchObject({ value: 0, coverage: 'partial' });
    expect(report.usage.output).toMatchObject({ value: 0, coverage: 'partial' });
    expect(report.usage.reasoningOutput.value).toBeNull();
    expect(report.usage.reasoningOutput.coverage).toBe('unknown');
    expect(report.usage.total.value).toBe(0);
    expect(report.usage.total.coverage).toBe('partial');
  });
});

describe('resource scope and time accounting', () => {
  test('reports operation duration separately from overlapping wall time and keeps phases', () => {
    const report = accountResources({
      operations: [
        operation('prep-failed', 'preparation', [], [0, 100], 'failed'),
        operation('candidate-superseded', 'candidate', [], [20, 70], 'superseded'),
        operation('grade-failed', 'grading', [], [50, 80], 'failed'),
      ],
      selectedOperationIds: ['prep-failed', 'candidate-superseded'],
    });

    expect(report.operationCount).toBe(2);
    expect(report.operationDuration).toMatchObject({ value: 150, coverage: 'complete' });
    expect(report.wallElapsed).toMatchObject({ value: 100, coverage: 'complete' });
    expect(report.phases.find((phase) => phase.phase === 'preparation')).toMatchObject({
      operationCount: 1,
    });
    expect(report.phases.find((phase) => phase.phase === 'grading')).toMatchObject({
      operationCount: 0,
    });
  });

  test('keeps the selected scope independent from later input mutation', () => {
    const selected = ['candidate'];

    const report = accountResources({
      operations: [operation('candidate', 'candidate', [])],
      selectedOperationIds: selected,
    });

    selected.push('other');

    expect(report.selectedOperationIds).toEqual(['candidate']);
    expect(() =>
      accountResources({
        operations: [operation('candidate', 'candidate', [])],
        selectedOperationIds: ['candidate', 'candidate'],
      }),
    ).toThrow('Duplicate selected operation id');

    expect(() =>
      accountResources({
        operations: [operation('candidate', 'candidate', [])],
        selectedOperationIds: ['missing'],
      }),
    ).toThrow('Unknown selected operation');
  });

  test('records partial duration when an operation is unfinished', () => {
    const report = accountResources({
      operations: [
        operation('finished', 'candidate', [], [0, 20]),
        operation('running', 'candidate', [], [10, null], 'running'),
      ],
      selectedOperationIds: ['finished', 'running'],
    });

    expect(report.operationDuration).toMatchObject({ value: 20, coverage: 'partial' });
    expect(report.wallElapsed).toMatchObject({ value: 20, coverage: 'partial' });
  });
});

describe('cost accounting', () => {
  test('prices different actor models separately and refuses inseparable inclusive model totals', () => {
    const parent = observation('parent', 'parent', 'cumulative', {
      input: 10,
      output: 0,
      cachedInput: 0,
    });

    const child = {
      ...observation('child', 'child', 'cumulative', {
        input: 4,
        output: 0,
        cachedInput: 0,
      }),
      model: 'fixture-worker-model',
    };

    const mixedPrices = {
      ...priceBook,
      rates: {
        ...priceBook.rates,
        worker: {
          input: 2,
          output: 4,
          cachedInput: 1,
        },
      },
      modelMapping: { ...priceBook.modelMapping, 'fixture-worker-model': 'worker' },
    };

    const separate = accountResources({
      operations: [operation('candidate', 'candidate', [parent, child])],
      selectedOperationIds: ['candidate'],
      priceBook: mixedPrices,
    });

    expect(separate.estimatedCost).toMatchObject({ value: 18 / 1_000_000, coverage: 'complete' });

    const inclusive = accountResources({
      operations: [
        operation('candidate', 'candidate', [{ ...parent, includedActorIds: ['child'] }, child]),
      ],
      selectedOperationIds: ['candidate'],
      priceBook: mixedPrices,
    });

    expect(inclusive.estimatedCost).toMatchObject({ value: null, coverage: 'unknown' });
    expect(inclusive.usage.input.value).toBe(10);
  });

  test('does not replace an unknown cached price with a known regular price', () => {
    const prices = {
      ...priceBook,
      rates: {
        standard: {
          input: 1,
          output: 2,
          cachedInput: null,
        },
      },
    };

    const result = (cachedInput: number) =>
      accountResources({
        operations: [
          operation('candidate', 'candidate', [
            observation('usage', 'actor', 'delta', {
              input: 10,
              output: 0,
              cachedInput,
            }),
          ]),
        ],
        selectedOperationIds: ['candidate'],
        priceBook: prices,
      });

    expect(result(4).estimatedCost).toMatchObject({ value: 0, coverage: 'partial' });
    expect(result(0).estimatedCost).toMatchObject({ value: 10 / 1_000_000, coverage: 'complete' });
  });

  test('uses explicit model mapping and does not price reasoning output twice', () => {
    const report = accountResources({
      operations: [
        operation('candidate', 'candidate', [
          observation('usage', 'actor', 'delta', {
            input: 10,
            output: 4,
            cachedInput: 3,
            reasoningOutput: 2,
          }),
        ]),
      ],
      selectedOperationIds: ['candidate'],
      priceBook,
    });

    expect(report.estimatedCost).toMatchObject({
      value: (7 * 1 + 3 * 0.5 + 4 * 2) / 1_000_000,
      coverage: 'complete',
      currency: 'USD',
      source: 'test-price-source',
      version: '2026-09-11',
    });
  });

  test('retains failed and superseded operation consumption independently of grading selection', () => {
    const report = accountResources({
      operations: [
        operation(
          'failed-candidate',
          'candidate',
          [observation('failed-usage', 'actor-a', 'delta', { input: 3, output: 1 })],
          [0, 10],
          'failed',
        ),
        operation(
          'superseded-grade',
          'grading',
          [observation('superseded-usage', 'actor-b', 'delta', { input: 2, output: 1 })],
          [10, 20],
          'superseded',
        ),
      ],
      selectedOperationIds: ['failed-candidate', 'superseded-grade'],
      priceBook,
      actualCharges: [
        {
          id: 'failed-charge',
          operationId: 'failed-candidate',
          amount: 0,
          currency: 'USD',
          source: 'provider-billing',
          attributable: true,
          reason: null,
        },
        {
          id: 'superseded-charge',
          operationId: 'superseded-grade',
          amount: 0.25,
          currency: 'USD',
          source: 'provider-billing',
          attributable: true,
          reason: null,
        },
      ],
    });

    expect(report.operationCount).toBe(2);
    expect(report.usage.total.value).toBe(7);
    expect(report.actualCost).toMatchObject({ value: 0.25, coverage: 'complete' });
  });

  test('keeps shared gateway charges unknown when they cannot be allocated', () => {
    const report = accountResources({
      operations: [operation('candidate', 'candidate', [])],
      selectedOperationIds: ['candidate'],
      actualCharges: [
        {
          id: 'gateway-charge',
          operationId: 'candidate',
          amount: null,
          currency: 'USD',
          source: 'shared-gateway',
          attributable: false,
          reason: 'Gateway reports only account-level spend.',
        },
      ],
    });

    expect(report.actualCost.value).toBeNull();
    expect(report.actualCost.coverage).toBe('unknown');
    expect(report.actualCost.reason).toContain('Gateway reports only account-level spend.');
  });

  test('returns partial actual cost when one selected operation has no charge evidence', () => {
    const report = accountResources({
      operations: [operation('candidate', 'candidate', []), operation('grader', 'grading', [])],
      selectedOperationIds: ['candidate', 'grader'],
      actualCharges: [
        {
          id: 'candidate-charge',
          operationId: 'candidate',
          amount: 0,
          currency: 'USD',
          source: 'billing',
          attributable: true,
          reason: null,
        },
      ],
    });

    expect(report.actualCost).toMatchObject({ value: 0, coverage: 'partial' });
    expect(report.actualCost.reason).toContain('grader');
  });

  test('uses zero totals for an empty selected sample', () => {
    const report = accountResources({ operations: [], selectedOperationIds: [] });

    expect(report.operationCount).toBe(0);
    expect(report.operationDuration).toEqual({
      value: 0,
      coverage: 'complete',
      reason: null,
    });

    expect(report.wallElapsed).toEqual({
      value: 0,
      coverage: 'complete',
      reason: null,
    });

    expect(report.usage.total).toEqual({
      value: 0,
      coverage: 'complete',
      reason: null,
    });

    expect(report.estimatedCost).toMatchObject({ value: 0, coverage: 'complete' });
    expect(report.actualCost).toMatchObject({ value: 0, coverage: 'complete' });
    expect(report.phases).toHaveLength(4);
  });

  test('treats model-free operations as zero model resource usage without a price book', () => {
    const report = accountResources({
      operations: [
        operation('preparation', 'preparation', [], [0, 10], 'completed', false),
        operation('verification', 'verification', [], [10, 20], 'completed', false),
      ],
      selectedOperationIds: ['preparation', 'verification'],
    });

    expect(report.usage).toMatchObject({
      input: { value: 0, coverage: 'complete' },
      output: { value: 0, coverage: 'complete' },
      total: { value: 0, coverage: 'complete' },
    });

    expect(report.estimatedCost).toMatchObject({ value: 0, coverage: 'complete' });
    expect(report.actualCost).toMatchObject({ value: 0, coverage: 'complete' });
  });

  test('rejects observations and charges attached to model-free operations', () => {
    expect(() =>
      accountResources({
        operations: [
          operation(
            'preparation',
            'preparation',
            [observation('invalid', 'actor', 'delta', { input: 1 })],
            [0, 10],
            'completed',
            false,
          ),
        ],
        selectedOperationIds: ['preparation'],
      }),
    ).toThrow('cannot have usage observations');

    expect(() =>
      accountResources({
        operations: [operation('preparation', 'preparation', [], [0, 10], 'completed', false)],
        selectedOperationIds: ['preparation'],
        actualCharges: [
          {
            id: 'invalid-charge',
            operationId: 'preparation',
            amount: 1,
            currency: 'USD',
            source: 'billing',
            attributable: true,
            reason: null,
          },
        ],
      }),
    ).toThrow('cannot have model-charge evidence');
  });
});

describe('resource input validation', () => {
  test('rejects duplicate operations, observations, and invalid intervals', () => {
    const candidate = operation('candidate', 'candidate', []);

    expect(() =>
      accountResources({
        operations: [candidate, candidate],
        selectedOperationIds: ['candidate'],
      }),
    ).toThrow('Duplicate operation id');

    expect(() =>
      accountResources({
        operations: [
          operation('candidate', 'candidate', [
            observation('same', 'actor', 'delta', {}),
            observation('same', 'actor', 'delta', {}),
          ]),
        ],
        selectedOperationIds: ['candidate'],
      }),
    ).toThrow('Duplicate usage observation id');

    expect(() =>
      accountResources({
        operations: [operation('candidate', 'candidate', [], [10, 0])],
        selectedOperationIds: ['candidate'],
      }),
    ).toThrow('ends before it starts');
  });

  test('rejects invalid charge references and duplicate included actors', () => {
    expect(() =>
      accountResources({
        operations: [
          operation('candidate', 'candidate', [
            observation('event', 'actor', 'delta', {}, ['child', 'child']),
          ]),
        ],
        selectedOperationIds: ['candidate'],
      }),
    ).toThrow('Duplicate included actor id');
    expect(() =>
      accountResources({
        operations: [operation('candidate', 'candidate', [])],
        selectedOperationIds: ['candidate'],
        actualCharges: [
          {
            id: 'charge',
            operationId: 'missing',
            amount: 1,
            currency: 'USD',
            source: 'billing',
            attributable: true,
            reason: null,
          },
        ],
      }),
    ).toThrow('Unknown actual-charge operation');
  });
});
