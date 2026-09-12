import { realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
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
export async function resolveRuntimeTools(profileDirectory: string): Promise<IRuntimeTools> {
  const file = Bun.file(resolve(profileDirectory, 'runtime.json'));
  if (!(await file.exists())) {
    return {
      pathDirectories: [],
      readPaths: [],
      tools: [],
    };
  }

  const { tools = [], toolReadPaths = [] } = objectRecord(await file.json()) ?? {};
  if (!Array.isArray(tools) || !Array.isArray(toolReadPaths)) {
    throw new Error('Invalid runtime tool declarations.');
  }

  const result: IRuntimeTools = {
    pathDirectories: [],
    readPaths: [],
    tools: [],
  };

  for (const root of toolReadPaths) {
    if (typeof root !== 'string') {
      throw new Error('Tool code dependencies must be paths.');
    }

    const path = await realpath(resolve(root));
    const info = await stat(path);
    if (!info.isDirectory() && !info.isFile()) {
      throw new Error(`Tool code dependency is not a file or directory: ${root}`);
    }
    result.readPaths.push(path);
  }

  const names = new Set<string>();

  for (const tool of tools) {
    const { name, executable, probe } = objectRecord(tool) ?? {};
    if (
      typeof name !== 'string' ||
      typeof executable !== 'string' ||
      !Array.isArray(probe) ||
      !probe.every((argument) => typeof argument === 'string')
    ) {
      throw new Error('A runtime tool needs name, executable and probe arguments.');
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
    result.tools.push({
      name,
      executable: found,
      resolvedExecutable,
      probe,
    });

    result.pathDirectories.push(dirname(found));
    result.readPaths.push(found, resolvedExecutable);
  }

  result.pathDirectories = [...new Set(result.pathDirectories)];
  result.readPaths = [...new Set(result.readPaths)];

  return result;
}
