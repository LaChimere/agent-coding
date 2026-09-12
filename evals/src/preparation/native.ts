import { randomUUID } from 'node:crypto';
import { chmod, lstat, mkdir, readdir, realpath, stat, unlink } from 'node:fs/promises';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { CodexSession, type INativeThread, protocolObject } from '../codex/session.ts';
import type { ICodexProcessExit, JsonRpcId } from '../codex/transport.ts';
import {
  type IConfigTable,
  isConfigTable,
  overlayConfig,
  parseConfig,
  runtimeEnvironment,
} from './config.ts';
import { containedPath, type ISnapshot, inventoryDirectory, writeJsonRecord } from './snapshot.ts';
import { resolveRuntimeTools } from './tools.ts';

export interface INativePreparationInput {
  directory: string;
  runtimeDirectory: string;
  profileDirectory: string;
  codexExecutable: string;
  credentials: Readonly<Record<string, string>>;
  networkAccess: boolean;
  pathPrepend?: readonly string[];
  executableFiles?: readonly string[];
  onServerRequest?: (method: string, params: unknown, id: JsonRpcId) => unknown | Promise<unknown>;
}

export interface IReadyNativeTrial {
  status: 'ready';
  session: CodexSession;
  thread: INativeThread;
  evidencePath: string;
  protocolPath: string;
  codexHome: string;
  workspace: string;
  finalize: () => Promise<void>;
}

export interface INotRunNativeTrial {
  status: 'not-run';
  reason: string;
  evidencePath: string;
}

export type NativePreparationResult = IReadyNativeTrial | INotRunNativeTrial;

interface IPluginSource {
  id: string;
  marketplaceName: string;
  name: string;
  version: string;
  source: string;
  installed: string;
  enabled: boolean;
}

interface IPreparationEvidence {
  status: 'preparing' | 'ready' | 'not-run';
  startedAt: string;
  completedAt?: string;
  reason?: string;
  paths: Record<string, string>;
  transformations: string[];
  installation: Record<string, unknown>;
  discovery: Record<string, unknown>;
  probes: Record<string, unknown>;
  conditions: {
    networkAccess: boolean;
    pathPrepend: readonly string[];
    executableFiles: readonly string[];
  };
}

const controlTimeoutMs = 30_000;
const cleanupGraceMs = 1_000;
const skillsVersion = '1.5.25';
const systemPath = '/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin';

function recordValue<TValue>(record: Record<string, TValue>, key: string, value: TValue): void {
  record[key] = value;
}

function configValue(config: IConfigTable, key: string) {
  return config[key];
}

function setConfigValue(config: IConfigTable, key: string, value: IConfigTable[string]): void {
  config[key] = value;
}

function deleteConfigValue(config: IConfigTable, key: string): void {
  delete config[key];
}

function redact(text: string, credentials: Readonly<Record<string, string>>): string {
  let sanitized = text;
  for (const value of Object.values(credentials)) {
    if (value.length > 0) {
      sanitized = sanitized.replaceAll(value, '<credential-redacted>');
    }
  }
  return sanitized;
}

function safeError(error: unknown, credentials: Readonly<Record<string, string>>): string {
  return redact(error instanceof Error ? error.message : String(error), credentials);
}

function sanitizedEvidence(
  evidence: IPreparationEvidence,
  credentials: Readonly<Record<string, string>>,
): unknown {
  return JSON.parse(redact(JSON.stringify(evidence), credentials)) as unknown;
}

function assertChild(root: string, path: string, label: string): void {
  const difference = relative(resolve(root), resolve(path));
  if (difference === '' || difference === '..' || difference.startsWith(`..${sep}`)) {
    throw new Error(`${label} must be below the trial directory.`);
  }
}

async function readConfig(path: string): Promise<IConfigTable> {
  return parseConfig(await Bun.file(path).text());
}

function rejectUndeclaredCapabilities(config: IConfigTable): void {
  for (const key of [
    'mcp_servers',
    'hooks',
    'notify',
    'marketplaces',
    'apps',
    'browser_use',
    'computer_use',
    'profiles',
    'permissions',
    'model_instructions_file',
    'experimental_compact_prompt_file',
    'model_catalog_json',
    'log_dir',
    'sqlite_home',
    'js_repl_node_path',
  ]) {
    if (config[key] !== undefined) {
      throw new Error(`Undeclared Codex capability is not supported in eval configuration: ${key}`);
    }
  }

  const features = configValue(config, 'features');
  if (features !== undefined) {
    if (!isConfigTable(features)) {
      throw new Error('Codex features must be a table.');
    }
  }

  const agents = configValue(config, 'agents');
  if (isConfigTable(agents) && Object.values(agents).some(isConfigTable)) {
    throw new Error('Role config indirection is unsupported; use the candidate agents directory.');
  }
}

function validateCredentialRoutes(
  baseline: IConfigTable,
  candidate: IConfigTable,
  credentials: Readonly<Record<string, string>>,
): void {
  const original = configValue(baseline, 'model_providers');
  const providers = configValue(candidate, 'model_providers');
  if (!isConfigTable(providers)) {
    return;
  }

  for (const [id, provider] of Object.entries(providers)) {
    if (!isConfigTable(provider)) {
      throw new Error('Model provider settings must be a table.');
    }

    const key = configValue(provider, 'env_key');
    const headers = configValue(provider, 'env_http_headers');
    const references = [key, ...(isConfigTable(headers) ? Object.values(headers) : [])];
    if (!references.some((name) => typeof name === 'string' && Object.hasOwn(credentials, name))) {
      continue;
    }

    const approved = isConfigTable(original) ? original[id] : undefined;
    const approvedUrl = isConfigTable(approved) ? configValue(approved, 'base_url') : undefined;
    const requestedUrl = configValue(provider, 'base_url');
    let sameOrigin = false;

    try {
      sameOrigin =
        typeof approvedUrl === 'string' &&
        typeof requestedUrl === 'string' &&
        new URL(approvedUrl).origin === new URL(requestedUrl).origin;
    } catch {
      sameOrigin = false;
    }

    if (!sameOrigin) {
      throw new Error(
        `Credential route for provider ${id} is outside the approved profile origin.`,
      );
    }
  }
}

function permissionFilesystem(
  workspace: string,
  runtimeDirectory: string,
  home: string,
  codexHome: string,
  executable: string,
  executableTarget: string,
): IConfigTable {
  return Object.fromEntries([
    [':root', 'deny'],
    [':minimal', 'read'],
    [':slash_tmp', 'deny'],
    [':tmpdir', 'write'],
    [workspace, 'write'],
    [runtimeDirectory, 'read'],
    [executable, 'read'],
    [executableTarget, 'read'],
    [`${codexHome}/AGENTS.md`, 'read'],
    [`${codexHome}/agents`, 'read'],
    [`${codexHome}/skills`, 'read'],
    [`${codexHome}/skills/.system`, 'deny'],
    [`${codexHome}/plugins`, 'read'],
    [`${home}/.agents/skills`, 'read'],
  ]);
}

function translateSandbox(
  config: IConfigTable,
  workspace: string,
  filesystem: IConfigTable,
  networkAccess: boolean,
  transformations: string[],
  credentialNames: readonly string[],
): IConfigTable {
  const result = structuredClone(config);
  const sandbox = configValue(result, 'sandbox_mode');
  if (sandbox !== 'workspace-write' && sandbox !== 'read-only') {
    throw new Error('Only workspace-write and read-only sandbox modes are supported.');
  }
  deleteConfigValue(result, 'sandbox_mode');
  deleteConfigValue(result, 'sandbox_workspace_write');
  const defaultPermissions = sandbox === 'read-only' ? 'eval-read-only' : 'eval';
  setConfigValue(result, 'default_permissions', defaultPermissions);
  if (!networkAccess) {
    setConfigValue(result, 'web_search', 'disabled');
  }

  const features = configValue(result, 'features');
  setConfigValue(result, 'features', {
    ...(isConfigTable(features) ? features : {}),
    memories: false,
    chronicle: false,
  });

  const shell = configValue(result, 'shell_environment_policy');
  if (shell !== undefined && !isConfigTable(shell)) {
    throw new Error('Shell environment policy must be a table.');
  }

  const policy = isConfigTable(shell) ? shell : {};
  const { set: configuredEnvironment } = policy;
  if (configuredEnvironment !== undefined && !isConfigTable(configuredEnvironment)) {
    throw new Error('Shell environment overrides must be a table.');
  }

  const { exclude: excluded } = policy;
  if (
    excluded !== undefined &&
    (!Array.isArray(excluded) || excluded.some((name) => typeof name !== 'string'))
  ) {
    throw new Error('Shell environment exclusions must be strings.');
  }
  setConfigValue(result, 'shell_environment_policy', {
    ...policy,
    exclude: [...new Set([...(Array.isArray(excluded) ? excluded : []), ...credentialNames])],
    set: {
      ...(isConfigTable(configuredEnvironment) ? configuredEnvironment : {}),
      ...Object.fromEntries([
        ['GIT_CONFIG_NOSYSTEM', '1'],
        ['GIT_CONFIG_GLOBAL', '/dev/null'],
      ]),
    },
  });

  setConfigValue(result, 'permissions', {
    eval: {
      extends: ':workspace',
      filesystem,
      network: { enabled: networkAccess },
    },
    'eval-read-only': {
      extends: ':read-only',
      filesystem: {
        ...filesystem,
        [workspace]: 'read',
        ':tmpdir': 'read',
      },
      network: { enabled: networkAccess },
    },
  });

  transformations.push(
    `Translated ${sandbox} sandbox mode to ${defaultPermissions}.`,
    `Set native eval network access to ${String(networkAccess)}${networkAccess ? '' : ' and disabled web search'}.`,
    'Disabled native system skill loading plus memories and chronicle for the isolated runtime.',
    'Excluded authentication variables from command environments while preserving other shell policy settings.',
    'Disabled machine and user Git configuration for the isolated fixture.',
  );

  return result;
}

async function copyFile(source: string, destination: string, mode?: number): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  await Bun.write(destination, Bun.file(source));
  if (mode !== undefined) {
    await chmod(destination, mode);
  }
}

async function copyCandidateAgents(
  sourceDirectory: string,
  destinationDirectory: string,
  transformations: string[],
): Promise<void> {
  await mkdir(destinationDirectory);
  const names = (await readdir(sourceDirectory)).sort();

  for (const name of names) {
    if (!name.endsWith('.toml') || name.includes('/') || name.includes('\\')) {
      throw new Error(`Unsupported candidate agent file: ${name}`);
    }

    const source = resolve(sourceDirectory, name);
    const info = await lstat(source);
    if (!info.isFile()) {
      throw new Error(`Candidate agent must be a regular file: ${name}`);
    }

    const role = await readConfig(source);

    const supported = new Set([
      'name',
      'description',
      'model',
      'model_reasoning_effort',
      'model_reasoning_summary',
      'model_verbosity',
      'service_tier',
      'developer_instructions',
      'sandbox_mode',
    ]);

    for (const key of Object.keys(role)) {
      if (!supported.has(key)) {
        throw new Error(
          `Unsupported role setting ${key} in ${name}; its isolation semantics are unqualified.`,
        );
      }
    }

    const sandbox = configValue(role, 'sandbox_mode');
    if (sandbox !== 'workspace-write' && sandbox !== 'read-only') {
      throw new Error(`Unsupported candidate agent sandbox mode: ${name}`);
    }
    deleteConfigValue(role, 'sandbox_mode');
    setConfigValue(
      role,
      'default_permissions',
      sandbox === 'read-only' ? 'eval-read-only' : 'eval',
    );

    const serialized = Bun.TOML.stringify(role);
    if (serialized === undefined) {
      throw new Error(`Cannot serialize candidate agent: ${name}`);
    }
    await Bun.write(resolve(destinationDirectory, name), serialized);
  }

  transformations.push(
    'Replaced AGENTS.md and the complete agents directory with candidate copies.',
  );
}

async function runControl(
  command: readonly [string, ...string[]],
  cwd: string,
  environment: Readonly<Record<string, string>>,
): Promise<{ command: readonly string[]; exitCode: number; stdout: string; stderr: string }> {
  const child = Bun.spawn({
    cmd: [...command],
    cwd,
    env: { ...environment },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const timer = setTimeout(() => child.kill('SIGKILL'), controlTimeoutMs);
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    if (exitCode !== 0) {
      throw new Error(`Preparation command failed (${exitCode}): ${stderr}`);
    }
    return {
      command,
      exitCode,
      stdout,
      stderr,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function pluginSources(
  runtimeDirectory: string,
  codexHome: string,
  configured: IConfigTable,
): Promise<IPluginSource[]> {
  const marketplace = (await Bun.file(
    resolve(runtimeDirectory, '.agents/plugins/marketplace.json'),
  ).json()) as unknown;
  const marketplaceObject = protocolObject(marketplace);
  const { name: marketplaceName, plugins: entries } = marketplaceObject;
  if (typeof marketplaceName !== 'string' || !Array.isArray(entries)) {
    throw new Error('Invalid frozen Codex marketplace.');
  }

  const component = (value: string): boolean =>
    value.length > 0 && value !== '.' && value !== '..' && !/[\\/\0]/u.test(value);
  if (!component(marketplaceName)) {
    throw new Error('Unsafe marketplace name.');
  }

  const result: IPluginSource[] = [];
  const activation = configValue(configured, 'plugins');
  if (activation !== undefined && !isConfigTable(activation)) {
    throw new Error('Plugin activation must be a table.');
  }

  for (const entry of entries) {
    const plugin = protocolObject(entry);
    const { name, source: sourceValue } = plugin;
    const source = protocolObject(sourceValue);
    const { path: sourcePath, source: sourceKind } = source;
    if (typeof name !== 'string' || sourceKind !== 'local' || typeof sourcePath !== 'string') {
      throw new Error('Only named local marketplace plugins are supported.');
    }
    if (!component(name) || result.some((plugin) => plugin.name === name)) {
      throw new Error('Unsafe or duplicate plugin name.');
    }

    const sourceDirectory = containedPath(runtimeDirectory, sourcePath);
    assertChild(await realpath(runtimeDirectory), await realpath(sourceDirectory), 'Plugin source');
    const manifest = protocolObject(
      (await Bun.file(resolve(sourceDirectory, '.codex-plugin/plugin.json')).json()) as unknown,
    );
    const { name: manifestName, version } = manifest;
    if (manifestName !== name || typeof version !== 'string' || !component(version)) {
      throw new Error(`Marketplace and plugin manifest disagree for ${name}.`);
    }

    for (const capability of ['mcpServers', 'hooks', 'apps']) {
      if (Object.hasOwn(manifest, capability)) {
        throw new Error(
          `Plugin ${name} declares an unqualified ${capability} execution dependency.`,
        );
      }
    }

    for (const file of ['.mcp.json', 'hooks/hooks.json']) {
      if (await Bun.file(resolve(sourceDirectory, file)).exists()) {
        throw new Error(`Plugin ${name} declares an unqualified execution dependency: ${file}`);
      }
    }

    const id = `${name}@${marketplaceName}`;
    const settings = isConfigTable(activation) ? activation[id] : undefined;
    const { enabled } = isConfigTable(settings) ? settings : {};
    if (
      settings !== undefined &&
      (!isConfigTable(settings) ||
        Object.keys(settings).some((key) => key !== 'enabled') ||
        typeof enabled !== 'boolean')
    ) {
      throw new Error(`Unsupported activation settings for ${id}.`);
    }

    const installed = resolve(codexHome, 'plugins/cache', marketplaceName, name, version);
    assertChild(codexHome, installed, 'Installed plugin');
    result.push({
      id,
      marketplaceName,
      name,
      version,
      source: sourceDirectory,
      installed,
      enabled: settings === undefined ? true : enabled === true,
    });
  }

  if (
    isConfigTable(activation) &&
    Object.keys(activation).some((id) => !result.some((plugin) => plugin.id === id))
  ) {
    throw new Error(
      'Plugin activation refers to a plugin outside the frozen repository marketplace.',
    );
  }

  return result;
}

async function standaloneSkills(runtimeDirectory: string): Promise<string[]> {
  const root = resolve(runtimeDirectory, 'skills');
  const names = (await readdir(root)).sort();
  const result: string[] = [];

  for (const name of names) {
    const info = await lstat(resolve(root, name));
    if (!info.isDirectory()) {
      throw new Error(`Standalone skill entry is not a directory: ${name}`);
    }

    const skill = resolve(root, name, 'SKILL.md');
    if (!(await Bun.file(skill).exists())) {
      throw new Error(`Standalone skill lacks SKILL.md: ${name}`);
    }
    result.push(name);
  }

  return result;
}

async function compareDirectories(
  source: string,
  installed: string,
  label: string,
): Promise<{ source: ISnapshot; installed: ISnapshot }> {
  const sourceSnapshot = await inventoryDirectory(source);
  const installedSnapshot = await inventoryDirectory(installed);
  if (sourceSnapshot.sha256 !== installedSnapshot.sha256) {
    throw new Error(`Installed capability differs from frozen source: ${label}`);
  }

  return { source: sourceSnapshot, installed: installedSnapshot };
}

function listedSkills(response: unknown): Record<string, unknown>[] {
  const { data } = protocolObject(response);
  if (!Array.isArray(data)) {
    throw new Error('Codex skills/list did not return data.');
  }

  const result: Record<string, unknown>[] = [];

  for (const entry of data) {
    const { skills, errors } = protocolObject(entry);
    if (Array.isArray(errors) && errors.length > 0) {
      throw new Error('Codex reported skill discovery errors.');
    }
    if (!Array.isArray(skills)) {
      throw new Error('Codex skills/list entry lacks skills.');
    }

    for (const skill of skills) {
      result.push(protocolObject(skill));
    }
  }

  return result;
}

function verifyInstalledPlugins(
  response: unknown,
  expected: readonly IPluginSource[],
  runtime: string,
): void {
  const { marketplaces, marketplaceLoadErrors } = protocolObject(response);
  if (
    !Array.isArray(marketplaces) ||
    !Array.isArray(marketplaceLoadErrors) ||
    marketplaceLoadErrors.length !== 0
  ) {
    throw new Error('Codex did not establish the installed plugin set.');
  }

  const seen = new Set<string>();

  for (const marketplace of marketplaces) {
    const { name: marketplaceName, path: marketplacePath, plugins } = protocolObject(marketplace);
    if (!Array.isArray(plugins)) {
      throw new Error('Codex marketplace has no plugin list.');
    }
    for (const value of plugins) {
      const { id, name, installed, enabled, localVersion, version, source } = protocolObject(value);
      if (typeof installed !== 'boolean') {
        throw new Error('Codex plugin installation state is unknown.');
      }
      if (!installed) {
        continue;
      }

      const plugin = expected.find((item) => item.id === id);
      if (plugin === undefined || seen.has(plugin.id)) {
        throw new Error('Unexpected or duplicate installed plugin.');
      }

      const { type: sourceType, path: sourcePath } = protocolObject(source);
      if (
        name !== plugin.name ||
        marketplaceName !== plugin.marketplaceName ||
        marketplacePath !== resolve(runtime, '.agents/plugins/marketplace.json') ||
        enabled !== plugin.enabled ||
        (localVersion ?? version) !== plugin.version ||
        sourceType !== 'local' ||
        typeof sourcePath !== 'string' ||
        resolve(sourcePath) !== plugin.source
      ) {
        throw new Error(`Installed plugin identity or activation differs for ${plugin.id}.`);
      }
      seen.add(plugin.id);
    }
  }

  if (seen.size !== expected.length) {
    throw new Error('A declared plugin was not installed.');
  }
}

async function commandProbe(
  session: CodexSession,
  command: readonly string[],
  workspace: string,
  profile: string,
): Promise<Record<string, unknown>> {
  return protocolObject(
    await session.transport.request('command/exec', {
      command,
      cwd: workspace,
      permissionProfile: profile,
      timeoutMs: 5_000,
    }),
  );
}

function exitCode(result: Record<string, unknown>): number {
  const { exitCode: value } = result;
  if (typeof value !== 'number') {
    throw new Error('Codex command probe did not report an exit code.');
  }
  return value;
}

/** Prepare one isolated native Codex trial without running a model turn. */
export async function prepareNativeTrial(
  input: INativePreparationInput,
): Promise<NativePreparationResult> {
  const directory = resolve(input.directory);
  const workspace = resolve(directory, 'workspace');
  const workspaceInfo = await lstat(workspace);
  if (!workspaceInfo.isDirectory()) {
    throw new Error('Trial workspace must be a regular directory.');
  }

  const stateDirectory = resolve(directory, 'native');
  // One exclusive reservation owns every preparation file. Reuse cannot truncate old evidence.
  await mkdir(stateDirectory);
  const home = resolve(stateDirectory, 'home');
  const codexHome = resolve(home, '.codex');
  const temporary = resolve(stateDirectory, 'tmp');
  const evidencePath = resolve(stateDirectory, 'preparation.json');
  const protocolPath = resolve(stateDirectory, 'protocol.jsonl');
  assertChild(directory, workspace, 'Workspace');
  assertChild(directory, home, 'Home');

  const evidence: IPreparationEvidence = {
    status: 'preparing',
    startedAt: new Date().toISOString(),
    paths: {
      directory,
      workspace,
      runtimeDirectory: resolve(input.runtimeDirectory),
      protocolPath,
      codexHome,
      temporary,
    },
    transformations: [],
    installation: {},
    discovery: {},
    probes: {},
    conditions: {
      networkAccess: input.networkAccess,
      pathPrepend: input.pathPrepend ?? [],
      executableFiles: input.executableFiles ?? [],
    },
  };

  const writer = Bun.file(protocolPath).writer();
  let session: CodexSession | null = null;
  let processExit: ICodexProcessExit | null = null;
  let finalization: Promise<void> | undefined;

  const finalize = (): Promise<void> => {
    finalization ??= (async () => {
      const errors: string[] = [];

      try {
        await session?.close();
      } catch (error) {
        errors.push(safeError(error, input.credentials));
      }

      try {
        await writer.end();
      } catch (error) {
        errors.push(safeError(error, input.credentials));
      }

      if (processExit !== null && processExit.exitCode !== 0 && processExit.signalCode === null) {
        errors.push(`Native app-server exited with code ${processExit.exitCode} during shutdown.`);
      }

      await writeJsonRecord(resolve(stateDirectory, 'finalization.json'), {
        status: errors.length === 0 ? 'closed' : 'failed',
        completedAt: new Date().toISOString(),
        errors,
        process: processExit,
      });

      if (errors.length > 0) {
        throw new Error(`Native finalization failed: ${errors.join(' ')}`);
      }
    })();
    return finalization;
  };

  try {
    await inventoryDirectory(resolve(input.runtimeDirectory));
    await mkdir(home);
    await mkdir(codexHome);
    await mkdir(temporary);

    const executable = resolve(input.codexExecutable);
    const executableTarget = await realpath(executable);
    const executableInfo = await stat(executableTarget);
    if (!executableInfo.isFile() || (executableInfo.mode & 0o111) === 0) {
      throw new Error('Resolved Codex executable is not executable.');
    }
    recordValue(evidence.paths, 'codexExecutable', executable);
    recordValue(evidence.paths, 'codexExecutableTarget', executableTarget);

    const base = await readConfig(resolve(input.profileDirectory, 'config.toml'));
    const candidate = await readConfig(resolve(input.runtimeDirectory, 'config/codex/config.toml'));
    rejectUndeclaredCapabilities(base);
    rejectUndeclaredCapabilities(candidate);
    const merged = overlayConfig(base, candidate);
    validateCredentialRoutes(base, merged, input.credentials);

    const runtimeTools = await resolveRuntimeTools(input.profileDirectory);
    const prepend = (input.pathPrepend ?? []).map((path) => containedPath(workspace, path));
    const effectivePath = [...prepend, ...runtimeTools.pathDirectories, systemPath].join(':');

    const filesystem = permissionFilesystem(
      workspace,
      resolve(input.runtimeDirectory),
      home,
      codexHome,
      executable,
      executableTarget,
    );

    for (const path of runtimeTools.readPaths) {
      filesystem[path] = 'read';
    }

    recordValue(evidence.installation, 'runtimeTools', runtimeTools);

    const configured = translateSandbox(
      merged,
      workspace,
      filesystem,
      input.networkAccess,
      evidence.transformations,
      Object.keys(input.credentials),
    );

    if (prepend.length > 0) {
      const shell = configValue(configured, 'shell_environment_policy');
      if (!isConfigTable(shell)) {
        throw new Error('Missing derived shell environment policy.');
      }
      setConfigValue(
        configured,
        'shell_environment_policy',
        overlayConfig(shell, {
          set: Object.fromEntries([['PATH', effectivePath]]),
        }),
      );

      evidence.transformations.push(
        'Applied declared fixture PATH precedence through the native shell environment policy.',
      );
    }

    const plugins = await pluginSources(resolve(input.runtimeDirectory), codexHome, configured);
    const skillNames = await standaloneSkills(resolve(input.runtimeDirectory));
    setConfigValue(
      configured,
      'projects',
      Object.fromEntries([[workspace, Object.fromEntries([['trust_level', 'trusted']])]]),
    );

    const serializedConfig = Bun.TOML.stringify(configured);
    if (serializedConfig === undefined) {
      throw new Error('Cannot serialize derived Codex config.');
    }
    await Bun.write(resolve(codexHome, 'config.toml'), serializedConfig);
    await copyFile(
      resolve(input.runtimeDirectory, 'config/codex/AGENTS.md'),
      resolve(codexHome, 'AGENTS.md'),
      0o600,
    );

    await copyCandidateAgents(
      resolve(input.runtimeDirectory, 'config/codex/agents'),
      resolve(codexHome, 'agents'),
      evidence.transformations,
    );

    const executableFiles = (input.executableFiles ?? []).map((path) =>
      containedPath(workspace, path),
    );
    const canonicalWorkspace = await realpath(workspace);

    for (const path of prepend) {
      if (!(await stat(path)).isDirectory()) {
        throw new Error(`PATH fixture is not a directory: ${path}`);
      }
    }

    for (const path of executableFiles) {
      const info = await lstat(path);
      if (!info.isFile()) {
        throw new Error(`Fixture executable is not a file: ${path}`);
      }
      assertChild(canonicalWorkspace, await realpath(path), 'Fixture executable');
      if ((info.mode & 0o111) === 0) {
        await chmod(path, (info.mode & 0o777) | 0o111);
        evidence.transformations.push(
          `Restored declared executable mode: ${relative(workspace, path)}`,
        );
      }
    }

    const environment = runtimeEnvironment(
      {
        home,
        codexHome,
        workspace,
        temporary,
        path: effectivePath,
      },
      Object.keys(input.credentials),
      input.credentials,
    );

    for (const [name, value] of [
      ['DISABLE_TELEMETRY', '1'],
      ['DO_NOT_TRACK', '1'],
    ] as const) {
      environment[name] = value;
    }

    recordValue(
      evidence.probes,
      'git',
      await runControl(
        ['git', '-c', 'init.templateDir=', 'init', '--quiet', workspace],
        workspace,
        environment,
      ),
    );

    const packagePath = Bun.resolveSync('skills/package.json', import.meta.dir);
    const packageMetadata = protocolObject((await Bun.file(packagePath).json()) as unknown);
    const { version: installedSkillsVersion } = packageMetadata;
    if (installedSkillsVersion !== skillsVersion) {
      throw new Error(`skills CLI must be pinned to ${skillsVersion}.`);
    }
    recordValue(
      evidence.installation,
      'standaloneCommand',
      await runControl(
        [
          process.execPath,
          resolve(dirname(packagePath), 'bin/cli.mjs'),
          'add',
          resolve(input.runtimeDirectory, 'skills'),
          '--global',
          '--agent',
          'codex',
          '--copy',
          '--yes',
        ],
        workspace,
        environment,
      ),
    );

    session = new CodexSession({
      command: [executableTarget, 'app-server', '--listen', 'stdio://'],
      cwd: workspace,
      env: environment,
      requestTimeoutMs: controlTimeoutMs,
      cleanupGraceMs,
      ...(input.onServerRequest === undefined ? {} : { onServerRequest: input.onServerRequest }),
      onRecord: async (record) => {
        writer.write(`${redact(JSON.stringify(record), input.credentials)}\n`);
        await writer.flush();
      },
    });

    recordValue(evidence.installation, 'process', {
      pid: session.transport.pid,
      executable: executableTarget,
    });

    void session.transport.exited.then((value) => {
      processExit = value;
    });
    recordValue(evidence.installation, 'initialize', await session.initialize());

    const marketplace = protocolObject(
      await session.transport.request('marketplace/add', {
        source: resolve(input.runtimeDirectory),
      }),
    );

    recordValue(evidence.installation, 'marketplace', marketplace);
    const marketplacePath = resolve(input.runtimeDirectory, '.agents/plugins/marketplace.json');
    const pluginInstalls: unknown[] = [];

    for (const plugin of plugins) {
      pluginInstalls.push(
        await session.transport.request('plugin/install', {
          marketplacePath,
          pluginName: plugin.name,
        }),
      );
      await session.transport.request('config/value/write', {
        keyPath: `plugins.${JSON.stringify(plugin.id)}.enabled`,
        value: plugin.enabled,
        mergeStrategy: 'replace',
      });
    }

    recordValue(evidence.installation, 'plugins', pluginInstalls);

    const verificationResults: Record<string, unknown> = {};
    const allowedSkillFiles = new Set<string>();

    for (const name of skillNames) {
      const installed = resolve(home, '.agents/skills', name);
      verificationResults[`skill:${name}`] = await compareDirectories(
        resolve(input.runtimeDirectory, 'skills', name),
        installed,
        `skill-${name}`,
      );
      allowedSkillFiles.add(resolve(installed, 'SKILL.md'));
    }

    for (const plugin of plugins) {
      verificationResults[`plugin:${plugin.name}`] = await compareDirectories(
        plugin.source,
        plugin.installed,
        `plugin-${plugin.name}`,
      );
      for await (const path of new Bun.Glob('*/SKILL.md').scan(
        resolve(plugin.installed, 'skills'),
      )) {
        if (plugin.enabled) {
          allowedSkillFiles.add(resolve(plugin.installed, 'skills', path));
        }
      }
    }

    recordValue(evidence.installation, 'verification', verificationResults);

    const before = listedSkills(
      await session.transport.request('skills/list', { cwds: [workspace], forceReload: true }),
    );
    const skillSettings = configValue(configured, 'skills');
    if (skillSettings !== undefined) {
      if (!isConfigTable(skillSettings)) {
        throw new Error('Skill activation must be a table.');
      }

      const { config: overrides } = skillSettings;
      if (!Array.isArray(overrides)) {
        throw new Error('Skill activation config must be an array.');
      }

      for (const override of overrides) {
        if (!isConfigTable(override)) {
          throw new Error('Skill activation must name a repository skill.');
        }

        const { name, enabled } = override;
        if (
          typeof name !== 'string' ||
          typeof enabled !== 'boolean' ||
          Object.keys(override).some((key) => !['name', 'enabled'].includes(key))
        ) {
          throw new Error('Use name and enabled for portable repository skill activation.');
        }

        const matches = before.filter((skill) => {
          const { name: skillName } = skill;
          return skillName === name;
        });

        const skill = matches[0];
        if (matches.length !== 1 || skill === undefined) {
          throw new Error(`Unknown or ambiguous skill activation: ${name}`);
        }

        const { path } = skill;
        if (typeof path !== 'string' || !allowedSkillFiles.has(resolve(path))) {
          throw new Error('Skill activation points outside enabled repository capabilities.');
        }
        await session.transport.request('skills/config/write', { path, enabled });
        if (!enabled) {
          allowedSkillFiles.delete(resolve(path));
        }
      }
    }

    for (const skill of before) {
      const { path, scope } = skill;
      if (scope === 'system') {
        if (typeof path !== 'string') {
          throw new Error('System skill lacks a path.');
        }
        await session.transport.request('skills/config/write', {
          path,
          enabled: false,
        });
      }
    }

    const skillsResponse = await session.transport.request('skills/list', {
      cwds: [workspace],
      forceReload: true,
    });

    const after = listedSkills(skillsResponse);
    const enabledPaths = new Set<string>();

    for (const skill of after) {
      const { enabled, path: skillPath, scope } = skill;
      if (enabled !== true) {
        continue;
      }
      if (scope === 'system') {
        throw new Error('A native system skill remains enabled.');
      }
      if (typeof skillPath !== 'string') {
        throw new Error('Enabled skill lacks a path.');
      }

      const resolvedSkill = resolve(skillPath);
      if (!allowedSkillFiles.has(resolvedSkill)) {
        throw new Error(`Undeclared enabled skill discovered: ${resolvedSkill}`);
      }
      enabledPaths.add(resolvedSkill);
    }

    if (enabledPaths.size !== allowedSkillFiles.size) {
      throw new Error('Installed and discovered repository skills do not match.');
    }
    recordValue(evidence.discovery, 'skills', skillsResponse);
    const installedPlugins = await session.transport.request('plugin/installed', {
      cwds: [workspace],
    });
    recordValue(evidence.discovery, 'plugins', installedPlugins);
    verifyInstalledPlugins(installedPlugins, plugins, resolve(input.runtimeDirectory));
    recordValue(
      evidence.discovery,
      'config',
      await session.transport.request('config/read', { cwd: workspace, includeLayers: true }),
    );

    const visiblePath = resolve(workspace, `.eval-preparation-${randomUUID()}`);
    const privatePath = resolve(stateDirectory, `.private-eval-${randomUUID()}`);
    const visibleValue = `visible-${randomUUID()}`;
    const privateValue = `private-${randomUUID()}`;
    await Bun.write(visiblePath, visibleValue);
    await Bun.write(privatePath, privateValue);
    const networkValue = `network-${randomUUID()}`;
    let networkRequests = 0;

    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () => {
        networkRequests += 1;
        return new Response(networkValue);
      },
    });

    let visible: Record<string, unknown>;
    let privateRead: Record<string, unknown>;
    let network: Record<string, unknown>;
    const defaultPermissions = configValue(configured, 'default_permissions');
    if (typeof defaultPermissions !== 'string') {
      throw new Error('Missing selected permission profile.');
    }

    try {
      visible = await commandProbe(
        session,
        ['/bin/cat', visiblePath],
        workspace,
        defaultPermissions,
      );
      privateRead = await commandProbe(
        session,
        ['/bin/cat', privatePath],
        workspace,
        defaultPermissions,
      );
      network = await commandProbe(
        session,
        [
          '/usr/bin/curl',
          '--silent',
          '--show-error',
          '--max-time',
          '3',
          `http://127.0.0.1:${server.port}`,
        ],
        workspace,
        defaultPermissions,
      );
    } finally {
      server.stop(true);
      await Promise.all([unlink(visiblePath), unlink(privatePath)]);
    }

    recordValue(evidence.probes, 'visibleRead', visible);
    recordValue(evidence.probes, 'privateRead', privateRead);
    recordValue(evidence.probes, 'network', {
      ...network,
      observedRequests: networkRequests,
      expectedValue: networkValue,
    });

    const { stdout: visibleStdout } = visible;
    if (exitCode(visible) !== 0 || visibleStdout !== visibleValue) {
      throw new Error('Native profile cannot read the trial workspace.');
    }

    const { stderr: privateError } = privateRead;
    if (
      exitCode(privateRead) === 0 ||
      typeof privateError !== 'string' ||
      !/denied|not permitted/iu.test(privateError)
    ) {
      throw new Error('Native profile can read private evaluation data.');
    }

    const { stdout: networkOutput, stderr: networkError } = network;
    if (
      input.networkAccess
        ? exitCode(network) !== 0 || networkRequests !== 1 || networkOutput !== networkValue
        : exitCode(network) === 0 ||
          networkRequests !== 0 ||
          typeof networkError !== 'string' ||
          !/connect|denied|not permitted/iu.test(networkError)
    ) {
      throw new Error('Native network policy does not match the declared trial policy.');
    }

    const writeResults: Record<string, unknown> = {};
    const writeValue = `write-${randomUUID()}`;

    for (const [name, root] of [
      ['workspace', workspace],
      ['temporary', temporary],
    ] as const) {
      const path = resolve(root, `.write-probe-${randomUUID()}`);

      const result = await commandProbe(
        session,
        ['/bin/sh', '-c', 'printf %s "$2" > "$1"', '_eval', path, writeValue],
        workspace,
        defaultPermissions,
      );

      writeResults[name] = result;
      const file = Bun.file(path);
      const exists = await file.exists();
      const contents = exists ? await file.text() : null;
      if (exists) {
        await unlink(path);
      }

      const shouldWrite = defaultPermissions === 'eval';
      if (
        shouldWrite
          ? exitCode(result) !== 0 || contents !== writeValue
          : exitCode(result) === 0 || exists
      ) {
        throw new Error(`Native ${name} write policy differs from the selected profile.`);
      }
    }

    recordValue(evidence.probes, 'writes', writeResults);
    if (prepend.length > 0) {
      const path = await commandProbe(
        session,
        ['/usr/bin/printenv', 'PATH'],
        workspace,
        defaultPermissions,
      );

      recordValue(evidence.probes, 'pathEnvironment', path);
      const { stdout } = path;
      if (
        exitCode(path) !== 0 ||
        typeof stdout !== 'string' ||
        !stdout.startsWith(`${prepend.join(':')}:`)
      ) {
        throw new Error(
          'Fixture PATH directories are not the leading command environment entries.',
        );
      }
    }

    const pathChecks: Record<string, unknown>[] = [];

    for (const file of executableFiles) {
      if (!prepend.includes(dirname(file))) {
        continue;
      }

      const check = await commandProbe(
        session,
        ['/usr/bin/which', basename(file)],
        workspace,
        defaultPermissions,
      );

      const { stdout } = check;
      if (exitCode(check) !== 0 || String(stdout).trim() !== file) {
        throw new Error(`Fixture PATH precedence was not applied: ${file}`);
      }
      pathChecks.push(check);
    }

    recordValue(evidence.probes, 'pathPrecedence', pathChecks);

    const toolChecks: unknown[] = [];

    for (const tool of runtimeTools.tools) {
      const check = await commandProbe(
        session,
        [tool.executable, ...tool.probe],
        workspace,
        defaultPermissions,
      );

      toolChecks.push({
        name: tool.name,
        executable: tool.executable,
        result: check,
      });

      recordValue(evidence.probes, 'runtimeTools', toolChecks);
      if (exitCode(check) !== 0) {
        throw new Error(
          `Required runtime tool is unusable inside the native profile: ${tool.name}`,
        );
      }
    }

    const thread = await session.startThread({
      cwd: workspace,
      permissions: defaultPermissions,
    });

    const { activePermissionProfile } = thread.response;
    const { id: activeProfile } = protocolObject(activePermissionProfile);
    if (activeProfile !== defaultPermissions) {
      throw new Error('Codex did not apply the derived native permission profile.');
    }

    evidence.status = 'ready';
    evidence.completedAt = new Date().toISOString();
    recordValue(evidence.probes, 'thread', thread);
    await writeJsonRecord(evidencePath, sanitizedEvidence(evidence, input.credentials));

    return {
      status: 'ready',
      session,
      thread,
      evidencePath,
      protocolPath,
      codexHome,
      workspace,
      finalize,
    };
  } catch (error) {
    const reason = safeError(error, input.credentials);
    evidence.status = 'not-run';
    evidence.completedAt = new Date().toISOString();
    evidence.reason = reason;

    try {
      await finalize();
    } catch (cleanupError) {
      evidence.reason = `${reason} Cleanup: ${safeError(cleanupError, input.credentials)}`;
    }

    await writeJsonRecord(evidencePath, sanitizedEvidence(evidence, input.credentials));

    return {
      status: 'not-run',
      reason: evidence.reason,
      evidencePath,
    };
  }
}
