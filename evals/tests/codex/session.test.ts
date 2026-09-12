import { afterEach, expect, test } from 'bun:test';
import { CodexSession } from '../../src/codex/session.ts';
import type { ICodexTransportRecord } from '../../src/codex/transport.ts';

const sessions: CodexSession[] = [];
const records: ICodexTransportRecord[] = [];
const create = () => {
  const session = new CodexSession({
    command: [process.execPath, `${import.meta.dir}/../fixtures/fake-session.ts`],
    cwd: import.meta.dir,
    env: {},
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
