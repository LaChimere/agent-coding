import { lstat, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { objectRecord } from '../codex/evidence.ts';

export interface IRuntimeTools {
  pathDirectories: string[];
  readPaths: string[];
  tools: { name: string; executable: string; resolvedExecutable: string; probe: string[] }[];
}

/** An explicit profile reference avoids Bun's injected transitive CLI binaries. */
export async function resolveCodexExecutable(
  profileDirectory: string,
  override?: string,
): Promise<string> {
  const file = Bun.file(resolve(profileDirectory, 'runtime.json'));
  const { codexExecutable } = (await file.exists()) ? (objectRecord(await file.json()) ?? {}) : {};
  const configured = override ?? codexExecutable;
  if (configured !== undefined && typeof configured !== 'string') {
    throw new Error('Codex executable reference must be a path or command name.');
  }

  const requested =
    typeof configured === 'string' && configured.startsWith('~/')
      ? resolve(homedir(), configured.slice(2))
      : configured;

  const path =
    requested === undefined
      ? Bun.which('codex')
      : requested.includes('/')
        ? resolve(requested)
        : Bun.which(requested);

  if (path === null) {
    throw new Error('The configured Codex executable was not found.');
  }

  return await realpath(path);
}

/** Tool installations are explicit execution dependencies, separate from candidate configuration. */
export async function resolveRuntimeTools(
  profileDirectory: string,
  platform: NodeJS.Platform = process.platform,
): Promise<IRuntimeTools> {
  const file = Bun.file(resolve(profileDirectory, 'runtime.json'));
  if (!(await file.exists())) {
    return {
      pathDirectories: [],
      readPaths: [],
      tools: [],
    };
  }

  const {
    tools = [],
    toolReadPaths = [],
    toolReadPathsByPlatform,
  } = objectRecord(await file.json()) ?? {};
  if (!Array.isArray(tools) || !Array.isArray(toolReadPaths)) {
    throw new Error('Invalid runtime tool declarations.');
  }

  let platformPaths: string[] = [];
  if (toolReadPathsByPlatform !== undefined) {
    const pathsByPlatform = objectRecord(toolReadPathsByPlatform);
    if (
      pathsByPlatform === undefined ||
      Object.values(pathsByPlatform).some(
        (paths) => !Array.isArray(paths) || !paths.every((path) => typeof path === 'string'),
      )
    ) {
      throw new Error('Runtime platform tool dependencies must be a map of string arrays.');
    }

    const selected = pathsByPlatform[platform];
    if (!Object.hasOwn(pathsByPlatform, platform) || !Array.isArray(selected)) {
      throw new Error(`Runtime tool dependencies are not declared for platform ${platform}.`);
    }
    platformPaths = selected;
  }

  const result: IRuntimeTools = {
    pathDirectories: [],
    readPaths: [],
    tools: [],
  };
  const readDirectories = new Set<string>();

  for (const root of [...toolReadPaths, ...platformPaths]) {
    if (typeof root !== 'string') {
      throw new Error('Tool code dependencies must be paths.');
    }

    const path = await realpath(resolve(root));
    const info = await stat(path);
    if (!info.isDirectory() && !info.isFile()) {
      throw new Error(`Tool code dependency is not a file or directory: ${root}`);
    }
    result.readPaths.push(path);
    if (info.isDirectory()) {
      readDirectories.add(path);
    }
  }

  const names = new Set<string>();

  for (const tool of tools) {
    const { name, executable, probe, codeReadPaths = [] } = objectRecord(tool) ?? {};
    if (
      typeof name !== 'string' ||
      typeof executable !== 'string' ||
      !Array.isArray(probe) ||
      !probe.every((argument) => typeof argument === 'string')
    ) {
      throw new Error('A runtime tool needs name, executable and probe arguments.');
    }
    if (
      !Array.isArray(codeReadPaths) ||
      !codeReadPaths.every(
        (path) => typeof path === 'string' && path.length > 0 && !isAbsolute(path),
      )
    ) {
      throw new Error('Runtime tool codeReadPaths must be relative, nonempty path strings.');
    }
    if (names.has(name)) {
      throw new Error(`Duplicate runtime tool: ${name}`);
    }
    names.add(name);
    const found = Bun.which(executable);
    if (found === null) {
      throw new Error(`Required runtime tool is missing: ${name}`);
    }

    const resolvedExecutable = await realpath(found);
    const info = await stat(resolvedExecutable);
    if (!info.isFile() || (info.mode & 0o111) === 0) {
      throw new Error(`Runtime tool is not executable: ${name}`);
    }

    for (const dependency of codeReadPaths) {
      const path = await realpath(resolve(dirname(resolvedExecutable), dependency));
      const dependencyInfo = await stat(path);
      if (!dependencyInfo.isDirectory() && !dependencyInfo.isFile()) {
        throw new Error(`Runtime tool code dependency is not a file or directory: ${name}`);
      }

      result.readPaths.push(path);
      if (dependencyInfo.isDirectory()) {
        readDirectories.add(path);
      }
    }

    if (codeReadPaths.length > 0 && (await lstat(found)).isSymbolicLink()) {
      // A leaf bind can flatten a launcher symlink and change a script's module directory.
      const launcherDirectory = dirname(found);
      if (!(await stat(launcherDirectory)).isDirectory()) {
        throw new Error(`Runtime tool launcher parent is not a directory: ${name}`);
      }

      result.readPaths.push(launcherDirectory);
      readDirectories.add(launcherDirectory);
    }
    result.tools.push({
      name,
      executable: found,
      resolvedExecutable,
      probe,
    });

    result.pathDirectories.push(dirname(found));
    for (const path of [found, resolvedExecutable]) {
      const covered =
        codeReadPaths.length > 0 &&
        [...readDirectories].some((root) => {
          const difference = relative(root, path);
          return (
            difference !== '..' && !difference.startsWith(`..${sep}`) && !isAbsolute(difference)
          );
        });
      if (!covered) {
        result.readPaths.push(path);
      }
    }
  }

  result.pathDirectories = [...new Set(result.pathDirectories)];
  result.readPaths = [...new Set(result.readPaths)];

  return result;
}
