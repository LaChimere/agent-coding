import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CodexTransportClosedError } from '../../src/codex/transport.ts';
import { runCommandCheck } from '../../src/grading/command.ts';

const fixturePath = resolve(import.meta.dir, '../fixtures/fake-command.ts');
const roots: string[] = [];

interface IFixture {
  root: string;
  artifacts: string;
  operation: string;
  profile: string;
  executable: string;
}

function shellLiteral(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function fixture(mode: string): Promise<IFixture> {
  const root = await mkdtemp(resolve('.cache/command-test-'));
  roots.push(root);
  const artifacts = resolve(root, 'artifacts');
  const operation = resolve(root, 'operation');
  const profile = resolve(root, 'profile');
  await Promise.all([mkdir(artifacts), mkdir(profile)]);
  await Bun.write(resolve(artifacts, 'original.txt'), 'original artifact\n');
  const executable = resolve(root, 'fake-codex');
  await Bun.write(
    executable,
    `#!/bin/sh\nexec ${shellLiteral(process.execPath)} ${shellLiteral(fixturePath)} ${shellLiteral(mode)} "$@"\n`,
  );

  await chmod(executable, 0o755);

  return {
    root,
    artifacts,
    operation,
    profile,
    executable,
  };
}

async function run(fixtureInput: IFixture, command: readonly string[], signal?: AbortSignal) {
  return await runCommandCheck({
    id: 'command-check',
    trialId: 'trial-command',
    artifactsDirectory: fixtureInput.artifacts,
    operationDirectory: fixtureInput.operation,
    profileDirectory: fixtureInput.profile,
    codexExecutable: fixtureInput.executable,
    command,
    ...(signal === undefined ? {} : { signal }),
  });
}

interface IProtocolRecord {
  direction: 'incoming' | 'outgoing';
  parsed?: unknown;
}

interface IParsedRecord {
  method?: unknown;
  params?: unknown;
}

interface ICommandParams extends IParsedRecord {
  command?: unknown;
  cwd?: unknown;
}

async function protocol(operation: string): Promise<IProtocolRecord[]> {
  const content = await Bun.file(resolve(operation, 'protocol.jsonl')).text();
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as IProtocolRecord);
}

function parsedRecord(record: IProtocolRecord): IParsedRecord {
  return record.parsed !== null &&
    typeof record.parsed === 'object' &&
    !Array.isArray(record.parsed)
    ? (record.parsed as IParsedRecord)
    : {};
}

function commandRequests(records: readonly IProtocolRecord[]): ICommandParams[] {
  return records
    .map(parsedRecord)
    .filter((record) => record.method === 'command/exec')
    .map((record) => record.params)
    .filter(
      (params): params is ICommandParams =>
        params !== null && typeof params === 'object' && !Array.isArray(params),
    );
}

async function waitForFile(path: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await Bun.file(path).exists()) {
      return;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
  throw new Error(`Timed out waiting for fixture marker: ${path}`);
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('runs the command in a writable copy, preserves the original, and records streamed output', async () => {
  const input = await fixture('success');
  const result = await run(input, ['fixture', 'success']);
  const workspace = resolve(input.operation, 'workspace');

  expect(result.exitCode).toBe(0);
  expect(result.evidence).toEqual([
    resolve(input.operation, 'command-result.json'),
    resolve(input.operation, 'stdout.txt'),
    resolve(input.operation, 'stderr.txt'),
  ]);

  expect(await Bun.file(resolve(input.artifacts, 'original.txt')).text()).toBe(
    'original artifact\n',
  );
  expect(await Bun.file(resolve(workspace, 'original.txt')).text()).toBe('mutated copy\n');
  expect(await Bun.file(resolve(input.operation, 'stdout.txt')).text()).toBe('streamed stdout\n');
  expect(await Bun.file(resolve(input.operation, 'stderr.txt')).text()).toBe('streamed stderr\n');

  const records = await protocol(input.operation);
  const requests = commandRequests(records);

  const main = requests.find((params) => {
    const command = params.command;
    return Array.isArray(command) && command[0] === 'fixture';
  });

  expect(main).toMatchObject({
    cwd: workspace,
    permissionProfile: 'verification',
    streamStdoutStderr: true,
    disableOutputCap: true,
    disableTimeout: true,
  });

  const methods = records
    .map(parsedRecord)
    .flatMap((record) => (typeof record.method === 'string' ? [record.method] : []));

  expect(
    methods.some((method) => method === 'thread/start' || method === 'turn/start'),
  ).toBeFalse();
  expect(methods.some((method) => method.includes('model'))).toBeFalse();
});

test('returns a nonzero command result while retaining both streamed streams', async () => {
  const input = await fixture('nonzero');

  await expect(run(input, ['fixture', 'nonzero'])).resolves.toMatchObject({ exitCode: 7 });
  expect(await Bun.file(resolve(input.operation, 'stdout.txt')).text()).toBe('failure stdout\n');
  expect(await Bun.file(resolve(input.operation, 'stderr.txt')).text()).toBe('failure stderr\n');
  expect(await Bun.file(resolve(input.operation, 'command-result.json')).json()).toMatchObject({
    exitCode: 7,
  });
});

test('fails a prerequisite before launching the main command', async () => {
  const input = await fixture('fail-private');

  await expect(run(input, ['fixture', 'success'])).rejects.toThrow(
    'Verification cannot establish private-data isolation.',
  );
  const requests = commandRequests(await protocol(input.operation));

  expect(requests).toHaveLength(1);
  expect(requests[0]?.command).toEqual(['/bin/cat', expect.any(String)]);
  expect(await Bun.file(resolve(input.operation, 'command-result.json')).exists()).toBeFalse();
  expect(await Bun.file(resolve(input.operation, 'probes.json')).exists()).toBeFalse();
  expect(await Bun.file(resolve(input.operation, 'workspace', 'original.txt')).text()).toBe(
    'original artifact\n',
  );
});

test('manual abort closes the child and retains streamed evidence', async () => {
  const input = await fixture('abort');
  const controller = new AbortController();
  const pending = run(input, ['fixture', 'hold'], controller.signal);
  const workspace = resolve(input.operation, 'workspace');
  await waitForFile(resolve(workspace, 'main-started'));
  controller.abort();

  await expect(pending).rejects.toBeInstanceOf(CodexTransportClosedError);
  await waitForFile(resolve(workspace, 'fake-child-closed'));

  expect(await Bun.file(resolve(input.operation, 'stdout.txt')).text()).toBe('partial stdout\n');
  expect(await Bun.file(resolve(input.operation, 'stderr.txt')).text()).toBe('partial stderr\n');
  expect(await Bun.file(resolve(input.operation, 'protocol.jsonl')).text()).toContain(
    'command/exec/outputDelta',
  );
  expect(await Bun.file(resolve(input.operation, 'operation-started.json')).exists()).toBeTrue();
  expect(await Bun.file(resolve(input.operation, 'input.json')).exists()).toBeTrue();
  expect(await Bun.file(resolve(input.operation, 'probes.json')).exists()).toBeTrue();
  expect(await Bun.file(resolve(input.operation, 'command-result.json')).exists()).toBeFalse();
});
