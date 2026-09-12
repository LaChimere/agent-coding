import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { saveReport } from '../../src/execution/worker.ts';
import { freezeRun, type IRunRequest } from '../../src/preparation/run.ts';
import { inventoryDirectory, snapshotDirectory } from '../../src/preparation/snapshot.ts';
import type { ITrialResult } from '../../src/results/records.ts';

const projectSource = resolve(import.meta.dir, '../..');
const regradeRunner = resolve(import.meta.dir, '../fixtures/regrade-runner.ts');
const roots: string[] = [];

interface IRuntimeConfig {
  authentication?: unknown;
  [key: string]: unknown;
}

interface IRegradeFixture {
  root: string;
  project: string;
  runDirectory: string;
  caseFile: string;
  trialId: string;
  resultPath: string;
  artifactPath: string;
  initialReportPath: string;
  initialManifest: string;
  initialResult: string;
  initialArtifact: string;
  initialReport: string;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true });
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function projectFixture(
  selectedCases = ['native/scripted-context'],
): Promise<IRegradeFixture> {
  const root = await mkdtemp(resolve('.cache/regrade-test-'));
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
  runtime.authentication = [
    {
      environment: `EVALS_REGRADING_${crypto.randomUUID().replaceAll('-', '_').toUpperCase()}`,
      jsonFile: { path: resolve(root, 'missing-auth.json'), pointer: '/key' },
    },
  ];

  await Bun.write(runtimePath, `${JSON.stringify(runtime)}\n`);

  for (const name of ['skills', 'plugins', 'config/codex', '.agents/plugins']) {
    await mkdir(resolve(candidate, name), { recursive: true });
  }

  const codex = resolve(root, 'codex');
  await Bun.write(codex, '#!/bin/sh\nprintf "fake-codex-version\\n"\n');
  await chmod(codex, 0o755);

  const request: IRunRequest = {
    project,
    candidates: [candidate],
    selectedCases,
    profile: 'default',
    concurrency: 1,
    repetitions: 1,
    codexExecutable: codex,
  };

  const { directory: runDirectory, manifest } = await freezeRun(request);
  const trial = manifest.trials[0];
  if (trial === undefined) {
    throw new Error('Missing frozen trial.');
  }

  const trialDirectory = resolve(runDirectory, 'trials', trial.id);
  const artifactDirectory = resolve(trialDirectory, 'artifacts');
  const artifactPath = resolve(artifactDirectory, 'candidate-output.txt');
  await mkdir(artifactDirectory, { recursive: true });
  await Bun.write(artifactPath, 'candidate output\n');
  const artifactInventory = await inventoryDirectory(artifactDirectory);
  const evidencePath = resolve(trialDirectory, 'evidence.json');
  await writeJson(evidencePath, { turnIds: ['turn-1', 'turn-2'], threadIds: ['thread-1'] });

  const result: ITrialResult = {
    id: trial.id,
    status: 'completed',
    queuedAt: manifest.createdAt,
    startedAt: manifest.createdAt + 1,
    endedAt: manifest.createdAt + 2,
    errors: [],
    output: 'Atlas 2.3 beta',
    evidencePath: `trials/${trial.id}/evidence.json`,
    protocolPath: null,
    artifacts: {
      directory: `trials/${trial.id}/artifacts`,
      inventory: artifactInventory,
    },
    threadIds: ['thread-1'],
    turnIds: ['turn-1', 'turn-2'],
    operationIds: [],
    environmentFingerprint: null,
  };

  const resultPath = resolve(trialDirectory, 'result.json');
  await writeJson(resultPath, result);
  await writeJson(resolve(runDirectory, 'run-finished.json'), { endedAt: manifest.createdAt + 3 });
  const initialReportPath = await saveReport({ directory: runDirectory });

  return {
    root,
    project,
    runDirectory,
    caseFile: resolve(project, 'cases/native-interaction.json'),
    trialId: trial.id,
    resultPath,
    artifactPath,
    initialReportPath,
    initialManifest: await Bun.file(resolve(runDirectory, 'manifest.json')).text(),
    initialResult: await Bun.file(resultPath).text(),
    initialArtifact: await Bun.file(artifactPath).text(),
    initialReport: await Bun.file(initialReportPath).text(),
  };
}

async function invokeRegrade(
  project: string,
  runDirectory: string,
  selectedCases: string[] = [],
): Promise<string> {
  const child = Bun.spawn(
    [
      process.execPath,
      regradeRunner,
      project,
      runDirectory,
      ...selectedCases.flatMap((id) => ['--case', id]),
    ],
    {
      cwd: project,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(`Regrade failed (${exitCode}): ${stderr || stdout}`);
  }

  const reportPath = stdout.trim().split(/\r?\n/u).at(-1);
  if (reportPath === undefined || reportPath.length === 0) {
    throw new Error(`Regrade returned no report path: ${stdout}`);
  }

  return reportPath;
}

async function regradeDirectories(runDirectory: string): Promise<string[]> {
  return (await Array.fromAsync(new Bun.Glob('regrades/*/manifest.json').scan(runDirectory))).map(
    (path) => resolve(runDirectory, path, '..'),
  );
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('explicit regrading selection keeps the full report scope and refuses unknown case IDs', async () => {
  const input = await projectFixture(['native/scripted-context', 'native/verified-fix']);

  const cases = (await Bun.file(input.caseFile).json()) as {
    metadata: { id: string };
    vars: { task: string };
  }[];

  const unselected = cases.find((item) => item.metadata.id === 'native/verified-fix');
  if (unselected === undefined) {
    throw new Error('Missing unselected case.');
  }
  unselected.vars.task = 'Changed execution input outside the selected grading scope.';
  await Bun.write(input.caseFile, JSON.stringify(cases));
  const reportPath = await invokeRegrade(input.project, input.runDirectory, [
    'native/scripted-context',
  ]);
  const report = await Bun.file(reportPath).json();

  expect(report.summary.execution).toMatchObject({
    planned: 2,
    recorded: 1,
    notRecorded: 1,
  });

  expect(report.quality.summary).toMatchObject({ passed: 1, unknown: 1 });
  const directory = (await regradeDirectories(input.runDirectory))[0];
  if (directory === undefined) {
    throw new Error('Missing selected regrade directory.');
  }

  const manifest = await Bun.file(resolve(directory, 'manifest.json')).json();

  expect(manifest.trials).toHaveLength(1);
  expect(manifest.cases).toHaveLength(1);
  expect(await Bun.file(input.resultPath).text()).toBe(input.initialResult);
  await expect(invokeRegrade(input.project, input.runDirectory, ['missing'])).rejects.toThrow(
    'Case is outside the original run',
  );
});

test('same-content regrade preserves criterion and judge identities', async () => {
  const input = await projectFixture();
  const currentPrices = await Bun.file(
    resolve(input.project, 'pricing/openai-standard.json'),
  ).json();
  currentPrices.version = 'later-price-version';
  await Bun.write(
    resolve(input.project, 'pricing/openai-standard.json'),
    JSON.stringify(currentPrices),
  );

  const firstReportPath = await invokeRegrade(input.project, input.runDirectory);
  const firstDirectories = await regradeDirectories(input.runDirectory);

  expect(firstDirectories).toHaveLength(1);
  const firstDirectory = firstDirectories[0];
  if (firstDirectory === undefined) {
    throw new Error('Missing first regrade directory.');
  }

  const originalManifest = (await Bun.file(
    resolve(input.runDirectory, 'manifest.json'),
  ).json()) as {
    judge: { definitionId: string };
    trials: { criteria: { id: string; definitionId: string }[] }[];
    priceBook: unknown;
  };

  const firstManifest = (await Bun.file(
    resolve(firstDirectory, 'manifest.json'),
  ).json()) as typeof originalManifest;

  expect(firstManifest.judge.definitionId).toBe(originalManifest.judge.definitionId);
  expect(firstManifest.trials[0]?.criteria).toEqual(originalManifest.trials[0]?.criteria);
  expect((await Bun.file(firstReportPath).json()).definition.priceBook).toEqual(
    originalManifest.priceBook,
  );

  const overridePath = await saveReport({
    directory: input.runDirectory,
    priceBook: currentPrices,
  });

  expect((await Bun.file(overridePath).json()).definition.priceBook.version).toBe(
    'later-price-version',
  );
  expect(await Bun.file(input.initialReportPath).text()).toBe(input.initialReport);
  expect((await Bun.file(firstReportPath).json()).quality.summary).toMatchObject({
    passed: 1,
    failed: 0,
  });
});

test('regrades frozen artifacts when native execution evidence was not collected', async () => {
  const input = await projectFixture();
  const result = (await Bun.file(input.resultPath).json()) as ITrialResult;
  const incomplete: ITrialResult = {
    ...result,
    status: 'incomplete',
    evidencePath: null,
    protocolPath: null,
    errors: ['Native execution evidence was not collected.'],
  };
  await writeJson(input.resultPath, incomplete);
  const beforeResult = await Bun.file(input.resultPath).text();

  const cases = (await Bun.file(input.caseFile).json()) as {
    metadata: { id: string };
    assert: { config: Record<string, unknown> }[];
  }[];
  const selected = cases.find((item) => item.metadata.id === 'native/scripted-context');
  if (selected === undefined) {
    throw new Error('Missing selected case.');
  }

  for (const assertion of selected.assert) {
    assertion.config = {
      ...assertion.config,
      method: 'programmatic',
      rubric: 'The frozen output file exists.',
      rule: { type: 'file-exists', path: 'candidate-output.txt' },
    };
  }
  await writeJson(input.caseFile, cases);

  const reportPath = await invokeRegrade(input.project, input.runDirectory);
  const report = await Bun.file(reportPath).json();

  expect(report.summary.execution.incomplete).toBe(1);
  expect(report.quality.summary).toMatchObject({ passed: 1, failed: 0, unknown: 0 });
  expect(report.grades).toHaveLength(2);
  expect(await Bun.file(input.resultPath).text()).toBe(beforeResult);
  expect(await Bun.file(input.artifactPath).text()).toBe(input.initialArtifact);
  expect(await Bun.file(input.initialReportPath).text()).toBe(input.initialReport);
});

test('invalid current rules stop regrading before a manifest, grade or native batch exists', async () => {
  const input = await projectFixture();

  const cases = (await Bun.file(input.caseFile).json()) as {
    metadata: { id: string };
    assert: { config: Record<string, unknown> }[];
  }[];

  const check = cases.find((item) => item.metadata.id === 'native/scripted-context')?.assert[0];
  if (check === undefined) {
    throw new Error('Missing assertion.');
  }
  check.config = { ...check.config, rule: { type: 'invalid-rule' } };
  await Bun.write(input.caseFile, JSON.stringify(cases));

  await expect(invokeRegrade(input.project, input.runDirectory)).rejects.toThrow(
    'programmatic rule',
  );
  expect(await regradeDirectories(input.runDirectory)).toEqual([]);
  expect(await Array.fromAsync(new Bun.Glob('grades/*.json').scan(input.runDirectory))).toEqual([]);
});

test('changed rubric creates a new criterion without mutating candidate evidence or the old report', async () => {
  const input = await projectFixture();

  const originalManifest = (await Bun.file(
    resolve(input.runDirectory, 'manifest.json'),
  ).json()) as {
    judge: { definitionId: string };
    trials: { criteria: { id: string; definitionId: string }[] }[];
  };

  const cases = (await Bun.file(input.caseFile).json()) as {
    metadata: { id: string };
    assert: { metric: string; config: Record<string, unknown> }[];
  }[];

  const selected = cases.find((item) => item.metadata.id === 'native/scripted-context');
  const assertion = selected?.assert.find((item) => item.metric === 'clarified-label');
  if (assertion === undefined) {
    throw new Error('Missing rubric assertion.');
  }
  assertion.config = { ...assertion.config, rubric: 'Changed rubric for the same execution.' };
  await Bun.write(input.caseFile, `${JSON.stringify(cases, null, 2)}\n`);

  const reportPath = await invokeRegrade(input.project, input.runDirectory);
  const directories = await regradeDirectories(input.runDirectory);

  expect(directories).toHaveLength(1);
  const regradeDirectory = directories[0];
  if (regradeDirectory === undefined) {
    throw new Error('Missing regrade directory.');
  }

  const regradeManifest = (await Bun.file(
    resolve(regradeDirectory, 'manifest.json'),
  ).json()) as typeof originalManifest;

  expect(regradeManifest.judge.definitionId).toBe(originalManifest.judge.definitionId);
  expect(regradeManifest.trials[0]?.criteria[0]?.id).toBe(
    originalManifest.trials[0]?.criteria[0]?.id,
  );
  expect(regradeManifest.trials[0]?.criteria[0]?.definitionId).not.toBe(
    originalManifest.trials[0]?.criteria[0]?.definitionId,
  );

  expect(await Bun.file(resolve(input.runDirectory, 'manifest.json')).text()).toEqual(
    input.initialManifest,
  );
  expect(await Bun.file(input.resultPath).text()).toEqual(input.initialResult);
  expect(await Bun.file(input.artifactPath).text()).toEqual(input.initialArtifact);
  expect(await Bun.file(input.initialReportPath).text()).toEqual(input.initialReport);

  const report = (await Bun.file(reportPath).json()) as {
    definition: {
      nativeExport?: { jsonPath: string; htmlPath: string };
      trialDefinitions: { criteria: { definitionId: string }[] }[];
    };
  };

  const nativeExport = (await Bun.file(resolve(regradeDirectory, 'native-export.json')).json()) as {
    jsonPath: string;
    htmlPath: string;
  };

  expect(report.definition.nativeExport).toEqual({
    jsonPath: nativeExport.jsonPath,
    htmlPath: nativeExport.htmlPath,
  });

  expect(nativeExport.jsonPath).toStartWith(regradeDirectory);
  expect(nativeExport.htmlPath).toStartWith(regradeDirectory);
  expect(report.definition.trialDefinitions[0]?.criteria[0]?.definitionId).toBe(
    regradeManifest.trials[0]?.criteria[0]?.definitionId,
  );
  expect((await Bun.file(reportPath).json()).quality.summary).toMatchObject({
    passed: 1,
    failed: 0,
  });
});
