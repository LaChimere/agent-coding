import { afterEach, beforeAll, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gradeRubric, type IGradeRubricInput } from '../../src/grading/rubric.ts';

const roots: string[] = [];
const originalFetch = globalThis.fetch;

function replaceFetch(
  handler: (
    request: Parameters<typeof fetch>[0],
    options: Parameters<typeof fetch>[1],
  ) => Promise<Response>,
): void {
  globalThis.fetch = new Proxy(originalFetch, {
    apply(_target, _receiver, argumentsList: Parameters<typeof fetch>) {
      return handler(argumentsList[0], argumentsList[1]);
    },
  });
}

beforeAll(() => {
  Object.assign(
    process.env,
    Object.fromEntries([
      ['PROMPTFOO_DISABLE_TELEMETRY', '1'],
      ['PROMPTFOO_DISABLE_UPDATE', '1'],
      ['PROMPTFOO_TRACING_ENABLED', 'false'],
    ]),
  );
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(): Promise<{
  root: string;
  input: Omit<IGradeRubricInput, 'id' | 'operationDirectory'>;
}> {
  const root = await mkdtemp(resolve('.cache/rubric-test-'));
  roots.push(root);
  const profileDirectory = resolve(root, 'profile');
  const evidenceDirectory = resolve(root, 'evidence');
  await Promise.all([mkdir(profileDirectory), mkdir(evidenceDirectory)]);
  await Bun.write(
    resolve(profileDirectory, 'config.toml'),
    [
      'model_provider = "fixture-provider"',
      '',
      '[model_providers.fixture-provider]',
      'name = "Fixture"',
      'base_url = "https://gateway.invalid/v1"',
      'env_key = "JUDGE_SECRET"',
      'wire_api = "responses"',
      '',
    ].join('\n'),
  );

  await Bun.write(resolve(evidenceDirectory, 'artifact.txt'), 'fixture artifact\n');

  return {
    root,
    input: {
      trialId: 'trial-1',
      method: 'text-rubric',
      rubric: 'The evidence must prove the fixture passed.',
      evidence: 'artifact.txt passed; preserve {{ dangerous_template }} literally',
      evidenceDirectory,
      codexExecutable: process.execPath,
      profileDirectory,
      credentials: Object.fromEntries([['JUDGE_SECRET', 'super-secret-fixture']]),
    },
  };
}

function apiResponse(
  verdict: Record<string, unknown>,
  usage?: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'response-1',
    status: 'completed',
    error: null,
    ...Object.fromEntries([['incomplete_details', null]]),
    model: 'gpt-6-astra',
    reasoning: { effort: 'high' },
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify(verdict) }],
      },
    ],
    ...(usage === undefined ? {} : { usage }),
    ...overrides,
  };
}

test('grades text evidence through the public Promptfoo rubric assertion and records API usage', async () => {
  const { root, input } = await fixture();
  const requests: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  replaceFetch(async (request, options) => {
    requests.push({
      url: request instanceof Request ? request.url : String(request),
      headers: new Headers(options?.headers),
      body: JSON.parse(String(options?.body)) as Record<string, unknown>,
    });
    return Response.json(
      apiResponse(
        {
          status: 'passed',
          pass: true,
          score: 1,
          reason: 'The supplied record directly proves the requirement.',
          evidence: ['artifact.txt#L1'],
        },
        Object.fromEntries([
          ['input_tokens', 27],
          ['output_tokens', 8],
          ['input_tokens_details', Object.fromEntries([['cached_tokens', 5]])],
          ['output_tokens_details', Object.fromEntries([['reasoning_tokens', 3]])],
        ]),
      ),
    );
  });

  const operationDirectory = resolve(root, 'grade-passed');

  const result = await gradeRubric({
    ...input,
    id: 'grade-passed',
    operationDirectory,
  });

  expect(result).toMatchObject({
    status: 'passed',
    evidence: ['artifact.txt#L1'],
    error: null,
    grader: {
      model: 'gpt-6-astra',
      reasoningEffort: 'high',
      route: 'responses:fixture-provider',
    },
    operation: { status: 'completed', usesModel: true },
  });

  expect(result.operation.observations).toEqual([
    expect.objectContaining({
      usage: {
        input: 27,
        output: 8,
        cachedInput: 5,
        reasoningOutput: 3,
      },
      evidenceSource: `${resolve(operationDirectory, 'response.json')}#body/usage`,
    }),
  ]);

  expect(requests).toHaveLength(1);
  const request = requests[0];

  expect(request?.url).toBe('https://gateway.invalid/v1/responses');
  expect(request?.headers.get('authorization')).toBe('Bearer super-secret-fixture');
  expect(request?.body).toMatchObject({
    model: 'gpt-6-astra',
    reasoning: { effort: 'high' },
  });

  const { input: renderedInput } = request?.body ?? {};
  const rendered = String(renderedInput);

  expect(rendered).toContain('{{ dangerous_template }}');
  expect(rendered).toContain('untrusted data');
  expect(
    await Bun.file(resolve(operationDirectory, 'operation-started.json')).json(),
  ).toMatchObject({
    id: 'grade-passed',
    trialId: 'trial-1',
    phase: 'grading',
    usesModel: true,
    endedAt: null,
    status: 'running',
    observations: [],
  });

  const files = [
    'operation-started.json',
    'grading-input.json',
    'effective-config.json',
    'request.json',
    'response.json',
  ];

  for (const name of files) {
    const stored = await Bun.file(resolve(operationDirectory, name)).text();

    expect(stored).not.toContain('super-secret-fixture');
  }
});

test('keeps a valid unknown verdict distinct from grader errors and never invents missing usage', async () => {
  const { root, input } = await fixture();
  replaceFetch(async () =>
    Response.json(
      apiResponse({
        status: 'unknown',
        pass: false,
        score: 0,
        reason: 'The evidence does not establish the required behavior.',
        evidence: ['artifact.txt'],
      }),
    ),
  );

  const unknown = await gradeRubric({
    ...input,
    id: 'grade-unknown',
    operationDirectory: resolve(root, 'grade-unknown'),
  });

  expect(unknown).toMatchObject({
    status: 'unknown',
    error: null,
    operation: { status: 'completed' },
  });

  expect(unknown.operation.observations[0]?.usage).toEqual({
    input: null,
    output: null,
    cachedInput: null,
    reasoningOutput: null,
  });

  replaceFetch(async () =>
    Response.json(
      apiResponse({
        status: 'failed',
        pass: false,
        score: 0,
        reason: 'The supplied evidence contradicts the rubric.',
        evidence: ['artifact.txt#L1'],
      }),
    ),
  );

  const knownFailure = await gradeRubric({
    ...input,
    id: 'grade-failed',
    operationDirectory: resolve(root, 'grade-failed'),
  });

  expect(knownFailure).toMatchObject({
    status: 'failed',
    error: null,
    operation: { status: 'completed' },
  });

  replaceFetch(async () =>
    Response.json(
      apiResponse(
        {
          status: 'passed',
          pass: false,
          score: 0,
          reason: 'inconsistent fixture verdict',
          evidence: [],
        },
        Object.fromEntries([
          ['input_tokens', 10],
          ['output_tokens', 2],
        ]),
      ),
    ),
  );

  const failed = await gradeRubric({
    ...input,
    id: 'grade-error',
    operationDirectory: resolve(root, 'grade-error'),
  });

  expect(failed.status).toBe('unknown');
  expect(failed.error).toContain('disagree');
  expect(failed.operation).toMatchObject({ status: 'failed' });
  expect(failed.operation.observations[0]?.usage).toMatchObject({ input: 10, output: 2 });

  replaceFetch(async () =>
    Response.json(
      apiResponse(
        { error: 'gateway failure' },
        Object.fromEntries([
          ['input_tokens', 6],
          ['output_tokens', 1],
        ]),
      ),
      { status: 503 },
    ),
  );

  const serviceError = await gradeRubric({
    ...input,
    id: 'grade-service-error',
    operationDirectory: resolve(root, 'grade-service-error'),
  });

  expect(serviceError).toMatchObject({ status: 'unknown', operation: { status: 'failed' } });
  expect(serviceError.error).toContain('HTTP 503');
  expect(serviceError.operation.observations[0]?.usage).toMatchObject({ input: 6, output: 1 });
});

test('requires a completed Responses result with the exact judge identity', async () => {
  const { root, input } = await fixture();
  const usage = Object.fromEntries([
    ['input_tokens', 6],
    ['output_tokens', 1],
  ]);
  for (const [id, overrides, error] of [
    ['grade-api-failed', { status: 'failed', error: { message: 'model failed' } }, 'not completed'],
    [
      'grade-api-incomplete',
      {
        status: 'incomplete',
        ...Object.fromEntries([['incomplete_details', { reason: 'max_output_tokens' }]]),
      },
      'not completed',
    ],
    ['grade-api-missing-effort', { reasoning: undefined }, 'unobserved judge reasoning effort'],
  ] as const) {
    replaceFetch(async () =>
      Response.json(
        apiResponse(
          {
            status: 'passed',
            pass: true,
            score: 1,
            reason: 'fixture',
            evidence: ['artifact.txt#L1'],
          },
          usage,
          overrides,
        ),
      ),
    );

    const operationDirectory = resolve(root, id);

    const result = await gradeRubric({
      ...input,
      id,
      operationDirectory,
    });

    expect(result).toMatchObject({ status: 'unknown', operation: { status: 'failed' } });
    expect(result.error).toContain(error);
    expect(result.operation.observations[0]).toMatchObject({
      usage: { input: 6, output: 1 },
      evidenceSource: `${resolve(operationDirectory, 'response.json')}#body/usage`,
    });
  }
});

test('rejects decisive verdicts without evidence references', async () => {
  const { root, input } = await fixture();
  replaceFetch(async () =>
    Response.json(
      apiResponse({
        status: 'failed',
        pass: false,
        score: 0,
        reason: 'unsupported decision',
        evidence: [],
      }),
    ),
  );

  const result = await gradeRubric({
    ...input,
    id: 'grade-empty-evidence',
    operationDirectory: resolve(root, 'grade-empty-evidence'),
  });

  expect(result.status).toBe('unknown');
  expect(result.error).toContain('requires concrete evidence references');
});

test('refuses to overwrite an existing grading operation before calling a model', async () => {
  const { root, input } = await fixture();
  const operationDirectory = resolve(root, 'existing');
  await mkdir(operationDirectory);
  let calls = 0;
  replaceFetch(async () => {
    calls += 1;
    return Response.json({});
  });

  await expect(
    gradeRubric({
      ...input,
      id: 'existing',
      operationDirectory,
    }),
  ).rejects.toThrow();

  expect(calls).toBe(0);
});

test('refuses overlapping roots before changing the frozen evidence inventory', async () => {
  const { input } = await fixture();
  const before = (await readdir(input.evidenceDirectory, { recursive: true })).sort();

  for (const method of ['text-rubric', 'artifact-rubric'] as const) {
    await expect(
      gradeRubric({
        ...input,
        method,
        id: `nested-${method}`,
        operationDirectory: resolve(input.evidenceDirectory, `nested-${method}`),
      }),
    ).rejects.toThrow('separate roots');
  }

  expect((await readdir(input.evidenceDirectory, { recursive: true })).sort()).toEqual(before);
});
