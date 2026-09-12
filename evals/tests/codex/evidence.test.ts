import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectEvidence, projectEvidence, readProtocol } from '../../src/codex/evidence.ts';
import type { ICodexTransportRecord } from '../../src/codex/transport.ts';
import { normalizeCodexUsage } from '../../src/codex/usage.ts';

function event(method: string, params: unknown): ICodexTransportRecord {
  return {
    direction: 'incoming',
    stream: 'stdout',
    time: new Date(0).toISOString(),
    raw: JSON.stringify({ method, params }),
    parsed: { method, params },
  };
}

test('projects completed native items once without confusing command requests with success', () => {
  const item = {
    id: 'command',
    type: 'commandExecution',
    command: 'cat /skill/SKILL.md',
  };

  const records = [
    event('item/started', {
      threadId: 'parent',
      turnId: 't1',
      item,
    }),
    event('item/completed', {
      threadId: 'parent',
      turnId: 't1',
      item: {
        ...item,
        exitCode: 0,
        aggregatedOutput: 'skill content',
      },
    }),
    event('item/completed', {
      threadId: 'parent',
      turnId: 't1',
      item: {
        id: 'reply',
        type: 'agentMessage',
        text: 'Answer',
        phase: 'final_answer',
      },
    }),
    event('item/completed', {
      threadId: 'child',
      turnId: 't2',
      item: {
        id: 'reply',
        type: 'agentMessage',
        text: 'Child answer',
        phase: 'final_answer',
      },
    }),
    event('turn/completed', { threadId: 'parent', turn: { id: 't1', status: 'completed' } }),
    event('skills/changed', {}),
  ];

  const projection = projectEvidence(records, 'parent', 'protocol.jsonl');

  expect(projection.items).toHaveLength(3);
  expect(projection.output).toBe('Answer');
  expect(projection.activation).toMatchObject({ status: 'inferred' });
  expect(projection.activation.references[0]?.source).toBe('protocol.jsonl#L2');
  const missing = projectEvidence(records.slice(0, 1), 'parent', 'protocol.jsonl');

  expect(missing.activation.status).toBe('unknown');
  expect(missing.output).toBe('');
});

test('attributes child contexts only to their live turns and retains absent child usage', async () => {
  const directory = await mkdtemp(resolve('.cache/evidence-test-'));
  try {
    await mkdir(resolve(directory, 'sessions'));

    const context = (id: string, model: string) => ({
      type: 'turn_context',
      payload: Object.fromEntries([
        ['turn_id', id],
        ['model', model],
      ]),
    });

    const rows = [
      { type: 'session_meta', payload: { id: 'child' } },
      { type: 'session_meta', payload: { id: 'parent' } },
      context('parent-turn', 'parent-model'),
      { type: 'response_item', payload: { type: 'custom_tool_call', input: 'copied parent call' } },
      context('child-turn', 'child-model'),
      {
        type: 'response_item',
        payload: {
          type: 'custom_tool_call',
          ...Object.fromEntries([['call_id', 'call-one']]),
          input: 'child command',
        },
      },
      {
        type: 'response_item',
        payload: {
          type: 'custom_tool_call_output',
          ...Object.fromEntries([['call_id', 'call-one']]),
          output: [
            {
              text: 'credential secret-value',
              count: 1,
              extra: null,
            },
          ],
        },
      },
    ];

    await Bun.write(
      resolve(directory, 'sessions/child.jsonl'),
      rows.map((row) => JSON.stringify(row)).join('\n'),
    );

    const records = [
      event('thread/tokenUsage/updated', { threadId: 'parent', turnId: 'parent-turn' }),
      event('thread/tokenUsage/updated', { threadId: 'child', turnId: 'child-turn' }),
      event('item/completed', {
        threadId: 'parent',
        turnId: 'parent-turn',
        item: {
          id: 'spawn',
          type: 'subAgentActivity',
          agentThreadId: 'missing-child',
        },
      }),
    ];

    const projection = await collectEvidence(records, 'parent', 'protocol.jsonl', directory, [
      'secret-value',
    ]);
    const child = projection.actors.find((actor) => actor.threadId === 'child');

    expect(child?.modelsByTurn).toEqual({ 'child-turn': 'child-model' });
    expect(child?.includedActorIds).toBeNull();
    expect(projection.toolRecords).toHaveLength(2);
    expect(
      projection.toolRecords.every(
        (item) => item.threadId === 'child' && item.turnId === 'child-turn',
      ),
    ).toBeTrue();

    expect(JSON.stringify(projection.toolRecords)).not.toContain('copied parent call');
    expect(JSON.stringify(projection.toolRecords)).not.toContain('secret-value');
    expect(JSON.stringify(projection.toolRecords)).toContain('<credential-redacted>');
    expect(projection.threadIds).toContain('missing-child');
    expect(projection.issues).toContain(
      'No live turn-context identity was captured for missing-child.',
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('retains live contexts and tools when an auxiliary session log is truncated', async () => {
  const directory = await mkdtemp(resolve('.cache/evidence-test-'));
  try {
    await mkdir(resolve(directory, 'sessions'));

    const rows = [
      { type: 'session_meta', payload: { id: 'parent' } },
      {
        type: 'turn_context',
        payload: Object.fromEntries([
          ['turn_id', 'turn-1'],
          ['model', 'gpt-6-astra'],
        ]),
      },
      {
        type: 'response_item',
        payload: {
          type: 'custom_tool_call',
          ...Object.fromEntries([
            ['call_id', 'call-one'],
            ['input', 'live command'],
          ]),
        },
      },
      '{"truncated":',
    ];

    await Bun.write(
      resolve(directory, 'sessions/parent.jsonl'),
      `${rows.map((row) => (typeof row === 'string' ? row : JSON.stringify(row))).join('\n')}\n`,
    );

    const records = [
      event('thread/tokenUsage/updated', { threadId: 'parent', turnId: 'turn-1' }),
      event('item/completed', {
        threadId: 'parent',
        turnId: 'turn-1',
        item: {
          id: 'reply',
          type: 'agentMessage',
          phase: 'final_answer',
          text: 'live output',
        },
      }),
    ];

    const evidence = await collectEvidence(records, 'parent', 'protocol.jsonl', directory);

    expect(evidence.output).toBe('live output');
    expect(evidence.actors[0]).toMatchObject({
      threadId: 'parent',
      modelsByTurn: { 'turn-1': 'gpt-6-astra' },
    });

    expect(evidence.toolRecords).toHaveLength(1);
    expect(evidence.toolRecords[0]).toMatchObject({
      threadId: 'parent',
      turnId: 'turn-1',
    });

    expect(evidence.issues).toEqual([expect.stringContaining('sessions/parent.jsonl#L4')]);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('retains live projection and counters when auxiliary log enumeration fails', async () => {
  const directory = await mkdtemp(resolve('.cache/evidence-test-'));
  try {
    const records = [
      event('thread/tokenUsage/updated', {
        threadId: 'parent',
        turnId: 'turn-1',
        tokenUsage: { total: { inputTokens: 7, outputTokens: 5 } },
      }),
      event('item/completed', {
        threadId: 'parent',
        turnId: 'turn-1',
        item: {
          id: 'reply',
          type: 'agentMessage',
          phase: 'final_answer',
          text: 'live output',
        },
      }),
    ];

    const evidence = await collectEvidence(
      records,
      'parent',
      'protocol.jsonl',
      resolve(directory, 'missing-home'),
    );

    const usage = normalizeCodexUsage(records, evidence.actors, 'protocol.jsonl');

    expect(evidence).toMatchObject({
      output: 'live output',
      threadIds: ['parent'],
      turnIds: ['turn-1'],
    });

    expect(usage.observations).toMatchObject([
      {
        actorId: 'parent',
        turnId: 'turn-1',
        model: null,
        usage: { input: 7, output: 5 },
      },
    ]);

    expect(evidence.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Auxiliary session log enumeration under'),
        expect.stringContaining('No live turn-context identity was captured for parent.'),
      ]),
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('reads persisted protocol, rejects invalid records and preserves missing identity', async () => {
  const directory = await mkdtemp(resolve('.cache/evidence-test-'));
  try {
    const path = resolve(directory, 'protocol.jsonl');
    const records = [event('turn/started', { threadId: 'parent', turn: { id: 'one' } })];
    await Bun.write(path, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);

    expect(await readProtocol(path)).toEqual(records);
    const evidence = await collectEvidence(records, 'parent', path, directory);

    expect(evidence.actors[0]?.includedActorIds).toEqual([]);
    expect(evidence.issues).toHaveLength(1);
    await Bun.write(path, '{}\n');

    await expect(readProtocol(path)).rejects.toThrow('Invalid native');
  } finally {
    await rm(directory, { recursive: true });
  }
});
