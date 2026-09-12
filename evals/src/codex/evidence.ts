import { resolve } from 'node:path';
import type { ICodexTransportRecord } from './transport.ts';
import type { IObservedActor } from './usage.ts';

export interface IEvidenceItem {
  threadId: string;
  turnId: string;
  item: Record<string, unknown>;
  source: string;
}

export interface INativeEvidence {
  items: IEvidenceItem[];
  toolRecords: {
    threadId: string;
    turnId: string;
    record: Record<string, unknown>;
    source: string;
  }[];
  actors: (IObservedActor & { contexts: Record<string, unknown>[] })[];
  threadIds: string[];
  turnIds: string[];
  output: string;
  activation: {
    status: 'inferred' | 'unknown';
    references: { path: string; source: string }[];
    reason: string;
  };
  issues: string[];
}

export function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export async function readProtocol(path: string): Promise<ICodexTransportRecord[]> {
  const records: ICodexTransportRecord[] = [];
  for (const line of (await Bun.file(path).text()).split('\n')) {
    if (line.trim().length === 0) {
      continue;
    }

    const record = objectRecord(JSON.parse(line));
    const { direction, stream, time, raw } = record ?? {};
    if (
      record === undefined ||
      (direction !== 'incoming' && direction !== 'outgoing') ||
      !['stdout', 'stdin', 'stderr'].includes(String(stream)) ||
      typeof time !== 'string' ||
      typeof raw !== 'string'
    ) {
      throw new Error('Invalid native protocol record.');
    }
    records.push(record as unknown as ICodexTransportRecord);
  }
  return records;
}

/** Project live items once by native identity; never replay inherited child history. */
export function projectEvidence(
  records: readonly ICodexTransportRecord[],
  rootThreadId: string,
  source: string,
): Omit<INativeEvidence, 'actors' | 'toolRecords'> {
  const items = new Map<string, IEvidenceItem>();
  const threads = new Set([rootThreadId]);
  const turns = new Set<string>();

  for (const [index, record] of records.entries()) {
    if (record.direction !== 'incoming' || record.stream !== 'stdout') {
      continue;
    }

    const { method, params } = objectRecord(record.parsed) ?? {};
    const { threadId, turnId, turn, item } = objectRecord(params) ?? {};
    if (typeof threadId !== 'string') {
      continue;
    }
    threads.add(threadId);
    const { id: nestedTurnId } = objectRecord(turn) ?? {};
    const currentTurn = typeof turnId === 'string' ? turnId : nestedTurnId;
    if (typeof currentTurn !== 'string') {
      continue;
    }
    turns.add(currentTurn);
    if (method !== 'item/started' && method !== 'item/completed') {
      continue;
    }

    const value = objectRecord(item);
    const { id: itemId, agentThreadId, receiverThreadIds } = value ?? {};
    if (value === undefined || typeof itemId !== 'string') {
      continue;
    }
    if (typeof agentThreadId === 'string') {
      threads.add(agentThreadId);
    }
    if (Array.isArray(receiverThreadIds)) {
      for (const child of receiverThreadIds) {
        if (typeof child === 'string') {
          threads.add(child);
        }
      }
    }
    items.set(`${threadId}:${currentTurn}:${itemId}`, {
      threadId,
      turnId: currentTurn,
      item: value,
      source: `${source}#L${index + 1}`,
    });
  }

  const result = [...items.values()];

  const answers = result.filter(({ threadId, item }) => {
    const { type, phase } = item;
    return threadId === rootThreadId && type === 'agentMessage' && phase !== 'commentary';
  });

  const last = answers.at(-1)?.item;
  const { text } = last ?? {};
  const references: { path: string; source: string }[] = [];

  for (const event of result) {
    const { type, command, exitCode } = event.item;
    if (type !== 'commandExecution' || exitCode !== 0 || typeof command !== 'string') {
      continue;
    }
    for (const match of command.matchAll(/[^\s'";]+\/SKILL\.md/gu)) {
      references.push({ path: match[0], source: event.source });
    }
  }

  return {
    items: result,
    threadIds: [...threads],
    turnIds: [...turns],
    output: typeof text === 'string' ? text : '',
    activation: {
      status: references.length > 0 ? 'inferred' : 'unknown',
      references,
      reason:
        'Successful commands mentioning SKILL.md are path-based evidence only. Missing references do not prove non-invocation; route answers are not activation evidence.',
    },
    issues: [],
  };
}

export async function collectEvidence(
  records: readonly ICodexTransportRecord[],
  rootThreadId: string,
  source: string,
  codexHome: string,
  secrets: readonly string[] = [],
): Promise<INativeEvidence> {
  const projection = projectEvidence(records, rootThreadId, source);
  const liveTurns = new Map<string, Set<string>>();

  for (const record of records) {
    if (record.direction !== 'incoming' || record.stream !== 'stdout') {
      continue;
    }

    const { params } = objectRecord(record.parsed) ?? {};
    const { threadId, turnId, turn } = objectRecord(params) ?? {};
    const { id: nestedTurnId } = objectRecord(turn) ?? {};
    const id = typeof turnId === 'string' ? turnId : nestedTurnId;
    if (typeof threadId !== 'string' || typeof id !== 'string') {
      continue;
    }

    const turns = liveTurns.get(threadId) ?? new Set<string>();
    turns.add(id);
    liveTurns.set(threadId, turns);
  }

  const actors = new Map<string, INativeEvidence['actors'][number]>();
  const toolRecords: INativeEvidence['toolRecords'] = [];

  for (const threadId of projection.threadIds) {
    actors.set(threadId, {
      threadId,
      modelsByTurn: {},
      includedActorIds: null,
      contexts: [],
    });
  }

  try {
    for await (const file of new Bun.Glob('sessions/**/*.jsonl').scan(codexHome)) {
      const path = resolve(codexHome, file);
      let contents: string;

      try {
        contents = await Bun.file(path).text();
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        projection.issues.push(
          `Auxiliary session log ${path} could not be read: ${String(redactEvidence(reason, secrets))}`,
        );
        continue;
      }

      let owner: string | undefined;
      let currentTurn: string | undefined;
      let lineNumber = 0;

      for (const line of contents.split('\n')) {
        lineNumber += 1;
        if (!line.trim()) {
          continue;
        }

        let parsed: unknown;

        try {
          parsed = JSON.parse(line);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          currentTurn = undefined;
          projection.issues.push(
            `Auxiliary session log ${path}#L${lineNumber} is invalid: ${String(redactEvidence(reason, secrets))}`,
          );
          continue;
        }

        const { type, payload } = objectRecord(parsed) ?? {};
        const context = objectRecord(payload);
        if (context === undefined) {
          continue;
        }

        const { id, turn_id: turnId, model } = context;
        if (type === 'session_meta' && owner === undefined && typeof id === 'string') {
          owner = id;
        }
        if (owner === undefined) {
          continue;
        }
        if (type === 'turn_context') {
          currentTurn =
            typeof turnId === 'string' && liveTurns.get(owner)?.has(turnId) ? turnId : undefined;
        }
        if (type === 'response_item') {
          const { type: itemType, internal_chat_message_metadata_passthrough: metadata } = context;
          const { turn_id: declaredTurn } = objectRecord(metadata) ?? {};
          const toolTurn = typeof declaredTurn === 'string' ? declaredTurn : currentTurn;
          if (
            typeof itemType === 'string' &&
            [
              'function_call',
              'function_call_output',
              'custom_tool_call',
              'custom_tool_call_output',
            ].includes(itemType) &&
            toolTurn !== undefined &&
            liveTurns.get(owner)?.has(toolTurn)
          ) {
            toolRecords.push({
              threadId: owner,
              turnId: toolTurn,
              record: objectRecord(redactEvidence(context, secrets)) ?? {},
              source: `${resolve(codexHome, file)}#L${lineNumber}`,
            });
          }
        }
        if (owner === undefined || type !== 'turn_context' || typeof turnId !== 'string') {
          continue;
        }

        const actor = actors.get(owner);
        if (actor === undefined || !liveTurns.get(owner)?.has(turnId)) {
          continue;
        }
        actor.contexts.push({ source: `${resolve(codexHome, file)}#L${lineNumber}`, ...context });
        const prior = actor.modelsByTurn[turnId];
        const effective = typeof model === 'string' ? model : null;
        actor.modelsByTurn = {
          ...actor.modelsByTurn,
          [turnId]: prior === undefined || prior === effective ? effective : null,
        };
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    projection.issues.push(
      `Auxiliary session log enumeration under ${codexHome} failed: ${String(redactEvidence(reason, secrets))}`,
    );
  }

  // One observed actor cannot overlap another observed actor. With children,
  // retain unknown overlap until the particular counter contract is established.
  if (actors.size === 1) {
    for (const actor of actors.values()) {
      actor.includedActorIds = [];
    }
  } else {
    projection.issues.push('Parent-child token counter overlap is not established by this run.');
  }

  for (const actor of actors.values()) {
    if (actor.contexts.length === 0) {
      projection.issues.push(`No live turn-context identity was captured for ${actor.threadId}.`);
    }
  }

  return {
    ...projection,
    actors: [...actors.values()],
    toolRecords,
  };
}

function redactEvidence(value: unknown, secrets: readonly string[]): unknown {
  if (typeof value === 'string') {
    let text = value;
    for (const secret of secrets) {
      if (secret.length > 0) {
        text = text.replaceAll(secret, '<credential-redacted>');
      }
    }
    return text;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactEvidence(item, secrets));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        String(redactEvidence(key, secrets)),
        redactEvidence(child, secrets),
      ]),
    );
  }

  return value;
}
