import { afterEach, describe, expect, test } from 'bun:test';
import {
  CodexJsonRpcError,
  CodexProcessExitError,
  CodexRequestTimeoutError,
  CodexTransport,
  CodexTransportClosedError,
  type ICodexTransportOptions,
  type ICodexTransportRecord,
} from '../../src/codex/transport.ts';

const fixturePath = `${import.meta.dir}/../fixtures/fake-codex.ts`;
const activeTransports = new Set<CodexTransport>();

function explicitEnvironment(): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      environment[name] = value;
    }
  }
  return environment;
}

type TransportOverrides = Partial<
  Pick<
    ICodexTransportOptions,
    'cleanupGraceMs' | 'onNotification' | 'onRecord' | 'onServerRequest' | 'requestTimeoutMs'
  >
> & { mode?: string };

function createTransport(overrides: TransportOverrides = {}): CodexTransport {
  const command: [string, ...string[]] = [process.execPath, fixturePath];
  if (overrides.mode !== undefined) {
    command.push(overrides.mode);
  }

  const transport = new CodexTransport({
    command,
    cwd: import.meta.dir,
    env: explicitEnvironment(),
    requestTimeoutMs: overrides.requestTimeoutMs ?? 1_000,
    ...(overrides.cleanupGraceMs === undefined ? {} : { cleanupGraceMs: overrides.cleanupGraceMs }),
    ...(overrides.onNotification === undefined ? {} : { onNotification: overrides.onNotification }),
    ...(overrides.onRecord === undefined ? {} : { onRecord: overrides.onRecord }),
    ...(overrides.onServerRequest === undefined
      ? {}
      : { onServerRequest: overrides.onServerRequest }),
  });

  activeTransports.add(transport);

  return transport;
}

afterEach(async () => {
  await Promise.allSettled([...activeTransports].map((transport) => transport.close()));
  activeTransports.clear();
});

describe('CodexTransport JSON-RPC behavior', () => {
  test('correlates out-of-order responses and records wire evidence before delivery', async () => {
    const records: ICodexTransportRecord[] = [];

    const transport = createTransport({
      onRecord: (record) => {
        records.push(record);
      },
    });

    const first = transport.request('out-of-order/first', { ordinal: 1 });
    const second = transport.request('out-of-order/second', { ordinal: 2 });

    await expect(second).resolves.toBe('second');
    await expect(first).resolves.toBe('first');
    const stdout = records.filter((record) => record.stream === 'stdout');

    expect(stdout.map((record) => (record.parsed as { result: string }).result)).toEqual([
      'second',
      'first',
    ]);

    expect(records.filter((record) => record.stream === 'stdin')).toHaveLength(2);
    expect(records.every((record) => record.time.length > 0 && record.raw.length > 0)).toBeTrue();
  });

  test('handles a reverse approval request whose handler makes a nested client request', async () => {
    let transport: CodexTransport;
    transport = createTransport({
      onServerRequest: async (method, params, id) => {
        expect({
          method,
          params,
          id,
        }).toEqual({
          method: 'approval/request',
          params: { reason: 'test' },
          id: 'approval-1',
        });
        const nested = await transport.request('nested/check', {});
        return { decision: 'approved', nested };
      },
    });

    await expect(transport.request('reverse/start', {})).resolves.toEqual({
      reverseResponse: { decision: 'approved', nested: { nested: true } },
    });
  });

  test('rejects unhandled reverse methods with method-not-found instead of authorization', async () => {
    const transport = createTransport();

    await expect(transport.request('reverse/unknown', {})).resolves.toEqual({
      reverseResponse: { code: -32_601, message: 'Method not found: unknown/reverse' },
    });
  });

  test('returns an explicit JSON-RPC error when a reverse-request handler fails', async () => {
    const transport = createTransport({
      onServerRequest: () => {
        throw new Error('approval policy unavailable');
      },
    });

    await expect(transport.request('reverse/start', {})).resolves.toEqual({
      reverseResponse: {
        code: -32_603,
        message: 'Server request handler failed: approval policy unavailable',
      },
    });
  });

  test('preserves notifications whose methods are unknown to the transport', async () => {
    const notifications: { method: string; params: unknown }[] = [];

    const transport = createTransport({
      onNotification: (method, params) => {
        notifications.push({ method, params });
      },
    });

    await expect(transport.request('emit/notification', {})).resolves.toBe('notified');
    expect(notifications).toEqual([{ method: 'future/notification', params: { value: 42 } }]);
  });

  test('surfaces native JSON-RPC errors without terminating the process', async () => {
    const transport = createTransport();
    const request = transport.request('rpc/error', {});

    await expect(request).rejects.toBeInstanceOf(CodexJsonRpcError);
    await expect(request).rejects.toMatchObject({
      code: -32_000,
      data: { source: 'fixture' },
    });

    await expect(transport.request('echo', { value: 1 })).resolves.toEqual({
      method: 'echo',
      params: { value: 1 },
    });
  });
});

describe('CodexTransport failure and lifecycle behavior', () => {
  test('retains malformed stdout evidence and rejects pending work', async () => {
    const records: ICodexTransportRecord[] = [];

    const transport = createTransport({
      onRecord: (record) => {
        records.push(record);
      },
    });

    await expect(transport.request('protocol/malformed', {})).rejects.toThrow('malformed JSON');
    expect(records.some((record) => record.stream === 'stdout' && record.raw === '{not-json')).toBe(
      true,
    );
    await expect(transport.terminal).resolves.toMatchObject({ kind: 'transport-error' });
    await transport.exited;
  });

  test('rejects structurally invalid responses instead of treating them as success', async () => {
    const transport = createTransport();

    await expect(transport.request('protocol/invalid-response', {})).rejects.toThrow(
      'exactly one of result or error',
    );
    await expect(transport.terminal).resolves.toMatchObject({ kind: 'transport-error' });
  });

  test('reports early process exit and drains stderr records', async () => {
    const records: ICodexTransportRecord[] = [];

    const transport = createTransport({
      onRecord: (record) => {
        records.push(record);
      },
    });

    const request = transport.request('exit/early', {});

    await expect(request).rejects.toBeInstanceOf(CodexProcessExitError);
    await expect(transport.exited).resolves.toMatchObject({ exitCode: 7 });
    await expect(transport.terminal).resolves.toMatchObject({ kind: 'process-exit' });
    expect(
      records.some((record) => record.stream === 'stderr' && record.raw.includes('exiting early')),
    ).toBe(true);
  });

  test('times out one control request without retrying or poisoning later requests', async () => {
    const records: ICodexTransportRecord[] = [];

    const transport = createTransport({
      requestTimeoutMs: 80,
      onRecord: (record) => {
        records.push(record);
      },
    });

    await expect(transport.request('timeout/hold', {})).rejects.toBeInstanceOf(
      CodexRequestTimeoutError,
    );
    await expect(transport.request('timeout/count', {})).resolves.toBe(1);

    const timedRequests = records.filter(
      (record) =>
        record.stream === 'stdin' &&
        (record.parsed as { method?: string }).method === 'timeout/hold',
    );

    expect(timedRequests).toHaveLength(1);
  });

  test('can disable a command deadline while retaining deadlines for control requests', async () => {
    const transport = createTransport({ requestTimeoutMs: 50 });

    expect(() => transport.request('echo', {}, { timeoutMs: 0 })).toThrow();
    const command = transport.request('timeout/delayed', {}, { timeoutMs: null });

    await expect(transport.request('timeout/hold', {})).rejects.toBeInstanceOf(
      CodexRequestTimeoutError,
    );
    await expect(command).resolves.toBe('finished');
  });

  test('close cancels pending requests and cleans up a child that stays alive after stdin ends', async () => {
    const transport = createTransport({ mode: 'keep-alive', cleanupGraceMs: 20 });
    const pending = transport.request('hold', {});
    const close = transport.close();

    await expect(pending).rejects.toBeInstanceOf(CodexTransportClosedError);
    await close;

    await expect(transport.exited).resolves.toMatchObject({ signalCode: 'SIGTERM' });
    await expect(transport.terminal).resolves.toMatchObject({ kind: 'closed' });
    await expect(transport.close()).resolves.toBeUndefined();
  });

  test('record callback failure rejects work and terminates the owned process', async () => {
    const transport = createTransport({
      onRecord: (record) => {
        if (record.stream === 'stdout') {
          throw new Error('evidence store unavailable');
        }
      },
    });

    await expect(transport.request('echo', {})).rejects.toThrow('evidence store unavailable');
    await expect(transport.terminal).resolves.toMatchObject({ kind: 'transport-error' });
    await transport.exited;
  });

  test('captures stderr independently of successful protocol responses', async () => {
    const records: ICodexTransportRecord[] = [];

    const transport = createTransport({
      onRecord: (record) => {
        records.push(record);
      },
    });

    await expect(transport.request('emit/stderr', {})).resolves.toBe('diagnosed');
    await transport.close();

    expect(
      records.some((record) => record.stream === 'stderr' && record.raw === 'fake diagnostic\n'),
    ).toBe(true);
  });

  test('drains an asynchronous notification before successful close', async () => {
    const release = Promise.withResolvers<void>();
    let handled = false;

    const transport = createTransport({
      onNotification: async () => {
        await release.promise;
        handled = true;
      },
    });

    await transport.request('emit/notification', {});
    const closed = transport.close();
    release.resolve();
    await closed;

    expect(handled).toBeTrue();
    await expect(transport.terminal).resolves.toMatchObject({ kind: 'closed' });
  });

  test('reports handler failure during shutdown through close and terminal', async () => {
    const release = Promise.withResolvers<void>();

    const transport = createTransport({
      onNotification: async () => {
        await release.promise;
        throw new Error('late handler failed');
      },
    });

    await transport.request('emit/notification', {});
    const closed = transport.close();
    release.resolve();

    await expect(closed).rejects.toThrow('late handler failed');
    await expect(transport.terminal).resolves.toMatchObject({ kind: 'transport-error' });
  });

  test('does not report successful closure while a notification handler remains pending', async () => {
    const release = Promise.withResolvers<void>();

    const transport = createTransport({
      cleanupGraceMs: 30,
      onNotification: () => release.promise,
    });

    await transport.request('emit/notification', {});

    try {
      await expect(transport.close()).rejects.toThrow('event drain timed out');
      await expect(transport.terminal).resolves.toMatchObject({ kind: 'transport-error' });
      await expect(transport.exited).resolves.toMatchObject({ exitCode: 0 });
    } finally {
      release.resolve();
    }
  });

  test('terminates despite a stalled evidence write and records a partial drain', async () => {
    const release = Promise.withResolvers<void>();
    const entered = Promise.withResolvers<void>();

    const transport = createTransport({
      cleanupGraceMs: 30,
      onRecord: async (record) => {
        if (record.stream === 'stdin') {
          entered.resolve();
          await release.promise;
        }
      },
    });

    const request = transport.request('echo', {});
    await entered.promise;
    const closing = transport.close();

    await expect(request).rejects.toBeInstanceOf(CodexTransportClosedError);

    try {
      await expect(closing).rejects.toThrow('write drain timed out');
      await expect(transport.exited).resolves.toMatchObject({ signalCode: 'SIGTERM' });
      await expect(transport.terminal).resolves.toMatchObject({ kind: 'transport-error' });
    } finally {
      release.resolve();
    }
  });
});
