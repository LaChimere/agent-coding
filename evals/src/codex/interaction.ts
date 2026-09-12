import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { ICaseMetadata } from '../corpus/cases.ts';
import { objectRecord } from './evidence.ts';

export interface IInteractionEvent {
  time: number;
  method: string;
  request: unknown;
  response: unknown;
  replyBoundary: number;
  reason: string;
}

/** Supplies only predeclared user information and exact command authorization. */
export class ScriptedUser {
  readonly issues: string[] = [];
  private _replyBoundary = 0;
  private readonly _metadata: ICaseMetadata;
  private readonly _workspace: string;
  private readonly _record: (event: IInteractionEvent) => Promise<void>;

  constructor(
    metadata: ICaseMetadata,
    workspace: string,
    record: (event: IInteractionEvent) => Promise<void>,
  ) {
    this._metadata = metadata;
    this._workspace = resolve(workspace);
    this._record = record;
  }

  async afterTurn(output: string): Promise<string | null> {
    const next = this._metadata.turns[this._replyBoundary];
    if (next === undefined) {
      return null;
    }
    if (next.when !== 'after-turn' || !new RegExp(next.match, 'iu').test(output)) {
      this.issues.push('The declared conversation branch was not reached.');
      return null;
    }
    this._replyBoundary += 1;
    await this._record({
      time: Date.now(),
      method: 'after-turn',
      request: output,
      response: next.reply,
      replyBoundary: this._replyBoundary,
      reason: 'Matched the next declared user reply.',
    });

    return next.reply;
  }

  async handle(method: string, params: unknown): Promise<unknown> {
    let response: unknown;
    let reason: string;
    if (method === 'item/tool/requestUserInput') {
      const { questions } = objectRecord(params) ?? {};
      const answers: Record<string, { answers: string[] }> = {};
      if (!Array.isArray(questions)) {
        throw new Error('Native user input lacks questions.');
      }

      // Match the entire request before consuming replies; unmatched multi-question
      // requests must not silently consume only the first part of a script.
      const matched = questions.map((question, index) => {
        const { id } = objectRecord(question) ?? {};
        const next = this._metadata.turns[this._replyBoundary + index];
        if (
          typeof id !== 'string' ||
          next?.when !== 'user-input' ||
          !new RegExp(next.match, 'iu').test(JSON.stringify(question))
        ) {
          return null;
        }

        return { id, reply: next.reply };
      });

      if (questions.length === 0 || matched.some((item) => item === null)) {
        reason = 'No declared user reply matches this native question set.';
        this.issues.push(reason);
      } else {
        for (const item of matched) {
          if (item !== null) {
            answers[item.id] = { answers: [item.reply] };
          }
        }
        this._replyBoundary += matched.length;
        reason = 'Matched the declared native user replies.';
      }
      response = { answers };
    } else if (method === 'item/commandExecution/requestApproval') {
      const { command, cwd, additionalPermissions, networkApprovalContext, kind } =
        objectRecord(params) ?? {};
      const rule = this._metadata.authorization.approvals.find(
        (item) => item.command === command && item.afterReply <= this._replyBoundary,
      );
      const difference = typeof cwd === 'string' ? relative(this._workspace, resolve(cwd)) : '..';

      const bounded =
        typeof cwd === 'string' &&
        isAbsolute(cwd) &&
        difference !== '..' &&
        !difference.startsWith(`..${sep}`) &&
        !isAbsolute(difference) &&
        additionalPermissions == null &&
        networkApprovalContext == null &&
        (kind === undefined || kind === 'command');

      const decision = bounded && rule !== undefined ? rule.decision : 'decline';
      reason =
        rule === undefined
          ? 'No matching command authorization exists at this reply boundary.'
          : !bounded
            ? 'The requested additional permission or environment is outside the qualified scope.'
            : 'Applied the predeclared command decision without a session-wide grant.';

      if (rule?.decision === 'accept' && !bounded) {
        this.issues.push(reason);
      }
      response = { decision };
    } else if (method === 'item/fileChange/requestApproval') {
      response = { decision: 'decline' };
      reason = 'The script does not authorize expanding filesystem write access.';
    } else if (method === 'item/permissions/requestApproval') {
      response = {
        permissions: {},
        scope: 'turn',
        strictAutoReview: true,
      };
      reason = 'No additional permissions are granted by the evaluation driver.';
    } else {
      throw new Error(`Unsupported native server request: ${method}`);
    }
    await this._record({
      time: Date.now(),
      method,
      request: params,
      response,
      replyBoundary: this._replyBoundary,
      reason,
    });

    return response;
  }
}
