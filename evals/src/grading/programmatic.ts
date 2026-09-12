import { lstat, realpath } from 'node:fs/promises';
import { objectRecord } from '../codex/evidence.ts';
import { containedPath, type ISnapshot } from '../preparation/snapshot.ts';
import type { QualityStatus } from '../results/quality.ts';

export type ProgrammaticRule =
  | { type: 'file-exists'; path: string }
  | { type: 'file-pattern'; pattern: string }
  | { type: 'text-contains'; value: string }
  | { type: 'text-regex'; pattern: string; flags: string }
  | { type: 'native-conversation'; turns: number; threads: number }
  | { type: 'command'; command: string[]; expectedExitCode: number }
  | { type: 'route'; expected: string[]; forbidden: string[] };

export function parseRule(value: unknown): ProgrammaticRule {
  const {
    type,
    path,
    value: contains,
    pattern,
    flags,
    expected,
    forbidden,
    turns,
    threads,
    command,
    expectedExitCode = 0,
  } = objectRecord(value) ?? {};

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
    typeof turns === 'number' &&
    typeof threads === 'number' &&
    Number.isSafeInteger(turns) &&
    Number.isSafeInteger(threads) &&
    turns > 0 &&
    threads > 0
  ) {
    return {
      type,
      turns,
      threads,
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
    Array.isArray(expected) &&
    Array.isArray(forbidden) &&
    [...expected, ...forbidden].every((item) => typeof item === 'string')
  ) {
    return {
      type,
      expected,
      forbidden,
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
  nativeEvidence?: { turnIds: string[]; threadIds: string[] } | null;
  nativeReference?: string | null;
}): Promise<IProgrammaticVerdict> {
  const { rule } = input;
  if (rule.type === 'command') {
    throw new Error('Command checks require the isolated native verifier.');
  }

  let passed: boolean;
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
    passed =
      input.nativeEvidence.turnIds.length === rule.turns &&
      input.nativeEvidence.threadIds.length === rule.threads;
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
  } else {
    let parsed: unknown;

    try {
      parsed = JSON.parse(input.output);
    } catch {
      parsed = null;
    }

    const { skills } = objectRecord(parsed) ?? {};
    const names =
      Array.isArray(skills) && skills.every((name) => typeof name === 'string') ? skills : null;
    // Native names may carry their plugin namespace; this is identity normalization,
    // not a substring match or evidence that the named skill actually ran.
    const matches = (expected: string, actual: string) =>
      actual === expected || actual.endsWith(`:${expected}`);
    passed =
      names !== null &&
      rule.expected.every((expected) => names.some((name) => matches(expected, name))) &&
      rule.forbidden.every((forbidden) => names.every((name) => !matches(forbidden, name)));
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
