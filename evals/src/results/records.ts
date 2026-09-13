import type { ILoadedCase } from '../corpus/cases.ts';
import type { ICollectionSnapshot } from '../corpus/collections.ts';
import type { ISnapshot } from '../preparation/snapshot.ts';
import type { IGradingRecord, ITrialDefinition } from './quality.ts';
import type { IPriceBook } from './resources.ts';

export interface ICandidateSnapshot {
  id: string;
  label: string;
  source: string;
  runtimeDirectory: string;
  profileDirectory: string;
  inventory: ISnapshot;
  profileInventory: ISnapshot;
}

export interface IPlannedTrial extends ITrialDefinition {
  candidateId: string;
  caseVersion: string;
  executionVersion: string;
  repetition: number;
}

export interface IRunManifest {
  schema: 'codex-evals/run-v2';
  collection: ICollectionSnapshot;
  id: string;
  createdAt: number;
  concurrency: number;
  repetitions: number;
  codexExecutable: string;
  codexVersion: string;
  framework: { bun: string; promptfoo: string; implementationHash: string };
  judge: { model: 'gpt-6-astra'; reasoningEffort: 'high'; definitionId: string };
  candidates: ICandidateSnapshot[];
  cases: ILoadedCase[];
  trials: IPlannedTrial[];
  priceBook: IPriceBook;
}

export type TrialExecutionStatus = 'not-run' | 'completed' | 'error' | 'incomplete';

/** Final execution record. Grading never edits this record or its artifacts. */
export interface ITrialResult {
  id: string;
  status: TrialExecutionStatus;
  queuedAt: number;
  startedAt: number | null;
  endedAt: number | null;
  errors: string[];
  output: string;
  evidencePath: string | null;
  protocolPath: string | null;
  artifacts: { directory: string; inventory: ISnapshot } | null;
  threadIds: string[];
  turnIds: string[];
  operationIds: string[];
  /** Hash of observed runtime tool paths and version probes; null means unestablished. */
  environmentFingerprint: string | null;
}

export interface IStoredGrade extends IGradingRecord {
  method: 'programmatic' | 'text-rubric' | 'artifact-rubric';
  grader: {
    model: string | null;
    reasoningEffort: string | null;
    route: string;
    definitionId: string;
  };
  error: string | null;
}
