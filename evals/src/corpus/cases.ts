import { lstat, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TestCase } from 'promptfoo';
import { parseRule } from '../grading/programmatic.ts';
import { containedPath, contentHash } from '../preparation/snapshot.ts';

export type GradingMethod = 'programmatic' | 'text-rubric' | 'artifact-rubric';

export interface ICaseMetadata {
  id: string;
  group: string;
  kind: 'task' | 'routing';
  requirements: string[];
  fixture: { source: string; target: string }[];
  execution: { networkAccess: boolean; pathPrepend: string[]; executableFiles: string[] };
  reference: string;
  requiredSkills: string[];
  turns: { when: 'after-turn' | 'user-input'; match: string; reply: string }[];
  authorization: {
    scope: string;
    approvals: { command: string; afterReply: number; decision: 'accept' | 'decline' }[];
  };
  outputSchema: Record<string, unknown> | null;
}

export interface IAssertionConfig {
  core: boolean;
  method: GradingMethod;
  requirements: string[];
  rubric: string;
  [key: string]: unknown;
}

export interface ICaseAssertion {
  type: 'javascript';
  value: string;
  metric: string;
  config: IAssertionConfig;
}

/** A standard Promptfoo case with repository-owned metadata and assertion configuration. */
export interface IRepositoryCase {
  description: string;
  vars: { task: string };
  metadata: ICaseMetadata;
  assert: ICaseAssertion[];
}

export interface ILoadedCase {
  definition: IRepositoryCase;
  version: string;
  executionVersion: string;
  source: string;
}

function table(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) {
    throw new Error(`${label} must be a${allowEmpty ? '' : ' non-empty'} string.`);
  }
  return value;
}

function knownFields(value: unknown, keys: readonly string[], label: string) {
  const result = table(value, label);
  for (const key of Object.keys(result)) {
    if (!keys.includes(key)) {
      throw new Error(`Unknown ${label} field: ${key}`);
    }
  }
  return result;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value;
}

function strings(value: unknown, label: string): string[] {
  const result = array(value, label).map((item) => text(item, label));
  if (new Set(result).size !== result.length) {
    throw new Error(`Duplicate ${label}.`);
  }
  return result;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean.`);
  }
  return value;
}

function paths(value: unknown, label: string): string[] {
  const entries = strings(value, label);
  for (const path of entries) {
    containedPath('/fixture', path);
  }
  return entries;
}

function parseAssertion(value: unknown, requirements: readonly string[]): ICaseAssertion {
  const { type, value: grader, metric, config } = table(value, 'assertion');
  if (type !== 'javascript') {
    throw new Error('Repository assertions use public JavaScript graders.');
  }

  const graderPath = text(grader, 'assertion value');
  if (!graderPath.startsWith('file://')) {
    throw new Error('An assertion must name a grader file.');
  }

  const settings = table(config, 'assertion config');
  const { method, core, rubric, rule, requirements: mapped } = settings;
  if (method !== 'programmatic' && method !== 'text-rubric' && method !== 'artifact-rubric') {
    throw new Error('Unknown grading method.');
  }
  if (method === 'programmatic') {
    parseRule(rule);
  }

  const mappings = strings(mapped, 'assertion requirements');
  if (mappings.length === 0 || mappings.some((id) => !requirements.includes(id))) {
    throw new Error('Every assertion must map to declared case requirements.');
  }

  return {
    type,
    value: graderPath,
    metric: text(metric, 'assertion metric'),
    config: {
      ...settings,
      method,
      core: boolean(core, 'core'),
      rubric: text(rubric, 'rubric'),
      requirements: mappings,
    },
  };
}

export function parseCase(value: unknown): IRepositoryCase {
  const { description, vars, metadata, assert } = knownFields(
    value,
    ['description', 'vars', 'metadata', 'assert'],
    'case',
  );

  const { task } = knownFields(vars, ['task'], 'case vars');

  const {
    id,
    group,
    kind,
    requirements,
    fixture,
    execution,
    reference,
    requiredSkills,
    turns,
    authorization,
    outputSchema,
  } = knownFields(
    metadata,
    [
      'id',
      'group',
      'kind',
      'requirements',
      'fixture',
      'execution',
      'reference',
      'requiredSkills',
      'turns',
      'authorization',
      'outputSchema',
    ],
    'case metadata',
  );

  if (kind !== 'task' && kind !== 'routing') {
    throw new Error('Unknown case kind.');
  }

  const mapped = strings(requirements, 'case requirements');
  if (mapped.length === 0) {
    throw new Error('A case must declare requirements.');
  }

  const criteria = array(assert, 'assertions').map((item) => parseAssertion(item, mapped));
  if (!criteria.some((criterion) => criterion.config.core)) {
    throw new Error('A case needs a core check.');
  }
  if (new Set(criteria.map((criterion) => criterion.metric)).size !== criteria.length) {
    throw new Error('Duplicate assertion metric.');
  }

  const checked = new Set(criteria.flatMap((criterion) => criterion.config.requirements));
  if (mapped.some((requirement) => !checked.has(requirement))) {
    throw new Error('A declared requirement has no assertion.');
  }

  const conditions = knownFields(
    execution,
    ['networkAccess', 'pathPrepend', 'executableFiles'],
    'execution conditions',
  );

  const { networkAccess, pathPrepend, executableFiles } = conditions;

  const files = array(fixture, 'fixture').map((item) => {
    const { source, target } = table(item, 'fixture file');
    const file = { source: text(source, 'fixture source'), target: text(target, 'fixture target') };
    containedPath('/fixture', file.source);
    containedPath('/fixture', file.target);

    return file;
  });

  if (new Set(files.map((file) => file.target)).size !== files.length) {
    throw new Error('Duplicate fixture target.');
  }

  const replies = array(turns, 'scripted turns').map((item) => {
    const { when, match, reply } = table(item, 'scripted turn');
    if (when !== 'after-turn' && when !== 'user-input') {
      throw new Error('Unknown interaction point.');
    }

    const pattern = text(match, 'interaction match');
    new RegExp(pattern, 'iu');

    return {
      when,
      match: pattern,
      reply: text(reply, 'scripted reply'),
    } as const;
  });

  const { scope, approvals } = knownFields(authorization, ['scope', 'approvals'], 'authorization');

  const approvalRules = array(approvals, 'approval rules').map((item) => {
    const { command, afterReply, decision } = knownFields(
      item,
      ['command', 'afterReply', 'decision'],
      'approval rule',
    );

    if (
      typeof afterReply !== 'number' ||
      !Number.isSafeInteger(afterReply) ||
      afterReply < 0 ||
      afterReply > replies.length
    ) {
      throw new Error('An approval rule must identify a declared reply boundary.');
    }
    if (decision !== 'accept' && decision !== 'decline') {
      throw new Error('Unknown approval decision.');
    }

    return {
      command: text(command, 'exact approval command'),
      afterReply,
      decision,
    } as const;
  });

  return {
    description: text(description, 'case description'),
    vars: { task: text(task, 'task') },
    metadata: {
      id: text(id, 'case id'),
      group: text(group, 'case group'),
      kind,
      requirements: mapped,
      fixture: files,
      execution: {
        networkAccess: boolean(networkAccess, 'networkAccess'),
        pathPrepend: paths(pathPrepend, 'PATH entries'),
        executableFiles: paths(executableFiles, 'executable files'),
      },
      reference: text(reference, 'reference', true),
      requiredSkills: strings(requiredSkills, 'required skills'),
      turns: replies,
      authorization: { scope: text(scope, 'authorization scope'), approvals: approvalRules },
      outputSchema: outputSchema === null ? null : table(outputSchema, 'output schema'),
    },
    assert: criteria,
  };
}

/** Native Promptfoo performs expansion and scheduling; this only loads and validates inputs. */
export async function loadCases(
  project: string,
  selectedIds: readonly string[] = [],
): Promise<ILoadedCase[]> {
  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('Duplicate selected case id.');
  }

  const root = resolve(project);
  const loaded: ILoadedCase[] = [];
  const ids = new Set<string>();

  for (const name of (await readdir(`${root}/cases`)).sort()) {
    if (!name.endsWith('.json')) {
      continue;
    }

    const source = `cases/${name}`;
    const definitions: unknown = await Bun.file(`${root}/${source}`).json();

    for (const value of array(definitions, source)) {
      const definition = parseCase(value);
      const id = definition.metadata.id;
      if (ids.has(id)) {
        throw new Error(`Duplicate case id: ${id}`);
      }
      ids.add(id);
      const fixtureHashes: { target: string; sha256: string; mode: number }[] = [];

      for (const file of definition.metadata.fixture) {
        const path = containedPath(`${root}/fixtures`, file.source);
        if (!(await Bun.file(path).exists())) {
          throw new Error(`Missing fixture: ${file.source}`);
        }

        const info = await lstat(path);
        if (!info.isFile()) {
          throw new Error(`Fixture must be a regular file: ${file.source}`);
        }
        fixtureHashes.push({
          target: file.target,
          sha256: contentHash(await Bun.file(path).bytes()),
          mode: info.mode & 0o777,
        });
      }

      for (const assertion of definition.assert) {
        const path = containedPath(root, assertion.value.slice('file://'.length));
        if (!(await Bun.file(path).exists())) {
          throw new Error(`Missing grader: ${assertion.value}`);
        }
      }

      const { kind, execution, requiredSkills, turns, authorization, outputSchema } =
        definition.metadata;
      loaded.push({
        definition,
        version: contentHash(JSON.stringify({ definition, fixtureHashes })),
        executionVersion: contentHash(
          JSON.stringify({
            task: definition.vars.task,
            kind,
            fixtureHashes,
            execution,
            requiredSkills,
            turns,
            authorization,
            outputSchema,
          }),
        ),
        source,
      });
    }
  }

  if (loaded.length === 0) {
    throw new Error('The corpus contains no cases.');
  }

  for (const id of selectedIds) {
    if (!ids.has(id)) {
      throw new Error(`Unknown selected case: ${id}`);
    }
  }

  return selectedIds.length === 0
    ? loaded
    : loaded.filter((item) => selectedIds.includes(item.definition.metadata.id));
}

export function promptfooCase(definition: IRepositoryCase, project: string): TestCase {
  return {
    ...definition,
    assert: definition.assert.map((assertion) => ({
      ...assertion,
      value: `file://${containedPath(project, assertion.value.slice('file://'.length))}`,
    })),
  };
}
