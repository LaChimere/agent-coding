import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ILoadedCase } from '../../src/corpus/cases.ts';
import { freezeRun, type IRunRequest } from '../../src/preparation/run.ts';
import { snapshotDirectory } from '../../src/preparation/snapshot.ts';
import type { IRunManifest } from '../../src/results/records.ts';
import { loadedCase } from '../fixtures/contracts.ts';

const projectSource = resolve(import.meta.dir, '../..');
const workerRunner = resolve(import.meta.dir, '../fixtures/repetition-runner.ts');
const regradeRunner = resolve(import.meta.dir, '../fixtures/regrade-runner.ts');
const roots: string[] = [];

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true });
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function invokeRunner(
  runner: string,
  args: readonly string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const child = Bun.spawn([process.execPath, runner, ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  return { stdout, stderr, exitCode };
}

async function projectFixture(): Promise<{
  project: string;
  runDirectory: string;
  manifest: IRunManifest;
}> {
  await mkdir(resolve('.cache'), { recursive: true });
  const root = await mkdtemp(resolve('.cache/repetition-test-'));
  roots.push(root);
  const project = resolve(root, 'project');
  await mkdir(project, { recursive: true });

  for (const name of ['src', 'profiles', 'pricing']) {
    await snapshotDirectory(resolve(projectSource, name), resolve(project, name), {
      symlinks: 'reject',
    });
  }

  for (const name of ['package.json', 'bun.lock']) {
    await Bun.write(resolve(project, name), await Bun.file(resolve(projectSource, name)).bytes());
  }

  for (const name of ['holdout/cases', 'holdout/fixtures', 'fixtures']) {
    await mkdir(resolve(project, name), { recursive: true });
  }

  await Bun.write(
    resolve(project, 'collections.json'),
    `${JSON.stringify({
      schema: 'codex-evals/collections-v1',
      collections: {
        development: {
          version: 'repetition-fixture',
          caseRoot: 'cases',
          fixtureRoot: 'fixtures',
          exposure: 'seen',
        },
        holdout: {
          version: 'repetition-fixture',
          caseRoot: 'holdout/cases',
          fixtureRoot: 'holdout/fixtures',
          exposure: 'unseen',
        },
      },
    })}\n`,
  );

  const cases = ['case/alpha', 'case/beta'].map((id): ILoadedCase['definition'] => {
    const item = loadedCase(id).definition;
    item.vars.task = 'Return routed.';
    const assertion = item.assert[0];
    if (assertion === undefined) {
      throw new Error('Missing repetition fixture assertion.');
    }
    assertion.config = {
      ...assertion.config,
      rule: { type: 'text-contains', value: 'routed' },
    };
    return item;
  });
  await writeJson(resolve(project, 'cases/repetition.json'), cases);

  const runtimePath = resolve(project, 'profiles/default/runtime.json');
  const runtime = (await Bun.file(runtimePath).json()) as {
    authentication?: unknown;
    [key: string]: unknown;
  };
  runtime.authentication = [];
  await writeJson(runtimePath, runtime);

  const candidates: string[] = [];
  for (const name of ['candidate-a', 'candidate-b']) {
    const candidate = resolve(root, name);
    candidates.push(candidate);
    for (const directory of ['skills', 'plugins', 'config/codex', '.agents/plugins']) {
      await mkdir(resolve(candidate, directory), { recursive: true });
    }
  }

  const codex = resolve(root, 'codex');
  await Bun.write(codex, '#!/bin/sh\nprintf "repetition-fixture-codex\\n"\n');
  await chmod(codex, 0o755);

  const request: IRunRequest = {
    project,
    candidates,
    selectedCases: cases.map((item) => item.metadata.id),
    profile: 'default',
    concurrency: 2,
    repetitions: 3,
    codexExecutable: codex,
  };
  const frozen = await freezeRun(request);
  return { project, runDirectory: frozen.directory, manifest: frozen.manifest };
}

async function regradeDirectories(runDirectory: string): Promise<string[]> {
  return (await Array.fromAsync(new Bun.Glob('regrades/*/manifest.json').scan(runDirectory))).map(
    (path) => resolve(runDirectory, path, '..'),
  );
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('real Promptfoo repetitions route worker and saved-evidence regrade by stable case identity', async () => {
  const input = await projectFixture();
  const worker = await invokeRunner(
    workerRunner,
    [input.project, input.runDirectory],
    input.project,
  );
  expect(worker.exitCode).toBe(0);

  const reports = (
    await Array.fromAsync(new Bun.Glob('reports/*.json').scan(input.runDirectory))
  ).filter((path) => !path.endsWith('.collection.json'));
  expect(reports).toHaveLength(1);
  const workerReport = await Bun.file(resolve(input.runDirectory, reports[0] as string)).json();
  expect(workerReport.runOutcome.status).toBe('completed');
  expect(workerReport.summary.execution).toMatchObject({
    planned: 12,
    recorded: 12,
    notRecorded: 0,
  });
  expect(workerReport.quality.summary).toMatchObject({
    planned: 12,
    passed: 12,
    failed: 0,
    unknown: 0,
  });
  expect(workerReport.grades).toHaveLength(12);

  const routes = (await Bun.file(
    resolve(input.runDirectory, 'mock-execute-trials.json'),
  ).json()) as {
    trialId: string;
    caseId: string;
    candidateId: string;
    repetition: number;
  }[];
  expect(routes).toHaveLength(12);
  expect(new Set(routes.map((route) => route.trialId)).size).toBe(12);

  const expected = input.manifest.trials
    .map((trial) => `${trial.caseId}|${trial.candidateId}|${trial.repetition}`)
    .sort();
  expect(
    routes.map((route) => `${route.caseId}|${route.candidateId}|${route.repetition}`).sort(),
  ).toEqual(expected);

  const originalResults = new Map<string, string>();
  for (const trial of input.manifest.trials) {
    originalResults.set(
      trial.id,
      await Bun.file(resolve(input.runDirectory, 'trials', trial.id, 'result.json')).text(),
    );
  }
  const originalGradePaths = await Array.fromAsync(
    new Bun.Glob('grades/*.json').scan(input.runDirectory),
  );
  const originalGrades = new Map<string, string>(
    await Promise.all(
      originalGradePaths.map(
        async (path) => [path, await Bun.file(resolve(input.runDirectory, path)).text()] as const,
      ),
    ),
  );

  const regrade = await invokeRunner(
    regradeRunner,
    [input.project, input.runDirectory, '--case', 'case/alpha'],
    input.project,
  );
  expect(regrade.exitCode).toBe(0);
  const regradePath = regrade.stdout.trim().split(/\r?\n/u).at(-1);
  if (regradePath === undefined || regradePath.length === 0) {
    throw new Error(`Regrade returned no report path: ${regrade.stdout}`);
  }

  const directories = await regradeDirectories(input.runDirectory);
  expect(directories).toHaveLength(1);
  const directory = directories[0];
  if (directory === undefined) {
    throw new Error('Missing regrade directory.');
  }

  const manifest = (await Bun.file(resolve(directory, 'manifest.json')).json()) as IRunManifest;
  expect(manifest.cases.map((item) => item.definition.metadata.id)).toEqual(['case/alpha']);
  expect(manifest.trials).toHaveLength(6);
  expect(manifest.trials.map((trial) => trial.id).sort()).toEqual(
    input.manifest.trials
      .filter((trial) => trial.caseId === 'case/alpha')
      .map((trial) => trial.id)
      .sort(),
  );

  for (const [trialId, before] of originalResults) {
    expect(
      await Bun.file(resolve(input.runDirectory, 'trials', trialId, 'result.json')).text(),
    ).toBe(before);
  }

  const nativeExport = (await Bun.file(resolve(directory, 'native-export.json')).json()) as {
    rows: number;
    jsonPath: string;
  };
  expect(nativeExport.rows).toBe(6);
  const exportData = (await Bun.file(nativeExport.jsonPath).json()) as {
    results: { results: { gradingResult?: { componentResults?: { pass?: boolean }[] } }[] };
  };
  expect(exportData.results.results).toHaveLength(6);
  expect(
    exportData.results.results.every((row) =>
      row.gradingResult?.componentResults?.every((component) => component.pass === true),
    ),
  ).toBe(true);

  const grades = await Array.fromAsync(new Bun.Glob('grades/*.json').scan(input.runDirectory));
  expect(grades).toHaveLength(originalGradePaths.length + 6);
  const selectedTrialIds = new Set(manifest.trials.map((trial) => trial.id));
  const newGradePaths = grades.filter((path) => !originalGrades.has(path));
  expect(newGradePaths).toHaveLength(6);
  const gradeRecords = await Promise.all(
    newGradePaths.map(
      async (path) =>
        (await Bun.file(resolve(input.runDirectory, path)).json()) as {
          trialId: string;
          status: string;
        },
    ),
  );
  expect(new Set(gradeRecords.map((grade) => grade.trialId))).toEqual(selectedTrialIds);
  expect(gradeRecords.every((grade) => grade.status === 'passed')).toBe(true);
  for (const [path, before] of originalGrades) {
    expect(await Bun.file(resolve(input.runDirectory, path)).text()).toBe(before);
  }
  expect(await Bun.file(regradePath).exists()).toBe(true);
});
