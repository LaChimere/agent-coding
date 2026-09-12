import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ApiProvider, TestCase } from 'promptfoo';
import { loadPromptfoo } from './library.ts';

export interface IPromptfooBatch {
  directory: string;
  providers: readonly ApiProvider[];
  tests: readonly TestCase[];
  concurrency: number;
  repetitions: number;
  signal?: AbortSignal;
}

export interface IPromptfooArtifacts {
  evaluationId: string;
  rows: number;
  jsonPath: string;
  htmlPath: string;
  durationMs: number;
}

let processRunDirectory: string | undefined;

/** A fresh worker process owns each run because Promptfoo caches its database connection. */
export async function runPromptfooBatch(input: IPromptfooBatch): Promise<IPromptfooArtifacts> {
  if (!Number.isSafeInteger(input.concurrency) || input.concurrency < 1) {
    throw new Error('Concurrency must be a positive integer.');
  }
  if (!Number.isSafeInteger(input.repetitions) || input.repetitions < 1) {
    throw new Error('Repetitions must be a positive integer.');
  }
  if (input.providers.length === 0 || input.tests.length === 0) {
    throw new Error('A batch requires at least one provider and one case.');
  }
  if (
    input.tests.some((test) => {
      const { task } = test.vars ?? {};
      return typeof task !== 'string';
    })
  ) {
    throw new Error('Every case must provide a task string.');
  }
  if (processRunDirectory !== undefined) {
    throw new Error('A process can execute only one batch; start a fresh run worker.');
  }

  const directory = resolve(input.directory);
  processRunDirectory = directory;
  await mkdir(directory, { recursive: true });
  // An existing native directory may contain a partial run; never overwrite or replay it.
  const nativeDirectory = resolve(directory, 'promptfoo');
  await mkdir(nativeDirectory);

  const environment: [string, string][] = [
    ['PROMPTFOO_CONFIG_DIR', nativeDirectory],
    ['PROMPTFOO_DISABLE_TELEMETRY', '1'],
    ['PROMPTFOO_DISABLE_UPDATE', '1'],
    ['PROMPTFOO_EVAL_TIMEOUT_MS', '0'],
    ['PROMPTFOO_MAX_EVAL_TIME_MS', '0'],
    ['PROMPTFOO_TRACING_ENABLED', 'false'],
    ['PROMPTFOO_AUTHOR', 'agent-coding-evals'],
  ];

  for (const [name, value] of environment) {
    process.env[name] = value;
  }

  const jsonPath = resolve(directory, 'promptfoo-results.json');
  const htmlPath = resolve(directory, 'promptfoo-results.html');
  const { evaluate } = await loadPromptfoo();
  const started = performance.now();

  const providers: ApiProvider[] = input.providers.map((provider) => ({
    ...provider,
    id: () => provider.id(),
    callApi: async (prompt, context, options) => {
      if (input.signal?.aborted) {
        return {
          output: '',
          error: 'Evaluation interrupted before this row started.',
          metadata: { executionStatus: 'not-run' },
        };
      }

      const signal =
        input.signal === undefined
          ? options?.abortSignal
          : options?.abortSignal === undefined
            ? input.signal
            : AbortSignal.any([input.signal, options.abortSignal]);

      return provider.callApi(prompt, context, {
        ...options,
        ...(signal === undefined ? {} : { abortSignal: signal }),
      });
    },
  }));

  const record = await evaluate(
    {
      prompts: ['{{task}}'],
      providers,
      tests: [...input.tests],
      writeLatestResults: true,
      sharing: false,
      author: 'agent-coding-evals',
      outputPath: [jsonPath, htmlPath],
    },
    {
      cache: false,
      maxConcurrency: input.concurrency,
      repeat: input.repetitions,
      timeoutMs: 0,
      maxEvalTimeMs: 0,
      showProgressBar: false,
      // Scheduler abort can return before in-flight callbacks finish. Owned work receives
      // the signal above; queued rows refuse work while normal scheduling drains and exports.
    },
  );

  const summary = await record.toEvaluateSummary();

  return {
    evaluationId: record.id,
    rows: summary.results.length,
    jsonPath,
    htmlPath,
    durationMs: performance.now() - started,
  };
}
