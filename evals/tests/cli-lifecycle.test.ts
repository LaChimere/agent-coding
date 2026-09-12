import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { snapshotDirectory } from '../src/preparation/snapshot.ts';

const projectSource = resolve(import.meta.dir, '..');
const freezeCodex = resolve(import.meta.dir, 'fixtures/fake-freeze-codex.ts');
const roots: string[] = [];

interface IRuntimeConfig {
  authentication?: unknown;
  [key: string]: unknown;
}

function shellLiteral(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function projectFixture(): Promise<{
  root: string;
  project: string;
  candidate: string;
  codex: string;
}> {
  const root = await mkdtemp(resolve('.cache/cli-lifecycle-test-'));
  roots.push(root);
  const project = resolve(root, 'project');
  const candidate = resolve(root, 'candidate');
  await mkdir(project);

  for (const name of ['src', 'cases', 'fixtures', 'profiles', 'pricing']) {
    await snapshotDirectory(resolve(projectSource, name), resolve(project, name), {
      symlinks: 'reject',
    });
  }

  for (const name of ['package.json', 'bun.lock']) {
    await Bun.write(resolve(project, name), await Bun.file(resolve(projectSource, name)).bytes());
  }

  const runtimePath = resolve(project, 'profiles/default/runtime.json');
  const runtime = (await Bun.file(runtimePath).json()) as IRuntimeConfig;
  runtime.authentication = [];
  await Bun.write(runtimePath, `${JSON.stringify(runtime)}\n`);

  for (const name of ['skills', 'plugins', 'config/codex', '.agents/plugins']) {
    await mkdir(resolve(candidate, name), { recursive: true });
  }

  const codex = resolve(root, 'codex');
  await Bun.write(
    codex,
    `#!/bin/sh\nexec ${shellLiteral(process.execPath)} ${shellLiteral(freezeCodex)} "$@"\n`,
  );

  await chmod(codex, 0o755);

  return {
    root,
    project,
    candidate,
    codex,
  };
}

async function waitForVersionMarker(project: string): Promise<string> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    for await (const path of new Bun.Glob('out/runs/*/codex-version-started').scan(project)) {
      return resolve(project, path);
    }
    await Bun.sleep(10);
  }
  throw new Error('Timed out waiting for the freeze version probe.');
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('cancellation during freeze prevents worker startup and model execution', async () => {
  const input = await projectFixture();
  let child: Bun.Subprocess | undefined;
  try {
    child = Bun.spawn(
      [
        process.execPath,
        resolve(input.project, 'src/index.ts'),
        'run',
        '--candidate',
        input.candidate,
        '--case',
        'native/scripted-context',
        '--codex',
        input.codex,
      ],
      {
        cwd: input.project,
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );

    const marker = await waitForVersionMarker(input.project);
    const runDirectory = resolve(marker, '..');
    child.kill('SIGINT');
    await Bun.sleep(30);
    await Bun.write(resolve(runDirectory, 'release-version'), 'released\n');

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout as ReadableStream<Uint8Array>).text(),
      new Response(child.stderr as ReadableStream<Uint8Array>).text(),
      child.exited,
    ]);

    expect(exitCode).toBe(1);
    expect(stderr).toContain('Manual interruption.');
    expect(stdout).not.toContain('Run ');
    expect(await Bun.file(resolve(runDirectory, 'manifest.json')).exists()).toBeTrue();
    expect(await Bun.file(resolve(runDirectory, 'run-started.json')).exists()).toBeFalse();
    expect(await Bun.file(resolve(runDirectory, 'native-export.json')).exists()).toBeFalse();
    expect(await Bun.file(resolve(runDirectory, 'model-started')).exists()).toBeFalse();
    expect(await Array.fromAsync(new Bun.Glob('trials/*/result.json').scan(runDirectory))).toEqual(
      [],
    );
  } finally {
    child?.kill('SIGKILL');
  }
});
