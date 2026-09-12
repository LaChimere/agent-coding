import { randomUUID } from 'node:crypto';
import { relative, resolve } from 'node:path';
import type { ApiProvider } from 'promptfoo';
import { executeTrial } from '../codex/trial.ts';
import { promptfooCase } from '../corpus/cases.ts';
import { setGradingSignal } from '../grading/assertion.ts';
import { resolveAuthentication } from '../preparation/authentication.ts';
import { writeJsonRecord } from '../preparation/snapshot.ts';
import { runPromptfooBatch } from '../promptfoo/batch.ts';
import type { IPlannedTrial, IRunManifest } from '../results/records.ts';
import { buildReport, type IRunOutcome, renderReportMarkdown } from '../results/report.ts';
import type { IActualChargeEvidence, IPriceBook } from '../results/resources.ts';
import { loadLedger, selectGrades } from './ledger.ts';

export async function saveReport(input: {
  directory: string;
  trialDefinitions?: readonly IPlannedTrial[];
  priceBook?: IPriceBook;
  actualCharges?: readonly IActualChargeEvidence[];
  nativeExportDirectory?: string;
}): Promise<string> {
  const ledger = await loadLedger(input.directory);
  const priceBook = input.priceBook ?? ledger.manifest.priceBook;

  const id = randomUUID();
  const createdAt = Date.now();
  const definitions = input.trialDefinitions ?? ledger.manifest.trials;

  const completed = Bun.file(resolve(input.directory, 'run-finished.json'));
  const completion = ledger.publishedPaths.has('run-finished.json')
    ? ((await completed.json()) as {
        endedAt: number;
        status?: IRunOutcome['status'];
        error?: string | null;
      })
    : null;

  const runEnd = completion?.endedAt ?? null;
  const end =
    runEnd === null || ledger.operations.some((operation) => operation.endedAt === null)
      ? null
      : Math.max(
          runEnd,
          ...ledger.operations.flatMap((operation) =>
            operation.endedAt === null ? [] : [operation.endedAt],
          ),
        );

  const starts = ledger.operations.flatMap((operation) =>
    operation.startedAt === null ? [] : [operation.startedAt],
  );

  const exportPath = resolve(input.nativeExportDirectory ?? input.directory, 'native-export.json');
  const exportFile = Bun.file(exportPath);
  const nativeExport = ledger.publishedPaths.has(relative(input.directory, exportPath))
    ? ((await exportFile.json()) as { jsonPath: string; htmlPath: string })
    : undefined;

  const report = buildReport({
    manifest: ledger.manifest,
    runOutcome: {
      status: completion?.status ?? 'unknown',
      error: completion?.error ?? null,
      evidence: completion === null ? null : 'run-finished.json',
    },
    trialResults: ledger.trials,
    grades: ledger.grades,
    operations: ledger.operations,
    definition: {
      id,
      runId: ledger.manifest.id,
      createdAt,
      trialDefinitions: definitions,
      gradingSelection: selectGrades(definitions, ledger.grades, ledger.operations),
      operationIds: ledger.operations.map((operation) => operation.id),
      accountingPolicy: { mode: 'all-available', cutoffAt: ledger.cutoffAt },
      wallClock: { startedAt: Math.min(ledger.manifest.createdAt, ...starts), endedAt: end },
      ...(priceBook === undefined ? {} : { priceBook }),
      ...(input.actualCharges === undefined ? {} : { actualCharges: input.actualCharges }),
      ...(nativeExport === undefined
        ? {}
        : { nativeExport: { jsonPath: nativeExport.jsonPath, htmlPath: nativeExport.htmlPath } }),
    },
  });

  const path = resolve(input.directory, 'reports', `${id}.json`);
  await writeJsonRecord(path, report);
  await Bun.write(resolve(input.directory, 'reports', `${id}.md`), renderReportMarkdown(report));

  return path;
}

/** The only case scheduler is Promptfoo. This provider resolves its planned row identity. */
export async function runWorker(directory: string, signal: AbortSignal): Promise<string> {
  const manifest = (await Bun.file(resolve(directory, 'manifest.json')).json()) as IRunManifest;
  if (manifest.schema !== 'codex-evals/run-v1') {
    throw new Error('Unsupported run manifest.');
  }

  await writeJsonRecord(resolve(directory, 'run-started.json'), { startedAt: Date.now() });
  setGradingSignal(signal);

  let failure: string | null = null;

  try {
    const providers: ApiProvider[] = [];

    for (const candidate of manifest.candidates) {
      const runtime = await Bun.file(
        resolve(directory, candidate.profileDirectory, 'runtime.json'),
      ).json();
      const credentials = await resolveAuthentication(runtime.authentication);

      providers.push({
        id: () => `openai:codex-app-server:${candidate.id}`,
        label: candidate.label,
        callApi: async (_prompt, context, options) => {
          const loaded =
            context?.testIdx === undefined ? undefined : manifest.cases[context.testIdx];
          const planned = manifest.trials.find(
            (trial) =>
              trial.caseId === loaded?.definition.metadata.id &&
              trial.candidateId === candidate.id &&
              trial.repetition === context?.repeatIndex,
          );
          if (planned === undefined || loaded === undefined) {
            throw new Error('Promptfoo row does not match the planned trial manifest.');
          }

          const effectiveSignal =
            options?.abortSignal === undefined
              ? signal
              : AbortSignal.any([signal, options.abortSignal]);

          const result = await executeTrial({
            runDirectory: directory,
            manifest,
            trial: planned,
            candidate,
            case: loaded,
            credentials,
            signal: effectiveSignal,
          });

          return {
            output: result.output,
            metadata: {
              runDirectory: directory,
              trialId: planned.id,
              executionStatus: result.status,
            },
          };
        },
      });
    }

    const tests = manifest.cases.map((loaded) => {
      const test = promptfooCase(loaded.definition, resolve(directory, 'private'));
      test.assert = loaded.definition.assert.map((assertion) => ({
        ...assertion,
        value: `file://${resolve(directory, 'private', assertion.value.slice('file://'.length))}`,
        config: { ...assertion.config, criterionId: assertion.metric },
      }));
      return test;
    });

    const native = await runPromptfooBatch({
      directory,
      providers,
      tests,
      concurrency: manifest.concurrency,
      repetitions: manifest.repetitions,
      signal,
    });

    await writeJsonRecord(resolve(directory, 'native-export.json'), native);
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    setGradingSignal(undefined);
    await writeJsonRecord(resolve(directory, 'run-finished.json'), {
      endedAt: Date.now(),
      status: signal.aborted ? 'interrupted' : failure === null ? 'completed' : 'error',
      error: failure,
    });
  }

  const report = await saveReport({ directory });
  if (failure !== null) {
    console.error(`Run ${manifest.id} failed: ${failure}`);
    process.exitCode = 1;
  }

  return report;
}
