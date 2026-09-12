import { randomUUID } from 'node:crypto';
import { chmod, mkdir, realpath } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { loadCases } from '../corpus/cases.ts';
import { promptfooVersion } from '../promptfoo/library.ts';
import { loadPriceBook } from '../results/pricing.ts';
import type { ICandidateSnapshot, IRunManifest } from '../results/records.ts';
import { runtimeEnvironment } from './config.ts';
import { contentHash, inventoryDirectory, snapshotDirectory, writeJsonRecord } from './snapshot.ts';

export interface IRunRequest {
  project: string;
  candidates: readonly string[];
  selectedCases: readonly string[];
  profile: string;
  concurrency: number;
  repetitions: number;
  codexExecutable: string;
}

async function executableVersion(executable: string, directory: string): Promise<string> {
  const home = resolve(directory, 'tooling-home');
  const temporary = resolve(home, 'tmp');
  await mkdir(temporary, { recursive: true });

  const child = Bun.spawn([executable, '--version'], {
    cwd: directory,
    env: runtimeEnvironment(
      {
        home,
        codexHome: resolve(home, '.codex'),
        temporary,
        workspace: directory,
        path: '/usr/bin:/bin',
      },
      [],
    ),
    signal: AbortSignal.timeout(30_000),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [output, error, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (code !== 0) {
    throw new Error(`Codex version check failed: ${error}`);
  }

  return output.trim();
}

export function criterionDefinitionId(assertion: unknown, judgeDefinitionId: string): string {
  return contentHash(JSON.stringify({ assertion, judgeDefinitionId }));
}

export function judgeDefinitionId(implementation: string, profile: string): string {
  return contentHash(
    JSON.stringify({
      model: 'gpt-6-astra',
      reasoningEffort: 'high',
      implementation,
      profile,
    }),
  );
}

/** Freeze selected content before launching the run's fresh Promptfoo worker. */
export async function freezeRun(
  input: IRunRequest,
): Promise<{ directory: string; manifest: IRunManifest }> {
  const startedAt = Date.now();

  for (const value of [input.concurrency, input.repetitions]) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error('Run counts must be positive integers.');
    }
  }

  if (input.candidates.length === 0) {
    throw new Error('At least one candidate is required.');
  }

  const project = resolve(input.project);
  if (!/^[a-z\d][a-z\d-]*$/u.test(input.profile)) {
    throw new Error('Invalid profile name.');
  }

  const executable = await realpath(input.codexExecutable);
  const id = randomUUID();
  const directory = resolve(project, 'out/runs', id);
  await mkdir(directory, { recursive: true });
  await chmod(directory, 0o700);
  await writeJsonRecord(resolve(directory, 'freeze-request.json'), { startedAt, request: input });

  try {
    const codexVersion = await executableVersion(executable, directory);
    const privateDirectory = resolve(directory, 'private');
    await mkdir(privateDirectory);

    // These are private framework inputs, never readable through the candidate profile.
    for (const name of ['src', 'cases', 'fixtures', 'profiles', 'pricing']) {
      await snapshotDirectory(resolve(project, name), resolve(privateDirectory, name), {
        symlinks: 'reject',
      });
    }

    for (const name of ['package.json', 'bun.lock']) {
      await Bun.write(
        resolve(privateDirectory, name),
        await Bun.file(resolve(project, name)).bytes(),
      );
    }

    const privateInventory = await inventoryDirectory(privateDirectory);
    await writeJsonRecord(resolve(directory, 'private-inventory.json'), privateInventory);
    const implementation = await inventoryDirectory(resolve(privateDirectory, 'src'));
    const profileDirectory = resolve(privateDirectory, 'profiles', input.profile);
    const profileInventory = await inventoryDirectory(profileDirectory);

    const judge = {
      model: 'gpt-6-astra',
      reasoningEffort: 'high',
      definitionId: judgeDefinitionId(implementation.sha256, profileInventory.sha256),
    } as const;

    const cases = await loadCases(privateDirectory, input.selectedCases);
    const candidates: ICandidateSnapshot[] = [];

    for (const [index, source] of input.candidates.entries()) {
      const candidateId = `candidate-${index + 1}`;
      const runtimeDirectory = `inputs/${candidateId}/runtime`;
      const target = resolve(directory, runtimeDirectory);
      await mkdir(target, { recursive: true });

      for (const name of ['skills', 'plugins', 'config/codex', '.agents/plugins']) {
        await mkdir(dirname(resolve(target, name)), { recursive: true });
        await snapshotDirectory(resolve(source, name), resolve(target, name), {
          symlinks: 'reject',
        });
      }

      candidates.push({
        id: candidateId,
        label: `${index + 1}:${basename(resolve(source))}`,
        source: resolve(source),
        runtimeDirectory,
        profileDirectory: `private/profiles/${input.profile}`,
        inventory: await inventoryDirectory(target),
        profileInventory,
      });
    }

    const trials = candidates.flatMap((candidate) =>
      cases.flatMap((item) =>
        Array.from({ length: input.repetitions }, (_, repetition) => ({
          id: randomUUID(),
          candidateId: candidate.id,
          caseId: item.definition.metadata.id,
          caseVersion: item.version,
          executionVersion: item.executionVersion,
          repetition,
          criteria: item.definition.assert.map((assertion) => ({
            id: assertion.metric,
            definitionId: criterionDefinitionId(
              { assertion, reference: item.definition.metadata.reference },
              judge.definitionId,
            ),
            core: assertion.config.core,
          })),
        })),
      ),
    );

    const manifest: IRunManifest = {
      schema: 'codex-evals/run-v1',
      id,
      createdAt: Date.now(),
      concurrency: input.concurrency,
      repetitions: input.repetitions,
      codexExecutable: executable,
      codexVersion,
      framework: {
        bun: Bun.version,
        promptfoo: promptfooVersion,
        implementationHash: implementation.sha256,
      },
      judge,
      candidates,
      cases,
      trials,
      priceBook: await loadPriceBook(privateDirectory),
    };

    await writeJsonRecord(resolve(directory, 'manifest.json'), manifest);
    const operationId = `${id}-freeze`;
    await writeJsonRecord(resolve(directory, 'operations', operationId, 'record.json'), {
      id: operationId,
      trialId: null,
      phase: 'preparation',
      status: 'completed',
      usesModel: false,
      startedAt,
      endedAt: manifest.createdAt,
      observations: [],
    });

    return { directory, manifest };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await writeJsonRecord(resolve(directory, 'freeze-error.json'), {
      startedAt,
      endedAt: Date.now(),
      status: 'failed',
      reason,
      usesModel: false,
    });
    throw new Error(`${reason} (input-freeze evidence: ${directory})`, { cause: error });
  }
}
