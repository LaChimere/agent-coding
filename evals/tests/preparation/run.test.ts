import { expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IRepositoryCase } from '../../src/corpus/cases.ts';
import { freezeRun, type IRunRequest } from '../../src/preparation/run.ts';

async function setup(): Promise<{ root: string; input: IRunRequest }> {
  const root = await mkdtemp(resolve('.cache/freeze-test-'));
  const project = resolve(root, 'evals');
  const candidate = resolve(root, 'candidate');

  for (const path of ['src/grading', 'cases', 'fixtures', 'profiles/default', 'pricing']) {
    await mkdir(resolve(project, path), { recursive: true });
  }

  for (const path of [
    'skills/example',
    'plugins/example',
    'config/codex/agents',
    '.agents/plugins',
  ]) {
    await mkdir(resolve(candidate, path), { recursive: true });
  }

  await Bun.write(
    resolve(project, 'cases/native.json'),
    JSON.stringify(
      (
        (await Bun.file(
          resolve(import.meta.dir, '../../cases/native-interaction.json'),
        ).json()) as IRepositoryCase[]
      ).filter((item) => item.metadata.id === 'native/scripted-context'),
    ),
  );

  await Bun.write(resolve(project, 'src/grading/assertion.ts'), 'export default () => true;\n');
  await Bun.write(resolve(project, 'profiles/default/config.toml'), 'model="fixture"\n');
  await Bun.write(resolve(project, 'package.json'), '{}\n');
  await Bun.write(resolve(project, 'bun.lock'), '{}\n');
  await Bun.write(
    resolve(project, 'pricing/openai-standard.json'),
    JSON.stringify({
      source: 'fixture rates',
      version: 'one',
      currency: 'USD',
      rates: {
        fixture: {
          input: 1,
          output: 2,
          cachedInput: 0.1,
        },
      },
      modelMapping: { fixture: 'fixture' },
    }),
  );

  await Bun.write(resolve(candidate, 'skills/example/SKILL.md'), 'subject v1\n');
  await chmod(resolve(candidate, 'skills/example/SKILL.md'), 0o750);
  await Bun.write(resolve(candidate, 'config/codex/config.toml'), 'model="candidate"\n');
  await Bun.write(resolve(candidate, '.agents/plugins/marketplace.json'), '{}\n');
  const executable = resolve(root, 'codex');
  await Bun.write(executable, '#!/bin/sh\nprintf "codex-cli fixture\\n"\n');
  await chmod(executable, 0o755);

  return {
    root,
    input: {
      project,
      candidates: [candidate],
      selectedCases: [],
      profile: 'default',
      concurrency: 2,
      repetitions: 2,
      codexExecutable: executable,
    },
  };
}

test('freezes nested runtime roots, private grading inputs, bytes and modes before execution', async () => {
  const { root, input } = await setup();
  try {
    const { directory, manifest } = await freezeRun(input);

    expect(manifest.trials).toHaveLength(2);
    expect(new Set(manifest.trials.map((trial) => trial.id)).size).toBe(2);
    expect(manifest.codexVersion).toBe('codex-cli fixture');
    expect(manifest.priceBook).toMatchObject({ source: 'fixture rates', version: 'one' });
    await Bun.write(resolve(input.project, 'pricing/openai-standard.json'), '{}');

    expect(
      await Bun.file(resolve(directory, 'private/pricing/openai-standard.json')).json(),
    ).toEqual(manifest.priceBook);
    expect(
      manifest.candidates[0]?.inventory.entries.find(
        (entry) => entry.path === 'skills/example/SKILL.md',
      )?.mode,
    ).toBe(0o750);

    await Bun.write(
      resolve(input.candidates[0] ?? '', 'skills/example/SKILL.md'),
      'later subject\n',
    );

    expect(
      await Bun.file(
        resolve(directory, 'inputs/candidate-1/runtime/skills/example/SKILL.md'),
      ).text(),
    ).toBe('subject v1\n');

    expect(
      await Bun.file(
        resolve(directory, 'inputs/candidate-1/runtime/config/codex/config.toml'),
      ).exists(),
    ).toBeTrue();

    expect(
      await Bun.file(
        resolve(directory, 'inputs/candidate-1/runtime/.agents/plugins/marketplace.json'),
      ).exists(),
    ).toBeTrue();

    expect(
      await Bun.file(resolve(directory, 'inputs/candidate-1/runtime/cases/native.json')).exists(),
    ).toBeFalse();
    expect(await Bun.file(resolve(directory, 'private/cases/native.json')).exists()).toBeTrue();
    const operation = await Bun.file(
      resolve(directory, 'operations', `${manifest.id}-freeze/record.json`),
    ).json();

    expect(operation).toMatchObject({
      usesModel: false,
      phase: 'preparation',
      status: 'completed',
    });
  } finally {
    await rm(root, { recursive: true });
  }
});

test('preserves a failed input-freeze record without following a runtime symlink', async () => {
  const { root, input } = await setup();
  try {
    await symlink(
      resolve(root, 'evals/cases/native.json'),
      resolve(root, 'candidate/skills/example/private-link'),
    );

    await expect(freezeRun(input)).rejects.toThrow('input-freeze evidence');
    const errors = [];

    for await (const path of new Bun.Glob('out/runs/*/freeze-error.json').scan(input.project)) {
      errors.push(await Bun.file(resolve(input.project, path)).json());
    }

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ usesModel: false, status: 'failed' });
  } finally {
    await rm(root, { recursive: true });
  }
});

test('rejects an invalid programmatic rule before creating a runnable manifest', async () => {
  const { root, input } = await setup();
  try {
    const path = resolve(input.project, 'cases/native.json');
    const cases = (await Bun.file(path).json()) as IRepositoryCase[];
    const check = cases[0]?.assert[0];
    if (check === undefined) {
      throw new Error('Missing case fixture.');
    }
    check.config = { ...check.config, rule: { type: 'unknown-rule' } };
    await Bun.write(path, JSON.stringify(cases));

    await expect(freezeRun(input)).rejects.toThrow('programmatic rule');
    expect(
      await Array.fromAsync(new Bun.Glob('out/runs/*/manifest.json').scan(input.project)),
    ).toEqual([]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('rejects invalid counts and profiles and preserves a version-query failure', async () => {
  const { root, input } = await setup();
  try {
    await expect(freezeRun({ ...input, concurrency: 0 })).rejects.toThrow('positive');
    await expect(freezeRun({ ...input, candidates: [] })).rejects.toThrow('candidate');
    await expect(freezeRun({ ...input, profile: '../outside' })).rejects.toThrow('profile');
    await Bun.write(input.codexExecutable, '#!/bin/sh\necho broken >&2\nexit 9\n');

    await expect(freezeRun(input)).rejects.toThrow('version check failed');
  } finally {
    await rm(root, { recursive: true });
  }
});
