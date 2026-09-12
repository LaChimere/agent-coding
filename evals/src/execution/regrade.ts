import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ApiProvider } from 'promptfoo';
import { loadCases, promptfooCase } from '../corpus/cases.ts';
import { criterionDefinitionId, judgeDefinitionId } from '../preparation/run.ts';
import { inventoryDirectory, snapshotDirectory, writeJsonRecord } from '../preparation/snapshot.ts';
import { runPromptfooBatch } from '../promptfoo/batch.ts';
import { loadPriceBook } from '../results/pricing.ts';
import type { IRunManifest } from '../results/records.ts';
import { loadLedger } from './ledger.ts';
import { saveReport } from './worker.ts';

/** Regrade saved evidence through Promptfoo; never launch another candidate trial. */
export async function regradeRun(
  project: string,
  runDirectory: string,
  signal: AbortSignal,
  selectedCases: readonly string[] = [],
): Promise<string> {
  const ledger = await loadLedger(runDirectory);
  const originalIds = ledger.manifest.cases.map((item) => item.definition.metadata.id);
  const caseIds = selectedCases.length === 0 ? originalIds : selectedCases;
  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error('Duplicate selected regrading case.');
  }

  for (const caseId of caseIds) {
    if (!originalIds.includes(caseId)) {
      throw new Error(`Case is outside the original run: ${caseId}`);
    }
  }

  const id = randomUUID();
  const directory = resolve(runDirectory, 'regrades', id);
  await mkdir(directory, { recursive: true });
  const frozen = resolve(directory, 'private');
  await mkdir(frozen);

  for (const name of ['src', 'cases', 'fixtures']) {
    await snapshotDirectory(resolve(project, name), resolve(frozen, name), { symlinks: 'reject' });
  }

  const cases = await loadCases(frozen, caseIds);

  for (const item of cases) {
    const previous = ledger.manifest.cases.find(
      (entry) => entry.definition.metadata.id === item.definition.metadata.id,
    );
    if (item.executionVersion !== previous?.executionVersion) {
      throw new Error(`Regrading cannot change execution inputs: ${item.definition.metadata.id}`);
    }
  }

  const implementation = await inventoryDirectory(resolve(frozen, 'src'));
  const profile = ledger.manifest.candidates[0]?.profileInventory.sha256;
  if (profile === undefined) {
    throw new Error('No frozen grading profile exists.');
  }

  const judge = {
    ...ledger.manifest.judge,
    definitionId: judgeDefinitionId(implementation.sha256, profile),
  };

  const trials = ledger.manifest.trials
    .filter((trial) => caseIds.includes(trial.caseId))
    .map((trial) => {
      const loaded = cases.find((item) => item.definition.metadata.id === trial.caseId);
      if (loaded === undefined) {
        throw new Error(`Missing regrading case: ${trial.caseId}`);
      }
      return {
        ...trial,
        criteria: loaded.definition.assert.map((assertion) => ({
          id: assertion.metric,
          core: assertion.config.core,
          definitionId: criterionDefinitionId(
            { assertion, reference: loaded.definition.metadata.reference },
            judge.definitionId,
          ),
        })),
      };
    });

  const manifest: IRunManifest = {
    ...ledger.manifest,
    cases,
    trials,
    judge,
  };

  const gradingManifestPath = resolve(directory, 'manifest.json');
  await writeJsonRecord(gradingManifestPath, manifest);

  const providers: ApiProvider[] = manifest.candidates.map((candidate) => ({
    id: () => `saved-codex-evidence:${candidate.id}`,
    callApi: async (_prompt, context) => {
      const loaded = context?.testIdx === undefined ? undefined : cases[context.testIdx];

      const trial = trials.find(
        (item) =>
          item.caseId === loaded?.definition.metadata.id &&
          item.candidateId === candidate.id &&
          item.repetition === context?.repeatIndex,
      );

      if (trial === undefined) {
        throw new Error('Saved evidence does not match the planned row.');
      }

      const result = ledger.trials.find((item) => item.id === trial.id);
      if (result === undefined || result.status === 'not-run') {
        return { error: 'No candidate evidence is available for regrading.', output: '' };
      }

      return {
        output: result.output,
        metadata: {
          runDirectory,
          trialId: trial.id,
          gradingManifestPath,
        },
      };
    },
  }));

  const tests = cases.map((item) => {
    const test = promptfooCase(item.definition, frozen);
    test.assert = item.definition.assert.map((assertion) => ({
      ...assertion,
      value: `file://${resolve(frozen, assertion.value.slice('file://'.length))}`,
      config: { ...assertion.config, criterionId: assertion.metric },
    }));
    return test;
  });

  const assertionModule: { setGradingSignal(signal: AbortSignal | undefined): void } = await import(
    resolve(frozen, 'src/grading/assertion.ts')
  );
  assertionModule.setGradingSignal(signal);

  try {
    const native = await runPromptfooBatch({
      directory,
      providers,
      tests,
      concurrency: manifest.concurrency,
      repetitions: manifest.repetitions,
      signal,
    });
    await writeJsonRecord(resolve(directory, 'native-export.json'), native);
  } finally {
    assertionModule.setGradingSignal(undefined);
  }

  const report = await saveReport({
    directory: runDirectory,
    priceBook: ledger.manifest.priceBook ?? (await loadPriceBook(project)),
    // Preserve the full original scope and its definitions outside this explicit selection.
    trialDefinitions: ledger.manifest.trials.map(
      (original) => trials.find((trial) => trial.id === original.id) ?? original,
    ),
    nativeExportDirectory: directory,
  });

  await writeJsonRecord(resolve(directory, 'result.json'), { report, endedAt: Date.now() });

  return report;
}
