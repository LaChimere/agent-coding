import type { IGradeRubricInput, IGradeRubricResult } from '../../src/grading/rubric.ts';

let started = 0;
const bothStarted = Promise.withResolvers<void>();

export async function gradeRubric(input: IGradeRubricInput): Promise<IGradeRubricResult> {
  const startedAt = Date.now();
  const interrupt = input.rubric === 'interrupt';

  if (interrupt) {
    const signal = input.signal;
    if (signal === undefined) {
      throw new Error('The cancellation fixture requires a signal.');
    }

    const aborted = signal.aborted
      ? Promise.resolve()
      : new Promise<void>((resolve) =>
          signal.addEventListener('abort', () => resolve(), { once: true }),
        );

    started += 1;
    if (started === 2) {
      bothStarted.resolve();
    }
    await bothStarted.promise;

    if (input.method === 'text-rubric') {
      process.kill(process.pid, 'SIGINT');
      await aborted;
    } else {
      await aborted;
      // Keep one owned operation in flight while the other row handles cancellation.
      await Bun.sleep(1_000);
    }
  }

  return {
    status: interrupt ? 'unknown' : 'passed',
    reason: 'Deterministic fixture',
    evidence: ['fixture'],
    error: interrupt ? 'Fixture interrupted.' : null,
    grader: {
      model: 'gpt-6-astra',
      reasoningEffort: 'high',
      route: 'fixture',
      definitionId: 'fixture',
    },
    operation: {
      id: input.id,
      trialId: input.trialId,
      phase: 'grading',
      status: interrupt ? 'incomplete' : 'completed',
      usesModel: true,
      startedAt,
      endedAt: Date.now(),
      observations: [
        {
          id: input.id,
          actorId: input.id,
          model: 'gpt-6-astra',
          threadId: null,
          turnId: null,
          kind: 'delta',
          observedAt: startedAt,
          evidenceSource: 'fixture',
          includedActorIds: [],
          usage: { input: 10, cachedInput: 0, output: 1, reasoningOutput: 0 },
        },
      ],
    },
  };
}
