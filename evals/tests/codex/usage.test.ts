import { expect, test } from 'bun:test';
import type { ICodexTransportRecord } from '../../src/codex/transport.ts';
import { normalizeCodexUsage } from '../../src/codex/usage.ts';
import { accountResources } from '../../src/results/resources.ts';

const event = (
  threadId: string,
  turnId: string,
  total: Record<string, unknown>,
  second: number,
): ICodexTransportRecord => ({
  direction: 'incoming',
  stream: 'stdout',
  time: new Date(second * 1000).toISOString(),
  raw: 'fixture wire event',
  parsed: {
    method: 'thread/tokenUsage/updated',
    params: {
      threadId,
      turnId,
      tokenUsage: { total, last: { inputTokens: 999 } },
    },
  },
});

test('normalizes live per-thread cumulative counters without adding last or token subsets', () => {
  const result = normalizeCodexUsage(
    [
      event('parent', 'turn-1', { inputTokens: 10, outputTokens: 2 }, 1),
      event(
        'parent',
        'turn-2',
        {
          inputTokens: 20,
          outputTokens: 4,
          cachedInputTokens: 10,
        },
        2,
      ),
      event(
        'child',
        'child-turn',
        {
          inputTokens: 7,
          outputTokens: 3,
          reasoningOutputTokens: 2,
        },
        3,
      ),
    ],
    [
      {
        threadId: 'parent',
        modelsByTurn: { 'turn-1': 'primary', 'turn-2': 'primary' },
        includedActorIds: [],
      },
      {
        threadId: 'child',
        modelsByTurn: { 'child-turn': 'worker' },
        includedActorIds: [],
      },
    ],
    'events.jsonl',
  );

  expect(result.issues).toEqual([]);
  expect(result.observations.map((item) => item.model)).toEqual(['primary', 'primary', 'worker']);

  const report = accountResources({
    operations: [
      {
        id: 'execution',
        trialId: 'trial',
        phase: 'candidate',
        usesModel: true,
        status: 'completed',
        startedAt: 0,
        endedAt: 4000,
        observations: result.observations,
      },
    ],
    selectedOperationIds: ['execution'],
  });

  expect(report.usage.total).toMatchObject({ value: 34, coverage: 'complete' });
  expect(report.usage.cachedInput).toMatchObject({ value: 10, coverage: 'partial' });
});

test('retains unknown actor metadata and malformed counters as measurement limitations', () => {
  const result = normalizeCodexUsage(
    [event('unknown-child', 'turn', { inputTokens: '7', outputTokens: 0 }, 1)],
    [],
    'events.jsonl',
  );

  expect(result.observations[0]).toMatchObject({
    model: null,
    includedActorIds: null,
    usage: { input: null, output: 0 },
  });
  expect(result.issues.map((issue) => issue.reason)).toEqual([
    'Invalid native token counter: inputTokens.',
    'Actor model and parent-child overlap are unestablished.',
  ]);
});

test('ignores unrelated records and refuses ambiguous actor identities', () => {
  const records: ICodexTransportRecord[] = [
    {
      direction: 'incoming',
      stream: 'stderr',
      time: 'invalid',
      raw: 'diagnostic',
    },
    {
      direction: 'incoming',
      stream: 'stdout',
      time: 'invalid',
      raw: '{}',
      parsed: {},
    },
    { ...event('thread', 'turn', {}, 1), time: 'invalid' },
  ];

  const result = normalizeCodexUsage(records, [], 'events.jsonl');

  expect(result.observations).toEqual([]);
  expect(result.issues).toHaveLength(1);

  const actor = {
    threadId: 'thread',
    modelsByTurn: {},
    includedActorIds: null,
  };

  expect(() => normalizeCodexUsage([], [actor, actor], 'events.jsonl')).toThrow('Duplicate actor');
});
