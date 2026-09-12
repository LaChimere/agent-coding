import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const send = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);
const { CODEX_HOME: codexHome, JUDGE_SECRET: judgeSecret } = process.env;
const { FAKE_JUDGE_PROBE_FAILURE: probeFailure } = process.env;
if (codexHome === undefined) {
  throw new Error('Missing fixture CODEX_HOME.');
}
const config = Bun.TOML.parse(await Bun.file(resolve(codexHome, 'config.toml')).text()) as Record<
  string,
  unknown
>;
const field = (record: Record<string, unknown>, key: string): unknown => record[key];
const judgeProfile = config;
const providerId = String(field(judgeProfile, 'model_provider'));
const threadId = 'judge-thread';
let systemSkillEnabled = true;
let activeTurn = '';
interface IPendingApproval {
  prompt: string;
  step: 'command' | 'file' | 'permissions' | 'unknown';
}
let pendingApprovalTurn: IPendingApproval | null = null;

function commandResult(
  command: unknown,
): Promise<Record<string, unknown>> | Record<string, unknown> {
  if (!Array.isArray(command) || command.some((part) => typeof part !== 'string')) {
    throw new Error('Invalid fixture command probe.');
  }

  const parts = command as string[];
  if (parts[0] === '/bin/ls') {
    const path = parts.at(-1);
    if (path === undefined) {
      throw new Error('Missing fixture directory.');
    }
    return readdir(path).then((names) => ({
      exitCode: 0,
      stdout: names.join('\n'),
      stderr: '',
    }));
  }
  if (parts[0] === '/usr/bin/head') {
    const path = parts.at(-1);
    if (path === undefined) {
      throw new Error('Missing fixture evidence path.');
    }
    return (async () => {
      return {
        exitCode: 0,
        stdout: new TextDecoder().decode((await Bun.file(path).bytes()).slice(0, 64)),
        stderr: '',
      };
    })();
  }
  if (parts[0] === '/bin/sh') {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'operation not permitted',
    };
  }
  if (parts[0] === '/bin/cat') {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'operation not permitted',
    };
  }
  if (parts[0] === '/usr/bin/curl') {
    if (probeFailure === 'network') {
      const url = parts.at(-1);
      if (url === undefined) {
        throw new Error('Missing fixture network URL.');
      }
      return fetch(url).then(async (response) => ({
        exitCode: 0,
        stdout: await response.text(),
        stderr: '',
      }));
    }
    return {
      exitCode: 7,
      stdout: '',
      stderr: 'network denied',
    };
  }
  throw new Error(`Unexpected fixture command: ${parts.join(' ')}`);
}

function requestApproval(id: string, method: string): void {
  send({
    id,
    method,
    params: {
      threadId,
      turnId: activeTurn,
      reason: 'fixture',
    },
  });
}

function complete(turnId: string, status: 'completed' | 'failed', prompt: string): void {
  const verdict = prompt.includes('missing-output-probe')
    ? {
        status: 'failed',
        pass: false,
        score: 0,
        reason: 'The evidence directory contains no required output.',
        evidence: ['evidence directory listing'],
      }
    : prompt.includes('ambiguous')
      ? {
          status: 'unknown',
          pass: false,
          score: 0,
          reason: 'The supplied evidence is ambiguous.',
          evidence: ['artifact.txt'],
        }
      : {
          status: 'passed',
          pass: true,
          score: 1,
          reason: 'The artifact satisfies the rubric.',
          evidence: ['artifact.txt#L1'],
        };
  send({
    method: 'thread/tokenUsage/updated',
    params: {
      threadId,
      turnId,
      tokenUsage: {
        total: {
          inputTokens: 41,
          outputTokens: 9,
          cachedInputTokens: 3,
          reasoningOutputTokens: 4,
        },
      },
    },
  });
  send({
    method: 'turn/completed',
    params: {
      threadId,
      turn: {
        id: turnId,
        status,
        items:
          status === 'completed' ? [{ type: 'agentMessage', text: JSON.stringify(verdict) }] : [],
      },
    },
  });
}

for await (const line of console) {
  if (line.trim().length === 0) {
    continue;
  }

  const message = JSON.parse(line) as {
    id?: number | string;
    method?: string;
    params?: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: Record<string, unknown>;
  };

  if (message.method === undefined) {
    if (pendingApprovalTurn !== null) {
      const pending: IPendingApproval = pendingApprovalTurn;
      if (pending.step === 'command' && message.id === 'approval-command') {
        if (field(message.result ?? {}, 'decision') !== 'decline') {
          throw new Error('Command approval was not declined.');
        }
        pendingApprovalTurn = { prompt: pending.prompt, step: 'file' };
        requestApproval('approval-file', 'item/fileChange/requestApproval');
      } else if (pending.step === 'file' && message.id === 'approval-file') {
        if (field(message.result ?? {}, 'decision') !== 'decline') {
          throw new Error('File approval was not declined.');
        }
        pendingApprovalTurn = { prompt: pending.prompt, step: 'permissions' };
        requestApproval('approval-permissions', 'item/permissions/requestApproval');
      } else if (pending.step === 'permissions' && message.id === 'approval-permissions') {
        if (
          JSON.stringify(message.result) !==
          JSON.stringify({
            permissions: {},
            scope: 'turn',
            strictAutoReview: true,
          })
        ) {
          throw new Error('Permission approval response was not the strict empty turn grant.');
        }
        pendingApprovalTurn = null;
        complete(activeTurn, 'completed', pending.prompt);
      } else if (pending.step === 'unknown' && message.id === 'approval-unknown') {
        if (message.result !== undefined || message.error === undefined) {
          throw new Error('Unknown request did not receive an error.');
        }
        pendingApprovalTurn = null;
        complete(activeTurn, 'completed', pending.prompt);
      }
    }
    continue;
  }
  if (message.id === undefined) {
    continue;
  }

  const reply = (result: unknown) => send({ id: message.id, result });

  switch (message.method) {
    case 'initialize':
      reply({ userAgent: 'fake-judge/1.0.0' });
      break;
    case 'skills/list':
      reply({
        data: [
          {
            cwd: process.cwd(),
            skills: systemSkillEnabled
              ? [
                  {
                    name: 'system-fixture',
                    path: resolve(codexHome, 'skills/.system/system-fixture/SKILL.md'),
                    scope: 'system',
                    enabled: true,
                  },
                ]
              : [],
            errors: [],
          },
        ],
      });
      break;
    case 'skills/config/write':
      if (field(message.params ?? {}, 'enabled') !== false) {
        throw new Error('System skill was not disabled.');
      }
      systemSkillEnabled = false;
      reply({});
      break;
    case 'config/read': {
      const shell = field(config, 'shell_environment_policy') as Record<string, unknown>;
      const excluded = field(shell, 'exclude');
      reply({
        args: process.argv.slice(2),
        cwd: process.cwd(),
        config,
        credentialPresentInProcess: judgeSecret !== undefined,
        credentialExcludedFromShell: Array.isArray(excluded)
          ? excluded.includes('JUDGE_SECRET')
          : false,
      });

      break;
    }
    case 'command/exec':
      reply(await commandResult(field(message.params ?? {}, 'command')));
      break;
    case 'thread/start':
      reply({
        thread: { id: threadId },
        model: field(message.params ?? {}, 'model'),
        modelProvider: providerId,
        reasoningEffort: field(judgeProfile, 'model_reasoning_effort'),
        activePermissionProfile: {
          id:
            probeFailure === 'permission'
              ? 'wrong-profile'
              : field(message.params ?? {}, 'permissions'),
          parent: ':read-only',
        },
        instructionSources: probeFailure === 'instructions' ? ['/tmp/AGENTS.md'] : [],
      });
      break;
    case 'turn/start': {
      activeTurn = 'judge-turn';
      const input = field(message.params ?? {}, 'input');
      const first = Array.isArray(input) ? input[0] : undefined;

      const prompt =
        first !== null && typeof first === 'object' && !Array.isArray(first)
          ? String(field(first as Record<string, unknown>, 'text'))
          : '';

      reply({ turn: { id: activeTurn, status: 'inProgress' } });
      if (prompt.includes('approval-probe')) {
        pendingApprovalTurn = { prompt, step: 'command' };
        requestApproval('approval-command', 'item/commandExecution/requestApproval');
      } else if (prompt.includes('unknown-request')) {
        pendingApprovalTurn = { prompt, step: 'unknown' };
        requestApproval('approval-unknown', 'approval/unknown');
      } else {
        complete(activeTurn, prompt.includes('native-error') ? 'failed' : 'completed', prompt);
      }
      break;
    }
    case 'turn/interrupt':
      complete(activeTurn, 'failed', 'native-error');
      reply({});
      break;
    default:
      send({ id: message.id, error: { code: -32601, message: 'Unknown fixture method' } });
  }
}

await Bun.write(resolve(codexHome, '..', 'cleanup-marker'), 'closed\n');
