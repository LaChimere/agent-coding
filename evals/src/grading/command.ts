import { randomUUID } from 'node:crypto';
import { mkdir, realpath, unlink } from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import { objectRecord } from '../codex/evidence.ts';
import { CodexTransport } from '../codex/transport.ts';
import { runtimeEnvironment } from '../preparation/config.ts';
import { snapshotDirectory, writeJsonRecord } from '../preparation/snapshot.ts';
import { resolveRuntimeTools } from '../preparation/tools.ts';

export interface ICommandCheckInput {
  id: string;
  trialId: string;
  artifactsDirectory: string;
  operationDirectory: string;
  profileDirectory: string;
  codexExecutable: string;
  command: readonly string[];
  signal?: AbortSignal;
}

/** Execute a trusted offline check against a writable copy, without starting a model. */
export async function runCommandCheck(
  input: ICommandCheckInput,
): Promise<{ exitCode: number; evidence: string[] }> {
  input.signal?.throwIfAborted();
  const artifacts = await realpath(input.artifactsDirectory);

  const directory = resolve(
    await realpath(dirname(input.operationDirectory)),
    basename(input.operationDirectory),
  );

  if (
    directory === artifacts ||
    directory.startsWith(`${artifacts}${sep}`) ||
    artifacts.startsWith(`${directory}${sep}`)
  ) {
    throw new Error('Verification state must be separate from original artifacts.');
  }
  if (input.command.length === 0) {
    throw new Error('A verification command is required.');
  }
  await mkdir(directory);
  await writeJsonRecord(resolve(directory, 'operation-started.json'), {
    id: input.id,
    trialId: input.trialId,
    phase: 'verification',
    usesModel: false,
    status: 'running',
    startedAt: Date.now(),
    endedAt: null,
    observations: [],
  });

  const workspace = resolve(directory, 'workspace');
  const copy = await snapshotDirectory(artifacts, workspace, { symlinks: 'preserve' });
  const home = resolve(directory, 'home');
  const codexHome = resolve(home, '.codex');
  const temporary = resolve(directory, 'tmp');
  const startup = resolve(directory, 'startup');

  for (const path of [codexHome, temporary, startup]) {
    await mkdir(path, { recursive: true });
  }

  const tools = await resolveRuntimeTools(input.profileDirectory);
  const executable = await realpath(input.codexExecutable);

  const environment = runtimeEnvironment(
    {
      home,
      codexHome,
      temporary,
      workspace: startup,
      path: [...tools.pathDirectories, '/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(':'),
    },
    [],
  );

  const config = Object.fromEntries([
    ['default_permissions', 'verification'],
    ['project_doc_max_bytes', 0],
    ['approval_policy', 'never'],
    ['features', { memories: false, chronicle: false }],
    ['shell_environment_policy', { inherit: 'all' }],
    ['projects', { [workspace]: Object.fromEntries([['trust_level', 'untrusted']]) }],
    [
      'permissions',
      {
        verification: {
          extends: ':workspace',
          filesystem: Object.fromEntries([
            [':root', 'deny'],
            [':minimal', 'read'],
            [':slash_tmp', 'deny'],
            [':tmpdir', 'write'],
            [workspace, 'write'],
            [startup, 'read'],
            [home, 'read'],
            [executable, 'read'],
            ...tools.readPaths.map((path) => [path, 'read']),
          ]),
          network: { enabled: false },
        },
      },
    ],
  ]);

  const serialized = Bun.TOML.stringify(config);
  if (serialized === undefined) {
    throw new Error('Cannot serialize verification permissions.');
  }
  await Bun.write(resolve(codexHome, 'config.toml'), serialized);
  await writeJsonRecord(resolve(directory, 'input.json'), {
    command: input.command,
    originalArtifacts: artifacts,
    workspace,
    copy,
    tools,
    config,
  });

  const processId = randomUUID();
  const protocolPath = resolve(directory, 'protocol.jsonl');
  const stdoutPath = resolve(directory, 'stdout.txt');
  const stderrPath = resolve(directory, 'stderr.txt');
  const protocol = Bun.file(protocolPath).writer();
  const stdout = Bun.file(stdoutPath).writer();
  const stderr = Bun.file(stderrPath).writer();

  const transport = new CodexTransport({
    command: [executable, 'app-server', '--listen', 'stdio://'],
    cwd: startup,
    env: environment,
    requestTimeoutMs: 30_000,
    cleanupGraceMs: 1_000,
    onRecord: async (record) => {
      protocol.write(`${JSON.stringify(record)}\n`);
      await protocol.flush();
      const { method, params } = objectRecord(record.parsed) ?? {};
      if (record.direction !== 'incoming' || method !== 'command/exec/outputDelta') {
        return;
      }

      const { processId: owner, stream, deltaBase64, capReached } = objectRecord(params) ?? {};
      if (owner !== processId) {
        return;
      }
      if (capReached === true) {
        throw new Error('Native verification output was truncated.');
      }
      if (typeof deltaBase64 !== 'string' || (stream !== 'stdout' && stream !== 'stderr')) {
        throw new Error('Invalid native verification output.');
      }

      const sink = stream === 'stdout' ? stdout : stderr;
      sink.write(Buffer.from(deltaBase64, 'base64'));
      await sink.flush();
    },
  });

  const abortFailure = Promise.withResolvers<never>();
  const abort = () => {
    void transport.close().catch((error: unknown) => abortFailure.reject(error));
  };
  input.signal?.addEventListener('abort', abort, { once: true });

  const probe = async (command: string[]) =>
    objectRecord(
      await transport.request('command/exec', {
        command,
        cwd: workspace,
        permissionProfile: 'verification',
        timeoutMs: 5_000,
      }),
    ) ?? {};

  try {
    await transport.request('initialize', {
      clientInfo: { name: 'agent_coding_verification', version: '0.1.0' },
      capabilities: { experimentalApi: true },
    });

    await transport.notify('initialized', {});
    input.signal?.throwIfAborted();
    const privateFile = resolve(directory, 'private-canary');
    await Bun.write(privateFile, randomUUID());
    const privateRead = await probe(['/bin/cat', privateFile]);
    await unlink(privateFile);
    const { exitCode: readCode, stderr: readError } = privateRead;
    if (
      readCode === 0 ||
      typeof readError !== 'string' ||
      !/denied|not permitted/iu.test(readError)
    ) {
      throw new Error('Verification cannot establish private-data isolation.');
    }

    const writeFile = resolve(workspace, `.verification-${randomUUID()}`);
    const writeValue = randomUUID();

    const writable = await probe([
      '/bin/sh',
      '-c',
      'printf %s "$2" > "$1"',
      '_verify',
      writeFile,
      writeValue,
    ]);

    const { exitCode: writeCode } = writable;
    if (
      writeCode !== 0 ||
      !(await Bun.file(writeFile).exists()) ||
      (await Bun.file(writeFile).text()) !== writeValue
    ) {
      throw new Error('Verification copy is not writable.');
    }
    await unlink(writeFile);
    let networkRequests = 0;

    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () => {
        networkRequests += 1;
        return new Response('verification-canary');
      },
    });

    let network: Record<string, unknown>;

    try {
      network = await probe([
        '/usr/bin/curl',
        '--silent',
        '--show-error',
        '--max-time',
        '3',
        `http://127.0.0.1:${server.port}`,
      ]);
    } finally {
      server.stop(true);
    }

    const { exitCode: networkCode, stderr: networkError } = network;
    if (
      networkCode === 0 ||
      networkRequests !== 0 ||
      typeof networkError !== 'string' ||
      !/connect|denied|not permitted/iu.test(networkError)
    ) {
      throw new Error('Verification tool network is not isolated.');
    }
    await writeJsonRecord(resolve(directory, 'probes.json'), {
      privateRead,
      writable,
      network,
      networkRequests,
    });

    input.signal?.throwIfAborted();

    const response = objectRecord(
      await Promise.race([
        transport.request(
          'command/exec',
          {
            command: input.command,
            processId,
            cwd: workspace,
            permissionProfile: 'verification',
            streamStdoutStderr: true,
            disableOutputCap: true,
            disableTimeout: true,
          },
          { timeoutMs: null },
        ),
        abortFailure.promise,
      ]),
    );

    input.signal?.throwIfAborted();
    const { exitCode } = response ?? {};
    if (typeof exitCode !== 'number') {
      throw new Error('Verification did not report an exit code.');
    }
    await writeJsonRecord(resolve(directory, 'command-result.json'), {
      exitCode,
      endedAt: Date.now(),
      stdoutPath,
      stderrPath,
    });

    return {
      exitCode,
      evidence: [resolve(directory, 'command-result.json'), stdoutPath, stderrPath],
    };
  } finally {
    input.signal?.removeEventListener('abort', abort);
    try {
      await transport.close();
    } finally {
      await Promise.all([protocol.end(), stdout.end(), stderr.end()]);
    }
  }
}
