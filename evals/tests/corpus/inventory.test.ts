import { expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { loadCases } from '../../src/corpus/cases.ts';

test('the current corpus is valid and every bundled fixture is used', async () => {
  const project = resolve(import.meta.dir, '../..');
  const cases = await loadCases(project);
  const referenced = new Set(
    cases.flatMap((item) => item.definition.metadata.fixture.map((fixture) => fixture.source)),
  );
  const files = [
    ...new Bun.Glob('**/*').scanSync({ cwd: resolve(project, 'fixtures'), onlyFiles: true }),
  ];

  expect([...referenced].sort()).toEqual(files.sort());
});
