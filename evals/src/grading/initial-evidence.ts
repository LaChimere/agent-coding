import { lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ICaseMetadata } from '../corpus/cases.ts';
import {
  containedPath,
  contentHash,
  type ISnapshot,
  type ISnapshotEntry,
} from '../preparation/snapshot.ts';

export interface IInitialFixtureEvidence {
  path: string;
  source: string;
  initial: { sha256: string; mode: number; bytes: number; text: string | null };
  final: ISnapshotEntry | null;
  unchanged: boolean;
}

/** Authoritative pre-execution fixture evidence, reconstructed from frozen inputs. */
export async function initialFixtureEvidence(
  runDirectory: string,
  metadata: ICaseMetadata,
  artifacts: ISnapshot,
): Promise<IInitialFixtureEvidence[]> {
  const evidence: IInitialFixtureEvidence[] = [];
  for (const binding of metadata.fixture) {
    const file = containedPath(resolve(runDirectory, 'private/fixtures'), binding.source);
    const info = await lstat(file);
    if (!info.isFile()) {
      throw new Error(`Initial fixture is not a regular file: ${binding.source}`);
    }

    const bytes = await Bun.file(file).bytes();
    let text: string | null = null;

    try {
      text = bytes.includes(0) ? null : new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      // A binary fixture still has exact byte and mode identity.
    }

    const initial = {
      sha256: contentHash(bytes),
      mode:
        (info.mode & 0o777) |
        ((info.mode & 0o111) === 0 && metadata.execution.executableFiles.includes(binding.target)
          ? 0o111
          : 0),
      bytes: bytes.length,
      text,
    };

    const final = artifacts.entries.find((entry) => entry.path === binding.target) ?? null;
    evidence.push({
      path: binding.target,
      source: `private/fixtures/${binding.source}`,
      initial,
      final,
      unchanged:
        final?.kind === 'file' && final.sha256 === initial.sha256 && final.mode === initial.mode,
    });
  }
  return evidence;
}
