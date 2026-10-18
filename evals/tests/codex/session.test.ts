import { afterEach, expect, test } from 'bun:test';
import { CodexSession, protocolObject } from '../../src/codex/session.ts';
import type { ICodexTransportRecord } from '../../src/codex/transport.ts';

const sessions: CodexSession[] = [];
const records: ICodexTransportRecord[] = [];
const create = (handoffMode?: string) => {
  const session = new CodexSession({
    command: [process.execPath, `${import.meta.dir}/../fixtures/fake-session.ts`],
    cwd: import.meta.dir,
    env: handoffMode === undefined ? {} : Object.fromEntries([['FAKE_HANDOFF_MODE', handoffMode]]),
    requestTimeoutMs: 1000,
    onRecord: (record) => {
      records.push(record);
    },
  });
  sessions.push(session);
  return session;
};

afterEach(async () => {
  await Promise.allSettled(sessions.map((session) => session.close()));
  sessions.length = 0;
  records.length = 0;
});

test('reuses a native thread across fresh turns and preserves observed identity', async () => {
  const session = create();
  await session.initialize();
  const thread = await session.startThread({ cwd: import.meta.dir, permissions: 'eval' });

  expect(thread).toMatchObject({
    id: 'fixture-thread',
    model: 'fixture-model',
    reasoningEffort: 'high',
  });

  expect(await session.runTurn('first user task')).toMatchObject({
    id: 'turn-1',
    status: 'completed',
  });

  expect(await session.runTurn('second user task')).toMatchObject({
    id: 'turn-2',
    status: 'completed',
  });

  const sent = records.filter((record) => record.stream === 'stdin').map((record) => record.raw);

  expect(sent.filter((raw) => raw.includes('thread/start'))).toHaveLength(1);
  expect(sent.filter((raw) => raw.includes('turn/start'))).toHaveLength(2);
  await expect(session.startThread({ cwd: import.meta.dir, permissions: 'eval' })).rejects.toThrow(
    'replace',
  );
});

test('handles completion before the start response and preserves native failure', async () => {
  const session = create();
  await session.initialize();
  await session.startThread({ cwd: import.meta.dir, permissions: 'eval' });

  expect(await session.runTurn('early-completion')).toMatchObject({ status: 'completed' });
  expect(await session.runTurn('fail')).toMatchObject({ status: 'failed' });
});

test('an explicit idle handoff starts a different thread with the same configuration', async () => {
  const session = create();
  await session.initialize();
  const first = await session.startThread({ cwd: import.meta.dir, permissions: 'eval' });
  await session.runTurn('prepare the handoff');

  const pending = session.handoffThread();
  await expect(session.runTurn('race the handoff')).rejects.toThrow('sequentially');
  const next = await pending;

  expect(next.id).toBe('fixture-thread-2');
  expect(next.model).toBe(first.model);
  await expect(session.runTurn('resume from the artifact')).resolves.toMatchObject({
    status: 'completed',
  });
  const requests = records
    .filter((record) => record.stream === 'stdin')
    .map((record) => {
      const { method } = protocolObject(record.parsed);
      return method;
    });
  expect(requests.filter((method) => method === 'thread/start')).toHaveLength(2);
  expect(requests.filter((method) => method === 'turn/start')).toHaveLength(2);
});

test('handoff requires an idle owner and rejects reused identity or changed model', async () => {
  const session = create();
  await expect(session.handoffThread()).rejects.toThrow('idle');
  await session.initialize();
  await session.startThread({ cwd: import.meta.dir, permissions: 'eval' });
  const controller = new AbortController();
  const turn = session.runTurn('hold', { signal: controller.signal });
  await expect(session.handoffThread()).rejects.toThrow('idle');
  controller.abort();
  await turn;

  for (const [mode, error] of [
    ['reuse', 'different native thread'],
    ['model', 'model configuration'],
  ] as const) {
    const other = create(mode);
    await other.initialize();
    await other.startThread({ cwd: import.meta.dir, permissions: 'eval' });
    await expect(other.handoffThread()).rejects.toThrow(error);
  }
});

test('handoff preserves the original read-only permissions and workspace', async () => {
  const session = create();
  await session.initialize();
  const options = { cwd: import.meta.dir, permissions: 'eval-read-only' };
  await session.startThread(options);
  options.permissions = 'eval';
  options.cwd = '/another-workspace';
  await session.runTurn('read-only inspection');
  await session.handoffThread();
  await session.runTurn('read-only continuation');

  const starts = records.flatMap((record) => {
    if (record.stream !== 'stdin') {
      return [];
    }
    const { method, params } = protocolObject(record.parsed);
    return method === 'thread/start' ? [protocolObject(params)] : [];
  });
  expect(starts).toHaveLength(2);
  for (const start of starts) {
    expect(start).toMatchObject({ cwd: import.meta.dir, permissions: 'eval-read-only' });
  }
});

test('interrupts the active native turn once without retrying the task', async () => {
  const session = create();
  await session.initialize();
  await session.startThread({ cwd: import.meta.dir, permissions: 'eval' });
  const controller = new AbortController();
  const turn = session.runTurn('hold', { signal: controller.signal });
  controller.abort();

  await expect(turn).resolves.toMatchObject({ status: 'interrupted' });
  await session.close();

  expect(records.filter((record) => record.raw.includes('turn/interrupt'))).toHaveLength(1);
  expect(records.filter((record) => record.raw.includes('turn/start'))).toHaveLength(1);
});

test('rejects absent threads and overlapping scripted turns', async () => {
  const session = create();

  await expect(session.runTurn('before start')).rejects.toThrow('Start the native thread');
  await session.initialize();
  await session.startThread({ cwd: import.meta.dir, permissions: 'eval' });
  const controller = new AbortController();
  const turn = session.runTurn('hold', { signal: controller.signal });

  await expect(session.runTurn('overlapping')).rejects.toThrow('sequentially');
  controller.abort();
  await turn;
});
