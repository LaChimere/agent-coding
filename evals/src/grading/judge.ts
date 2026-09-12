import { randomUUID } from 'node:crypto';
import { mkdir, readdir, realpath, stat, unlink } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import type { ApiProvider, ProviderResponse } from 'promptfoo';
import { CodexSession, protocolObject } from '../codex/session.ts';
import type { ICodexTransportRecord } from '../codex/transport.ts';
import { normalizeCodexUsage } from '../codex/usage.ts';
import { type IConfigTable, parseConfig, runtimeEnvironment } from '../preparation/config.ts';
import type { IUsageObservation } from '../results/resources.ts';

export const judgeModel = 'gpt-6-astra';
export const judgeReasoningEffort = 'high';
export const judgeDefinitionId = 'codex-evals/rubric-v1';
export const nativeJudgeRoute = 'openai:codex-app-server:repo-judge';

export type RubricStatus = 'passed' | 'failed' | 'unknown';

export interface IJudgeVerdict {
  status: RubricStatus;
  pass: boolean;
  score: number;
  reason: string;
  evidence: string[];
}

export interface IObservedJudge {
  model: string | null;
  reasoningEffort: string | null;
  route: string;
  definitionId: string;
}

export interface IJudgeInput {
  evidenceDirectory: string;
  operationDirectory: string;
  codexExecutable: string;
  profileDirectory: string;
  credentials: Readonly<Record<string, string>>;
  signal?: AbortSignal;
}

export interface IJudgeProvider {
  provider: ApiProvider;
  observations: readonly IUsageObservation[];
  observed: IObservedJudge;
  close(): Promise<void>;
}

const controlTimeoutMs = 30_000;
const cleanupGraceMs = 1_000;
const permissionName = 'eval-grader';
const systemPath = '/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin';

export const verdictSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'pass', 'score', 'reason', 'evidence'],
  properties: {
    status: { type: 'string', enum: ['passed', 'failed', 'unknown'] },
    pass: { type: 'boolean' },
    score: { type: 'number', enum: [0, 1] },
    reason: { type: 'string', minLength: 1 },
    evidence: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
} as const;

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function field(record: Record<string, unknown>, key: string): unknown {
  return record[key];
}

function configTable(value: unknown): value is IConfigTable {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function redact(value: string, credentials: Readonly<Record<string, string>>): string {
  let result = value;
  for (const credential of Object.values(credentials)) {
    if (credential.length > 0) {
      result = result.replaceAll(credential, '<credential-redacted>');
    }
  }
  return result;
}

function sanitized(value: unknown, credentials: Readonly<Record<string, string>>): unknown {
  return JSON.parse(redact(JSON.stringify(value), credentials)) as unknown;
}

async function writeJson(
  path: string,
  value: unknown,
  credentials: Readonly<Record<string, string>>,
): Promise<void> {
  await Bun.write(path, `${JSON.stringify(sanitized(value, credentials), null, 2)}\n`);
}

function parseVerdict(value: unknown): IJudgeVerdict {
  const source = protocolObject(value);
  const { status, pass, score, reason, evidence } = source;
  if (status !== 'passed' && status !== 'failed' && status !== 'unknown') {
    throw new Error('Judge verdict has an invalid status.');
  }
  if (typeof pass !== 'boolean' || (score !== 0 && score !== 1)) {
    throw new Error('Judge verdict has invalid Promptfoo adapter fields.');
  }
  if ((status === 'passed') !== pass || score !== (pass ? 1 : 0)) {
    throw new Error('Judge verdict status, pass and score disagree.');
  }
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new Error('Judge verdict has no reason.');
  }
  if (
    !Array.isArray(evidence) ||
    evidence.some((reference) => typeof reference !== 'string' || reference.trim().length === 0)
  ) {
    throw new Error('Judge verdict has invalid evidence references.');
  }
  if (status !== 'unknown' && evidence.length === 0) {
    throw new Error('A decisive judge verdict requires concrete evidence references.');
  }

  return {
    status,
    pass,
    score,
    reason,
    evidence,
  };
}

function parseVerdictOutput(output: unknown): IJudgeVerdict {
  if (typeof output === 'string') {
    try {
      return parseVerdict(JSON.parse(output) as unknown);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Judge returned malformed JSON.');
      }
      throw error;
    }
  }
  return parseVerdict(output);
}

function providerResponse(
  verdict: IJudgeVerdict,
  metadata: Record<string, unknown>,
  tokenUsage?: ProviderResponse['tokenUsage'],
): ProviderResponse {
  return {
    output: verdict,
    metadata: {
      ...metadata,
      status: verdict.status,
      evidence: verdict.evidence,
    },
    ...(tokenUsage === undefined ? {} : { tokenUsage }),
  };
}

function providerConfig(profile: IConfigTable): {
  id: string;
  settings: IConfigTable;
  baseUrl: string;
} {
  const id = text(field(profile, 'model_provider'), 'Approved model provider');
  const providers = field(profile, 'model_providers');
  if (!configTable(providers)) {
    throw new Error('Approved profile has no model providers.');
  }

  const settings = providers[id];
  if (!configTable(settings)) {
    throw new Error(`Approved profile has no provider ${id}.`);
  }
  if (field(settings, 'wire_api') !== 'responses') {
    throw new Error(`Approved provider ${id} is not configured for the Responses API.`);
  }

  const baseUrl = text(field(settings, 'base_url'), `Provider ${id} base URL`).replace(/\/$/u, '');
  const url = new URL(baseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Provider ${id} base URL must use HTTP or HTTPS.`);
  }

  return {
    id,
    settings,
    baseUrl,
  };
}

function requestHeaders(
  settings: IConfigTable,
  credentials: Readonly<Record<string, string>>,
): Headers {
  const headers = new Headers({ 'content-type': 'application/json' });
  const staticHeaders = field(settings, 'http_headers');
  if (staticHeaders !== undefined) {
    if (!configTable(staticHeaders)) {
      throw new Error('Provider HTTP headers must be a table.');
    }
    for (const [name, value] of Object.entries(staticHeaders)) {
      headers.set(name, text(value, `Static provider header ${name}`));
    }
  }

  const environmentHeaders = field(settings, 'env_http_headers');
  if (environmentHeaders !== undefined) {
    if (!configTable(environmentHeaders)) {
      throw new Error('Provider environment HTTP headers must be a table.');
    }
    for (const [name, environment] of Object.entries(environmentHeaders)) {
      const variable = text(environment, `Provider header reference ${name}`);
      headers.set(name, text(credentials[variable], `Credential ${variable}`));
    }
  }

  const environmentKey = field(settings, 'env_key');
  if (environmentKey !== undefined) {
    const variable = text(environmentKey, 'Provider bearer credential reference');
    headers.set('authorization', `Bearer ${text(credentials[variable], `Credential ${variable}`)}`);
  }

  return headers;
}

function responseText(response: Record<string, unknown>): string {
  const directOutput = field(response, 'output_text');
  if (typeof directOutput === 'string') {
    return directOutput;
  }

  const output = field(response, 'output');
  if (!Array.isArray(output)) {
    throw new Error('Responses API result has no output.');
  }

  const texts: string[] = [];

  for (const item of output) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const content = field(item as Record<string, unknown>, 'content');
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (part === null || typeof part !== 'object' || Array.isArray(part)) {
        continue;
      }

      const record = part as Record<string, unknown>;
      const type = field(record, 'type');
      const value = field(record, 'text');
      if (type === 'output_text' && typeof value === 'string') {
        texts.push(value);
      }
    }
  }

  if (texts.length === 0) {
    throw new Error('Responses API result has no output text.');
  }

  return texts.join('\n');
}

function apiUsage(
  response: Record<string, unknown>,
  responsePath: string,
): {
  observation: IUsageObservation;
  promptfoo: NonNullable<ProviderResponse['tokenUsage']>;
} {
  const responseUsage = field(response, 'usage');

  const usage =
    responseUsage !== null && typeof responseUsage === 'object' && !Array.isArray(responseUsage)
      ? (responseUsage as Record<string, unknown>)
      : {};

  const rawInputDetails = field(usage, 'input_tokens_details');

  const inputDetails =
    rawInputDetails !== null &&
    typeof rawInputDetails === 'object' &&
    !Array.isArray(rawInputDetails)
      ? (rawInputDetails as Record<string, unknown>)
      : {};

  const rawOutputDetails = field(usage, 'output_tokens_details');

  const outputDetails =
    rawOutputDetails !== null &&
    typeof rawOutputDetails === 'object' &&
    !Array.isArray(rawOutputDetails)
      ? (rawOutputDetails as Record<string, unknown>)
      : {};

  const input = safeInteger(field(usage, 'input_tokens'));
  const output = safeInteger(field(usage, 'output_tokens'));
  const cached = safeInteger(field(inputDetails, 'cached_tokens'));
  const reasoning = safeInteger(field(outputDetails, 'reasoning_tokens'));
  const promptfoo: NonNullable<ProviderResponse['tokenUsage']> = {};
  if (input !== null) {
    promptfoo.prompt = input;
  }
  if (output !== null) {
    promptfoo.completion = output;
  }
  if (cached !== null) {
    promptfoo.cached = cached;
  }
  if (input !== null || output !== null || cached !== null || reasoning !== null) {
    promptfoo.numRequests = 1;
  }

  const evidenceSource = `${responsePath}#body/usage`;

  return {
    observation: {
      id: evidenceSource,
      actorId: optionalText(field(response, 'id')) ?? 'responses-request',
      model: optionalText(field(response, 'model')),
      threadId: null,
      turnId: optionalText(field(response, 'id')),
      kind: 'delta',
      observedAt: Date.now(),
      usage: {
        input,
        output,
        cachedInput: cached,
        reasoningOutput: reasoning,
      },
      evidenceSource,
      includedActorIds: [],
    },
    promptfoo,
  };
}

export async function createTextJudge(input: IJudgeInput): Promise<IJudgeProvider> {
  const profilePath = resolve(input.profileDirectory, 'config.toml');
  const profile = parseConfig(await Bun.file(profilePath).text());
  const configured = providerConfig(profile);
  const route = `responses:${configured.id}`;

  const state: { observations: IUsageObservation[]; observed: IObservedJudge } = {
    observations: [],
    observed: {
      model: null,
      reasoningEffort: null,
      route,
      definitionId: judgeDefinitionId,
    },
  };

  await writeJson(
    resolve(input.operationDirectory, 'effective-config.json'),
    {
      route,
      provider: configured.id,
      baseUrl: configured.baseUrl,
      wireApi: field(configured.settings, 'wire_api'),
      model: judgeModel,
      requestedReasoningEffort: judgeReasoningEffort,
      credentialReferences: [
        field(configured.settings, 'env_key'),
        field(configured.settings, 'env_http_headers'),
      ],
    },
    input.credentials,
  );

  let called = false;

  const provider: ApiProvider = {
    id: () => `openai:responses:${configured.id}:repo-judge`,
    callApi: async (prompt, _context, options) => {
      if (called) {
        throw new Error('A grading operation cannot call the judge more than once.');
      }
      called = true;
      const signal = options?.abortSignal ?? input.signal;
      signal?.throwIfAborted();

      const url = `${configured.baseUrl}/responses`;
      const body = {
        model: judgeModel,
        input: prompt,
        reasoning: { effort: judgeReasoningEffort },
        text: {
          format: {
            type: 'json_schema',
            name: 'rubric_verdict',
            strict: true,
            schema: verdictSchema,
          },
        },
      };

      await writeJson(
        resolve(input.operationDirectory, 'request.json'),
        {
          url,
          method: 'POST',
          body,
        },
        input.credentials,
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders(configured.settings, input.credentials),
        body: JSON.stringify(body),
        ...(signal === undefined ? {} : { signal }),
      });

      const raw = await response.text();
      let decoded: unknown;

      try {
        decoded = JSON.parse(raw) as unknown;
      } catch {
        decoded = { unparsed: raw };
      }

      await writeJson(
        resolve(input.operationDirectory, 'response.json'),
        {
          status: response.status,
          statusText: response.statusText,
          body: decoded,
        },
        input.credentials,
      );

      const record = protocolObject(decoded);
      const usage = apiUsage(record, resolve(input.operationDirectory, 'response.json'));
      state.observations.push(usage.observation);

      const reasoning = field(record, 'reasoning');
      const observedReasoning =
        reasoning !== null && typeof reasoning === 'object' && !Array.isArray(reasoning)
          ? optionalText(field(reasoning as Record<string, unknown>, 'effort'))
          : optionalText(field(record, 'reasoning_effort'));

      state.observed = {
        model: optionalText(field(record, 'model')),
        reasoningEffort: observedReasoning,
        route,
        definitionId: judgeDefinitionId,
      };

      if (response.status !== 200) {
        throw new Error(`Responses API failed with HTTP ${response.status}.`);
      }
      if (field(record, 'status') !== 'completed') {
        throw new Error('Responses API result is not completed.');
      }
      if (field(record, 'error') != null || field(record, 'incomplete_details') != null) {
        throw new Error('Responses API result reports an error or incomplete result.');
      }
      if (state.observed.model !== judgeModel) {
        throw new Error('Responses API returned a different or unobserved judge model.');
      }
      if (state.observed.reasoningEffort !== judgeReasoningEffort) {
        throw new Error('Responses API returned a different or unobserved judge reasoning effort.');
      }

      const verdict = parseVerdictOutput(responseText(record));

      return providerResponse(
        verdict,
        {
          model: state.observed.model,
          requestedReasoningEffort: judgeReasoningEffort,
          observedReasoningEffort: state.observed.reasoningEffort,
          route,
        },
        usage.promptfoo,
      );
    },
  };

  return {
    provider,
    get observations() {
      return state.observations;
    },
    get observed() {
      return state.observed;
    },
    close: async () => {},
  };
}

function isChild(root: string, candidate: string): boolean {
  const difference = relative(root, candidate);
  return difference.length > 0 && difference !== '..' && !difference.startsWith(`..${sep}`);
}

async function firstEvidenceFile(directory: string): Promise<string | null> {
  const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isFile()) {
      return path;
    }
    if (entry.isDirectory()) {
      const found = await firstEvidenceFile(path);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
}

async function sha256(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(await Bun.file(path).arrayBuffer());
  return hasher.digest('hex');
}

async function commandProbe(
  session: CodexSession,
  command: readonly string[],
  cwd: string,
): Promise<Record<string, unknown>> {
  return protocolObject(
    await session.transport.request('command/exec', {
      command,
      cwd,
      permissionProfile: permissionName,
      timeoutMs: 5_000,
    }),
  );
}

function exitCode(result: Record<string, unknown>): number {
  const value = field(result, 'exitCode');
  if (typeof value !== 'number') {
    throw new Error('Native judge probe did not report an exit code.');
  }
  return value;
}

function listedSkills(response: unknown): Record<string, unknown>[] {
  const { data } = protocolObject(response);
  if (!Array.isArray(data)) {
    throw new Error('Codex skills/list did not return data.');
  }

  const skills: Record<string, unknown>[] = [];

  for (const entry of data) {
    const record = protocolObject(entry);
    const errors = field(record, 'errors');
    if (Array.isArray(errors) && errors.length > 0) {
      throw new Error('Codex reported grader skill discovery errors.');
    }

    const listed = field(record, 'skills');
    if (!Array.isArray(listed)) {
      throw new Error('Codex skills/list entry lacks skills.');
    }

    for (const skill of listed) {
      skills.push(protocolObject(skill));
    }
  }

  return skills;
}

function nativeOutput(turn: Readonly<Record<string, unknown>>): string {
  const { items } = turn;
  if (!Array.isArray(items)) {
    throw new Error('Native judge turn has no output items.');
  }

  const texts: string[] = [];

  for (const item of items) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const type = field(record, 'type');
    if (type !== 'agentMessage' && type !== 'assistantMessage') {
      continue;
    }

    const textValue = field(record, 'text');
    const content = field(record, 'content');
    if (typeof textValue === 'string') {
      texts.push(textValue);
    }
    if (typeof content === 'string') {
      texts.push(content);
    }
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part !== null && typeof part === 'object' && !Array.isArray(part)) {
          const value = field(part as Record<string, unknown>, 'text');
          if (typeof value === 'string') {
            texts.push(value);
          }
        }
      }
    }
  }

  const output = texts.at(-1);
  if (output === undefined) {
    throw new Error('Native judge produced no assistant verdict.');
  }

  return output;
}

async function nativeConfiguration(input: IJudgeInput): Promise<{
  configured: Record<string, unknown>;
  providerId: string;
  evidence: string;
  operation: string;
  home: string;
  codexHome: string;
  temporary: string;
  startup: string;
  executable: string;
}> {
  const evidence = await realpath(input.evidenceDirectory);
  const operation = await realpath(input.operationDirectory);
  if (isChild(evidence, operation) || isChild(operation, evidence) || evidence === operation) {
    throw new Error('Evidence and grader operation directories must be separate roots.');
  }
  if (!(await stat(evidence)).isDirectory()) {
    throw new Error('Evidence root must be a directory.');
  }

  const executable = await realpath(input.codexExecutable);
  const executableInfo = await stat(executable);
  if (!executableInfo.isFile() || (executableInfo.mode & 0o111) === 0) {
    throw new Error('Resolved Codex executable is not executable.');
  }

  const profile = parseConfig(
    await Bun.file(resolve(input.profileDirectory, 'config.toml')).text(),
  );
  const provider = providerConfig(profile);

  for (const reference of [
    field(provider.settings, 'env_key'),
    ...(configTable(field(provider.settings, 'env_http_headers'))
      ? Object.values(field(provider.settings, 'env_http_headers') as IConfigTable)
      : []),
  ]) {
    if (reference !== undefined) {
      const name = text(reference, 'Native provider credential reference');
      text(input.credentials[name], `Credential ${name}`);
    }
  }

  const native = resolve(operation, 'native');
  const home = resolve(native, 'home');
  const codexHome = resolve(home, '.codex');
  const temporary = resolve(native, 'tmp');
  const startup = resolve(native, 'startup');
  await mkdir(codexHome, { recursive: true });
  await mkdir(temporary);
  await mkdir(startup);
  const credentialNames = Object.keys(input.credentials);

  const configured: Record<string, unknown> = Object.fromEntries([
    ['model_providers', { [provider.id]: provider.settings }],
    ['project_doc_max_bytes', 0],
    ['web_search', 'disabled'],
    ['features', { memories: false, chronicle: false }],
    ['shell_environment_policy', { inherit: 'core', exclude: credentialNames }],
    ['projects', { [startup]: Object.fromEntries([['trust_level', 'trusted']]) }],
    [
      'permissions',
      {
        [permissionName]: {
          extends: ':read-only',
          filesystem: {
            ':root': 'deny',
            ':minimal': 'read',
            ':slash_tmp': 'deny',
            ':tmpdir': 'write',
            [startup]: 'read',
            [evidence]: 'read',
            [home]: 'read',
            [executable]: 'read',
            [`${codexHome}/skills/.system`]: 'deny',
          },
          network: { enabled: false },
        },
      },
    ],
    ['model', judgeModel],
    ['model_provider', provider.id],
    ['model_reasoning_effort', judgeReasoningEffort],
    ['default_permissions', permissionName],
  ]);

  const serialized = Bun.TOML.stringify(configured);
  if (serialized === undefined) {
    throw new Error('Cannot serialize native judge configuration.');
  }
  await Bun.write(resolve(codexHome, 'config.toml'), serialized);
  await writeJson(
    resolve(input.operationDirectory, 'effective-config.json'),
    {
      route: nativeJudgeRoute,
      permissionProfile: permissionName,
      provider: provider.id,
      model: judgeModel,
      requestedReasoningEffort: judgeReasoningEffort,
      paths: {
        evidence,
        operation,
        home,
        codexHome,
        temporary,
        startup,
        executable,
      },
      config: configured,
    },
    input.credentials,
  );

  return {
    configured,
    providerId: provider.id,
    evidence,
    operation,
    home,
    codexHome,
    temporary,
    startup,
    executable,
  };
}

export async function createNativeJudge(input: IJudgeInput): Promise<IJudgeProvider> {
  const native = await nativeConfiguration(input);
  const protocolPath = resolve(input.operationDirectory, 'protocol.jsonl');
  const writer = Bun.file(protocolPath).writer();
  const records: ICodexTransportRecord[] = [];

  const environment = runtimeEnvironment(
    {
      home: native.home,
      codexHome: native.codexHome,
      workspace: native.startup,
      temporary: native.temporary,
      path: systemPath,
    },
    Object.keys(input.credentials),
    input.credentials,
  );

  Object.assign(
    environment,
    Object.fromEntries([
      ['DISABLE_TELEMETRY', '1'],
      ['DO_NOT_TRACK', '1'],
    ]),
  );

  let session: CodexSession | null = null;
  let observations: IUsageObservation[] = [];
  let usageThread: { id: string; model: string } | null = null;

  let observed: IObservedJudge = {
    model: null,
    reasoningEffort: null,
    route: nativeJudgeRoute,
    definitionId: judgeDefinitionId,
  };

  let called = false;
  let closePromise: Promise<void> | null = null;

  const refreshObservations = (): void => {
    if (usageThread === null) {
      return;
    }

    const modelsByTurn: Record<string, string> = {};

    for (const record of records) {
      if (record.direction !== 'incoming' || record.stream !== 'stdout') {
        continue;
      }

      const message = record.parsed;
      if (message === null || typeof message !== 'object' || Array.isArray(message)) {
        continue;
      }

      const protocol = message as Record<string, unknown>;
      if (field(protocol, 'method') !== 'thread/tokenUsage/updated') {
        continue;
      }

      const params = field(protocol, 'params');
      if (params === null || typeof params !== 'object' || Array.isArray(params)) {
        continue;
      }

      const turnId = field(params as Record<string, unknown>, 'turnId');
      if (typeof turnId === 'string') {
        modelsByTurn[turnId] = usageThread.model;
      }
    }

    observations = normalizeCodexUsage(
      records,
      [
        {
          threadId: usageThread.id,
          modelsByTurn,
          includedActorIds: null,
        },
      ],
      protocolPath,
    ).observations;
  };

  const close = (): Promise<void> => {
    closePromise ??= (async () => {
      const failures: unknown[] = [];

      try {
        await session?.close();
      } catch (failure) {
        failures.push(failure);
      }

      refreshObservations();

      try {
        await writer.end();
      } catch (failure) {
        failures.push(failure);
      }

      if (failures[0] !== undefined) {
        throw failures[0];
      }
    })();
    return closePromise;
  };

  const provider: ApiProvider = {
    id: () => nativeJudgeRoute,
    callApi: async (prompt, _context, options) => {
      if (called) {
        throw new Error('A grading operation cannot call the judge more than once.');
      }
      called = true;
      const signal = options?.abortSignal ?? input.signal;
      signal?.throwIfAborted();
      await writeJson(
        resolve(input.operationDirectory, 'request.json'),
        {
          prompt,
          outputSchema: verdictSchema,
          evidenceDirectory: resolve(input.evidenceDirectory),
        },
        input.credentials,
      );

      session = new CodexSession({
        command: [native.executable, 'app-server', '--listen', 'stdio://'],
        cwd: native.startup,
        env: environment,
        requestTimeoutMs: controlTimeoutMs,
        cleanupGraceMs,
        onServerRequest: (method) => {
          if (
            method === 'item/commandExecution/requestApproval' ||
            method === 'item/fileChange/requestApproval'
          ) {
            return { decision: 'decline' };
          }
          if (method === 'item/permissions/requestApproval') {
            return {
              permissions: {},
              scope: 'turn',
              strictAutoReview: true,
            };
          }
          throw new Error(`Native judge refused unsupported server request: ${method}`);
        },
        onRecord: async (record) => {
          records.push(record);
          writer.write(`${redact(JSON.stringify(record), input.credentials)}\n`);
          await writer.flush();
        },
      });

      await session.initialize();

      const before = listedSkills(
        await session.transport.request('skills/list', {
          cwds: [native.startup],
          forceReload: true,
        }),
      );

      for (const skill of before) {
        if (field(skill, 'scope') === 'system') {
          const path = text(field(skill, 'path'), 'Native system skill path');
          await session.transport.request('skills/config/write', { path, enabled: false });
        } else if (field(skill, 'enabled') === true) {
          throw new Error('Native judge discovered an undeclared non-system skill.');
        }
      }

      const after = listedSkills(
        await session.transport.request('skills/list', {
          cwds: [native.startup],
          forceReload: true,
        }),
      );

      if (after.some((skill) => field(skill, 'enabled') === true)) {
        throw new Error('Native judge still has an enabled skill.');
      }

      const effective = await session.transport.request('config/read', {
        cwd: native.startup,
        includeLayers: true,
      });

      await writeJson(
        resolve(input.operationDirectory, 'observed-config.json'),
        effective,
        input.credentials,
      );

      const effectiveConfig = protocolObject(field(protocolObject(effective), 'config'));
      if (field(effectiveConfig, 'project_doc_max_bytes') !== 0) {
        throw new Error('Native judge did not disable project instruction loading.');
      }

      const readableEvidence = await firstEvidenceFile(native.evidence);
      const expectedEvidenceHash =
        readableEvidence === null ? null : await sha256(readableEvidence);

      const expectedPrefix =
        readableEvidence === null
          ? null
          : new TextDecoder().decode((await Bun.file(readableEvidence).bytes()).slice(0, 64));

      const evidenceRead = await commandProbe(
        session,
        readableEvidence === null
          ? ['/bin/ls', '-A', native.evidence]
          : ['/usr/bin/head', '-c', '64', readableEvidence],
        native.startup,
      );

      const { stdout: evidenceReadOutput } = evidenceRead;
      if (
        exitCode(evidenceRead) !== 0 ||
        typeof evidenceReadOutput !== 'string' ||
        (expectedPrefix !== null && evidenceReadOutput !== expectedPrefix)
      ) {
        throw new Error('Native judge cannot read the frozen evidence root.');
      }

      const deniedWritePath = resolve(native.evidence, `.judge-write-${randomUUID()}`);
      const deniedWriteValue = `denied-write-${randomUUID()}`;

      const evidenceWrite = await commandProbe(
        session,
        ['/bin/sh', '-c', 'printf %s "$2" > "$1"', '_judge', deniedWritePath, deniedWriteValue],
        native.startup,
      );

      const deniedWriteExists = await Bun.file(deniedWritePath).exists();
      if (deniedWriteExists) {
        await unlink(deniedWritePath);
      }

      const { stderr: evidenceWriteError } = evidenceWrite;
      if (
        exitCode(evidenceWrite) === 0 ||
        deniedWriteExists ||
        typeof evidenceWriteError !== 'string' ||
        !/denied|not permitted/iu.test(evidenceWriteError)
      ) {
        throw new Error('Native judge can modify the frozen evidence root.');
      }

      const privatePath = resolve(native.operation, `.judge-private-${randomUUID()}`);
      const privateValue = `private-${randomUUID()}`;
      await Bun.write(privatePath, privateValue);
      let privateRead: Record<string, unknown>;

      try {
        privateRead = await commandProbe(session, ['/bin/cat', privatePath], native.startup);
      } finally {
        await unlink(privatePath);
      }

      const { stderr: privateReadError } = privateRead;
      if (
        exitCode(privateRead) === 0 ||
        typeof privateReadError !== 'string' ||
        !/denied|not permitted/iu.test(privateReadError)
      ) {
        throw new Error('Native judge can read private grading state outside the evidence root.');
      }

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

      let network: Record<string, unknown>;

      try {
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
          native.startup,
        );
      } finally {
        server.stop(true);
      }

      const { stderr: networkError } = network;
      if (
        exitCode(network) === 0 ||
        networkRequests !== 0 ||
        typeof networkError !== 'string' ||
        !/connect|denied|not permitted/iu.test(networkError)
      ) {
        throw new Error('Native judge tool network access is not blocked.');
      }
      await writeJson(
        resolve(input.operationDirectory, 'native-probes.json'),
        {
          evidenceRead: {
            ...evidenceRead,
            path: readableEvidence ?? native.evidence,
            sha256: expectedEvidenceHash,
            prefixBytes: readableEvidence === null ? null : 64,
          },
          evidenceWrite: {
            ...evidenceWrite,
            path: deniedWritePath,
            created: deniedWriteExists,
          },
          privateRead,
          network: {
            ...network,
            expectedValue: networkValue,
            observedRequests: networkRequests,
          },
        },
        input.credentials,
      );

      const thread = await session.startThread({
        cwd: native.startup,
        permissions: permissionName,
        model: judgeModel,
      });

      observed = {
        model: thread.model,
        reasoningEffort: thread.reasoningEffort,
        route: nativeJudgeRoute,
        definitionId: judgeDefinitionId,
      };

      usageThread = { id: thread.id, model: thread.model };
      const { activePermissionProfile, instructionSources } = thread.response;
      const activeProfile = protocolObject(activePermissionProfile);
      if (field(activeProfile, 'id') !== permissionName) {
        throw new Error('Codex did not apply the native judge permission profile.');
      }
      if (!Array.isArray(instructionSources) || instructionSources.length !== 0) {
        throw new Error('Native judge loaded unexpected instruction sources.');
      }
      if (
        thread.model !== judgeModel ||
        thread.reasoningEffort !== judgeReasoningEffort ||
        thread.modelProvider !== native.providerId
      ) {
        throw new Error(
          'Native judge effective model, effort or provider differs from the request.',
        );
      }

      const turn = await session.runTurn(prompt, {
        outputSchema: verdictSchema,
        ...(signal === undefined ? {} : { signal }),
      });

      refreshObservations();
      await writeJson(
        resolve(input.operationDirectory, 'response.json'),
        turn.response,
        input.credentials,
      );

      if (turn.status !== 'completed') {
        throw new Error(`Native judge turn ended with status ${turn.status}.`);
      }

      const verdict = parseVerdictOutput(nativeOutput(turn.response));

      return providerResponse(verdict, {
        model: observed.model,
        requestedReasoningEffort: judgeReasoningEffort,
        observedReasoningEffort: observed.reasoningEffort,
        route: nativeJudgeRoute,
      });
    },
    cleanup: close,
  };

  return {
    provider,
    get observations() {
      return observations;
    },
    get observed() {
      return observed;
    },
    close,
  };
}
