import type { ITokenUsage, IUsageObservation } from '../results/resources.ts';
import type { ICodexTransportRecord } from './transport.ts';

export interface IObservedActor {
  threadId: string;
  /** Effective native turn-context models, not requested role defaults. */
  modelsByTurn: Readonly<Record<string, string | null>>;
  /** Only supply [] when the counter's exclusion of child usage is established. */
  includedActorIds: readonly string[] | null;
}

interface INormalizedUsage {
  observations: IUsageObservation[];
  issues: { evidenceSource: string; reason: string }[];
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Use only live thread counters; inherited rollout history is never another sample. */
export function normalizeCodexUsage(
  records: readonly ICodexTransportRecord[],
  actors: readonly IObservedActor[],
  evidencePath: string,
): INormalizedUsage {
  const byThread = new Map<string, IObservedActor>();

  for (const actor of actors) {
    if (byThread.has(actor.threadId)) {
      throw new Error(`Duplicate actor: ${actor.threadId}`);
    }
    byThread.set(actor.threadId, actor);
  }

  const observations: IUsageObservation[] = [];
  const issues: INormalizedUsage['issues'] = [];

  const fields: [keyof ITokenUsage, string][] = [
    ['input', 'inputTokens'],
    ['output', 'outputTokens'],
    ['cachedInput', 'cachedInputTokens'],
    ['reasoningOutput', 'reasoningOutputTokens'],
  ];

  for (const [index, record] of records.entries()) {
    if (record.direction !== 'incoming' || record.stream !== 'stdout') {
      continue;
    }

    const message = object(record.parsed);
    if (message === undefined) {
      continue;
    }

    const { method, params } = message;
    if (method !== 'thread/tokenUsage/updated') {
      continue;
    }

    const evidenceSource = `${evidencePath}#L${index + 1}`;
    const { threadId, turnId, tokenUsage } = object(params) ?? {};
    const observedAt = Date.parse(record.time);
    if (
      typeof threadId !== 'string' ||
      typeof turnId !== 'string' ||
      !Number.isFinite(observedAt)
    ) {
      issues.push({
        evidenceSource,
        reason: 'Usage event has no valid thread, turn or time identity.',
      });
      continue;
    }

    const { total } = object(tokenUsage) ?? {};
    const counters = object(total) ?? {};

    const usage: ITokenUsage = {
      input: null,
      output: null,
      cachedInput: null,
      reasoningOutput: null,
    };

    for (const [normalized, native] of fields) {
      const value = counters[native];
      if (value === undefined || value === null) {
        continue;
      }
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        issues.push({ evidenceSource, reason: `Invalid native token counter: ${native}.` });
      } else {
        usage[normalized] = value;
      }
    }

    const actor = byThread.get(threadId);
    if (actor === undefined) {
      issues.push({
        evidenceSource,
        reason: 'Actor model and parent-child overlap are unestablished.',
      });
    }
    observations.push({
      id: evidenceSource,
      actorId: threadId,
      threadId,
      turnId,
      model: actor?.modelsByTurn[turnId] ?? null,
      kind: 'cumulative',
      observedAt,
      usage,
      includedActorIds: actor?.includedActorIds ?? null,
      evidenceSource,
    });
  }

  return { observations, issues };
}
