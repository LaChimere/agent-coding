import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { TestCase } from 'promptfoo';
import { resolveAuthentication } from '../preparation/authentication.ts';
import {
  containedPath,
  contentHash,
  snapshotDirectory,
  writeJsonRecord,
} from '../preparation/snapshot.ts';
import { resolveCodexExecutable } from '../preparation/tools.ts';
import { runPromptfooBatch } from '../promptfoo/batch.ts';
import { loadPriceBook } from '../results/pricing.ts';
import type { QualityStatus } from '../results/quality.ts';
import { accountResources } from '../results/resources.ts';
import type { IGradeRubricResult } from './rubric.ts';

interface ICalibrationSample {
  id: string;
  description: string;
  rubric: string;
  files: { path: string; text: string }[];
  textEvidence: string;
  artifactEvidence: string;
  proposedLabel: QualityStatus;
}

interface ICalibrationLabels {
  sampleHash: string;
  confirmedAt: string;
  source: 'repository-owner';
  labels: Record<string, QualityStatus>;
}

/** Calibrates judges only; these observations never become candidate execution samples. */
export async function calibrateGraders(project: string, signal: AbortSignal): Promise<string> {
  const startedAt = Date.now();
  const samples = (await Bun.file(
    resolve(project, 'calibration/samples.json'),
  ).json()) as ICalibrationSample[];
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error('Calibration samples are missing.');
  }

  const ids = new Set<string>();

  for (const sample of samples) {
    if (!/^[a-z][a-z\d-]*$/u.test(sample.id) || ids.has(sample.id)) {
      throw new Error('Invalid or duplicate calibration sample ID.');
    }
    ids.add(sample.id);
    if (!['passed', 'failed', 'unknown'].includes(sample.proposedLabel)) {
      throw new Error('Invalid proposed calibration label.');
    }

    for (const file of sample.files) {
      containedPath('/evidence', file.path);
    }
  }

  const sampleHash = contentHash(JSON.stringify(samples));
  const labelsFile = Bun.file(resolve(project, 'calibration/labels.json'));
  const labels = (await labelsFile.exists())
    ? ((await labelsFile.json()) as ICalibrationLabels)
    : null;
  if (
    labels !== null &&
    (labels.sampleHash !== sampleHash ||
      labels.source !== 'repository-owner' ||
      !Number.isFinite(Date.parse(labels.confirmedAt)) ||
      samples.some(
        (sample) => !['passed', 'failed', 'unknown'].includes(labels.labels[sample.id] ?? ''),
      ))
  ) {
    throw new Error('Human calibration labels do not match the current samples.');
  }

  const directory = resolve(project, 'out/calibration', randomUUID());
  await mkdir(resolve(directory, 'private'), { recursive: true });
  await mkdir(resolve(directory, 'operations'));
  await snapshotDirectory(resolve(project, 'src'), resolve(directory, 'private/src'), {
    symlinks: 'reject',
  });
  await snapshotDirectory(resolve(project, 'pricing'), resolve(directory, 'private/pricing'), {
    symlinks: 'reject',
  });
  const priceBook = await loadPriceBook(resolve(directory, 'private'));
  await snapshotDirectory(
    resolve(project, 'profiles/default'),
    resolve(directory, 'private/profile'),
    { symlinks: 'reject' },
  );

  await writeJsonRecord(resolve(directory, 'samples.json'), samples);
  await writeJsonRecord(resolve(directory, 'labels.json'), labels);
  const profileDirectory = resolve(directory, 'private/profile');
  const runtime = await Bun.file(resolve(profileDirectory, 'runtime.json')).json();
  const credentials = await resolveAuthentication(runtime.authentication);
  const codexExecutable = await resolveCodexExecutable(profileDirectory);
  const rubricModule: typeof import('./rubric.ts') = await import(
    resolve(directory, 'private/src/grading/rubric.ts')
  );

  const observations: {
    sampleId: string;
    method: string;
    expected: QualityStatus | null;
    proposed: QualityStatus;
    agreement: boolean | null;
    result: IGradeRubricResult;
  }[] = [];

  const tests: TestCase[] = [];

  for (const sample of samples) {
    const evidenceDirectory = resolve(directory, 'evidence', randomUUID());
    await mkdir(evidenceDirectory, { recursive: true });

    for (const file of sample.files) {
      const destination = containedPath(evidenceDirectory, file.path);
      await mkdir(dirname(destination), { recursive: true });
      await Bun.write(destination, file.text);
    }

    for (const method of ['text-rubric', 'artifact-rubric'] as const) {
      tests.push({
        description: `${sample.id}: ${method}`,
        vars: { task: sample.description },
        assert: [
          {
            type: 'javascript',
            value: async () => {
              const id = randomUUID();

              const result = await rubricModule.gradeRubric({
                id,
                trialId: `calibration:${sample.id}:${method}`,
                method,
                rubric: sample.rubric,
                evidence: method === 'text-rubric' ? sample.textEvidence : sample.artifactEvidence,
                evidenceDirectory,
                operationDirectory: resolve(directory, 'operations', id),
                codexExecutable,
                profileDirectory,
                credentials,
                signal,
              });

              const expected = labels?.labels[sample.id] ?? null;
              const agreement =
                expected === null ? null : result.error === null && result.status === expected;
              observations.push({
                sampleId: sample.id,
                method,
                expected,
                proposed: sample.proposedLabel,
                agreement,
                result,
              });

              return {
                pass: agreement === true,
                score: agreement === true ? 1 : 0,
                reason:
                  expected === null
                    ? 'Human labels are not confirmed; prediction retained without an agreement claim.'
                    : (result.error ?? `${result.status}; expected ${expected}`),
                metadata: {
                  status: result.status,
                  labelAgreement: agreement,
                  operationId: id,
                },
              };
            },
          },
        ],
      });
    }
  }

  const native = await runPromptfooBatch({
    directory,
    providers: [
      { id: () => 'saved-calibration-evidence', callApi: async (prompt) => ({ output: prompt }) },
    ],
    tests,
    concurrency: 2,
    repetitions: 1,
    signal,
  });

  const report = resolve(directory, 'calibration.json');
  const operations = observations.map((item) => item.result.operation);
  await writeJsonRecord(report, {
    schema: 'codex-evals/calibration-v1',
    sampleHash,
    labelsConfirmed: labels !== null,
    planned: tests.length,
    graded: observations.filter((item) => item.result.error === null).length,
    agreementCount:
      labels === null ? null : observations.filter((item) => item.agreement === true).length,
    observations,
    native,
    priceBook,
    resources: accountResources({
      operations,
      selectedOperationIds: operations.map((operation) => operation.id),
      priceBook,
      wallClock: { startedAt, endedAt: Date.now() },
    }),
  });

  return report;
}
