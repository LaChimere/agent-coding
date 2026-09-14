import { mock } from 'bun:test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ITrialInput } from '../../src/codex/trial.ts';
import { writeJsonRecord } from '../../src/preparation/snapshot.ts';
import type { ITrialResult } from '../../src/results/records.ts';

const [project, runDirectory] = process.argv.slice(2);
if (project === undefined || runDirectory === undefined) {
  throw new Error('Missing repetition worker paths.');
}

const trialModulePath = resolve(import.meta.dir, '../../src/codex/trial.ts');
const originalTrial = await import(trialModulePath);
const routes: {
  trialId: string;
  caseId: string;
  candidateId: string;
  repetition: number;
}[] = [];

mock.module(trialModulePath, () => ({
  ...originalTrial,
  executeTrial: async (input: ITrialInput): Promise<ITrialResult> => {
    const { trial, manifest } = input;
    const startedAt = manifest.createdAt + routes.length + 1;
    const result: ITrialResult = {
      id: trial.id,
      status: 'completed',
      queuedAt: manifest.createdAt,
      startedAt,
      endedAt: startedAt + 1,
      errors: [],
      output: 'routed',
      evidencePath: null,
      protocolPath: null,
      artifacts: null,
      threadIds: [],
      turnIds: [],
      operationIds: [],
      environmentFingerprint: null,
    };

    routes.push({
      trialId: trial.id,
      caseId: trial.caseId,
      candidateId: trial.candidateId,
      repetition: trial.repetition,
    });
    await mkdir(resolve(runDirectory, 'trials', trial.id), { recursive: true });
    await writeJsonRecord(resolve(runDirectory, 'trials', trial.id, 'result.json'), result);
    return result;
  },
}));

const { runWorker } = await import('../../src/execution/worker.ts');
await runWorker(runDirectory, new AbortController().signal, 'development');
await writeJsonRecord(resolve(runDirectory, 'mock-execute-trials.json'), routes);
