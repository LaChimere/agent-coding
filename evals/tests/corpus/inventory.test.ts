import { expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { loadCases } from '../../src/corpus/cases.ts';
import { selectCollection } from '../../src/corpus/collections.ts';

test('the current corpus is valid and every bundled fixture is used', async () => {
  const project = resolve(import.meta.dir, '../..');
  const cases = await loadCases(project, await selectCollection(project));
  const sessionContext = await loadCases(project, {
    caseRoot: 'cases/v5',
    fixtureRoot: 'fixtures',
  });
  const referenced = new Set([
    ...cases.flatMap((item) => item.definition.metadata.fixture.map((fixture) => fixture.source)),
    ...sessionContext.flatMap((item) =>
      item.definition.metadata.fixture.map((fixture) => fixture.source),
    ),
  ]);
  const files = [
    ...new Bun.Glob('**/*').scanSync({ cwd: resolve(project, 'fixtures'), onlyFiles: true }),
  ];

  expect([...referenced].sort()).toEqual(files.sort());
});

test('current daily tasks retain the eight additional public-boundary cases', async () => {
  const project = resolve(import.meta.dir, '../..');
  const prospective = await loadCases(project, { caseRoot: 'cases/v5', fixtureRoot: 'fixtures' });
  const authored = prospective.filter((item) => item.definition.metadata.group === 'natural-v4');

  expect(authored).toHaveLength(8);
  const families = new Map<string, number>();
  for (const item of authored) {
    const { metadata, assert: assertions } = item.definition;
    expect(metadata.assessment).toBe('outcome');
    expect(metadata.requiredSkills).toEqual([]);
    expect(metadata.execution.gitBaseline).toEqual(
      metadata.fixture.map((binding) => binding.target),
    );
    families.set(metadata.workFamily ?? '', (families.get(metadata.workFamily ?? '') ?? 0) + 1);
    expect(
      assertions.some(
        (check) =>
          check.metric === 'authorization' &&
          check.config.core &&
          check.config.method === 'artifact-rubric' &&
          check.config.requirements.includes('authorization'),
      ),
    ).toBeTrue();
  }
  expect(Object.fromEntries(families)).toEqual({
    implementation: 2,
    review: 2,
    documentation: 2,
    planning: 2,
  });
});

test('the current daily corpus covers ordinary work without required skills or a fixed tool path', async () => {
  const project = resolve(import.meta.dir, '../..');
  const registry = await Bun.file(resolve(project, 'collections.natural-v5.json')).json();
  const source = registry.collections.development;
  expect(source).toMatchObject({
    caseRoot: 'cases/v5',
    fixtureRoot: 'fixtures',
    exposure: 'seen',
  });
  const daily = await loadCases(project, source);
  const legacy = await loadCases(project, await selectCollection(project));

  expect(legacy).toHaveLength(338);
  expect(daily).toHaveLength(44);
  expect(new Set(daily.map((item) => item.definition.metadata.id)).size).toBe(44);
  expect(
    daily.some((item) =>
      legacy.some((old) => old.definition.metadata.id === item.definition.metadata.id),
    ),
  ).toBeFalse();

  const families = new Map<string, number>();
  for (const item of daily) {
    const { assessment, workFamily, fixture, requiredSkills, execution } = item.definition.metadata;
    expect(assessment).toBe('outcome');
    expect(requiredSkills).toEqual([]);
    expect(fixture.length).toBeGreaterThan(0);
    expect(execution.gitBaseline).toEqual(fixture.map((binding) => binding.target));
    expect(workFamily).not.toBeNull();
    families.set(workFamily ?? '', (families.get(workFamily ?? '') ?? 0) + 1);
    const authorization = item.definition.metadata.requirements.filter(
      (requirement) => requirement.capability === 'authorization',
    );
    expect(authorization.length).toBeGreaterThan(0);
    for (const requirement of authorization) {
      expect(
        item.definition.assert.some(
          (check) => check.config.core && check.config.requirements.includes(requirement.id),
        ),
      ).toBeTrue();
    }
  }
  expect(Object.fromEntries(families)).toEqual({
    documentation: 7,
    planning: 7,
    implementation: 19,
    review: 11,
  });
  const sessionTasks = daily.filter((item) =>
    item.definition.metadata.id.startsWith('natural/session-context/'),
  );
  expect(sessionTasks).toHaveLength(4);
  expect(sessionTasks.filter((item) => item.definition.metadata.turns.length > 0)).toHaveLength(2);
});
