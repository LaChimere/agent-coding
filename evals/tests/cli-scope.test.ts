import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runCli } from '../src/cli.ts';
import { loadCases } from '../src/corpus/cases.ts';
import { freezeCollection, selectCollection } from '../src/corpus/collections.ts';
import { loadedCase } from './fixtures/contracts.ts';

const roots: string[] = [];

async function setup() {
  await mkdir(resolve('.cache'), { recursive: true });
  const root = await mkdtemp(resolve('.cache/cli-scope-'));
  roots.push(root);
  await Bun.write(
    resolve(root, 'collections.json'),
    await Bun.file(resolve(import.meta.dir, '../collections.json')).bytes(),
  );
  await Bun.write(resolve(root, 'cases/fixture.json'), JSON.stringify([loadedCase().definition]));
  await Bun.write(resolve(root, 'src/grading/assertion.ts'), 'export default () => true;');
  await Bun.write(resolve(root, 'holdout/cases/unreadable.json'), 'This must not be parsed.');

  const scope = freezeCollection(await selectCollection(root, 'holdout'), [loadedCase()], true);
  await Bun.write(resolve(root, 'saved/collection.json'), JSON.stringify(scope));
  await Bun.write(resolve(root, 'saved/manifest.json'), 'This must not be parsed.');
  const report = resolve(root, 'saved/report.json');
  await Bun.write(`${report}.collection.json`, JSON.stringify(scope));
  await Bun.write(report, 'This must not be parsed.');

  return { root, report };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true })));
});

test('default validation never discovers or parses holdout definitions', async () => {
  const { root } = await setup();

  await runCli(['validate'], root);
  await expect(runCli(['validate', '--collection', 'holdout'], root)).rejects.toThrow();
});

test('all saved-content commands reject holdout scope before reading the payload', async () => {
  const { root, report } = await setup();
  const run = resolve(root, 'saved');

  for (const args of [
    ['regrade', run],
    ['report', run],
    ['view', report],
    ['compare', report, report],
    ['_worker', run],
  ]) {
    await expect(runCli(args, root)).rejects.toThrow('--collection holdout');
  }

  await expect(runCli(['view', report, '--collection', 'holdout'], root)).rejects.toThrow('JSON');
});

test('a selected case directory cannot reach holdouts through a symlink', async () => {
  const { root } = await setup();
  await symlink(resolve(root, 'holdout/cases/unreadable.json'), resolve(root, 'cases/link.json'));

  await expect(loadCases(root, await selectCollection(root))).rejects.toThrow('symlink');
});
