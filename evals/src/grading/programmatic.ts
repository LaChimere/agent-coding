import { lstat, realpath } from 'node:fs/promises';
import { type INativeConversationMessage, objectRecord } from '../codex/evidence.ts';
import { containedPath, type ISnapshot } from '../preparation/snapshot.ts';
import type { QualityStatus } from '../results/quality.ts';

export type ProgrammaticRule =
  | { type: 'file-exists'; path: string }
  | { type: 'file-pattern'; pattern: string }
  | { type: 'text-contains'; value: string }
  | { type: 'text-regex'; pattern: string; flags: string }
  | {
      type: 'native-conversation';
      countScope: 'root' | 'all';
      turns: number;
      threads: number;
      sequence?: { actor: 'candidate' | 'user'; pattern: string }[];
    }
  | { type: 'command'; command: string[]; expectedExitCode: number }
  | { type: 'route'; alternatives: string[][]; optional: string[] };

export function parseRule(value: unknown): ProgrammaticRule {
  const record = objectRecord(value) ?? {};
  const {
    type,
    path,
    value: contains,
    pattern,
    flags,
    alternatives,
    optional,
    sequence,
    countScope,
    turns,
    threads,
    command,
    expectedExitCode = 0,
  } = record;

  if (
    type === 'command' &&
    Array.isArray(command) &&
    command.length > 0 &&
    command.every((argument) => typeof argument === 'string') &&
    typeof expectedExitCode === 'number' &&
    Number.isSafeInteger(expectedExitCode)
  ) {
    return {
      type,
      command,
      expectedExitCode,
    };
  }
  if (
    type === 'native-conversation' &&
    (countScope === 'root' || countScope === 'all') &&
    typeof turns === 'number' &&
    typeof threads === 'number' &&
    Number.isSafeInteger(turns) &&
    Number.isSafeInteger(threads) &&
    turns > 0 &&
    threads > 0 &&
    (countScope !== 'root' || threads === 1)
  ) {
    let parsedSequence: { actor: 'candidate' | 'user'; pattern: string }[] | undefined;
    if (sequence !== undefined) {
      if (!Array.isArray(sequence) || sequence.length === 0) {
        throw new Error('A native sequence must contain required events.');
      }
      parsedSequence = sequence.map((item: unknown) => {
        const { actor, pattern } = objectRecord(item) ?? {};
        if (
          (actor !== 'candidate' && actor !== 'user') ||
          typeof pattern !== 'string' ||
          pattern.length === 0
        ) {
          throw new Error('Invalid native sequence event.');
        }
        new RegExp(pattern, 'iu');

        return { actor, pattern };
      });
    }
    return {
      type,
      countScope,
      turns,
      threads,
      ...(parsedSequence === undefined ? {} : { sequence: parsedSequence }),
    };
  }
  if (type === 'file-exists' && typeof path === 'string') {
    containedPath('/artifacts', path);
    return { type, path };
  }
  if (type === 'file-pattern' && typeof pattern === 'string') {
    containedPath('/artifacts', pattern);
    new Bun.Glob(pattern);
    return { type, pattern };
  }
  if (type === 'text-contains' && typeof contains === 'string') {
    return { type, value: contains };
  }
  if (type === 'text-regex' && typeof pattern === 'string' && typeof flags === 'string') {
    new RegExp(pattern, flags);
    return {
      type,
      pattern,
      flags,
    };
  }
  if (
    type === 'route' &&
    Object.keys(record).every((key) => ['type', 'alternatives', 'optional'].includes(key)) &&
    Array.isArray(alternatives) &&
    alternatives.length > 0 &&
    alternatives.every(
      (alternative) =>
        Array.isArray(alternative) &&
        alternative.every((item) => typeof item === 'string' && item.length > 0),
    ) &&
    Array.isArray(optional) &&
    optional.every((item) => typeof item === 'string' && item.length > 0)
  ) {
    return {
      type,
      alternatives,
      optional,
    };
  }
  throw new Error('Invalid or unsupported programmatic rule.');
}

export interface IProgrammaticVerdict {
  status: QualityStatus;
  reason: string;
  evidence: string[];
}

export async function checkProgrammatic(input: {
  rule: ProgrammaticRule;
  output: string;
  completed: boolean;
  artifactsDirectory: string | null;
  outputReference: string;
  artifactReference: string | null;
  artifactInventory?: ISnapshot | null;
  nativeEvidence?: {
    turnIds: string[];
    threadIds: string[];
    conversation?: INativeConversationMessage[];
  } | null;
  nativeReference?: string | null;
}): Promise<IProgrammaticVerdict> {
  const { rule } = input;
  if (rule.type === 'command') {
    throw new Error('Command checks require the isolated native verifier.');
  }

  let passed = false;
  const evidence = [input.outputReference];
  if (rule.type === 'native-conversation') {
    if (input.nativeEvidence == null || input.nativeReference == null) {
      return {
        status: 'unknown',
        reason: 'Native conversation evidence is unavailable.',
        evidence: [],
      };
    }
    evidence.splice(0, 1, input.nativeReference);
    if (
      (rule.countScope === 'root' || rule.sequence !== undefined) &&
      input.nativeEvidence.conversation === undefined
    ) {
      return {
        status: 'unknown',
        reason: 'Ordered native conversation evidence is unavailable.',
        evidence,
      };
    }

    const conversation = (input.nativeEvidence.conversation ?? []).filter(
      (message) => message.threadId === input.nativeEvidence?.threadIds[0],
    );
    const turnCount =
      rule.countScope === 'root'
        ? new Set(conversation.map((message) => message.turnId)).size
        : input.nativeEvidence.turnIds.length;
    const threadCount =
      rule.countScope === 'root'
        ? new Set(conversation.map((message) => message.threadId)).size
        : input.nativeEvidence.threadIds.length;

    passed = turnCount === rule.turns && threadCount === rule.threads;

    if (passed && rule.sequence !== undefined) {
      let cursor = 0;
      const witnesses: string[] = [];

      for (const required of rule.sequence) {
        const pattern = new RegExp(required.pattern, 'iu');
        const index = conversation.findIndex(
          (message, index) =>
            index >= cursor && message.actor === required.actor && pattern.test(message.content),
        );
        const message = conversation[index];
        if (message === undefined) {
          passed = false;
          break;
        }

        cursor = index + 1;
        witnesses.push(message.source);
      }

      if (passed) {
        evidence.push(...witnesses);
      }
    }
  } else if (rule.type === 'file-pattern') {
    if (input.artifactInventory == null || input.artifactReference === null) {
      return {
        status: 'unknown',
        reason: 'No immutable artifact inventory is available.',
        evidence: [],
      };
    }

    // Match recorded paths only; never traverse a glob or follow a saved symlink.
    const pattern = new Bun.Glob(rule.pattern);
    const matches = input.artifactInventory.entries.filter((entry) => pattern.match(entry.path));
    const files = matches.filter((entry) => entry.kind === 'file');
    if (files.length === 0 && matches.some((entry) => entry.kind === 'symlink')) {
      return {
        status: 'unknown',
        reason: 'Only symbolic links match; their referents are not frozen evidence.',
        evidence: [input.artifactReference],
      };
    }
    passed = files.length > 0;
    evidence.splice(0, 1, ...files.map((entry) => `${input.artifactReference}/${entry.path}`));
    if (!passed) {
      evidence.push(input.artifactReference);
    }
  } else if (rule.type === 'file-exists') {
    if (input.artifactsDirectory === null || input.artifactReference === null) {
      return {
        status: 'unknown',
        reason: 'No immutable artifact snapshot is available.',
        evidence: [],
      };
    }

    const file = containedPath(input.artifactsDirectory, rule.path);

    try {
      const info = await lstat(file);
      const root = await realpath(input.artifactsDirectory);
      const expected = containedPath(root, rule.path);
      if ((await realpath(file)) !== expected || info.isSymbolicLink()) {
        return {
          status: 'unknown',
          reason:
            'The artifact path contains a symbolic link; its referent is not frozen evidence.',
          evidence: [input.artifactReference],
        };
      }
      passed = info.isFile();
    } catch (error) {
      const { code } = objectRecord(error) ?? {};
      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error;
      }
      passed = false;
    }

    evidence.splice(0, 1, `${input.artifactReference}/${rule.path}`);
  } else if (rule.type === 'text-contains') {
    passed = input.output.includes(rule.value);
  } else if (rule.type === 'text-regex') {
    passed = new RegExp(rule.pattern, rule.flags).test(input.output);
  } else if (rule.type === 'route') {
    let parsed: unknown;

    try {
      parsed = JSON.parse(input.output);
    } catch {
      parsed = null;
    }

    const { skills } = objectRecord(parsed) ?? {};
    const names =
      Array.isArray(skills) && skills.every((name) => typeof name === 'string') ? skills : null;
    passed = names !== null && routeSatisfied(names, rule.alternatives, rule.optional);
  }

  return {
    status: passed ? 'passed' : input.completed ? 'failed' : 'unknown',
    reason: passed
      ? `The ${rule.type} requirement is supported.`
      : input.completed
        ? `The ${rule.type} requirement was not satisfied.`
        : 'The requirement is not established by the incomplete execution.',
    evidence,
  };
}

function routeSatisfied(
  actual: readonly string[],
  alternatives: readonly (readonly string[])[],
  optional: readonly string[],
): boolean {
  const matches = (expected: string, candidate: string) =>
    candidate === expected || candidate.endsWith(`:${expected}`);

  return alternatives.some((required) => {
    const matched = new Set<string>();

    for (const name of actual) {
      const requiredName = required.find((candidate) => matches(candidate, name));
      const optionalName = optional.find((candidate) => matches(candidate, name));
      const normalized = requiredName ?? optionalName;
      if (normalized === undefined || matched.has(normalized)) {
        return false;
      }

      matched.add(normalized);
    }

    return required.every((name) => matched.has(name));
  });
}
