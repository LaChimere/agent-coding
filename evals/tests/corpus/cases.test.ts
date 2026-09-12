import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  type IRepositoryCase,
  loadCases,
  parseCase,
  promptfooCase,
} from '../../src/corpus/cases.ts';

const definition = (): IRepositoryCase => ({
  description: 'Ask for a clarification before editing the fixture.',
  vars: { task: 'Clarify the expected behavior before editing.' },
  metadata: {
    id: 'fixture/clarification',
    group: 'interaction',
    kind: 'task',
    requirements: ['clarify-first'],
    fixture: [],
    execution: {
      networkAccess: false,
      pathPrepend: [],
      executableFiles: [],
    },
    reference: '',
    requiredSkills: [],
    turns: [
      {
        when: 'after-turn',
        match: 'behavior|clarif',
        reply: 'Preserve order.',
      },
    ],
    authorization: {
      scope: 'Local fixture edits after clarification; no commits or publication.',
      approvals: [],
    },
    outputSchema: null,
  },
  assert: [
    {
      type: 'javascript',
      value: 'file://grader.ts',
      metric: 'clarification',
      config: {
        core: true,
        method: 'text-rubric',
        requirements: ['clarify-first'],
        rubric: 'The requested clarification occurs before a file edit.',
      },
    },
  ],
});

test('keeps native Promptfoo fields and explicit requirement, criterion and interaction identities', () => {
  const source = definition();
  const parsed = parseCase(JSON.parse(JSON.stringify(source)));

  expect(parsed).toEqual(source);
  expect(promptfooCase(parsed, '/project').assert?.[0]).toMatchObject({
    value: 'file:///project/grader.ts',
  });
});

test('rejects ungraded requirements, missing core checks and duplicate criteria', () => {
  const noCore = definition();

  for (const criterion of noCore.assert) {
    criterion.config.core = false;
  }

  const ungraded = definition();
  ungraded.metadata.requirements.push('missing');
  const duplicate = definition();
  duplicate.assert.push(...duplicate.assert);
  const unknownRequirement = definition();

  for (const criterion of unknownRequirement.assert) {
    criterion.config.requirements = ['unknown'];
  }

  for (const item of [noCore, ungraded, duplicate, unknownRequirement]) {
    expect(() => parseCase(item)).toThrow();
  }
});

test('rejects ambiguous fixture targets and escaping execution paths before launch', () => {
  const duplicate = definition();
  duplicate.metadata.fixture = [
    { source: 'one.txt', target: 'same.txt' },
    { source: 'two.txt', target: 'same.txt' },
  ];

  expect(() => parseCase(duplicate)).toThrow('Duplicate fixture target');

  for (const path of ['../outside', '/absolute']) {
    const item = definition();
    item.metadata.execution.pathPrepend = [path];

    expect(() => parseCase(item)).toThrow();
  }

  const invalidScript = definition();
  invalidScript.metadata.turns = [
    {
      when: 'after-turn',
      match: '[',
      reply: 'answer',
    },
  ];

  expect(() => parseCase(invalidScript)).toThrow();
});

test('loads the full corpus by default and makes explicit subsets and versions inspectable', async () => {
  const root = await mkdtemp(resolve('.cache/cases-test-'));
  await mkdir(`${root}/cases`);
  await Bun.write(
    `${root}/grader.ts`,
    'export default () => ({ pass: true, score: 1, reason: "fixture" });',
  );

  const first = definition();
  const second = definition();
  second.metadata.id = 'fixture/second';
  await Bun.write(`${root}/cases/examples.json`, JSON.stringify([first, second]));
  const full = await loadCases(root);

  expect(full.map((item) => item.definition.metadata.id)).toEqual([
    'fixture/clarification',
    'fixture/second',
  ]);

  expect(full[0]?.version).not.toBe(full[1]?.version);
  const original = full[0];

  for (const criterion of first.assert) {
    criterion.config.rubric = 'Revised grading wording.';
  }

  await Bun.write(`${root}/cases/examples.json`, JSON.stringify([first, second]));
  const regraded = (await loadCases(root))[0];

  expect(regraded?.version).not.toBe(original?.version);
  expect(regraded?.executionVersion).toBe(original?.executionVersion);
  expect(await loadCases(root, ['fixture/second'])).toHaveLength(1);
  await expect(loadCases(root, ['missing'])).rejects.toThrow('Unknown selected case');
  await expect(loadCases(root, ['fixture/second', 'fixture/second'])).rejects.toThrow(
    'Duplicate selected',
  );
  await Bun.write(`${root}/cases/duplicate.json`, JSON.stringify([first]));

  await expect(loadCases(root)).rejects.toThrow('Duplicate case id');
});

test('refuses missing fixtures and graders', async () => {
  const root = await mkdtemp(resolve('.cache/cases-test-'));
  await mkdir(`${root}/cases`);
  const source = definition();
  source.metadata.fixture = [{ source: 'missing.txt', target: 'input.txt' }];
  await Bun.write(`${root}/cases/case.json`, JSON.stringify([source]));

  await expect(loadCases(root)).rejects.toThrow('Missing fixture');
  await Bun.write(`${root}/fixtures/missing.txt`, 'fixture');

  await expect(loadCases(root)).rejects.toThrow('Missing grader');
});

test('moving fixture storage preserves execution identity when target, bytes and mode remain equal', async () => {
  const root = await mkdtemp(resolve('.cache/cases-move-test-'));
  try {
    await mkdir(resolve(root, 'cases'));
    await mkdir(resolve(root, 'fixtures'));
    await Bun.write(resolve(root, 'grader.ts'), 'export default () => true;');
    await Bun.write(resolve(root, 'fixtures/old.fixture'), 'same input');
    const source = definition();
    source.metadata.fixture = [{ source: 'old.fixture', target: 'input.txt' }];
    await Bun.write(resolve(root, 'cases/example.json'), JSON.stringify([source]));
    const before = (await loadCases(root))[0];
    await rename(resolve(root, 'fixtures/old.fixture'), resolve(root, 'fixtures/moved.fixture'));
    source.metadata.fixture = [{ source: 'moved.fixture', target: 'input.txt' }];
    await Bun.write(resolve(root, 'cases/example.json'), JSON.stringify([source]));
    const after = (await loadCases(root))[0];

    expect(after?.executionVersion).toBe(before?.executionVersion);
    expect(after?.version).not.toBe(before?.version);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('rejects misspelled fields and undeclared approval boundaries', () => {
  const source = definition();

  expect(() => parseCase({ ...source, unexpected: true })).toThrow('Unknown case field');
  source.metadata.authorization.approvals = [
    {
      command: 'git commit -m approved',
      afterReply: 2,
      decision: 'accept',
    },
  ];

  expect(() => parseCase(source)).toThrow('reply boundary');
});
