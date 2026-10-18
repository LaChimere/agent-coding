import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadCases } from '../../src/corpus/cases.ts';
import { selectCollection } from '../../src/corpus/collections.ts';
import { parseRule } from '../../src/grading/programmatic.ts';

const project = resolve(import.meta.dir, '../..');

test('the active engineering collection grades outcomes while retaining the legacy baseline', async () => {
  const current = await selectCollection(project);
  const cases = await loadCases(project, current);
  const legacy = await Bun.file(resolve(project, 'collections.legacy-v1.json')).json();

  expect(current.caseRoot).toBe('cases/engineering-v1');
  expect(cases).toHaveLength(16);
  expect(cases.every((item) => item.definition.metadata.assessment === 'outcome')).toBeTrue();
  expect(cases.every((item) => item.definition.metadata.requiredSkills.length === 0)).toBeTrue();
  expect(legacy.collections.development.caseRoot).toBe('cases');
  expect(legacy.collections.holdout).toEqual(
    (await Bun.file(resolve(project, 'collections.json')).json()).collections.holdout,
  );
});

test.each([
  ['engineering/cold-start-exporter', 'csv-cli'],
  ['engineering/fresh-context-handoff', 'handoff-correctness'],
])(
  '%s CLI oracle rejects empty-field loss and accepts alternative valid quoting',
  async (caseId, metric) => {
    const [item] = await loadCases(project, await selectCollection(project), [caseId]);
    if (item === undefined) {
      throw new Error(`Case ${caseId} for metric ${metric} is missing.`);
    }
    const assertion = item.definition.assert.find((check) => check.metric === metric);
    if (assertion === undefined) {
      throw new Error(`Case ${caseId} is missing the ${metric} CLI assertion.`);
    }
    const { rule: sourceRule } = assertion.config;
    const rule = parseRule(sourceRule);
    if (rule.type !== 'command') {
      throw new Error(`Case ${caseId} metric ${metric} needs an executable CLI oracle.`);
    }
    const root = await mkdtemp(resolve('.cache/engineering-oracle-'));

    try {
      for (const fixture of item.definition.metadata.fixture) {
        const target = resolve(root, fixture.target);
        await mkdir(dirname(target), { recursive: true });
        await Bun.write(target, Bun.file(resolve(project, 'fixtures', fixture.source)));
      }
      const verify = () =>
        Bun.spawn(rule.command, { cwd: root, stdout: 'ignore', stderr: 'ignore' }).exited;

      expect(await verify()).not.toBe(0);

      // This otherwise valid encoder loses the distinction between [] and [''].
      await Bun.write(
        resolve(root, 'format.mjs'),
        `export function formatCsvRow(fields) {
  return fields.map(value => /[",\\r\\n]/.test(value)
    ? '"' + value.replaceAll('"', '""') + '"' : value).join(',') + '\\r\\n';
}
`,
      );

      expect(await verify()).not.toBe(0);

      // Quoting every field is valid; the oracle must not require the minimal-quoting implementation.
      await Bun.write(
        resolve(root, 'format.mjs'),
        `export function formatCsvRow(fields) {
  return fields.map(value => '"' + value.replaceAll('"', '""') + '"').join(',') + '\\r\\n';
}
`,
      );

      expect(await verify()).toBe(0);
    } finally {
      await rm(root, { recursive: true });
    }
  },
);

test('local release evidence requires the actual immutable artifact and a post-deploy execution', async () => {
  const [item] = await loadCases(project, await selectCollection(project), [
    'engineering/authorized-local-release',
  ]);
  if (item === undefined) {
    throw new Error('Local release case is missing.');
  }
  const assertion = item.definition.assert.find((check) => check.metric === 'deployed-artifact');
  if (assertion === undefined) {
    throw new Error('Local release artifact assertion is missing.');
  }
  const { rule: sourceRule } = assertion.config;
  const rule = parseRule(sourceRule);
  if (rule.type !== 'command') {
    throw new Error('Local release needs an executable artifact check.');
  }
  const root = await mkdtemp(resolve('.cache/release-oracle-'));
  try {
    for (const fixture of item.definition.metadata.fixture) {
      const target = resolve(root, fixture.target);
      await mkdir(dirname(target), { recursive: true });
      await Bun.write(target, Bun.file(resolve(project, 'fixtures', fixture.source)));
    }
    const run = (command: string[]) =>
      Bun.spawn(command, { cwd: root, stdout: 'ignore', stderr: 'ignore' }).exited;

    expect(await run(rule.command)).not.toBe(0);
    expect(await run([process.execPath, 'release.mjs', 'status'])).toBe(0);
    expect(await Bun.file(resolve(root, 'deployed/events.jsonl')).exists()).toBeFalse();
    expect(await run([process.execPath, 'release.mjs', 'deploy', 'v2'])).toBe(0);
    expect(await run(rule.command)).not.toBe(0);
    expect(await run([process.execPath, 'release.mjs', 'verify'])).toBe(0);
    expect(await run([process.execPath, 'release.mjs', 'deploy', 'v2'])).toBe(0);
    expect(await run(rule.command)).toBe(0);

    await Bun.write(resolve(root, 'deployed/app.mjs'), "console.log('wrong artifact');\n");
    expect(await run(rule.command)).not.toBe(0);
  } finally {
    await rm(root, { recursive: true });
  }
});
