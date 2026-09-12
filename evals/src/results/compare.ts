import type { IQualitySummary, QualityStatus } from './quality.ts';
import type { IReport, IReportTrial } from './report.ts';
import type { IResourceMeasurement } from './resources.ts';

export interface ITrialPair {
  leftTrialId: string;
  rightTrialId: string;
}

export interface IComparisonExclusion {
  leftTrialId: string;
  rightTrialId: string;
  reasons: readonly string[];
}

export interface IComparisonConditions {
  comparable: boolean;
  reasons: readonly string[];
}

export interface IQualityPairComparison {
  plannedPairs: number;
  eligiblePairs: number;
  excludedPairs: readonly IComparisonExclusion[];
  leftPassed: number;
  leftFailed: number;
  rightPassed: number;
  rightFailed: number;
  leftPassRate: number | null;
  rightPassRate: number | null;
  passRateDelta: number | null;
}

export type ResourceMetricName =
  | 'operationDuration'
  | 'wallElapsed'
  | 'usage.input'
  | 'usage.output'
  | 'usage.cachedInput'
  | 'usage.reasoningOutput'
  | 'usage.total'
  | 'estimatedCost'
  | 'actualCost';

export interface IResourceMetricComparison {
  metric: ResourceMetricName;
  plannedPairs: number;
  eligiblePairs: number;
  excludedPairs: readonly IComparisonExclusion[];
  leftTotal: number | null;
  rightTotal: number | null;
  delta: number | null;
  currency: string | null;
  qualityGroups: readonly IResourceQualityGroup[];
}

export interface IResourceQualityGroup {
  leftStatus: QualityStatus;
  rightStatus: QualityStatus;
  pairs: number;
  leftTotal: number;
  rightTotal: number;
  delta: number;
  qualityComparable: boolean;
  qualityExclusionReasons: readonly string[];
}

export interface IOneSidedComparisonSummary {
  reportId: string;
  runId: string;
  quality: IQualitySummary;
  resources: IReport['summary']['resources'];
}

export interface IComparisonReport {
  schema: 'codex-evals/comparison-v1';
  left: IOneSidedComparisonSummary;
  right: IOneSidedComparisonSummary;
  conditions: IComparisonConditions;
  pairs: readonly ITrialPair[];
  quality: IQualityPairComparison;
  resources: readonly IResourceMetricComparison[];
}

function deepFreeze<TValue>(value: TValue): TValue {
  const copy = structuredClone(value);

  const visit = (item: unknown): void => {
    if (item === null || typeof item !== 'object' || Object.isFrozen(item)) {
      return;
    }
    for (const child of Object.values(item)) {
      visit(child);
    }
    Object.freeze(item);
  };

  visit(copy);

  return copy;
}

function uniqueReasons(reasons: readonly string[]): readonly string[] {
  return [...new Set(reasons.filter((reason) => reason.length > 0))];
}

function trialMap(report: IReport): Map<string, IReportTrial> {
  return new Map(report.trials.map((trial) => [trial.id, trial]));
}

function criterionSignature(trial: IReportTrial): string {
  return trial.quality.checks
    .map((check) => `${check.id}:${check.definitionId}:${check.core ? 'core' : 'diagnostic'}`)
    .sort()
    .join('|');
}

function globalConditionReasons(left: IReport, right: IReport): readonly string[] {
  const reasons: string[] = [];

  const compare = (label: string, leftValue: unknown, rightValue: unknown): void => {
    if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
      reasons.push(`${label} differs.`);
    }
  };

  compare('Concurrency', left.manifest.concurrency, right.manifest.concurrency);
  compare('Repetitions', left.manifest.repetitions, right.manifest.repetitions);
  compare('Codex executable', left.manifest.codexExecutable, right.manifest.codexExecutable);
  compare('Codex version', left.manifest.codexVersion, right.manifest.codexVersion);
  compare('Framework versions', left.manifest.framework, right.manifest.framework);

  return uniqueReasons(reasons);
}

function selectedGrade(
  report: IReport,
  trialId: string,
  criterionId: string,
): IReport['grades'][number] | undefined {
  const gradeId = report.definition.gradingSelection[trialId]?.[criterionId];
  if (gradeId === undefined) {
    return undefined;
  }
  return report.grades.find((grade) => grade.id === gradeId);
}

function pairConditionReasons(
  leftReport: IReport,
  rightReport: IReport,
  left: IReportTrial,
  right: IReportTrial,
  includeGraderConfiguration: boolean,
): readonly string[] {
  const reasons: string[] = [];
  if (left.environmentFingerprint == null || right.environmentFingerprint == null) {
    reasons.push('Observed runtime tool conditions are unavailable.');
  } else if (left.environmentFingerprint !== right.environmentFingerprint) {
    reasons.push('Observed runtime tool conditions differ.');
  }
  if (left.executionVersion !== right.executionVersion) {
    reasons.push('Execution version differs.');
  }
  if (left.caseId !== right.caseId) {
    reasons.push('Case id differs.');
  }
  if (criterionSignature(left) !== criterionSignature(right)) {
    reasons.push('Criterion definition set differs.');
  }
  if (includeGraderConfiguration) {
    const criterionIds = new Set([
      ...left.quality.checks.filter((check) => check.core).map((check) => check.id),
      ...right.quality.checks.filter((check) => check.core).map((check) => check.id),
    ]);
    for (const criterionId of criterionIds) {
      const leftGrade = selectedGrade(leftReport, left.id, criterionId);
      const rightGrade = selectedGrade(rightReport, right.id, criterionId);

      const leftConfiguration =
        leftGrade === undefined
          ? null
          : [
              leftGrade.definitionId,
              leftGrade.grader.definitionId,
              leftGrade.grader.model,
              leftGrade.grader.reasoningEffort,
              leftGrade.grader.route,
            ];

      const rightConfiguration =
        rightGrade === undefined
          ? null
          : [
              rightGrade.definitionId,
              rightGrade.grader.definitionId,
              rightGrade.grader.model,
              rightGrade.grader.reasoningEffort,
              rightGrade.grader.route,
            ];

      if (JSON.stringify(leftConfiguration) !== JSON.stringify(rightConfiguration)) {
        reasons.push(`Selected grader configuration differs for ${criterionId}.`);
      }
    }
  }

  return uniqueReasons(reasons);
}

function qualityStatus(value: QualityStatus): value is 'passed' | 'failed' {
  return value === 'passed' || value === 'failed';
}

function qualityComparison(
  pairs: readonly ITrialPair[],
  leftReport: IReport,
  rightReport: IReport,
  leftTrials: ReadonlyMap<string, IReportTrial>,
  rightTrials: ReadonlyMap<string, IReportTrial>,
  globalReasons: readonly string[],
): IQualityPairComparison {
  const excluded: IComparisonExclusion[] = [];
  let leftPassed = 0;
  let leftFailed = 0;
  let rightPassed = 0;
  let rightFailed = 0;

  for (const pair of pairs) {
    const left = leftTrials.get(pair.leftTrialId);
    const right = rightTrials.get(pair.rightTrialId);

    const reasons = [
      ...globalReasons,
      ...(left === undefined || right === undefined
        ? ['A paired trial is unavailable.']
        : pairConditionReasons(leftReport, rightReport, left, right, true)),
    ];

    if (left !== undefined && right !== undefined) {
      if (!qualityStatus(left.quality.status) || !qualityStatus(right.quality.status)) {
        reasons.push('Both selected trial judgments must be decidable.');
      }
    }
    if (reasons.length > 0) {
      excluded.push({
        leftTrialId: pair.leftTrialId,
        rightTrialId: pair.rightTrialId,
        reasons,
      });
      continue;
    }
    if (left?.quality.status === 'passed') {
      leftPassed += 1;
    }
    if (left?.quality.status === 'failed') {
      leftFailed += 1;
    }
    if (right?.quality.status === 'passed') {
      rightPassed += 1;
    }
    if (right?.quality.status === 'failed') {
      rightFailed += 1;
    }
  }

  const leftDecidable = leftPassed + leftFailed;
  const rightDecidable = rightPassed + rightFailed;
  const leftPassRate = leftDecidable === 0 ? null : leftPassed / leftDecidable;
  const rightPassRate = rightDecidable === 0 ? null : rightPassed / rightDecidable;

  return {
    plannedPairs: pairs.length,
    eligiblePairs: pairs.length - excluded.length,
    excludedPairs: excluded,
    leftPassed,
    leftFailed,
    rightPassed,
    rightFailed,
    leftPassRate,
    rightPassRate,
    passRateDelta:
      leftPassRate === null || rightPassRate === null ? null : rightPassRate - leftPassRate,
  };
}

interface IMetricSample {
  measurement: IResourceMeasurement;
  currency: string | null;
}

function metricSample(trial: IReportTrial, metric: ResourceMetricName): IMetricSample {
  if (metric === 'operationDuration') {
    return { measurement: trial.resources.operationDuration, currency: null };
  }
  if (metric === 'wallElapsed') {
    return { measurement: trial.resources.wallElapsed, currency: null };
  }
  if (metric === 'estimatedCost') {
    return {
      measurement: trial.resources.estimatedCost,
      currency: trial.resources.estimatedCost.currency,
    };
  }
  if (metric === 'actualCost') {
    return {
      measurement: trial.resources.actualCost,
      currency: trial.resources.actualCost.currency,
    };
  }

  const key = metric.slice('usage.'.length) as keyof typeof trial.resources.usage;

  return { measurement: trial.resources.usage[key], currency: null };
}

function isCostMetric(metric: ResourceMetricName): boolean {
  return metric === 'estimatedCost' || metric === 'actualCost';
}

function isUnitNeutral(sample: IMetricSample): boolean {
  return (
    sample.currency === null &&
    sample.measurement.value === 0 &&
    sample.measurement.coverage === 'complete'
  );
}

function compatibleCurrencies(left: IMetricSample, right: IMetricSample): boolean {
  return left.currency === right.currency || isUnitNeutral(left) || isUnitNeutral(right);
}

function expectedCurrency(
  metric: ResourceMetricName,
  pairs: readonly ITrialPair[],
  leftReport: IReport,
  rightReport: IReport,
  leftTrials: ReadonlyMap<string, IReportTrial>,
  rightTrials: ReadonlyMap<string, IReportTrial>,
): { currency: string | null; multiple: boolean } {
  if (!isCostMetric(metric)) {
    return { currency: null, multiple: false };
  }

  const currencies = new Set<string>();

  for (const pair of pairs) {
    const left = leftTrials.get(pair.leftTrialId);
    const right = rightTrials.get(pair.rightTrialId);
    if (left === undefined || right === undefined) {
      continue;
    }

    const pairReasons = [
      ...globalConditionReasons(leftReport, rightReport),
      ...pairConditionReasons(leftReport, rightReport, left, right, false),
    ];

    const leftSample = metricSample(left, metric);
    const rightSample = metricSample(right, metric);
    if (
      pairReasons.length === 0 &&
      leftSample.measurement.coverage === 'complete' &&
      rightSample.measurement.coverage === 'complete' &&
      leftSample.measurement.value !== null &&
      rightSample.measurement.value !== null &&
      compatibleCurrencies(leftSample, rightSample) &&
      (metric !== 'estimatedCost' ||
        JSON.stringify(leftReport.definition.priceBook) ===
          JSON.stringify(rightReport.definition.priceBook))
    ) {
      if (leftSample.currency !== null) {
        currencies.add(leftSample.currency);
      }
      if (rightSample.currency !== null) {
        currencies.add(rightSample.currency);
      }
    }
  }

  if (currencies.size > 1) {
    return { currency: null, multiple: true };
  }

  return { currency: currencies.values().next().value ?? null, multiple: false };
}

function resourceMetricComparison(
  metric: ResourceMetricName,
  pairs: readonly ITrialPair[],
  leftReport: IReport,
  rightReport: IReport,
  leftTrials: ReadonlyMap<string, IReportTrial>,
  rightTrials: ReadonlyMap<string, IReportTrial>,
  globalReasons: readonly string[],
  qualityGlobalReasons: readonly string[],
): IResourceMetricComparison {
  const excluded: IComparisonExclusion[] = [];
  let leftTotal = 0;
  let rightTotal = 0;
  let currency: string | null = null;

  const currencySelection = expectedCurrency(
    metric,
    pairs,
    leftReport,
    rightReport,
    leftTrials,
    rightTrials,
  );

  const qualityGroups = new Map<string, IResourceQualityGroup>();

  for (const pair of pairs) {
    const left = leftTrials.get(pair.leftTrialId);
    const right = rightTrials.get(pair.rightTrialId);

    const reasons = [
      ...globalReasons,
      ...(left === undefined || right === undefined
        ? ['A paired trial is unavailable.']
        : pairConditionReasons(leftReport, rightReport, left, right, false)),
    ];

    const qualityReasons = [
      ...qualityGlobalReasons,
      ...(left === undefined || right === undefined
        ? ['A paired trial is unavailable.']
        : pairConditionReasons(leftReport, rightReport, left, right, true)),
    ];

    if (left !== undefined && right !== undefined) {
      const leftSample = metricSample(left, metric);
      const rightSample = metricSample(right, metric);
      if (leftSample.measurement.coverage !== 'complete') {
        reasons.push(`Left ${metric} coverage is ${leftSample.measurement.coverage}.`);
      }
      if (rightSample.measurement.coverage !== 'complete') {
        reasons.push(`Right ${metric} coverage is ${rightSample.measurement.coverage}.`);
      }
      if (leftSample.measurement.value === null || rightSample.measurement.value === null) {
        reasons.push(`${metric} is unavailable on one side.`);
      }
      if (isCostMetric(metric)) {
        if (
          metric === 'estimatedCost' &&
          JSON.stringify(leftReport.definition.priceBook) !==
            JSON.stringify(rightReport.definition.priceBook)
        ) {
          reasons.push('estimatedCost price books differ.');
        }
        if (!compatibleCurrencies(leftSample, rightSample)) {
          reasons.push(`${metric} currencies differ.`);
        }
        if (currencySelection.multiple) {
          reasons.push(`${metric} has multiple eligible currencies; aggregate unavailable.`);
        } else if (
          currencySelection.currency !== null &&
          ((!isUnitNeutral(leftSample) && leftSample.currency !== currencySelection.currency) ||
            (!isUnitNeutral(rightSample) && rightSample.currency !== currencySelection.currency))
        ) {
          reasons.push(`${metric} currency differs across eligible pairs.`);
        }
        if (
          (leftSample.measurement.value !== 0 && leftSample.currency === null) ||
          (rightSample.measurement.value !== 0 && rightSample.currency === null)
        ) {
          reasons.push(`${metric} currency is missing.`);
        }
      }
      if (reasons.length === 0) {
        leftTotal += leftSample.measurement.value ?? 0;
        rightTotal += rightSample.measurement.value ?? 0;
        currency ??= leftSample.currency ?? rightSample.currency;
        const key = `${left.quality.status}->${right.quality.status}`;

        const qualityExclusionReasons = uniqueReasons([
          ...qualityReasons,
          ...(!qualityStatus(left.quality.status) || !qualityStatus(right.quality.status)
            ? ['Both selected trial judgments must be decidable.']
            : []),
        ]);

        const existing = qualityGroups.get(key);
        if (existing === undefined) {
          qualityGroups.set(key, {
            leftStatus: left.quality.status,
            rightStatus: right.quality.status,
            pairs: 1,
            leftTotal: leftSample.measurement.value ?? 0,
            rightTotal: rightSample.measurement.value ?? 0,
            delta: (rightSample.measurement.value ?? 0) - (leftSample.measurement.value ?? 0),
            qualityComparable: qualityExclusionReasons.length === 0,
            qualityExclusionReasons,
          });
        } else {
          existing.pairs += 1;
          existing.leftTotal += leftSample.measurement.value ?? 0;
          existing.rightTotal += rightSample.measurement.value ?? 0;
          existing.delta = existing.rightTotal - existing.leftTotal;
          existing.qualityComparable =
            existing.qualityComparable && qualityExclusionReasons.length === 0;
          existing.qualityExclusionReasons = uniqueReasons([
            ...existing.qualityExclusionReasons,
            ...qualityExclusionReasons,
          ]);
        }
        continue;
      }
    }
    excluded.push({
      leftTrialId: pair.leftTrialId,
      rightTrialId: pair.rightTrialId,
      reasons,
    });
  }

  return {
    metric,
    plannedPairs: pairs.length,
    eligiblePairs: pairs.length - excluded.length,
    excludedPairs: excluded,
    leftTotal: excluded.length === pairs.length ? null : leftTotal,
    rightTotal: excluded.length === pairs.length ? null : rightTotal,
    delta: excluded.length === pairs.length ? null : rightTotal - leftTotal,
    currency,
    qualityGroups: [...qualityGroups.values()],
  };
}

export function compareReports(input: {
  left: IReport;
  right: IReport;
  pairs: readonly ITrialPair[];
}): IComparisonReport {
  const leftTrials = trialMap(input.left);
  const rightTrials = trialMap(input.right);
  const leftSeen = new Set<string>();
  const rightSeen = new Set<string>();

  for (const pair of input.pairs) {
    if (leftSeen.has(pair.leftTrialId)) {
      throw new Error(`Duplicate left trial pairing: ${pair.leftTrialId}`);
    }
    if (rightSeen.has(pair.rightTrialId)) {
      throw new Error(`Duplicate right trial pairing: ${pair.rightTrialId}`);
    }
    if (!leftTrials.has(pair.leftTrialId)) {
      throw new Error(`Unknown left trial: ${pair.leftTrialId}`);
    }
    if (!rightTrials.has(pair.rightTrialId)) {
      throw new Error(`Unknown right trial: ${pair.rightTrialId}`);
    }
    leftSeen.add(pair.leftTrialId);
    rightSeen.add(pair.rightTrialId);
  }

  const qualityGlobalReasons = globalConditionReasons(input.left, input.right);
  const resourceGlobalReasons = qualityGlobalReasons;

  const quality = qualityComparison(
    input.pairs,
    input.left,
    input.right,
    leftTrials,
    rightTrials,
    qualityGlobalReasons,
  );

  const metrics: readonly ResourceMetricName[] = [
    'operationDuration',
    'wallElapsed',
    'usage.input',
    'usage.output',
    'usage.cachedInput',
    'usage.reasoningOutput',
    'usage.total',
    'estimatedCost',
    'actualCost',
  ];

  const resources = metrics.map((metric) =>
    resourceMetricComparison(
      metric,
      input.pairs,
      input.left,
      input.right,
      leftTrials,
      rightTrials,
      resourceGlobalReasons,
      qualityGlobalReasons,
    ),
  );

  return deepFreeze({
    schema: 'codex-evals/comparison-v1',
    left: {
      reportId: input.left.id,
      runId: input.left.runId,
      quality: input.left.quality.summary,
      resources: input.left.summary.resources,
    },
    right: {
      reportId: input.right.id,
      runId: input.right.runId,
      quality: input.right.quality.summary,
      resources: input.right.summary.resources,
    },
    conditions: {
      comparable: qualityGlobalReasons.length === 0,
      reasons: qualityGlobalReasons,
    },
    pairs: input.pairs,
    quality,
    resources,
  });
}
