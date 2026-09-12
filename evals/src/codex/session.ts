import { CodexTransport, type ICodexTransportOptions } from './transport.ts';

export interface INativeThread {
  id: string;
  model: string;
  modelProvider: string;
  reasoningEffort: string | null;
  response: Readonly<Record<string, unknown>>;
}

export interface INativeTurn {
  id: string;
  status: 'completed' | 'failed' | 'interrupted';
  response: Readonly<Record<string, unknown>>;
}

export function protocolObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a Codex protocol object.');
  }
  return value as Record<string, unknown>;
}

function protocolText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing Codex protocol field: ${label}`);
  }
  return value;
}

/** A trial owns one native thread; Codex owns every assistant turn and tool call. */
export class CodexSession {
  readonly transport: CodexTransport;
  private _thread: INativeThread | null = null;
  private _running = false;
  private _turnId: string | null = null;
  private readonly _completed = new Map<string, INativeTurn>();
  private _completion = Promise.withResolvers<INativeTurn>();

  constructor(options: ICodexTransportOptions) {
    const notify = options.onNotification;
    this.transport = new CodexTransport({
      ...options,
      onNotification: async (method, params) => {
        this._observe(method, params);
        await notify?.(method, params);
      },
    });
  }

  async initialize(): Promise<unknown> {
    const result = await this.transport.request('initialize', {
      clientInfo: { name: 'agent_coding_evals', version: '0.1.0' },
      capabilities: { experimentalApi: true, requestAttestation: false },
    });
    await this.transport.notify('initialized', {});
    return result;
  }

  async startThread(options: {
    cwd: string;
    permissions: string;
    model?: string;
  }): Promise<INativeThread> {
    if (this._thread !== null) {
      throw new Error('A trial cannot replace its native thread.');
    }

    const response = protocolObject(
      await this.transport.request('thread/start', {
        ...options,
        allowProviderModelFallback: false,
      }),
    );

    const { thread, model, modelProvider, reasoningEffort } = response;
    const { id } = protocolObject(thread);
    if (reasoningEffort !== null && typeof reasoningEffort !== 'string') {
      throw new Error('Codex did not report the effective reasoning effort.');
    }
    this._thread = {
      id: protocolText(id, 'thread.id'),
      model: protocolText(model, 'model'),
      modelProvider: protocolText(modelProvider, 'modelProvider'),
      reasoningEffort,
      response,
    };

    return this._thread;
  }

  async runTurn(
    text: string,
    options: { outputSchema?: Record<string, unknown>; signal?: AbortSignal } = {},
  ): Promise<INativeTurn> {
    if (this._thread === null) {
      throw new Error('Start the native thread before a turn.');
    }
    if (this._running) {
      throw new Error('Scripted turns must run sequentially in their native thread.');
    }
    options.signal?.throwIfAborted();
    this._running = true;
    this._completion = Promise.withResolvers<INativeTurn>();
    const abortFailure = Promise.withResolvers<never>();
    const onAbort = () => {
      void this.interrupt().catch((error: unknown) => abortFailure.reject(error));
    };

    try {
      const input = Object.fromEntries([
        ['type', 'text'],
        ['text', text],
        ['text_elements', []],
      ]);

      const { turn } = protocolObject(
        await this.transport.request('turn/start', {
          threadId: this._thread.id,
          input: [input],
          ...(options.outputSchema === undefined ? {} : { outputSchema: options.outputSchema }),
        }),
      );

      const { id } = protocolObject(turn);
      this._turnId = protocolText(id, 'turn.id');
      const alreadyCompleted = this._completed.get(this._turnId);
      if (alreadyCompleted !== undefined) {
        return alreadyCompleted;
      }
      options.signal?.addEventListener('abort', onAbort, { once: true });
      if (options.signal?.aborted) {
        onAbort();
      }

      return await Promise.race([
        this._completion.promise,
        abortFailure.promise,
        this.transport.terminal.then((terminal) => {
          if (terminal.kind !== 'closed') {
            throw terminal.error;
          }
          throw new Error('Codex closed before turn completion; execution evidence is incomplete.');
        }),
      ]);
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
      this._running = false;
      this._turnId = null;
    }
  }

  /** A manual interruption is a control action, not an elapsed-time budget. */
  async interrupt(): Promise<void> {
    try {
      if (this._thread !== null && this._turnId !== null) {
        await this.transport.request('turn/interrupt', {
          threadId: this._thread.id,
          turnId: this._turnId,
        });
      }
    } finally {
      // Closing also bounds cases where the interrupt is acknowledged without a terminal event.
      await this.transport.close();
    }
  }

  close(): Promise<void> {
    return this.transport.close();
  }

  private _observe(method: string, params: unknown): void {
    if (method !== 'turn/completed') {
      return;
    }

    const { threadId, turn } = protocolObject(params);
    if (threadId !== this._thread?.id) {
      return;
    }

    const response = protocolObject(turn);
    const { id, status } = response;
    if (status !== 'completed' && status !== 'failed' && status !== 'interrupted') {
      throw new Error('Codex emitted a non-terminal turn/completed status.');
    }

    const completed: INativeTurn = {
      id: protocolText(id, 'turn.id'),
      status,
      response,
    };

    this._completed.set(completed.id, completed);
    if (this._turnId === completed.id) {
      this._completion.resolve(completed);
    }
  }
}
