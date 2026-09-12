import { appendFile, chmod, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { ILoadedCase } from '../corpus/cases.ts';
import { prepareNativeTrial } from '../preparation/native.ts';
import {
  containedPath,
  contentHash,
  snapshotDirectory,
  writeJsonRecord,
} from '../preparation/snapshot.ts';
import type {
  ICandidateSnapshot,
  IPlannedTrial,
  IRunManifest,
  ITrialResult,
} from '../results/records.ts';
import type { IResourceOperation } from '../results/resources.ts';
import { collectEvidence, objectRecord, projectEvidence, readProtocol } from './evidence.ts';
import { ScriptedUser } from './interaction.ts';
import { normalizeCodexUsage } from './usage.ts';

export interface ITrialInput {
  runDirectory: string;
  manifest: IRunManifest;
  trial: IPlannedTrial;
  candidate: ICandidateSnapshot;
  case: ILoadedCase;
  credentials: Readonly<Record<string, string>>;
  signal?: AbortSignal;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function discoveredNames(prepared: unknown): string[] {
  const { discovery } = objectRecord(prepared) ?? {};
  const { skills } = objectRecord(discovery) ?? {};
  const { data } = objectRecord(skills) ?? {};
  if (!Array.isArray(data)) {
    throw new Error('Missing verified skill discovery.');
  }

  return data.flatMap((entry) => {
    const { skills: entries } = objectRecord(entry) ?? {};
    if (!Array.isArray(entries)) {
      throw new Error('Invalid verified skill discovery.');
    }
    return entries.flatMap((skill) => {
      const { name, enabled } = objectRecord(skill) ?? {};
      return enabled === true && typeof name === 'string' ? [name] : [];
    });
  });
}

/** One Promptfoo provider call corresponds to exactly one planned native trial. */
export async function executeTrial(input: ITrialInput): Promise<ITrialResult> {
  const { manifest, trial, candidate } = input;
  const directory = resolve(input.runDirectory, 'trials', trial.id);
  await mkdir(directory, { recursive: true });
  const startedAt = Date.now();
  await writeJsonRecord(resolve(directory, 'started.json'), { id: trial.id, startedAt });
  const workspace = resolve(directory, 'workspace');
  await mkdir(workspace);
  const operations: (IResourceOperation & { usesModel: boolean })[] = [];

  const result: ITrialResult = {
    id: trial.id,
    status: 'not-run',
    queuedAt: manifest.createdAt,
    startedAt,
    endedAt: null,
    errors: [],
    output: '',
    evidencePath: null,
    protocolPath: null,
    artifacts: null,
    threadIds: [],
    turnIds: [],
    operationIds: [],
    environmentFingerprint: null,
  };

  let preparation: Awaited<ReturnType<typeof prepareNativeTrial>> | undefined;
  let candidateStart: number | null = null;
  const interaction = new AbortController();

  const signal =
    input.signal === undefined
      ? interaction.signal
      : AbortSignal.any([input.signal, interaction.signal]);

  const user = new ScriptedUser(input.case.definition.metadata, workspace, async (event) => {
    await appendFile(resolve(directory, 'interaction.jsonl'), `${JSON.stringify(event)}\n`, {
      mode: 0o600,
    });
  });

  try {
    for (const binding of input.case.definition.metadata.fixture) {
      const target = containedPath(workspace, binding.target);
      const source = containedPath(resolve(input.runDirectory, 'private/fixtures'), binding.source);
      await mkdir(dirname(target), { recursive: true });
      await Bun.write(target, await Bun.file(source).bytes());
      const { mode } = await stat(source);
      await chmod(target, mode & 0o777);
    }

    signal.throwIfAborted();
    preparation = await prepareNativeTrial({
      directory,
      runtimeDirectory: resolve(input.runDirectory, candidate.runtimeDirectory),
      profileDirectory: resolve(input.runDirectory, candidate.profileDirectory),
      codexExecutable: manifest.codexExecutable,
      credentials: input.credentials,
      ...input.case.definition.metadata.execution,
      onServerRequest: async (method, params) => {
        try {
          const reply = await user.handle(method, params);
          if (user.issues.length > 0) {
            interaction.abort(new Error(user.issues.join(' ')));
          }
          return reply;
        } catch (error) {
          interaction.abort(error);
          throw error;
        }
      },
    });

    result.protocolPath = `trials/${trial.id}/native/protocol.jsonl`;
    if (preparation.status === 'not-run') {
      result.errors.push(preparation.reason);
      return result;
    }

    const prepared = await Bun.file(preparation.evidencePath).json();
    const { installation, probes } = objectRecord(prepared) ?? {};
    const { runtimeTools: tools } = objectRecord(installation) ?? {};
    const { runtimeTools: versions } = objectRecord(probes) ?? {};
    if (tools !== undefined && versions !== undefined) {
      result.environmentFingerprint = contentHash(JSON.stringify({ tools, versions }));
    }

    const available = discoveredNames(prepared);

    for (const skill of input.case.definition.metadata.requiredSkills) {
      if (available.filter((name) => name === skill || name.endsWith(`:${skill}`)).length !== 1) {
        throw new Error(`Required skill was not discovered: ${skill}`);
      }
    }

    signal.throwIfAborted();
    candidateStart = Date.now();
    await writeJsonRecord(resolve(directory, 'candidate-started.json'), {
      id: `${trial.id}-candidate`,
      trialId: trial.id,
      phase: 'candidate',
      status: 'running',
      usesModel: true,
      startedAt: candidateStart,
      endedAt: null,
      observations: [],
    });

    result.status = 'completed';
    let prompt: string | null = input.case.definition.vars.task;

    while (prompt !== null) {
      const turn = await preparation.session.runTurn(prompt, {
        ...(input.case.definition.metadata.outputSchema === null
          ? {}
          : { outputSchema: input.case.definition.metadata.outputSchema }),
        signal,
      });

      if (turn.status !== 'completed') {
        result.status = turn.status === 'failed' ? 'error' : 'incomplete';
        result.errors.push(`Native turn ${turn.id}: ${turn.status}`);
        break;
      }

      const current = projectEvidence(
        await readProtocol(preparation.protocolPath),
        preparation.thread.id,
        result.protocolPath,
      );

      result.output = current.output;
      prompt = await user.afterTurn(current.output);
    }
  } catch (error) {
    result.errors.push(errorText(error));
    result.status = candidateStart === null ? 'not-run' : 'incomplete';
  } finally {
    if (preparation?.status === 'ready') {
      try {
        await preparation.finalize();
      } catch (error) {
        result.errors.push(errorText(error));
        result.status = 'incomplete';
      }
    }

    const endedAt = Date.now();
    operations.push({
      id: `${trial.id}-preparation`,
      trialId: trial.id,
      phase: 'preparation',
      status: candidateStart === null ? 'failed' : 'completed',
      usesModel: false,
      startedAt,
      endedAt: candidateStart ?? endedAt,
      observations: [],
    });

    if (candidateStart !== null && preparation?.status === 'ready') {
      const operation: IResourceOperation & { usesModel: boolean } = {
        id: `${trial.id}-candidate`,
        trialId: trial.id,
        phase: 'candidate',
        status: result.status === 'completed' ? 'completed' : 'incomplete',
        usesModel: true,
        startedAt: candidateStart,
        endedAt,
        observations: [],
      };
      try {
        const records = await readProtocol(preparation.protocolPath);

        const evidence = await collectEvidence(
          records,
          preparation.thread.id,
          result.protocolPath ?? preparation.protocolPath,
          preparation.codexHome,
          Object.values(input.credentials),
        );

        const usage = normalizeCodexUsage(
          records,
          evidence.actors,
          result.protocolPath ?? preparation.protocolPath,
        );

        operation.observations = usage.observations;
        evidence.issues.push(
          ...usage.issues.map(({ evidenceSource, reason }) => `${evidenceSource}: ${reason}`),
        );
        result.output = evidence.output;
        result.threadIds = evidence.threadIds;
        result.turnIds = evidence.turnIds;
        result.evidencePath = `trials/${trial.id}/evidence.json`;
        await writeJsonRecord(resolve(input.runDirectory, result.evidencePath), evidence);
      } catch (error) {
        result.errors.push(`Evidence: ${errorText(error)}`);
        result.status = 'incomplete';
      }
      operations.push(operation);
    }
    if (user.issues.length > 0) {
      result.errors.push(...user.issues);
      result.status = 'incomplete';
    }

    try {
      const artifacts = `trials/${trial.id}/artifacts`;
      result.artifacts = {
        directory: artifacts,
        inventory: await snapshotDirectory(workspace, resolve(input.runDirectory, artifacts), {
          symlinks: 'preserve',
        }),
      };
    } catch (error) {
      result.errors.push(`Artifact snapshot: ${errorText(error)}`);
      result.status = 'incomplete';
    }

    for (const operation of operations) {
      if (operation.phase === 'candidate' && result.status !== 'completed') {
        operation.status = 'incomplete';
      }
      await writeJsonRecord(
        resolve(input.runDirectory, 'operations', operation.id, 'record.json'),
        operation,
      );
    }

    result.operationIds = operations.map((operation) => operation.id);
    result.endedAt = Date.now();
    await writeJsonRecord(resolve(directory, 'result.json'), result);
  }

  return result;
}
