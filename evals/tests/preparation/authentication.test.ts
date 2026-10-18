import { expect, test } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveAuthentication } from '../../src/preparation/authentication.ts';

test('resolves an explicit JSON runtime reference and prefers an injected environment value', async () => {
  const root = await mkdtemp(resolve('.cache/authentication-test-'));
  await Bun.write(`${root}/auth.json`, JSON.stringify({ auth: { keys: ['fixture-only-value'] } }));
  const references = [
    { environment: 'EVAL_KEY', jsonFile: { path: '~/auth.json', pointer: '/auth/keys/0' } },
  ];
  const fromFile = await resolveAuthentication(references, {}, root);

  expect(Object.values(fromFile)).toEqual(['fixture-only-value']);

  const fromEnvironment = await resolveAuthentication(
    references,
    Object.fromEntries([['EVAL_KEY', 'injected-fixture-value']]),
    root,
  );

  expect(Object.values(fromEnvironment)).toEqual(['injected-fixture-value']);
});

test('fails on missing values and masks malformed credential file contents', async () => {
  const root = await mkdtemp(resolve('.cache/authentication-test-'));
  await Bun.write(`${root}/invalid.json`, '{"secret":"fixture-private-text",');

  await expect(
    resolveAuthentication([
      { environment: 'EVAL_KEY', jsonFile: { path: `${root}/invalid.json`, pointer: '/secret' } },
    ]),
  ).rejects.toThrow('Cannot read the configured authentication JSON file for EVAL_KEY.');

  await expect(resolveAuthentication([{ environment: 'MISSING_KEY' }], {})).rejects.toThrow(
    'Missing authentication value',
  );
  await Bun.write(`${root}/missing.json`, '{}');

  await expect(
    resolveAuthentication([
      { environment: 'EVAL_KEY', jsonFile: { path: `${root}/missing.json`, pointer: '/absent' } },
    ]),
  ).rejects.toThrow('Missing authentication value');
});

test('reads only the declared dotenv key without evaluating shell expressions', async () => {
  const root = await mkdtemp(resolve('.cache/authentication-env-test-'));
  await Bun.write(
    `${root}/credentials.env`,
    "export EVAL_KEY='$(not-a-command)'\nOTHER_KEY=not-requested\n",
  );
  const references = [{ environment: 'EVAL_KEY', envFile: '~/credentials.env' }];

  const injected = Object.fromEntries([['EVAL_KEY', 'injected-value']]);
  expect(Object.entries(await resolveAuthentication(references, {}, root))).toEqual([
    ['EVAL_KEY', '$(not-a-command)'],
  ]);
  expect(await resolveAuthentication(references, injected, root)).toEqual(injected);
  expect(
    await resolveAuthentication(
      [{ environment: 'EVAL_KEY', envFile: '~/absent.env' }],
      injected,
      root,
    ),
  ).toEqual(injected);
});

test('dotenv source errors and ambiguous fallback configuration do not leak values', async () => {
  const root = await mkdtemp(resolve('.cache/authentication-env-test-'));
  await Bun.write(`${root}/credentials.env`, 'OTHER_KEY=fixture-private-value\n');

  await expect(
    resolveAuthentication([{ environment: 'EVAL_KEY', envFile: '~/absent.env' }], {}, root),
  ).rejects.toThrow('Cannot read the configured authentication env file for EVAL_KEY.');
  await expect(
    resolveAuthentication([{ environment: 'EVAL_KEY', envFile: '~/credentials.env' }], {}, root),
  ).rejects.toThrow('Missing authentication value for EVAL_KEY.');
  await expect(
    resolveAuthentication(
      [
        {
          environment: 'EVAL_KEY',
          envFile: '~/credentials.env',
          jsonFile: { path: '~/auth.json', pointer: '/key' },
        },
      ],
      {},
      root,
    ),
  ).rejects.toThrow('Multiple authentication file sources');
});
