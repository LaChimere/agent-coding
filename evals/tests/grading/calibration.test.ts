import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

async function runCalibration(interrupt: boolean) {
  const project = await mkdtemp(resolve('.cache/calibration-test-'));

  try {
    for (const directory of ['src/grading', 'profiles/default', 'calibration', 'pricing']) {
      await mkdir(resolve(project, directory), { recursive: true });
    }

    await Bun.write(
      resolve(project, 'pricing/openai-standard.json'),
      await Bun.file(resolve(import.meta.dir, '../../pricing/openai-standard.json')).bytes(),
    );
    await Bun.write(
      resolve(project, 'profiles/default/runtime.json'),
      JSON.stringify({ codexExecutable: process.execPath, authentication: [] }),
    );
    await Bun.write(
      resolve(project, 'calibration/samples.json'),
      JSON.stringify(
        Array.from({ length: interrupt ? 3 : 1 }, (_, index) => ({
          id: `fixture-${index}`,
          description: `Deterministic grader fixture ${index}`,
          rubric: interrupt ? 'interrupt' : 'Fixture',
          files: [],
          textEvidence: 'fixture',
          artifactEvidence: 'fixture',
          proposedLabel: 'passed',
        })),
      ),
    );
    await Bun.write(
      resolve(project, 'src/grading/rubric.ts'),
      await Bun.file(resolve(import.meta.dir, '../fixtures/calibration-grader.ts')).bytes(),
    );

    const child = Bun.spawn(
      [process.execPath, resolve(import.meta.dir, '../fixtures/calibration-runner.ts'), project],
      { stdout: 'pipe', stderr: 'pipe' },
    );
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    if (code !== 0) {
      throw new Error(`Calibration fixture failed: ${stderr || stdout}`);
    }

    const path = stdout.trim().split('\n').at(-1);
    if (path === undefined) {
      throw new Error('No calibration report.');
    }

    const report = await Bun.file(path).json();
    const frozenPriceBook = await Bun.file(
      resolve(path, '../private/pricing/openai-standard.json'),
    ).json();
    const nativeExport = await Bun.file(report.native.jsonPath).json();

    return { report, frozenPriceBook, nativeExport };
  } finally {
    await rm(project, { recursive: true });
  }
}

test('calibration freezes reference prices and accounts for both graders without claiming human labels', async () => {
  const { report, frozenPriceBook } = await runCalibration(false);

  expect(report).toMatchObject({
    planned: 2,
    graded: 2,
    labelsConfirmed: false,
    agreementCount: null,
  });
  expect(report.resources.operationCount).toBe(2);
  expect(report.resources.estimatedCost.value).toBeCloseTo(0.0003, 10);
  expect(report.resources.estimatedCost.coverage).toBe('partial');
  expect(report.resources.actualCost.value).toBeNull();
  expect(frozenPriceBook).toEqual(report.priceBook);
});

test('cancellation drains started graders and refuses queued rows before saving reports and exports', async () => {
  const { report, nativeExport } = await runCalibration(true);

  expect(report.resources.operationCount).toBe(2);
  expect(report.observations).toHaveLength(2);
  expect(report.resources.usage.total.value).toBe(22);
  expect(report).toMatchObject({ planned: 6, graded: 0, labelsConfirmed: false });
  expect(report.native.rows).toBe(6);
  expect(nativeExport.results.results).toHaveLength(6);
});
