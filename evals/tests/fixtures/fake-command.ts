import { symlink, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

type JsonRpcId = string | number;

interface IJsonMessage {
  id?: unknown;
  method?: unknown;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

interface ICommandParams {
  command?: unknown;
  cwd?: unknown;
  processId?: unknown;
  streamStdoutStderr?: unknown;
  disableOutputCap?: unknown;
  disableTimeout?: unknown;
}

const mode = process.argv[2] ?? 'success';
const appServerArguments = process.argv.slice(3);
const send = (message: IJsonMessage): void => {
  process.stdout.write(`${JSON.stringify(message)}\n`);
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return typeof value === 'string' || typeof value === 'number';
}

function reply(id: unknown, result: unknown): void {
  if (isJsonRpcId(id)) {
    send({ id, result });
  }
}

function replyError(id: unknown, message: string): void {
  if (isJsonRpcId(id)) {
    send({ id, error: { code: -32_600, message } });
  }
}

function outputDelta(processId: string, stream: 'stdout' | 'stderr', text: string): void {
  send({
    method: 'command/exec/outputDelta',
    params: {
      processId,
      stream,
      deltaBase64: Buffer.from(text).toString('base64'),
      capReached: false,
    },
  });
}

let lastWorkspace: string | undefined;

async function handleCommand(message: IJsonMessage): Promise<void> {
  const params: ICommandParams = isRecord(message.params) ? message.params : {};
  const command = params.command;
  const cwd = params.cwd;
  if (typeof cwd === 'string') {
    lastWorkspace = cwd;
  }
  if (!Array.isArray(command) || !command.every((part) => typeof part === 'string')) {
    replyError(message.id, 'Fixture received an invalid command.');
    return;
  }

  const parts = command as string[];
  if (parts[0] === 'fixture') {
    const processId = params.processId;
    if (
      typeof cwd !== 'string' ||
      typeof processId !== 'string' ||
      params.streamStdoutStderr !== true ||
      params.disableOutputCap !== true ||
      params.disableTimeout !== true
    ) {
      replyError(message.id, 'Fixture main command did not receive streaming and no-limit flags.');
      return;
    }
    if (mode === 'abort') {
      await Bun.write(resolve(cwd, 'main-started'), 'started\n');
      outputDelta(processId, 'stdout', 'partial stdout\n');
      outputDelta(processId, 'stderr', 'partial stderr\n');

      return;
    }
    await Bun.write(resolve(cwd, 'original.txt'), 'mutated copy\n');
    const failed = mode === 'nonzero';
    outputDelta(processId, 'stdout', failed ? 'failure stdout\n' : 'streamed stdout\n');
    outputDelta(processId, 'stderr', failed ? 'failure stderr\n' : 'streamed stderr\n');
    reply(message.id, { exitCode: failed ? 7 : 0 });

    return;
  }
  if (parts[0] === '/bin/cat' && parts[1] === '/dev/null') {
    reply(message.id, {
      exitCode: mode === 'fail-cat-control' ? 1 : 0,
      stdout: '',
      stderr: mode === 'fail-cat-control' ? 'operation not permitted' : '',
    });
    return;
  }
  if (mode === 'fail-private' && parts[0] === '/bin/cat') {
    reply(message.id, {
      exitCode: 0,
      stdout: 'private data leaked',
      stderr: '',
    });
    return;
  }
  if (parts[0] === '/bin/cat') {
    const path = parts[1];
    if (path === undefined || typeof cwd !== 'string') {
      throw new Error('Fixture received an invalid private probe.');
    }
    if (mode === 'private-marker-missing' || mode === 'private-marker-symlink') {
      await unlink(path);
    }
    if (mode === 'private-marker-changed') {
      await Bun.write(path, 'changed-canary');
    }
    if (mode === 'private-marker-symlink') {
      await symlink(resolve(cwd, 'original.txt'), path);
    }
    reply(message.id, {
      exitCode: mode === 'private-launcher' ? 127 : 1,
      stdout: mode === 'private-output-leak' ? await Bun.file(path).text() : '',
      stderr:
        mode === 'private-double-quoted-enoent'
          ? `cat: "${path}": No such file or directory\n`
          : mode === 'private-double-quoted-program-enoent'
            ? `/bin/cat: "${path}": No such file or directory\n`
            : mode === 'private-double-wrong-path'
              ? `cat: "${path}-unrelated": No such file or directory\n`
              : mode === 'private-quoted-enoent'
                ? `cat: '${path}': No such file or directory\n`
                : mode === 'private-enoent' || mode === 'private-marker-missing'
                  ? `cat: ${path}: No such file or directory\n`
                  : mode === 'private-wrong-path'
                    ? 'cat: /unrelated-canary: No such file or directory\n'
                    : mode === 'private-wrong-permission-path'
                      ? 'cat: /unrelated-canary: Permission denied\n'
                      : mode === 'private-wrong-command'
                        ? `ls: ${path}: No such file or directory\n`
                        : `cat: ${path}: Operation not permitted\n`,
    });
    return;
  }
  if (parts[0] === '/bin/sh') {
    const path = parts[4];
    const value = parts[5];
    if (typeof path !== 'string' || typeof value !== 'string') {
      replyError(message.id, 'Fixture received an invalid writable probe.');
      return;
    }
    if (mode !== 'fail-writable') {
      await Bun.write(path, value);
    }
    reply(message.id, {
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    return;
  }
  if (parts[0] === '/usr/bin/curl') {
    if (mode === 'network-leak') {
      await fetch(parts.at(-1) ?? '');
    }
    reply(message.id, {
      exitCode: mode === 'network-launcher' ? 127 : 7,
      stdout: mode === 'network-output-leak' ? 'unexpected network output' : '',
      stderr: 'network is not permitted',
    });
    return;
  }
  replyError(message.id, `Unexpected fixture command: ${parts.join(' ')}`);
}

if (appServerArguments.join(' ') !== 'app-server --listen stdio://') {
  throw new Error('Fixture was not launched as an app-server.');
}

for await (const line of console) {
  if (line.trim().length === 0) {
    continue;
  }

  const message = JSON.parse(line) as IJsonMessage;
  if (typeof message.method !== 'string') {
    continue;
  }
  if (message.method === 'initialize') {
    reply(message.id, { userAgent: 'fake-command/1.0.0' });
  } else if (message.method === 'command/exec') {
    await handleCommand(message);
  } else if (message.method !== 'initialized') {
    replyError(message.id, `Unexpected fixture method: ${message.method}`);
  }
}

if (lastWorkspace !== undefined) {
  await Bun.write(resolve(lastWorkspace, 'fake-child-closed'), 'closed\n');
}
