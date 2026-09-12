import { expect, test } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ApiProvider, TestCase } from 'promptfoo';
import { type IPromptfooBatch, runPromptfooBatch } from '../../src/promptfoo/batch.ts';

interface INativeExport {
  results: {
    results: {
      response: { metadata: { caseIndex: number; repeatIndex: number } };
      gradingResult: { componentResults: { metadata?: { status?: string } }[] };
    }[];
    stats: { successes: number; failures: number };
  };
}

test('Bun executes a real Promptfoo batch, retains metadata and exports into its own directory', async () => {
  const directory = await mkdtemp(resolve('.cache/promptfoo-batch-test-'));
  const calls: string[] = [];
  let active = 0;
  let maximumActive = 0;

  const provider: ApiProvider = {
    id: () => 'deterministic-batch-test',
    callApi: async (prompt, context) => {
      if (context?.testIdx === undefined || context.repeatIndex === undefined) {
        throw new Error('Promptfoo did not provide the planned row identity.');
      }
      calls.push(`${context.testIdx}:${context.repeatIndex}`);
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Bun.sleep(5);
      active -= 1;

      return {
        output: prompt.toUpperCase(),
        metadata: { caseIndex: context.testIdx, repeatIndex: context.repeatIndex },
      };
    },
  };

  const tests: TestCase[] = [
    {
      vars: { task: 'alpha' },
      assert: [{ type: 'equals', value: 'ALPHA' }],
    },
    {
      vars: { task: 'beta' },
      assert: [
        { type: 'equals', value: 'BETA' },
        {
          type: 'javascript',
          value: () => ({
            pass: false,
            score: 0,
            reason: 'Evidence is insufficient for this separate judgment.',
            metadata: { status: 'unknown' },
          }),
        },
      ],
    },
  ];

  const input: IPromptfooBatch = {
    directory,
    providers: [provider],
    tests,
    concurrency: 2,
    repetitions: 2,
  };

  for (const override of [
    { concurrency: 0 },
    { repetitions: 1.5 },
    { providers: [] },
    { tests: [] },
  ]) {
    await expect(runPromptfooBatch({ ...input, ...override })).rejects.toThrow();
  }

  await expect(runPromptfooBatch({ ...input, tests: [{ vars: {} }] })).rejects.toThrow(
    'task string',
  );

  // No provider network access is needed here. Detect rather than forward any library request.
  const attemptedRequests: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = new Proxy(originalFetch, {
    apply(_target, _receiver, args: Parameters<typeof fetch>) {
      const [request] = args;
      attemptedRequests.push(request instanceof Request ? request.url : String(request));
      return Promise.reject(
        new Error('Unexpected network request during deterministic batch test'),
      );
    },
  });

  const environmentKeys = [
    'PROMPTFOO_CONFIG_DIR',
    'PROMPTFOO_DISABLE_TELEMETRY',
    'PROMPTFOO_DISABLE_UPDATE',
    'PROMPTFOO_EVAL_TIMEOUT_MS',
    'PROMPTFOO_MAX_EVAL_TIME_MS',
    'PROMPTFOO_TRACING_ENABLED',
    'PROMPTFOO_AUTHOR',
  ];

  const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));

  for (const name of ['PROMPTFOO_EVAL_TIMEOUT_MS', 'PROMPTFOO_MAX_EVAL_TIME_MS']) {
    process.env[name] = '1';
  }

  try {
    const result = await runPromptfooBatch(input);

    expect(result.rows).toBe(4);
    expect(new Set(calls).size).toBe(4);
    expect(calls).toHaveLength(4);
    expect(maximumActive).toBe(2);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(await Bun.file(result.htmlPath).text()).toContain('<html');
    const exported = (await Bun.file(result.jsonPath).json()) as INativeExport;

    expect(exported.results.stats).toMatchObject({ successes: 2, failures: 2 });
    expect(exported.results.results).toHaveLength(4);
    const unknown = exported.results.results
      .flatMap((row) => row.gradingResult.componentResults)
      .filter((check) => check.metadata?.status === 'unknown');

    expect(unknown).toHaveLength(2);
    expect(attemptedRequests).toEqual([]);
    const { PROMPTFOO_CONFIG_DIR: configDirectory, PROMPTFOO_EVAL_TIMEOUT_MS: timeout } =
      process.env;

    expect(configDirectory).toBe(resolve(directory, 'promptfoo'));
    expect(timeout).toBe('0');
    await expect(runPromptfooBatch(input)).rejects.toThrow('only one batch');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of originalEnvironment) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
