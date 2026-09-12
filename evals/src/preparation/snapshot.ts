import { createHash, randomUUID } from 'node:crypto';
import {
  chmod,
  link,
  lstat,
  mkdir,
  open,
  readdir,
  readlink,
  symlink,
  unlink,
} from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

export interface ISnapshotEntry {
  path: string;
  kind: 'file' | 'symlink' | 'directory';
  mode: number;
  bytes: number;
  sha256: string;
  target?: string;
}

export interface ISnapshot {
  sha256: string;
  entries: readonly ISnapshotEntry[];
}

export function contentHash(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

export function containedPath(root: string, path: string): string {
  if (isAbsolute(path) || path.length === 0) {
    throw new Error(`Expected a relative path: ${path}`);
  }

  const target = resolve(root, path);
  const difference = relative(resolve(root), target);
  if (difference === '' || difference === '..' || difference.startsWith(`..${sep}`)) {
    throw new Error(`Path escapes its root: ${path}`);
  }

  return target;
}

/** Publish an immutable JSON record only after the entire file has been written. */
export async function writeJsonRecord(path: string, record: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  const file = await open(temporary, 'wx', 0o600);

  try {
    await file.writeFile(`${JSON.stringify(record, null, 2)}\n`);
    await file.sync();
    await file.close();
    // A hard link publishes atomically and refuses an existing destination.
    await link(temporary, path);
  } finally {
    await file.close();
    await unlink(temporary);
  }
}

/**
 * Copy bytes and modes, never symlink referents. Runtime inputs reject links;
 * artifact snapshots retain links as evidence, including unsafe link targets.
 */
export async function snapshotDirectory(
  source: string,
  destination: string,
  options: { symlinks: 'reject' | 'preserve'; exclude?: readonly string[] },
): Promise<ISnapshot> {
  return await inspectDirectory(source, options, destination);
}

export async function inventoryDirectory(
  source: string,
  options: { symlinks: 'reject' | 'preserve' } = { symlinks: 'reject' },
): Promise<ISnapshot> {
  return await inspectDirectory(source, options);
}

async function inspectDirectory(
  source: string,
  options: { symlinks: 'reject' | 'preserve'; exclude?: readonly string[] },
  destination?: string,
): Promise<ISnapshot> {
  const sourceRoot = resolve(source);
  const destinationRoot = destination === undefined ? undefined : resolve(destination);
  if (destinationRoot !== undefined) {
    const destinationRelative = relative(sourceRoot, destinationRoot);
    if (
      destinationRelative === '' ||
      (destinationRelative !== '..' && !destinationRelative.startsWith(`..${sep}`))
    ) {
      throw new Error('A snapshot destination must be outside its source tree.');
    }
  }

  const rootInfo = await lstat(sourceRoot);
  if (!rootInfo.isDirectory()) {
    throw new Error('A snapshot source must be a directory.');
  }
  if (destinationRoot !== undefined) {
    await mkdir(destinationRoot);
  }

  const entries: ISnapshotEntry[] = [];
  const exclusions = new Set(options.exclude ?? []);

  const visit = async (directory: string): Promise<void> => {
    const names = (await readdir(directory)).sort();
    for (const name of names) {
      const sourcePath = resolve(directory, name);
      const path = relative(sourceRoot, sourcePath).split(sep).join('/');
      if (exclusions.has(path)) {
        continue;
      }

      const targetPath =
        destinationRoot === undefined ? undefined : containedPath(destinationRoot, path);
      const info = await lstat(sourcePath);
      if (info.isSymbolicLink()) {
        if (options.symlinks === 'reject') {
          throw new Error(`Input symlink is not supported: ${path}`);
        }

        const target = await readlink(sourcePath);
        if (targetPath !== undefined) {
          await symlink(target, targetPath);
        }
        entries.push({
          path,
          kind: 'symlink',
          mode: info.mode & 0o777,
          bytes: Buffer.byteLength(target),
          sha256: contentHash(target),
          target,
        });
      } else if (info.isDirectory()) {
        if (targetPath !== undefined) {
          await mkdir(targetPath);
        }
        entries.push({
          path,
          kind: 'directory',
          mode: info.mode & 0o777,
          bytes: 0,
          sha256: contentHash(''),
        });

        await visit(sourcePath);
        if (targetPath !== undefined) {
          await chmod(targetPath, info.mode & 0o777);
        }
      } else if (info.isFile()) {
        const bytes = await Bun.file(sourcePath).bytes();
        const after = await lstat(sourcePath);
        if (
          after.ino !== info.ino ||
          after.size !== info.size ||
          after.mtimeMs !== info.mtimeMs ||
          after.ctimeMs !== info.ctimeMs
        ) {
          throw new Error(`Source changed during snapshot: ${path}`);
        }
        if (targetPath !== undefined) {
          await Bun.write(targetPath, bytes);
          await chmod(targetPath, info.mode & 0o777);
        }
        entries.push({
          path,
          kind: 'file',
          mode: info.mode & 0o777,
          bytes: bytes.byteLength,
          sha256: contentHash(bytes),
        });
      } else {
        throw new Error(`Unsupported filesystem entry: ${path}`);
      }
    }
  };

  await visit(sourceRoot);

  return { sha256: contentHash(JSON.stringify(entries)), entries };
}
