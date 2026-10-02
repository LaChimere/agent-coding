import { randomUUID } from 'node:crypto';
import { lstat, mkdir } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import type { AssertionValueFunctionContext, GradingResult } from 'promptfoo';
import { collectEvidence, objectRecord, readProtocol } from '../codex/evidence.ts';
import type { ICaseAssertion, ICaseMetadata, ILoadedCase } from '../corpus/cases.ts';
import { resolveAuthentication } from '../preparation/authentication.ts';
import {
  containedPath,
  contentHash,
  inventoryDirectory,
  writeJsonRecord,
} from '../preparation/snapshot.ts';
import type {
  IPlannedTrial,
  IRunManifest,
  IStoredGrade,
  ITrialResult,
} from '../results/records.ts';
import type { IResourceOperation } from '../results/resources.ts';
import { runCommandCheck } from './command.ts';
import { initialFixtureEvidence } from './initial-evidence.ts';
import { checkProgrammatic, parseRule } from './programmatic.ts';
import { gradeRubric } from './rubric.ts';

let runSignal: AbortSignal | undefined;

/** A fresh run worker supplies its manual cancellation signal to public assertion callbacks. */
export function setGradingSignal(signal: AbortSignal | undefined): void {
  runSignal = signal;
}

interface ISkillDiscoveryEvidence {
  status: 'observed' | 'unknown';
  source: string;
  sha256: string | null;
  skills: { name: string; description: string; source: string }[] | null;
  reason: string | null;
}

async function savedPreparation(runDirectory: string, trialId: string) {
  const source = `trials/${trialId}/native/preparation.json`;
  try {
    const path = containedPath(runDirectory, source);
    if (!(await lstat(path)).isFile()) {
      return null;
    }
    const bytes = await Bun.file(path).bytes();
    const prepared = objectRecord(JSON.parse(new TextDecoder().decode(bytes)));
    const { status } = prepared ?? {};
    if (prepared === undefined || status !== 'ready') {
      return null;
    }
    return { source, sha256: contentHash(bytes), prepared };
  } catch {
    return null;
  }
}

/** Saved native discovery is capability evidence, not evidence of skill invocation. */
async function skillDiscoveryEvidence(
  runDirectory: string,
  trialId: string,
): Promise<ISkillDiscoveryEvidence> {
  const source = `trials/${trialId}/native/preparation.json`;
  const unknown: ISkillDiscoveryEvidence = {
    status: 'unknown',
    source,
    sha256: null,
    skills: null,
    reason: 'Saved native skill discovery is missing or invalid.',
  };

  try {
    const saved = await savedPreparation(runDirectory, trialId);
    if (saved === null) {
      return unknown;
    }
    const { discovery } = saved.prepared;
    const { skills: listed } = objectRecord(discovery) ?? {};
    const { data } = objectRecord(listed) ?? {};
    if (!Array.isArray(data)) {
      return unknown;
    }

    const skills: NonNullable<ISkillDiscoveryEvidence['skills']> = [];
    const names = new Set<string>();
    for (const [entryIndex, entry] of data.entries()) {
      const { skills: entries, errors } = objectRecord(entry) ?? {};
      if (!Array.isArray(entries) || !Array.isArray(errors) || errors.length !== 0) {
        return unknown;
      }

      for (const [skillIndex, skill] of entries.entries()) {
        const { enabled, name, description } = objectRecord(skill) ?? {};
        if (typeof enabled !== 'boolean') {
          return unknown;
        }
        if (!enabled) {
          continue;
        }
        if (
          typeof name !== 'string' ||
          name.trim().length === 0 ||
          typeof description !== 'string' ||
          names.has(name)
        ) {
          return unknown;
        }

        names.add(name);
        skills.push({
          name,
          description,
          source: `${source}#/discovery/skills/data/${entryIndex}/skills/${skillIndex}`,
        });
      }
    }

    return { status: 'observed', source, sha256: saved.sha256, skills, reason: null };
  } catch {
    return unknown;
  }
}

async function gitBaselineEvidence(
  runDirectory: string,
  trialId: string,
  declared: readonly string[] | undefined,
  fixtureTargets: readonly string[],
) {
  if (declared === undefined) {
    return { status: 'not-declared' };
  }
  const unknown = {
    status: 'unknown',
    source: `trials/${trialId}/native/preparation.json#/probes/git/baseline`,
    reason: 'Saved initial Git baseline is missing or does not match the declared fixture paths.',
  };
  const saved = await savedPreparation(runDirectory, trialId);
  const { probes, conditions } = saved?.prepared ?? {};
  const { git } = objectRecord(probes) ?? {};
  const { baseline } = objectRecord(git) ?? {};
  const { files, commit, tree, observed } = objectRecord(baseline) ?? {};
  const {
    head,
    tree: observedTree,
    trackedFiles,
    untrackedFiles,
    trackedWorktreeClean,
  } = objectRecord(observed) ?? {};
  const { gitBaseline: requested } = objectRecord(conditions) ?? {};
  const samePaths = (paths: unknown, expected: readonly string[]): boolean =>
    Array.isArray(paths) &&
    paths.every((path) => typeof path === 'string') &&
    JSON.stringify([...paths].sort()) === JSON.stringify([...expected].sort());
  const remainingFiles = fixtureTargets.filter((path) => !declared.includes(path));
  const hash = /^(?:[\da-f]{40}|[\da-f]{64})$/u;
  if (
    saved === null ||
    !samePaths(files, declared) ||
    !samePaths(requested, declared) ||
    !samePaths(trackedFiles, declared) ||
    !samePaths(untrackedFiles, remainingFiles) ||
    head !== commit ||
    observedTree !== tree ||
    trackedWorktreeClean !== true ||
    typeof commit !== 'string' ||
    typeof tree !== 'string' ||
    !hash.test(commit) ||
    !hash.test(tree)
  ) {
    return unknown;
  }
  return {
    status: 'observed',
    source: unknown.source,
    sha256: saved.sha256,
    files,
    commit,
    tree,
    observed: { head, tree: observedTree, trackedFiles, untrackedFiles, trackedWorktreeClean },
  };
}

export async function gradeCriterion(input: {
  runDirectory: string;
  manifest: IRunManifest;
  trial: IPlannedTrial;
  case: ILoadedCase;
  initialMetadata: ICaseMetadata;
  result: ITrialResult;
  assertion: ICaseAssertion;
  credentials?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<IStoredGrade> {
  const { trial, result, assertion } = input;
  const criterion = trial.criteria.find((item) => item.id === assertion.metric);
  const candidate = input.manifest.candidates.find((item) => item.id === trial.candidateId);
  if (criterion === undefined || candidate === undefined) {
    throw new Error('Invalid grading identity.');
  }

  const id = randomUUID();
  const operationId = randomUUID();
  const directory = resolve(input.runDirectory, 'operations', operationId);
  await mkdir(resolve(input.runDirectory, 'operations'), { recursive: true });
  const startedAt = Date.now();
  let credentials = input.credentials ?? {};
  let modelMayHaveRun = false;

  let operation: IResourceOperation & { usesModel: boolean } = {
    id: operationId,
    trialId: trial.id,
    phase: assertion.config.method === 'programmatic' ? 'verification' : 'grading',
    status: 'completed',
    usesModel: false,
    startedAt,
    endedAt: null,
    observations: [],
  };

  const grade: IStoredGrade = {
    id,
    trialId: trial.id,
    criterionId: criterion.id,
    definitionId: criterion.definitionId,
    status: 'unknown',
    reason: 'Candidate execution did not start.',
    evidence: [],
    operationId,
    method: assertion.config.method,
    grader: {
      model: null,
      reasoningEffort: null,
      route:
        assertion.config.method === 'programmatic' ? 'programmatic' : 'unresolved-model-grader',
      definitionId: input.manifest.judge.definitionId,
    },
    error: null,
  };

  try {
    if (result.status !== 'not-run') {
      const artifactsDirectory =
        result.artifacts === null ? null : resolve(input.runDirectory, result.artifacts.directory);
      if (result.artifacts !== null && artifactsDirectory !== null) {
        const actual = await inventoryDirectory(artifactsDirectory, { symlinks: 'preserve' });
        if (actual.sha256 !== result.artifacts.inventory.sha256) {
          throw new Error('Frozen artifacts changed since candidate execution.');
        }
      }

      if (assertion.config.method === 'programmatic') {
        const { rule } = assertion.config;
        const parsedRule = parseRule(rule);

        const nativeEvidence =
          parsedRule.type === 'native-conversation' && result.evidencePath !== null
            ? ((await Bun.file(resolve(input.runDirectory, result.evidencePath)).json()) as {
                turnIds: string[];
                threadIds: string[];
                conversation?: import('../codex/evidence.ts').INativeConversationMessage[];
              })
            : null;

        if (parsedRule.type === 'command') {
          if (artifactsDirectory === null) {
            throw new Error('No frozen artifacts are available for verification.');
          }

          const verification = await runCommandCheck({
            id: operationId,
            trialId: trial.id,
            artifactsDirectory,
            operationDirectory: directory,
            profileDirectory: resolve(input.runDirectory, candidate.profileDirectory),
            codexExecutable: input.manifest.codexExecutable,
            command: parsedRule.command,
            ...(input.signal === undefined ? {} : { signal: input.signal }),
          });

          grade.status =
            verification.exitCode === parsedRule.expectedExitCode
              ? 'passed'
              : result.status === 'completed'
                ? 'failed'
                : 'unknown';

          grade.reason = `Verification exited with ${verification.exitCode}; expected ${parsedRule.expectedExitCode}.`;
          grade.evidence = verification.evidence;
        } else {
          Object.assign(
            grade,
            await checkProgrammatic({
              rule: parsedRule,
              nativeEvidence,
              nativeReference: result.evidencePath,
              output: result.output,
              completed: result.status === 'completed',
              artifactsDirectory,
              outputReference: `trials/${trial.id}/result.json#output`,
              artifactReference: result.artifacts?.directory ?? null,
              artifactInventory: result.artifacts?.inventory ?? null,
            }),
          );
        }
      } else {
        if (artifactsDirectory === null) {
          throw new Error('No immutable artifacts are available for model grading.');
        }

        if (input.credentials === undefined) {
          const runtime = await Bun.file(
            resolve(input.runDirectory, candidate.profileDirectory, 'runtime.json'),
          ).json();
          credentials = await resolveAuthentication(runtime.authentication);
        }

        const evidence =
          result.evidencePath === null
            ? null
            : await Bun.file(resolve(input.runDirectory, result.evidencePath)).json();

        const {
          items,
          activation,
          issues,
          actors: savedActors,
          actorRelations,
          conversation,
          toolRecords: savedToolRecords,
          instructionContext: savedInstructionContext,
        } = objectRecord(evidence) ?? {};

        // Regrading can enrich projections from retained raw records without changing a trial.
        const rootThread = result.threadIds[0];

        const recoveredEvidence =
          (savedToolRecords === undefined || savedInstructionContext === undefined) &&
          result.protocolPath !== null &&
          rootThread !== undefined
            ? await collectEvidence(
                await readProtocol(resolve(input.runDirectory, result.protocolPath)),
                rootThread,
                result.protocolPath,
                resolve(input.runDirectory, 'trials', result.id, 'native/home/.codex'),
                Object.values(credentials),
              )
            : null;

        const toolRecords = savedToolRecords ?? recoveredEvidence?.toolRecords ?? null;
        const instructionContext =
          savedInstructionContext ?? recoveredEvidence?.instructionContext ?? null;

        const rubricEvidence = JSON.stringify({
          task: input.case.definition.vars.task,
          requirements: input.case.definition.metadata.requirements.filter((requirement) =>
            assertion.config.requirements.includes(requirement.id),
          ),
          reference: input.case.definition.metadata.reference,
          authorization: input.case.definition.metadata.authorization.scope,
          executionStatus: result.status,
          executionConditions: input.initialMetadata.execution,
          skillDiscovery: await skillDiscoveryEvidence(input.runDirectory, trial.id),
          gitBaseline: await gitBaselineEvidence(
            input.runDirectory,
            trial.id,
            input.initialMetadata.execution.gitBaseline,
            input.initialMetadata.fixture.map((binding) => binding.target),
          ),
          errors: result.errors,
          output: result.output,
          outputReference: `trials/${trial.id}/result.json#output`,
          items,
          toolRecords,
          instructionContext,
          actors: Array.isArray(savedActors)
            ? savedActors.map((value: unknown) => {
                const {
                  threadId,
                  parentThreadId,
                  childThreadIds,
                  assignment,
                  role,
                  model,
                  reasoningEffort,
                  modelsByTurn,
                  reasoningEffortByTurn,
                  sources,
                } = objectRecord(value) ?? {};

                return {
                  threadId,
                  parentThreadId,
                  childThreadIds,
                  assignment,
                  role,
                  model,
                  reasoningEffort,
                  modelsByTurn,
                  reasoningEffortByTurn,
                  sources,
                };
              })
            : null,
          actorRelations,
          conversation,
          activation,
          issues,
          artifacts: result.artifacts,
          initialFixtures:
            result.artifacts === null
              ? null
              : await initialFixtureEvidence(
                  input.runDirectory,
                  input.initialMetadata,
                  result.artifacts.inventory,
                ),
        });

        modelMayHaveRun = true;

        const modelGrade = await gradeRubric({
          id: operationId,
          trialId: trial.id,
          method: assertion.config.method,
          rubric: assertion.config.rubric,
          evidence: rubricEvidence,
          evidenceDirectory: artifactsDirectory,
          operationDirectory: directory,
          codexExecutable: input.manifest.codexExecutable,
          profileDirectory: resolve(input.runDirectory, candidate.profileDirectory),
          credentials,
          ...(input.signal === undefined ? {} : { signal: input.signal }),
        });

        grade.status = modelGrade.status;
        grade.reason = modelGrade.reason;
        grade.evidence = modelGrade.evidence;
        grade.grader = { ...modelGrade.grader, definitionId: input.manifest.judge.definitionId };
        grade.error = modelGrade.error;
        operation = { ...modelGrade.operation, usesModel: true };

        if (grade.status !== 'unknown' && grade.evidence.length === 0) {
          grade.status = 'unknown';
          grade.reason = 'The model judge returned no concrete evidence reference.';
        }
      }
    }
  } catch (error) {
    grade.error = error instanceof Error ? error.message : String(error);

    for (const secret of Object.values(credentials)) {
      grade.error = grade.error.replaceAll(secret, '<credential-redacted>');
    }

    grade.status = 'unknown';
    grade.reason = grade.error;
    operation.status = input.signal?.aborted ? 'interrupted' : 'failed';
    // A model request may have happened before an I/O failure prevented its return.
    operation.usesModel = modelMayHaveRun;
  }

  operation.endedAt ??= Date.now();
  operation.observations = operation.observations.map((observation) => ({
    ...observation,
    evidenceSource: isAbsolute(observation.evidenceSource)
      ? observation.evidenceSource
      : `operations/${operationId}/${observation.evidenceSource}`,
  }));

  await writeJsonRecord(resolve(directory, 'record.json'), operation);
  await writeJsonRecord(resolve(input.runDirectory, 'grades', `${grade.id}.json`), grade);

  return grade;
}

/** Public Promptfoo JavaScript assertion; trial identity comes from our provider metadata. */
export default async function gradeAssertion(
  _output: string,
  context: AssertionValueFunctionContext,
): Promise<GradingResult> {
  const { runDirectory, trialId, gradingManifestPath } = context.metadata ?? {};
  const { criterionId } = context.config ?? {};
  if (
    typeof runDirectory !== 'string' ||
    typeof trialId !== 'string' ||
    typeof criterionId !== 'string'
  ) {
    throw new Error('Missing repository grading context.');
  }

  const manifest = (await Bun.file(
    typeof gradingManifestPath === 'string'
      ? gradingManifestPath
      : resolve(runDirectory, 'manifest.json'),
  ).json()) as IRunManifest;

  const trial = manifest.trials.find((item) => item.id === trialId);
  const loaded = manifest.cases.find((item) => item.definition.metadata.id === trial?.caseId);
  const assertion = loaded?.definition.assert.find((item) => item.metric === criterionId);
  const candidate = manifest.candidates.find((item) => item.id === trial?.candidateId);

  const executionManifest =
    typeof gradingManifestPath === 'string'
      ? ((await Bun.file(resolve(runDirectory, 'manifest.json')).json()) as IRunManifest)
      : manifest;

  const initialCase = executionManifest.cases.find(
    (item) => item.definition.metadata.id === trial?.caseId,
  );
  if (
    trial === undefined ||
    loaded === undefined ||
    assertion === undefined ||
    candidate === undefined ||
    initialCase === undefined
  ) {
    throw new Error('Unknown repository grading identity.');
  }

  const result = (await Bun.file(
    resolve(runDirectory, 'trials', trial.id, 'result.json'),
  ).json()) as ITrialResult;

  const grade = await gradeCriterion({
    runDirectory,
    manifest,
    trial,
    case: loaded,
    initialMetadata: initialCase.definition.metadata,
    result,
    assertion,
    ...(runSignal === undefined ? {} : { signal: runSignal }),
  });

  return {
    pass: grade.status === 'passed',
    score: grade.status === 'passed' ? 1 : 0,
    reason: grade.reason,
    metadata: {
      status: grade.status,
      gradingRecordId: grade.id,
      operationId: grade.operationId,
      evidence: grade.evidence,
      ...(grade.error === null ? {} : { graderError: true }),
    },
  };
}
