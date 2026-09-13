import { expect, test } from 'bun:test';
import type { ILoadedCase, IRequirement } from '../../src/corpus/cases.ts';
import {
  buildCoverageReport,
  buildQualityDimensions,
  type ICoverageTrial,
} from '../../src/results/coverage.ts';
import type { ISelectedCheck, ITrialQuality } from '../../src/results/quality.ts';
import type { IPlannedTrial } from '../../src/results/records.ts';

function requirement(id: string, capability: IRequirement['capability']): IRequirement {
  return {
    id,
    capability,
    authority: `authority for ${id}`,
    appliesWhen: `when ${id} applies`,
    evidence: `evidence for ${id}`,
  };
}

function loadedCase(
  caseId: string,
  assessment: 'outcome' | 'mechanism',
  workFamily: 'planning' | 'implementation' | 'review' | 'documentation' | null,
  caseRequirement: IRequirement,
): ILoadedCase {
  return {
    definition: {
      description: caseId,
      vars: { task: caseId },
      metadata: {
        id: caseId,
        group: 'coverage-tests',
        kind: 'task',
        assessment,
        workFamily,
        provenance: { source: 'tests', group: 'coverage' },
        requirements: [caseRequirement],
        fixture: [],
        execution: { networkAccess: false, pathPrepend: [], executableFiles: [] },
        reference: '',
        requiredSkills: [],
        turns: [],
        authorization: { scope: 'coverage test', approvals: [] },
        outputSchema: null,
      },
      assert: [
        {
          type: 'javascript',
          value: 'file://grader.ts',
          metric: `check-${caseId}`,
          config: {
            core: true,
            method: 'programmatic',
            requirements: [caseRequirement.id],
            rubric: 'The check is satisfied.',
          },
        },
      ],
    },
    version: `${caseId}-v1`,
    executionVersion: `${caseId}-execution`,
    source: `tests/${caseId}.json`,
  };
}

function trial(id: string, caseId: string): IPlannedTrial {
  return {
    id,
    caseId,
    candidateId: 'candidate',
    caseVersion: `${caseId}-v1`,
    executionVersion: `${caseId}-execution`,
    repetition: 0,
    criteria: [{ id: `check-${caseId}`, definitionId: 'rubric-v1', core: true }],
  };
}

function quality(
  trialId: string,
  caseId: string,
  status: ITrialQuality['status'],
  gradingRecordId: string | null,
): ITrialQuality {
  const check: ISelectedCheck = {
    id: `check-${caseId}`,
    definitionId: 'rubric-v1',
    core: true,
    gradingRecordId,
    status,
    reason: `The check is ${status}.`,
    evidence: gradingRecordId === null ? [] : [`evidence/${trialId}.json`],
  };
  return { trialId, caseId, status, checks: [check] };
}

test('separates ordinary and mechanism quality across all four work-family summaries', () => {
  const cases = [
    loadedCase('planning', 'outcome', 'planning', requirement('plan', 'planning')),
    loadedCase(
      'implementation',
      'outcome',
      'implementation',
      requirement('implement', 'implementation'),
    ),
    loadedCase('review', 'outcome', 'review', requirement('review', 'review')),
    loadedCase(
      'documentation',
      'outcome',
      'documentation',
      requirement('document', 'documentation'),
    ),
    loadedCase('mechanism', 'mechanism', null, requirement('mechanism', 'skill-mechanism')),
  ];
  const qualities = [
    quality('trial-planning', 'planning', 'passed', 'grade-planning'),
    quality('trial-implementation', 'implementation', 'failed', 'grade-implementation'),
    quality('trial-review', 'review', 'unknown', null),
    quality('trial-documentation', 'documentation', 'passed', 'grade-documentation'),
    quality('trial-mechanism', 'mechanism', 'failed', 'grade-mechanism'),
  ];

  const dimensions = buildQualityDimensions(cases, qualities);

  expect(dimensions.allTrials).toMatchObject({ planned: 5, passed: 2, failed: 2, unknown: 1 });
  expect(dimensions.outcome).toMatchObject({ planned: 4, passed: 2, failed: 1, unknown: 1 });
  expect(dimensions.mechanism).toMatchObject({ planned: 1, passed: 0, failed: 1, unknown: 0 });
  expect(Object.keys(dimensions.workFamilies)).toEqual([
    'planning',
    'implementation',
    'review',
    'documentation',
  ]);
  expect(dimensions.workFamilies.review).toMatchObject({ planned: 1, unknown: 1, decidable: 0 });
});

test('maps requirements to checks and evidence while distinguishing planned, unrecorded and unknown', () => {
  const ordinaryRequirement = requirement('ordinary-requirement', 'authorization');
  const mechanismRequirement = requirement('role-evidence', 'delegation');
  const cases = [
    loadedCase('ordinary', 'outcome', 'implementation', ordinaryRequirement),
    loadedCase('mechanism', 'mechanism', null, mechanismRequirement),
  ];
  const trials = [
    trial('ordinary-recorded', 'ordinary'),
    trial('ordinary-missing', 'ordinary'),
    trial('mechanism-recorded', 'mechanism'),
  ];
  const observedTrials: readonly ICoverageTrial[] = [
    {
      id: 'ordinary-recorded',
      caseId: 'ordinary',
      executionStatus: 'completed',
      quality: quality('ordinary-recorded', 'ordinary', 'passed', 'grade-ordinary'),
    },
    {
      id: 'mechanism-recorded',
      caseId: 'mechanism',
      executionStatus: 'completed',
      quality: quality('mechanism-recorded', 'mechanism', 'unknown', null),
    },
  ];

  const coverage = buildCoverageReport({ cases, trials, observedTrials });
  const ordinary = coverage.requirements.find(
    (item) => item.requirementId === 'ordinary-requirement',
  );
  const mechanism = coverage.requirements.find((item) => item.requirementId === 'role-evidence');
  const delegation = coverage.capabilities.find((item) => item.capability === 'delegation');

  expect(ordinary).toMatchObject({
    planned: 2,
    recorded: 1,
    notRecorded: 1,
    unknown: 0,
    decidable: 1,
    caseIds: ['ordinary'],
    checkIds: ['check-ordinary'],
    observedCheckIds: ['check-ordinary'],
    evidence: ['evidence/ordinary-recorded.json'],
    authority: 'authority for ordinary-requirement',
  });
  expect(mechanism).toMatchObject({
    planned: 1,
    recorded: 1,
    notRecorded: 0,
    unknown: 1,
    decidable: 0,
    authority: 'authority for role-evidence',
    requirementEvidence: 'evidence for role-evidence',
  });
  expect(delegation).toMatchObject({
    caseIds: ['mechanism'],
    requirementIds: ['role-evidence'],
    checkIds: ['check-mechanism'],
    observedCheckIds: [],
    unknown: 1,
  });
  expect(coverage).toMatchObject({ plannedCases: 2, observedCases: 1, notRecordedCases: 1 });
});

test('diagnostic-only observations do not qualify a required capability', () => {
  const item = loadedCase(
    'work',
    'outcome',
    'implementation',
    requirement('result', 'implementation'),
  );
  item.definition.metadata.requirements.push(requirement('optional-discussion', 'delegation'));
  const assertion = item.definition.assert[0];
  if (assertion === undefined) {
    throw new Error('Missing fixture assertion.');
  }
  item.definition.assert.push({
    ...assertion,
    metric: 'discussion',
    config: { ...assertion.config, core: false, requirements: ['optional-discussion'] },
  });
  const planned = trial('attempt', 'work');
  const observation = quality('attempt', 'work', 'passed', 'grade-work');
  observation.checks = [
    ...observation.checks,
    {
      id: 'discussion',
      definitionId: 'diagnostic',
      core: false,
      gradingRecordId: 'grade-discussion',
      status: 'passed',
      reason: 'An optional discussion occurred.',
      evidence: ['discussion.json'],
    },
  ];

  const report = buildCoverageReport({
    cases: [item],
    trials: [planned],
    observedTrials: [
      { id: 'attempt', caseId: 'work', executionStatus: 'completed', quality: observation },
    ],
  });

  expect(
    report.requirements.find((entry) => entry.requirementId === 'optional-discussion'),
  ).toMatchObject({ core: false, decidable: 1 });
  expect(report.capabilities.map((entry) => entry.capability)).toEqual(['implementation']);
});
