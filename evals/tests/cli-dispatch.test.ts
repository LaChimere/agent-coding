import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runCli } from '../src/cli.ts';
import { loadCases } from '../src/corpus/cases.ts';
import { freezeCollection, selectCollection } from '../src/corpus/collections.ts';
import { loadedCase } from './fixtures/contracts.ts';

const roots: string[] = [];
const originalConsoleLog = console.log;
const originalExitCode = process.exitCode;
let logCalls: unknown[][] = [];

async function projectRoot(): Promise<string> {
  const root = await mkdtemp(resolve('.cache/cli-dispatch-'));
  roots.push(root);
  await mkdir(resolve(root, 'cases'), { recursive: true });
  await mkdir(resolve(root, 'fixtures'), { recursive: true });
  await mkdir(resolve(root, 'src/grading'), { recursive: true });
  await mkdir(resolve(root, 'profiles/default'), { recursive: true });
  await mkdir(resolve(root, 'pricing'), { recursive: true });
  for (const directory of ['skills', 'plugins', 'config/codex', '.agents/plugins']) {
    await mkdir(resolve(root, directory), { recursive: true });
  }
  await Bun.write(
    resolve(root, 'collections.json'),
    await Bun.file(resolve(import.meta.dir, '../collections.json')).bytes(),
  );
  await Bun.write(resolve(root, 'cases/fixture.json'), JSON.stringify([loadedCase().definition]));
  await Bun.write(resolve(root, 'src/grading/assertion.ts'), 'export default () => true;\n');
  await Bun.write(
    resolve(root, 'profiles/default/runtime.json'),
    JSON.stringify({ codexExecutable: process.execPath, authentication: [] }),
  );
  await Bun.write(
    resolve(root, 'pricing/openai-standard.json'),
    JSON.stringify({
      source: 'fixture',
      version: 'fixture',
      currency: 'USD',
      rates: {},
      modelMapping: {},
    }),
  );
  await Bun.write(resolve(root, 'package.json'), '{}\n');
  await Bun.write(resolve(root, 'bun.lock'), '{}\n');
  return root;
}

async function savedViewReport(root: string): Promise<string> {
  const cases = await loadCases(root, await selectCollection(root));
  const collection = freezeCollection(await selectCollection(root), cases, false);
  const report = resolve(root, 'report.json');
  await Bun.write(`${report}.collection.json`, JSON.stringify(collection));
  await Bun.write(
    report,
    JSON.stringify({
      schema: 'codex-evals/report-v2',
      manifest: { collection, candidates: [{ id: 'candidate' }], trials: [] },
      definition: {},
    }),
  );
  return report;
}

afterEach(async () => {
  console.log = originalConsoleLog;
  logCalls = [];
  process.exitCode = originalExitCode;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('CLI dispatches help and validates the development collection', async () => {
  const root = await projectRoot();
  console.log = ((...args: unknown[]) => logCalls.push(args)) as typeof console.log;

  await runCli(['help'], root);
  await runCli(['--help'], root);
  await runCli(['--', 'validate'], root);

  expect(logCalls.filter((args) => String(args[0]).includes('Codex evaluations'))).toHaveLength(2);
  expect(logCalls.some((args) => String(args[0]).includes('"valid":true'))).toBe(true);
});

test('CLI view reads a saved report with a matching collection sidecar', async () => {
  const root = await projectRoot();
  const report = await savedViewReport(root);
  console.log = ((...args: unknown[]) => logCalls.push(args)) as typeof console.log;

  await runCli(['view', report], root);

  expect(logCalls.some((args) => String(args[0]).startsWith(`${report}\n`))).toBe(true);
  expect(logCalls.some((args) => String(args[0]).includes('No native export'))).toBe(true);
});

test('CLI dispatches a valid run request to the frozen worker', async () => {
  const root = await projectRoot();
  console.log = ((...args: unknown[]) => logCalls.push(args)) as typeof console.log;
  const originalSpawn = Bun.spawn;
  const launched: unknown[][] = [];
  (Bun as unknown as { spawn: typeof Bun.spawn }).spawn = ((args: unknown) => {
    if (Array.isArray(args) && args[1] === '--version') {
      return {
        stdout: new Response('fixture-codex\n').body,
        stderr: new Response('').body,
        exited: Promise.resolve(0),
      } as never;
    }
    if (Array.isArray(args)) {
      launched.push(args);
    }
    return { exited: Promise.resolve(0), kill: () => undefined } as never;
  }) as unknown as typeof Bun.spawn;

  try {
    await runCli(['run', '--candidate', root, '--profile', 'default'], root);
  } finally {
    (Bun as unknown as { spawn: typeof Bun.spawn }).spawn = originalSpawn;
  }

  expect(logCalls.some((args) => String(args[0]).includes('Run '))).toBe(true);
  expect(process.exitCode).toBe(0);
  expect(launched).toHaveLength(1);
  expect(launched[0]?.[0]).toBe(process.execPath);
  expect(String(launched[0]?.[1])).toEndWith('/private/src/index.ts');
  expect(launched[0]?.slice(2, 3)).toEqual(['_worker']);
  expect(launched[0]?.[4]).toBe('development');
  const manifest = await Bun.file(resolve(String(launched[0]?.[3]), 'manifest.json')).json();
  expect(manifest).toMatchObject({ repetitions: 1, concurrency: 2 });
  expect(manifest.collection.id).toBe('development');
  expect(manifest.candidates[0].source).toBe(root);
});

test('CLI rejects malformed commands and reports saved-content boundaries', async () => {
  const root = await projectRoot();
  const report = await savedViewReport(root);
  const run = resolve(root, 'run');
  await mkdir(run, { recursive: true });
  const collection = await Bun.file(`${report}.collection.json`).json();
  await Bun.write(resolve(run, 'collection.json'), JSON.stringify(collection));
  await Bun.write(resolve(run, 'manifest.json'), JSON.stringify({ schema: 'unsupported' }));

  await expect(runCli(['unknown'], root)).rejects.toThrow('Unknown command');
  await expect(runCli(['validate', 'extra'], root)).rejects.toThrow(
    'validate accepts no positional',
  );
  await expect(runCli(['run', '--concurrency', '0'], root)).rejects.toThrow(
    'Counts must be positive integers',
  );
  await expect(runCli(['regrade'], root)).rejects.toThrow('regrade requires one run directory');
  await expect(runCli(['report'], root)).rejects.toThrow('report requires one run directory');
  await expect(runCli(['compare', '/tmp/one'], root)).rejects.toThrow(
    'compare requires two saved report files',
  );
  await expect(runCli(['view'], root)).rejects.toThrow('view requires one saved report file');
  await expect(runCli(['calibrate', 'extra'], root)).rejects.toThrow(
    'calibrate accepts no positional arguments',
  );
  await expect(runCli(['regrade', run], root)).rejects.toThrow();
  await expect(runCli(['report', run], root)).rejects.toThrow('Unsupported run manifest');
  await expect(runCli(['compare', report, report], root)).rejects.toThrow();
  await expect(runCli(['calibrate'], root)).rejects.toThrow('calibration/samples.json');
  await expect(runCli(['_worker', run], root)).rejects.toThrow();
});
