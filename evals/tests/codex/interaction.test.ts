import { expect, test } from 'bun:test';
import { type IInteractionEvent, ScriptedUser } from '../../src/codex/interaction.ts';
import type { ICaseMetadata } from '../../src/corpus/cases.ts';

function metadata(turns: ICaseMetadata['turns'] = []): ICaseMetadata {
  return {
    id: 'interaction',
    group: 'native',
    kind: 'task',
    requirements: ['scope'],
    fixture: [],
    execution: {
      networkAccess: false,
      pathPrepend: [],
      executableFiles: [],
    },
    reference: '',
    requiredSkills: [],
    turns,
    authorization: {
      scope: 'Local work after the declared reply.',
      approvals: [
        {
          command: 'git commit -m approved',
          afterReply: 1,
          decision: 'accept',
        },
      ],
    },
    outputSchema: null,
  };
}

test('supplies sequential clarification and keeps authorization at its declared boundary', async () => {
  const events: IInteractionEvent[] = [];

  const user = new ScriptedUser(
    metadata([
      {
        when: 'after-turn',
        match: 'empty input',
        reply: 'Return an empty array.',
      },
    ]),
    '/workspace',
    async (event) => {
      events.push(event);
    },
  );

  const request = {
    command: 'git commit -m approved',
    cwd: '/workspace',
    kind: 'command',
  };

  expect(await user.handle('item/commandExecution/requestApproval', request)).toEqual({
    decision: 'decline',
  });
  expect(await user.afterTurn('What should empty input do?')).toBe('Return an empty array.');
  expect(await user.handle('item/commandExecution/requestApproval', request)).toEqual({
    decision: 'accept',
  });
  expect(await user.afterTurn('Done.')).toBeNull();
  expect(events.map((event) => event.replyBoundary)).toEqual([0, 1, 1]);
  expect(user.issues).toEqual([]);
});

test('matches all native questions before consuming any scripted answer', async () => {
  const events: IInteractionEvent[] = [];

  const user = new ScriptedUser(
    metadata([
      {
        when: 'user-input',
        match: 'empty',
        reply: 'Empty array',
      },
      {
        when: 'user-input',
        match: 'invalid',
        reply: 'Throw',
      },
    ]),
    '/workspace',
    async (event) => {
      events.push(event);
    },
  );

  expect(
    await user.handle('item/tool/requestUserInput', {
      questions: [
        { id: 'q1', question: 'empty?' },
        { id: 'q2', question: 'unmatched?' },
      ],
    }),
  ).toEqual({ answers: {} });

  expect(
    await user.handle('item/tool/requestUserInput', {
      questions: [
        { id: 'a', question: 'empty?' },
        { id: 'b', question: 'invalid?' },
      ],
    }),
  ).toEqual({ answers: { a: { answers: ['Empty array'] }, b: { answers: ['Throw'] } } });

  expect(events.map((event) => event.replyBoundary)).toEqual([0, 2]);
  expect(user.issues).toHaveLength(1);
  await expect(user.handle('item/tool/requestUserInput', {})).rejects.toThrow('questions');
});

test('does not widen command authority into filesystem, network or session grants', async () => {
  const definition = metadata();
  const rule = definition.authorization.approvals[0];
  if (rule === undefined) {
    throw new Error('Missing fixture rule');
  }
  rule.afterReply = 0;
  const user = new ScriptedUser(definition, '/workspace', async () => {});

  for (const extra of [
    { cwd: '/workspace-other' },
    { cwd: '/workspace/../../private' },
    { cwd: 'relative' },
    { additionalPermissions: { filesystem: { write: ['/private'] } } },
    { networkApprovalContext: { host: 'example.org' } },
    { kind: 'stdin' },
  ]) {
    expect(
      await user.handle('item/commandExecution/requestApproval', {
        command: rule.command,
        cwd: '/workspace',
        ...extra,
      }),
    ).toEqual({ decision: 'decline' });
  }

  expect(await user.handle('item/fileChange/requestApproval', { grantRoot: '/' })).toEqual({
    decision: 'decline',
  });
  expect(await user.handle('item/permissions/requestApproval', {})).toMatchObject({
    permissions: {},
    scope: 'turn',
  });

  await expect(user.handle('unrecognized/method', {})).rejects.toThrow('Unsupported');
  expect(user.issues).toHaveLength(6);
});

test('preserves an unmatched conversation branch as incomplete information', async () => {
  const user = new ScriptedUser(
    metadata([
      {
        when: 'after-turn',
        match: 'edge condition',
        reply: 'Confirmed',
      },
    ]),
    '/workspace',
    async () => {},
  );

  expect(await user.afterTurn('I already changed it.')).toBeNull();
  expect(user.issues).toEqual(['The declared conversation branch was not reached.']);
});
