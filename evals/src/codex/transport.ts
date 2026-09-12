export type JsonRpcId = string | number;

export interface ICodexTransportRecord {
  direction: 'incoming' | 'outgoing';
  stream: 'stdin' | 'stdout' | 'stderr';
  time: string;
  raw: string;
  parsed?: unknown;
}

export interface ICodexProcessExit {
  exitCode: number;
  signalCode: NodeJS.Signals | null;
}

export type CodexTransportTerminal =
  | { kind: 'closed'; process: ICodexProcessExit }
  | { kind: 'process-exit'; error: Error; process: ICodexProcessExit }
  | { kind: 'transport-error'; error: Error };

export interface ICodexTransportOptions {
  command: readonly [string, ...string[]];
  cwd: string;
  env: Readonly<Record<string, string>>;
  requestTimeoutMs: number;
  cleanupGraceMs?: number;
  onRecord?: (record: ICodexTransportRecord) => void | Promise<void>;
  onNotification?: (method: string, params: unknown) => void | Promise<void>;
  onServerRequest?: (method: string, params: unknown, id: JsonRpcId) => unknown | Promise<unknown>;
}

interface IPendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
}

interface IJsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface IJsonMessage {
  data?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
  result?: unknown;
  error?: unknown;
  [key: string]: unknown;
}

interface IDeferred<TValue> {
  promise: Promise<TValue>;
  resolve: (value: TValue) => void;
}

const defaultCleanupGraceMs = 250;

export class CodexTransportError extends Error {}

export class CodexRequestTimeoutError extends CodexTransportError {}

export class CodexTransportClosedError extends CodexTransportError {}

export class CodexProcessExitError extends CodexTransportError {
  readonly exitCode: number;
  readonly signalCode: NodeJS.Signals | null;

  constructor(exitCode: number, signalCode: NodeJS.Signals | null) {
    super(
      `Codex app-server exited before transport close (code ${exitCode}, signal ${signalCode ?? 'none'}).`,
    );
    this.exitCode = exitCode;
    this.signalCode = signalCode;
  }
}

export class CodexJsonRpcError extends CodexTransportError {
  readonly code: number;
  readonly data: unknown;

  constructor(error: IJsonRpcError) {
    super(`Codex JSON-RPC error ${error.code}: ${error.message}`);
    this.code = error.code;
    this.data = error.data;
  }
}

function createDeferred<TValue>(): IDeferred<TValue> {
  let resolve: ((value: TValue) => void) | undefined;
  const promise = new Promise<TValue>((promiseResolve) => {
    resolve = promiseResolve;
  });
  if (resolve === undefined) {
    throw new Error('Promise resolver was not initialized.');
  }

  return { promise, resolve };
}

function isObject(value: unknown): value is IJsonMessage {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return typeof value === 'string' || typeof value === 'number';
}

function hasOwn(value: object, key: string): boolean {
  return Object.hasOwn(value, key);
}

function asError(value: unknown, context: string): Error {
  if (value instanceof Error) {
    return new CodexTransportError(`${context}: ${value.message}`);
  }
  return new CodexTransportError(`${context}: ${String(value)}`);
}

export class CodexTransport {
  readonly pid: number;
  readonly exited: Promise<ICodexProcessExit>;
  readonly terminal: Promise<CodexTransportTerminal>;

  private readonly _process: Bun.PipedSubprocess;
  private readonly _requestTimeoutMs: number;
  private readonly _cleanupGraceMs: number;
  private readonly _onRecord: ICodexTransportOptions['onRecord'];
  private readonly _onNotification: ICodexTransportOptions['onNotification'];
  private readonly _onServerRequest: ICodexTransportOptions['onServerRequest'];
  private readonly _pending = new Map<JsonRpcId, IPendingRequest>();
  private readonly _abandonedRequestIds = new Set<JsonRpcId>();
  private readonly _dispatches = new Set<Promise<void>>();
  private readonly _terminalDeferred = createDeferred<CodexTransportTerminal>();
  private readonly _stdoutDone: Promise<void>;
  private readonly _stderrDone: Promise<void>;
  private _nextRequestId = 1;
  private _writeChain: Promise<void> = Promise.resolve();
  private _failure: Error | null = null;
  private _closing = false;
  private _terminalSettled = false;
  private _closePromise: Promise<void> | null = null;

  constructor(options: ICodexTransportOptions) {
    if (options.command.length === 0 || options.command[0].length === 0) {
      throw new TypeError('Codex transport command must contain a non-empty executable.');
    }
    if (!Number.isFinite(options.requestTimeoutMs) || options.requestTimeoutMs <= 0) {
      throw new RangeError('requestTimeoutMs must be a positive finite number.');
    }

    const cleanupGraceMs = options.cleanupGraceMs ?? defaultCleanupGraceMs;
    if (!Number.isFinite(cleanupGraceMs) || cleanupGraceMs < 0) {
      throw new RangeError('cleanupGraceMs must be a non-negative finite number.');
    }

    this._requestTimeoutMs = options.requestTimeoutMs;
    this._cleanupGraceMs = cleanupGraceMs;
    this._onRecord = options.onRecord;
    this._onNotification = options.onNotification;
    this._onServerRequest = options.onServerRequest;
    this._process = Bun.spawn({
      cmd: [...options.command],
      cwd: options.cwd,
      env: { ...options.env },
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    this.pid = this._process.pid;
    this.exited = this._process.exited.then((exitCode) => ({
      exitCode,
      signalCode: this._process.signalCode,
    }));

    this.terminal = this._terminalDeferred.promise;
    this._stdoutDone = this._readStdout();
    this._stderrDone = this._readStderr();
    void this._observeProcessExit();
  }

  request(
    method: string,
    params: unknown,
    options: { timeoutMs?: number | null } = {},
  ): Promise<unknown> {
    this._assertOpen();
    const timeoutMs =
      options.timeoutMs === null ? null : (options.timeoutMs ?? this._requestTimeoutMs);
    if (timeoutMs !== null && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
      throw new Error('Request timeout must be positive or explicitly null.');
    }

    const id = this._nextRequestId;
    this._nextRequestId += 1;

    const response = new Promise<unknown>((resolve, reject) => {
      const timer =
        timeoutMs === null
          ? undefined
          : setTimeout(() => {
              if (!this._pending.delete(id)) {
                return;
              }
              this._abandonedRequestIds.add(id);
              reject(
                new CodexRequestTimeoutError(
                  `Codex request ${String(id)} (${method}) timed out after ${timeoutMs} ms.`,
                ),
              );
            }, timeoutMs);
      this._pending.set(id, {
        resolve,
        reject,
        timer,
      });
    });

    void this._send({
      id,
      method,
      ...(params === undefined ? {} : { params }),
    }).catch((error) => {
      this._rejectRequest(id, errorFromUnknown(error));
    });

    return response;
  }

  async notify(method: string, params: unknown): Promise<void> {
    await this._send({ method, ...(params === undefined ? {} : { params }) });
  }

  close(): Promise<void> {
    if (this._closePromise === null) {
      this._closePromise = this._performClose();
    }
    return this._closePromise;
  }

  private _assertOpen(): void {
    if (this._failure !== null) {
      throw this._failure;
    }
    if (this._closing) {
      throw new CodexTransportClosedError('Codex transport is closing or closed.');
    }
  }

  private _send(message: IJsonMessage): Promise<void> {
    this._assertOpen();
    const raw = `${JSON.stringify(message)}\n`;

    const operation = this._writeChain.then(async () => {
      if (this._failure !== null) {
        throw this._failure;
      }
      await this._record({
        direction: 'outgoing',
        stream: 'stdin',
        time: new Date().toISOString(),
        raw,
        parsed: message,
      });
      try {
        await this._process.stdin.write(raw);
        await this._process.stdin.flush();
      } catch (error) {
        throw asError(error, 'Failed to write Codex app-server stdin');
      }
    });

    this._writeChain = operation.catch((error) => {
      const failure = errorFromUnknown(error);
      this._fail(failure);
      throw failure;
    });

    return this._writeChain;
  }

  private async _record(record: ICodexTransportRecord): Promise<void> {
    if (this._onRecord === undefined) {
      return;
    }
    try {
      await this._onRecord(record);
    } catch (error) {
      throw asError(error, 'Codex transport record handler failed');
    }
  }

  private async _readStdout(): Promise<void> {
    const reader = this._process.stdout.getReader();
    const decoder = new TextDecoder();
    let buffered = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffered += decoder.decode(value, { stream: true });
        let newline = buffered.indexOf('\n');

        while (newline >= 0) {
          const line = buffered.slice(0, newline).replace(/\r$/, '');
          buffered = buffered.slice(newline + 1);
          await this._handleStdoutLine(line);
          newline = buffered.indexOf('\n');
        }
      }
      buffered += decoder.decode();
      if (buffered.length > 0) {
        await this._handleStdoutLine(buffered.replace(/\r$/, ''));
      }
    } catch (error) {
      this._fail(asError(error, 'Failed to read Codex app-server stdout'));
    } finally {
      reader.releaseLock();
    }
  }

  private async _readStderr(): Promise<void> {
    const reader = this._process.stderr.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const raw = decoder.decode(value, { stream: true });
        if (raw.length > 0) {
          await this._record({
            direction: 'incoming',
            stream: 'stderr',
            time: new Date().toISOString(),
            raw,
          });
        }
      }
      const raw = decoder.decode();
      if (raw.length > 0) {
        await this._record({
          direction: 'incoming',
          stream: 'stderr',
          time: new Date().toISOString(),
          raw,
        });
      }
    } catch (error) {
      this._fail(asError(error, 'Failed to read Codex app-server stderr'));
    } finally {
      reader.releaseLock();
    }
  }

  private async _handleStdoutLine(raw: string): Promise<void> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      await this._record({
        direction: 'incoming',
        stream: 'stdout',
        time: new Date().toISOString(),
        raw,
      });
      throw asError(error, 'Codex app-server emitted malformed JSON');
    }

    await this._record({
      direction: 'incoming',
      stream: 'stdout',
      time: new Date().toISOString(),
      raw,
      parsed,
    });

    this._interpretMessage(parsed);
  }

  private _interpretMessage(message: unknown): void {
    if (!isObject(message)) {
      this._fail(new CodexTransportError('Codex app-server emitted a non-object JSON message.'));
      return;
    }
    if (hasOwn(message, 'method')) {
      if (typeof message.method !== 'string') {
        this._fail(new CodexTransportError('Codex app-server emitted a non-string method.'));
        return;
      }

      const params = message.params;
      if (hasOwn(message, 'id')) {
        if (!isJsonRpcId(message.id)) {
          this._fail(new CodexTransportError('Codex app-server emitted an invalid request id.'));
          return;
        }
        this._ownDispatch(this._dispatchServerRequest(message.method, params, message.id));
        return;
      }
      this._ownDispatch(this._dispatchNotification(message.method, params));

      return;
    }
    if (!hasOwn(message, 'id') || !isJsonRpcId(message.id)) {
      this._fail(new CodexTransportError('Codex app-server emitted an unrecognized message.'));
      return;
    }
    this._handleResponse(message.id, message);
  }

  private _handleResponse(id: JsonRpcId, message: IJsonMessage): void {
    const pending = this._pending.get(id);
    if (pending === undefined) {
      if (this._abandonedRequestIds.delete(id) || this._closing) {
        return;
      }
      this._fail(
        new CodexTransportError(`Codex app-server returned unknown response id ${String(id)}.`),
      );
      return;
    }

    const hasResult = hasOwn(message, 'result');
    const hasError = hasOwn(message, 'error');
    if (hasResult === hasError) {
      this._fail(
        new CodexTransportError(
          `Codex app-server response ${String(id)} must contain exactly one of result or error.`,
        ),
      );
      return;
    }
    this._pending.delete(id);
    clearTimeout(pending.timer);
    if (hasError) {
      if (!isObject(message.error)) {
        pending.reject(
          new CodexTransportError(`Codex response ${String(id)} has an invalid error.`),
        );
        return;
      }

      const { code, message: errorMessage } = message.error;
      if (typeof code !== 'number' || typeof errorMessage !== 'string') {
        pending.reject(
          new CodexTransportError(`Codex response ${String(id)} has an invalid error.`),
        );
        return;
      }
      pending.reject(
        new CodexJsonRpcError({
          code,
          message: errorMessage,
          ...(hasOwn(message.error, 'data') ? { data: message.error.data } : {}),
        }),
      );

      return;
    }
    pending.resolve(message.result);
  }

  private async _dispatchNotification(method: string, params: unknown): Promise<void> {
    if (this._onNotification === undefined) {
      return;
    }
    try {
      await this._onNotification(method, params);
    } catch (error) {
      this._fail(asError(error, `Codex notification handler failed for ${method}`));
    }
  }

  private _ownDispatch(operation: Promise<void>): void {
    const owned = operation
      .catch((error: unknown) => this._fail(errorFromUnknown(error)))
      .finally(() => this._dispatches.delete(owned));
    this._dispatches.add(owned);
  }

  private async _dispatchServerRequest(
    method: string,
    params: unknown,
    id: JsonRpcId,
  ): Promise<void> {
    try {
      if (this._onServerRequest === undefined) {
        await this._sendError(id, -32601, `Method not found: ${method}`);
        return;
      }
      const result = await this._onServerRequest(method, params, id);
      await this._send({ id, result: result ?? null });
    } catch (error) {
      const failure = errorFromUnknown(error);
      try {
        await this._sendError(id, -32603, `Server request handler failed: ${failure.message}`);
      } catch (writeError) {
        this._fail(errorFromUnknown(writeError));
      }
    }
  }

  private async _sendError(
    id: JsonRpcId,
    code: number,
    message: string,
    data?: unknown,
  ): Promise<void> {
    await this._send({
      id,
      error: {
        code,
        message,
        ...(data === undefined ? {} : { data }),
      },
    });
  }

  private _rejectRequest(id: JsonRpcId, error: Error): void {
    const pending = this._pending.get(id);
    if (pending === undefined) {
      return;
    }
    this._pending.delete(id);
    clearTimeout(pending.timer);
    pending.reject(error);
  }

  private _rejectPending(error: Error): void {
    for (const [id, pending] of this._pending) {
      this._pending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(error);
    }
  }

  private _fail(error: Error, kind: 'process-exit' | 'transport-error' = 'transport-error'): void {
    if (this._failure !== null) {
      return;
    }
    this._failure = error;
    this._rejectPending(error);
    if (kind === 'process-exit') {
      void this.exited.then((process) =>
        this._settleTerminal({
          kind,
          error,
          process,
        }),
      );
    } else {
      this._settleTerminal({ kind, error });
    }
    if (!this._closing && this._process.exitCode === null) {
      void this._terminateProcess().catch((terminationError: unknown) => {
        this._failure = asError(terminationError, 'Codex process cleanup failed');
      });
    }
  }

  private _settleTerminal(terminal: CodexTransportTerminal): void {
    if (this._terminalSettled) {
      return;
    }
    this._terminalSettled = true;
    this._terminalDeferred.resolve(terminal);
  }

  private async _observeProcessExit(): Promise<void> {
    const process = await this.exited;
    await Promise.allSettled([this._stdoutDone, this._stderrDone]);
    if (this._closing || this._failure !== null) {
      return;
    }
    this._fail(new CodexProcessExitError(process.exitCode, process.signalCode), 'process-exit');
  }

  private async _terminateProcess(): Promise<void> {
    if (this._process.exitCode !== null) {
      return;
    }
    this._process.kill('SIGTERM');
    if (await this._waitForExit(this._cleanupGraceMs)) {
      return;
    }
    this._process.kill('SIGKILL');
    await this._waitForExit(this._cleanupGraceMs);
  }

  private async _waitForExit(milliseconds: number): Promise<boolean> {
    if (this._process.exitCode !== null) {
      return true;
    }
    return await this._within(this.exited, milliseconds);
  }

  private async _within(operation: Promise<unknown>, milliseconds: number): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation.then(() => true),
        new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(false), milliseconds);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async _performClose(): Promise<void> {
    this._closing = true;
    const closedError = new CodexTransportClosedError('Codex transport closed.');
    this._rejectPending(this._failure ?? closedError);

    try {
      // Cleanup starts immediately even if the evidence sink or stdin has stalled.
      const finishWrites = this._writeChain.then(async () => {
        await this._process.stdin.end();
      });
      let closeError: Error | null = null;

      try {
        if (!(await this._within(finishWrites, this._cleanupGraceMs))) {
          closeError = new CodexTransportError('Codex write drain timed out; evidence is partial.');
        }
      } catch (error) {
        closeError = errorFromUnknown(error);
      }

      if (!(await this._waitForExit(this._cleanupGraceMs))) {
        await this._terminateProcess();
      }

      const drain = Promise.all([this._stdoutDone, this._stderrDone]).then(async () => {
        await Promise.all([...this._dispatches]);
      });
      if (!(await this._within(drain, this._cleanupGraceMs))) {
        closeError ??= new CodexTransportError('Codex event drain timed out; evidence is partial.');
      }
      if (this._failure !== null) {
        throw this._failure;
      }
      if (closeError !== null) {
        throw closeError;
      }
      if (this._process.exitCode === null && this._process.signalCode === null) {
        throw new CodexTransportError('Codex process cleanup did not complete.');
      }
      this._settleTerminal({ kind: 'closed', process: await this.exited });
    } catch (error) {
      const failure = errorFromUnknown(error);
      this._fail(failure);
      throw failure;
    }
  }
}

function errorFromUnknown(value: unknown): Error {
  return value instanceof Error ? value : new CodexTransportError(String(value));
}
