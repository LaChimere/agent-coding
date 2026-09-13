import { resolve } from 'node:path';
import type { ICodexTransportRecord } from './transport.ts';

export interface IEvidenceItem {
  threadId: string;
  turnId: string;
  item: Record<string, unknown>;
  source: string;
}

export interface INativeConversationMessage {
  actor: 'candidate' | 'user';
  content: string;
  threadId: string;
  turnId: string;
  source: string;
}

export interface INativeActorEvidence {
  threadId: string;
  parentThreadId: string | null;
  childThreadIds: string[];
  assignment: {
    role: string | null;
    agentPath: string | null;
    agentNickname: string | null;
    modelProvider: string | null;
    source: string | null;
  };
  role: string | null;
  model: string | null;
  reasoningEffort: string | null;
  reasoningEffortByTurn: Readonly<Record<string, string | null>>;
  sources: {
    sessionMeta: string[];
    turnContexts: string[];
    toolRecords: string[];
    parentChild: string[];
  };
  modelsByTurn: Readonly<Record<string, string | null>>;
  includedActorIds: readonly string[] | null;
  contexts: Record<string, unknown>[];
}

export interface INativeEvidence {
  items: IEvidenceItem[];
  toolRecords: {
    threadId: string;
    turnId: string;
    record: Record<string, unknown>;
    source: string;
  }[];
  actors: INativeActorEvidence[];
  conversation: INativeConversationMessage[];
  actorRelations: { parentThreadId: string; childThreadId: string; source: string }[];
  /** The root thread is first; remaining entries include observed worker threads. */
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
  const actorRelations: {
    parentThreadId: string;
    childThreadId: string;
    source: string;
  }[] = [];

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
  const conversation: INativeConversationMessage[] = [];

  for (const event of result) {
    const { type, command, exitCode, phase } = event.item;
    if ((type === 'userMessage' || type === 'agentMessage') && phase !== 'commentary') {
      const content = messageContent(event.item);
      if (content !== null) {
        conversation.push({
          actor: type === 'userMessage' ? 'user' : 'candidate',
          content,
          threadId: event.threadId,
          turnId: event.turnId,
          source: event.source,
        });
      }
    }
    if (type !== 'commandExecution' || exitCode !== 0 || typeof command !== 'string') {
      continue;
    }
    for (const match of command.matchAll(/[^\s'";]+\/SKILL\.md/gu)) {
      references.push({ path: match[0], source: event.source });
    }
  }

  return {
    items: result,
    conversation,
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
    actorRelations,
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

  const actors = new Map<string, INativeActorEvidence>();
  const toolRecords: INativeEvidence['toolRecords'] = [];

  for (const threadId of projection.threadIds) {
    actors.set(threadId, {
      threadId,
      parentThreadId: null,
      childThreadIds: [],
      assignment: {
        role: null,
        agentPath: null,
        agentNickname: null,
        modelProvider: null,
        source: null,
      },
      role: null,
      model: null,
      reasoningEffort: null,
      reasoningEffortByTurn: {},
      sources: {
        sessionMeta: [],
        turnContexts: [],
        toolRecords: [],
        parentChild: [],
      },
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

        const { id, turn_id: turnId, model, model_provider: modelProvider, effort } = context;
        if (type === 'session_meta' && owner === undefined && typeof id === 'string') {
          owner = id;
        }
        if (owner === undefined) {
          continue;
        }
        const actor = actors.get(owner);
        const evidenceSource = `${resolve(codexHome, file)}#L${lineNumber}`;
        if (type === 'session_meta' && actor !== undefined && id === owner) {
          const source = objectRecord(field(context, 'source'));
          const subagent = objectRecord(field(source, 'subagent'));
          const threadSpawn = objectRecord(field(subagent, 'thread_spawn'));
          const role = firstText(field(context, 'agent_role'));
          const agentPath = firstText(field(context, 'agent_path'));
          const agentNickname = firstText(field(context, 'agent_nickname'));
          const provider = firstText(modelProvider);
          const parentThreadId = firstText(field(threadSpawn, 'parent_thread_id'));

          actor.contexts.push({
            source: evidenceSource,
            ...(redactEvidence(context, secrets) as Record<string, unknown>),
          });
          actor.sources.sessionMeta.push(evidenceSource);
          actor.assignment = {
            role,
            agentPath,
            agentNickname,
            modelProvider: provider,
            source: evidenceSource,
          };
          actor.role = role;
          actor.parentThreadId ??= parentThreadId;
          if (parentThreadId !== null && !actor.sources.parentChild.includes(evidenceSource)) {
            actor.sources.parentChild.push(evidenceSource);
            projection.actorRelations.push({
              parentThreadId,
              childThreadId: owner,
              source: evidenceSource,
            });
            const parent = actors.get(parentThreadId);
            if (parent !== undefined) {
              if (!parent.childThreadIds.includes(owner)) {
                parent.childThreadIds.push(owner);
              }
              parent.sources.parentChild.push(evidenceSource);
            }
          }
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
              source: evidenceSource,
            });
            if (actor !== undefined) {
              actor.sources.toolRecords.push(evidenceSource);
            }
          }
        }
        if (owner === undefined || type !== 'turn_context' || typeof turnId !== 'string') {
          continue;
        }

        if (actor === undefined || !liveTurns.get(owner)?.has(turnId)) {
          continue;
        }
        actor.contexts.push({
          source: evidenceSource,
          ...(redactEvidence(context, secrets) as Record<string, unknown>),
        });
        actor.sources.turnContexts.push(evidenceSource);
        const prior = actor.modelsByTurn[turnId];
        const effective = typeof model === 'string' ? model : null;
        actor.modelsByTurn = {
          ...actor.modelsByTurn,
          [turnId]: prior === undefined || prior === effective ? effective : null,
        };
        const priorReasoning = actor.reasoningEffortByTurn[turnId];
        const effectiveReasoning = firstText(effort);
        actor.reasoningEffortByTurn = {
          ...actor.reasoningEffortByTurn,
          [turnId]:
            priorReasoning === undefined || priorReasoning === effectiveReasoning
              ? effectiveReasoning
              : null,
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
    actor.model = observedValue(Object.values(actor.modelsByTurn));
    actor.reasoningEffort = observedValue(Object.values(actor.reasoningEffortByTurn));
    if (actor.sources.turnContexts.length === 0) {
      projection.issues.push(`No live turn-context identity was captured for ${actor.threadId}.`);
    }
  }

  return {
    ...projection,
    actors: [...actors.values()],
    toolRecords,
  };
}

function firstText(...values: unknown[]): string | null {
  return (
    values.find((value): value is string => typeof value === 'string' && value.length > 0) ?? null
  );
}

function observedValue(values: readonly (string | null)[]): string | null {
  if (values.length === 0 || values.some((value) => value === null)) {
    return null;
  }

  const observed = [...new Set(values)];
  return observed.length === 1 ? (observed[0] ?? null) : null;
}

function field(record: Record<string, unknown> | undefined, key: string): unknown {
  return record?.[key];
}

function messageContent(item: Record<string, unknown>): string | null {
  const direct = firstText(field(item, 'text'));
  if (direct !== null) {
    return direct;
  }

  const content = field(item, 'content');
  if (!Array.isArray(content)) {
    return null;
  }

  const parts = content.flatMap((part) => {
    const record = objectRecord(part);
    const text = field(record, 'text');
    return typeof text !== 'string' ? [] : [text];
  });
  return parts.length > 0 ? parts.join('') : null;
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
