import type {
  Capability,
  ICaseMetadata,
  ILoadedCase,
  IRequirement,
  WorkFamily,
} from '../corpus/cases.ts';
import {
  type IQualitySummary,
  type ISelectedCheck,
  type ITrialQuality,
  summarizeQuality,
} from './quality.ts';
import type { IPlannedTrial, TrialExecutionStatus } from './records.ts';

export interface IQualityDimensions {
  allTrials: IQualitySummary;
  outcome: IQualitySummary;
  mechanism: IQualitySummary;
  workFamilies: Record<WorkFamily, IQualitySummary>;
}

export interface ICoverageCounts {
  planned: number;
  recorded: number;
  notRecorded: number;
  unknown: number;
  decidable: number;
}

export interface ICaseCoverage extends ICoverageCounts {
  caseId: string;
  assessment: ICaseMetadata['assessment'];
  workFamily: WorkFamily | null;
  requirementIds: readonly string[];
  checkIds: readonly string[];
  observedCheckIds: readonly string[];
  evidence: readonly string[];
}

export interface IRequirementCoverage extends ICoverageCounts {
  core: boolean;
  caseIds: readonly string[];
  requirementId: string;
  capability: Capability;
  authority: string;
  appliesWhen: string;
  requirementEvidence: string;
  checkIds: readonly string[];
  observedCheckIds: readonly string[];
  evidence: readonly string[];
}

export interface ICapabilityCoverage extends ICoverageCounts {
  capability: Capability;
  caseIds: readonly string[];
  requirementIds: readonly string[];
  checkIds: readonly string[];
  observedCheckIds: readonly string[];
  evidence: readonly string[];
}

export interface ICoverageReport {
  plannedCases: number;
  observedCases: number;
  notRecordedCases: number;
  cases: readonly ICaseCoverage[];
  requirements: readonly IRequirementCoverage[];
  capabilities: readonly ICapabilityCoverage[];
}

export interface ICoverageTrial {
  id: string;
  caseId: string;
  executionStatus: TrialExecutionStatus | 'not-recorded';
  quality: ITrialQuality;
}

interface IRequirementDefinition {
  core: boolean;
  requirement: IRequirement;
  checkIds: readonly string[];
}

interface IMutableCounts {
  planned: number;
  recorded: number;
  notRecorded: number;
  unknown: number;
  decidable: number;
}

interface IMutableCaseCoverage extends IMutableCounts {
  caseId: string;
  assessment: ICaseMetadata['assessment'];
  workFamily: WorkFamily | null;
  requirementIds: Set<string>;
  checkIds: Set<string>;
  observedCheckIds: Set<string>;
  evidence: Set<string>;
}

interface IMutableRequirementCoverage extends IMutableCounts {
  core: boolean;
  caseIds: Set<string>;
  requirementId: string;
  capability: Capability;
  authority: string;
  appliesWhen: string;
  requirementEvidence: string;
  checkIds: Set<string>;
  observedCheckIds: Set<string>;
  evidence: Set<string>;
}

interface IMutableCapabilityCoverage extends IMutableCounts {
  capability: Capability;
  caseIds: Set<string>;
  requirementIds: Set<string>;
  checkIds: Set<string>;
  observedCheckIds: Set<string>;
  evidence: Set<string>;
}

const workFamilies: readonly WorkFamily[] = [
  'planning',
  'implementation',
  'review',
  'documentation',
];

function emptyCounts(): IMutableCounts {
  return { planned: 0, recorded: 0, notRecorded: 0, unknown: 0, decidable: 0 };
}

function sorted(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].sort();
}

function counts(value: IMutableCounts): ICoverageCounts {
  return {
    planned: value.planned,
    recorded: value.recorded,
    notRecorded: value.notRecorded,
    unknown: value.unknown,
    decidable: value.decidable,
  };
}

function caseMap(cases: readonly ILoadedCase[]): Map<string, ILoadedCase> {
  const result = new Map<string, ILoadedCase>();

  for (const item of cases) {
    const id = item.definition.metadata.id;
    if (result.has(id)) {
      throw new Error(`Duplicate grading case: ${id}`);
    }

    result.set(id, item);
  }

  return result;
}

function qualityForRequirement(
  trial: ICoverageTrial,
  checkIds: readonly string[],
): { status: 'unknown' | 'decidable'; checks: readonly ISelectedCheck[] } {
  const mapped = trial.quality.checks.filter((check) => checkIds.includes(check.id));
  const core = mapped.filter((check) => check.core);
  const checks = core.length > 0 ? core : mapped;
  if (checks.length === 0) {
    return { status: 'unknown', checks: [] };
  }

  if (checks.some((check) => check.status === 'failed')) {
    return { status: 'decidable', checks };
  }

  if (checks.some((check) => check.status === 'unknown')) {
    return { status: 'unknown', checks };
  }

  return { status: 'decidable', checks };
}

function addObservedEvidence(
  target: { observedCheckIds: Set<string>; evidence: Set<string> },
  checks: readonly ISelectedCheck[],
): void {
  for (const check of checks) {
    if (check.gradingRecordId !== null) {
      target.observedCheckIds.add(check.id);
    }

    for (const evidence of check.evidence) {
      target.evidence.add(evidence);
    }
  }
}

function buildRequirementDefinitions(item: ILoadedCase): readonly IRequirementDefinition[] {
  const checksByRequirement = new Map<string, string[]>();

  for (const assertion of item.definition.assert) {
    for (const requirementId of assertion.config.requirements) {
      const checkIds = checksByRequirement.get(requirementId) ?? [];
      checkIds.push(assertion.metric);
      checksByRequirement.set(requirementId, checkIds);
    }
  }

  return item.definition.metadata.requirements.map((requirement) => ({
    requirement,
    core: item.definition.assert.some(
      (check) => check.config.core && check.config.requirements.includes(requirement.id),
    ),
    checkIds: sorted(checksByRequirement.get(requirement.id) ?? []),
  }));
}

function addCounts(target: IMutableCounts, source: IMutableCounts): void {
  target.planned += source.planned;
  target.recorded += source.recorded;
  target.notRecorded += source.notRecorded;
  target.unknown += source.unknown;
  target.decidable += source.decidable;
}

export function buildQualityDimensions(
  cases: readonly ILoadedCase[],
  qualityTrials: readonly ITrialQuality[],
): IQualityDimensions {
  const metadata = caseMap(cases);

  for (const trial of qualityTrials) {
    if (!metadata.has(trial.caseId)) {
      throw new Error(`Quality trial references unknown case: ${trial.caseId}`);
    }
  }

  const ordinary = qualityTrials.filter(
    (trial) => metadata.get(trial.caseId)?.definition.metadata.assessment === 'outcome',
  );
  const mechanism = qualityTrials.filter(
    (trial) => metadata.get(trial.caseId)?.definition.metadata.assessment === 'mechanism',
  );
  const familyEntries = Object.fromEntries(
    workFamilies.map((family) => [
      family,
      summarizeQuality(
        ordinary.filter(
          (trial) => metadata.get(trial.caseId)?.definition.metadata.workFamily === family,
        ),
      ),
    ]),
  ) as Record<WorkFamily, IQualitySummary>;

  return {
    allTrials: summarizeQuality(qualityTrials),
    outcome: summarizeQuality(ordinary),
    mechanism: summarizeQuality(mechanism),
    workFamilies: familyEntries,
  };
}

export function buildCoverageReport(input: {
  cases: readonly ILoadedCase[];
  trials: readonly IPlannedTrial[];
  observedTrials: readonly ICoverageTrial[];
}): ICoverageReport {
  const metadata = caseMap(input.cases);
  const trialsByCase = new Map<string, IPlannedTrial[]>();

  for (const trial of input.trials) {
    if (!metadata.has(trial.caseId)) {
      throw new Error(`Coverage trial references unknown case: ${trial.caseId}`);
    }

    const entries = trialsByCase.get(trial.caseId) ?? [];
    entries.push(trial);
    trialsByCase.set(trial.caseId, entries);
  }

  const observedByTrial = new Map<string, ICoverageTrial>();

  for (const trial of input.observedTrials) {
    if (observedByTrial.has(trial.id)) {
      throw new Error(`Duplicate coverage trial: ${trial.id}`);
    }

    const planned = input.trials.find((item) => item.id === trial.id);
    if (planned === undefined) {
      throw new Error(`Observed coverage trial is not planned: ${trial.id}`);
    }

    if (planned.caseId !== trial.caseId || trial.quality.caseId !== trial.caseId) {
      throw new Error(`Observed coverage trial does not match its planned case: ${trial.id}`);
    }

    observedByTrial.set(trial.id, trial);
  }

  const caseCoverage = new Map<string, IMutableCaseCoverage>();
  const requirementCoverage = new Map<string, IMutableRequirementCoverage>();
  const capabilityCoverage = new Map<string, IMutableCapabilityCoverage>();

  for (const item of input.cases) {
    const caseId = item.definition.metadata.id;
    const requirements = buildRequirementDefinitions(item);
    const caseResult: IMutableCaseCoverage = {
      ...emptyCounts(),
      caseId,
      assessment: item.definition.metadata.assessment,
      workFamily: item.definition.metadata.workFamily,
      requirementIds: new Set(requirements.map((entry) => entry.requirement.id)),
      checkIds: new Set(requirements.flatMap((entry) => entry.checkIds)),
      observedCheckIds: new Set(),
      evidence: new Set(),
    };

    const planned = trialsByCase.get(caseId) ?? [];

    for (const trial of planned) {
      caseResult.planned += 1;

      const observed = observedByTrial.get(trial.id);
      if (observed === undefined || observed.executionStatus === 'not-recorded') {
        caseResult.notRecorded += 1;
        continue;
      }

      caseResult.recorded += 1;
      if (observed.quality.status === 'unknown') {
        caseResult.unknown += 1;
      } else {
        caseResult.decidable += 1;
      }

      for (const requirementDefinition of requirements) {
        const result = qualityForRequirement(observed, requirementDefinition.checkIds);
        addObservedEvidence(caseResult, result.checks);
      }
    }

    caseCoverage.set(caseId, caseResult);

    for (const definition of requirements) {
      const key = JSON.stringify([caseId, definition.requirement.id]);
      const requirementResult: IMutableRequirementCoverage = {
        ...emptyCounts(),
        core: definition.core,
        caseIds: new Set([caseId]),
        requirementId: definition.requirement.id,
        capability: definition.requirement.capability,
        authority: definition.requirement.authority,
        appliesWhen: definition.requirement.appliesWhen,
        requirementEvidence: definition.requirement.evidence,
        checkIds: new Set(definition.checkIds),
        observedCheckIds: new Set(),
        evidence: new Set(),
      };

      for (const trial of trialsByCase.get(caseId) ?? []) {
        requirementResult.planned += 1;

        const observed = observedByTrial.get(trial.id);
        if (observed === undefined || observed.executionStatus === 'not-recorded') {
          requirementResult.notRecorded += 1;
          continue;
        }

        requirementResult.recorded += 1;
        const result = qualityForRequirement(observed, definition.checkIds);
        addObservedEvidence(requirementResult, result.checks);

        if (result.status === 'decidable') {
          requirementResult.decidable += 1;
        } else {
          requirementResult.unknown += 1;
        }
      }

      requirementCoverage.set(key, requirementResult);

      if (!definition.core) {
        continue;
      }

      const capability = capabilityCoverage.get(definition.requirement.capability) ?? {
        ...emptyCounts(),
        capability: definition.requirement.capability,
        caseIds: new Set<string>(),
        requirementIds: new Set<string>(),
        checkIds: new Set<string>(),
        observedCheckIds: new Set<string>(),
        evidence: new Set<string>(),
      };

      addCounts(capability, requirementResult);
      capability.caseIds.add(caseId);
      capability.requirementIds.add(definition.requirement.id);

      for (const checkId of definition.checkIds) {
        capability.checkIds.add(checkId);
      }

      for (const checkId of requirementResult.observedCheckIds) {
        capability.observedCheckIds.add(checkId);
      }

      for (const evidence of requirementResult.evidence) {
        capability.evidence.add(evidence);
      }

      capabilityCoverage.set(definition.requirement.capability, capability);
    }
  }

  const cases = [...caseCoverage.values()]
    .sort((left, right) => left.caseId.localeCompare(right.caseId))
    .map(
      (item): ICaseCoverage => ({
        ...counts(item),
        caseId: item.caseId,
        assessment: item.assessment,
        workFamily: item.workFamily,
        requirementIds: sorted(item.requirementIds),
        checkIds: sorted(item.checkIds),
        observedCheckIds: sorted(item.observedCheckIds),
        evidence: sorted(item.evidence),
      }),
    );

  const requirements = [...requirementCoverage.values()]
    .sort((left, right) => left.requirementId.localeCompare(right.requirementId))
    .map(
      (item): IRequirementCoverage => ({
        ...counts(item),
        core: item.core,
        caseIds: sorted(item.caseIds),
        requirementId: item.requirementId,
        capability: item.capability,
        authority: item.authority,
        appliesWhen: item.appliesWhen,
        requirementEvidence: item.requirementEvidence,
        checkIds: sorted(item.checkIds),
        observedCheckIds: sorted(item.observedCheckIds),
        evidence: sorted(item.evidence),
      }),
    );

  const capabilities = [...capabilityCoverage.values()]
    .sort((left, right) => left.capability.localeCompare(right.capability))
    .map(
      (item): ICapabilityCoverage => ({
        ...counts(item),
        capability: item.capability,
        caseIds: sorted(item.caseIds),
        requirementIds: sorted(item.requirementIds),
        checkIds: sorted(item.checkIds),
        observedCheckIds: sorted(item.observedCheckIds),
        evidence: sorted(item.evidence),
      }),
    );

  return {
    plannedCases: input.cases.length,
    observedCases: cases.filter((item) => item.evidence.length > 0).length,
    notRecordedCases: cases.filter((item) => item.notRecorded > 0).length,
    cases,
    requirements,
    capabilities,
  };
}
