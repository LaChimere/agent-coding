import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadPriceBook } from '../../src/results/pricing.ts';
import { accountResources, type IResourceOperation } from '../../src/results/resources.ts';

const project = resolve(import.meta.dir, '../..');

function operation(
  id: string,
  model: string,
  input: number,
  cachedInput: number,
): IResourceOperation {
  return {
    id,
    trialId: id,
    phase: 'candidate',
    status: 'completed',
    usesModel: true,
    startedAt: 0,
    endedAt: 1,
    observations: [
      {
        id,
        actorId: id,
        model,
        threadId: null,
        turnId: id,
        kind: 'delta',
        observedAt: 1,
        evidenceSource: `responses/${id}.json`,
        includedActorIds: [],
        usage: {
          input,
          cachedInput,
          output: 1000,
          reasoningOutput: 400,
        },
      },
    ],
  };
}

test('official model-specific rates distinguish cached reads and output without counting reasoning twice', async () => {
  const priceBook = await loadPriceBook(project);

  const operations = [
    operation('astra', 'gpt-6-astra', 100000, 40000),
    operation('luna', 'gpt-5.6-luna', 200000, 100000),
  ];

  const report = accountResources({
    operations,
    selectedOperationIds: operations.map((item) => item.id),
    priceBook,
  });

  // Official Standard reference: Astra 0.60 + 0.04 + 0.05; Luna 0.02 + 0.002 + 0.0012.
  expect(report.estimatedCost.value).toBeCloseTo(0.7132, 10);
  expect(report.estimatedCost).toMatchObject({
    coverage: 'partial',
    currency: 'USD',
    version: priceBook.version,
  });

  expect(report.estimatedCost.reason).toContain('Pricing conditions');
  expect(priceBook.uncertainties?.join(' ')).toContain('cache-write');
  expect(report.actualCost).toMatchObject({ value: null, coverage: 'unknown' });
  expect(
    priceBook.references?.every((url) => url.startsWith('https://developers.openai.com/')),
  ).toBeTrue();
});

test('an unlisted model remains unknown instead of inheriting another model rate', async () => {
  const priceBook = await loadPriceBook(project);

  for (const model of ['unlisted-model', 'constructor', '__proto__']) {
    const candidate = operation('unknown', model, 100, 0);

    const report = accountResources({
      operations: [candidate],
      selectedOperationIds: [candidate.id],
      priceBook,
    });

    expect(report.estimatedCost).toMatchObject({ value: null, coverage: 'unknown' });
    expect(report.estimatedCost.reason).toContain('No price mapping exists');
  }

  const candidate = operation('bad-rate', 'gpt-6-astra', 100, 0);

  const report = accountResources({
    operations: [candidate],
    selectedOperationIds: [candidate.id],
    priceBook: {
      ...priceBook,
      rates: {},
      modelMapping: { 'gpt-6-astra': 'constructor' },
    },
  });

  expect(report.estimatedCost).toMatchObject({ value: null, coverage: 'unknown' });
  expect(report.estimatedCost.reason).toContain('has no rate definition');
});

test('explicit custom price snapshots are validated at load without accessing a provider', async () => {
  const directory = await mkdtemp(resolve('.cache/pricing-test-'));
  try {
    const file = resolve(directory, 'custom.json');

    const valid = {
      source: 'operator fixture',
      version: 'custom',
      currency: 'USD',
      rates: {},
      modelMapping: {},
    };

    await Bun.write(file, JSON.stringify(valid));

    expect(await loadPriceBook(project, file)).toEqual(valid);
    await Bun.write(
      file,
      JSON.stringify({
        ...valid,
        rates: {
          bad: {
            input: -1,
            output: 2,
            cachedInput: 0,
          },
        },
      }),
    );

    await expect(loadPriceBook(project, file)).rejects.toThrow('must not be negative');
    await Bun.write(file, JSON.stringify({ ...valid, uncertainties: 'not-an-array' }));

    await expect(loadPriceBook(project, file)).rejects.toThrow('must be an array');
  } finally {
    await rm(directory, { recursive: true });
  }
});
