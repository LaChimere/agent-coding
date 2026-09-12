export type QualityStatus = 'passed' | 'failed' | 'unknown';

export interface ICriterion {
  id: string;
  definitionId: string;
  core: boolean;
}

export interface ITrialDefinition {
  id: string;
  caseId: string;
  criteria: readonly ICriterion[];
}

export interface IGradingRecord {
  id: string;
  trialId: string;
  criterionId: string;
  definitionId: string;
  status: QualityStatus;
  reason: string;
  evidence: readonly string[];
  operationId: string;
}

export interface ISelectedCheck extends ICriterion {
  gradingRecordId: string | null;
  status: QualityStatus;
  reason: string;
  evidence: readonly string[];
}

export interface ITrialQuality {
  trialId: string;
  caseId: string;
  status: QualityStatus;
  checks: readonly ISelectedCheck[];
}

export interface IQualitySummary {
  planned: number;
  passed: number;
  failed: number;
  unknown: number;
  decidable: number;
  passRate: number | null;
  decisionCoverage: number | null;
}

export type GradingSelection = Readonly<Record<string, Readonly<Record<string, string>>>>;

function indexUnique<TValue>(values: readonly TValue[], getId: (value: TValue) => string) {
  const index = new Map<string, TValue>();
  for (const value of values) {
    const id = getId(value);
    if (index.has(id)) {
      throw new Error(`Duplicate identifier: ${id}`);
    }
    index.set(id, value);
  }
  return index;
}

function selectCheck(
  trialId: string,
  criterion: ICriterion,
  selection: Readonly<Record<string, string>>,
  records: ReadonlyMap<string, IGradingRecord>,
): ISelectedCheck {
  const selectedId = Object.hasOwn(selection, criterion.id) ? selection[criterion.id] : undefined;
  if (selectedId === undefined) {
    return {
      ...criterion,
      gradingRecordId: null,
      status: 'unknown',
      reason: 'No grading record selected.',
      evidence: [],
    };
  }

  const record = records.get(selectedId);
  if (record === undefined) {
    throw new Error(`Unknown grading record: ${selectedId}`);
  }
  if (
    record.trialId !== trialId ||
    record.criterionId !== criterion.id ||
    record.definitionId !== criterion.definitionId
  ) {
    throw new Error(`Grading record ${selectedId} does not match trial/check/definition.`);
  }

  return {
    ...criterion,
    gradingRecordId: record.id,
    status: record.status,
    reason: record.reason,
    evidence: [...record.evidence],
  };
}

export function summarizeQuality(trials: readonly ITrialQuality[]): IQualitySummary {
  const passed = trials.filter((trial) => trial.status === 'passed').length;
  const failed = trials.filter((trial) => trial.status === 'failed').length;
  const decidable = passed + failed;

  return {
    planned: trials.length,
    passed,
    failed,
    unknown: trials.length - decidable,
    decidable,
    passRate: decidable === 0 ? null : passed / decidable,
    decisionCoverage: trials.length === 0 ? null : decidable / trials.length,
  };
}

/** Resolve only the explicit selection; historical grades never become extra samples. */
export function buildQualityReport(
  definitions: readonly ITrialDefinition[],
  grades: readonly IGradingRecord[],
  selections: GradingSelection,
): { trials: ITrialQuality[]; summary: IQualitySummary } {
  const trialsById = indexUnique(definitions, (trial) => trial.id);
  const records = indexUnique(grades, (record) => record.id);

  for (const trialId of Object.keys(selections)) {
    if (!trialsById.has(trialId)) {
      throw new Error(`Unknown selected trial: ${trialId}`);
    }
  }

  const trials = definitions.map((trial): ITrialQuality => {
    const criteria = indexUnique(trial.criteria, (criterion) => criterion.id);
    if (!trial.criteria.some((criterion) => criterion.core)) {
      throw new Error(`Trial ${trial.id} has no core criteria.`);
    }

    const selection = Object.hasOwn(selections, trial.id) ? (selections[trial.id] ?? {}) : {};

    for (const criterionId of Object.keys(selection)) {
      if (!criteria.has(criterionId)) {
        throw new Error(`Unknown selected check: ${criterionId}`);
      }
    }

    const checks = trial.criteria.map((criterion) =>
      selectCheck(trial.id, criterion, selection, records),
    );
    const core = checks.filter((check) => check.core);

    const status = core.some((check) => check.status === 'failed')
      ? 'failed'
      : core.some((check) => check.status === 'unknown')
        ? 'unknown'
        : 'passed';

    return {
      trialId: trial.id,
      caseId: trial.caseId,
      status,
      checks,
    };
  });

  return { trials, summary: summarizeQuality(trials) };
}
