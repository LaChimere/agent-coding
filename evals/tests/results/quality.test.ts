import { describe, expect, test } from 'bun:test';
import {
  buildQualityReport,
  type IGradingRecord,
  type ITrialDefinition,
  type ITrialQuality,
  type QualityStatus,
  summarizeQuality,
} from '../../src/results/quality.ts';

const trial: ITrialDefinition = {
  id: 'trial-a',
  caseId: 'case-a',
  criteria: [
    {
      id: 'task',
      definitionId: 'task-v1',
      core: true,
    },
    {
      id: 'explanation',
      definitionId: 'explanation-v1',
      core: false,
    },
  ],
};

function grade(id: string, status: QualityStatus, criterionId = 'task'): IGradingRecord {
  return {
    id,
    trialId: trial.id,
    criterionId,
    definitionId: `${criterionId}-v1`,
    status,
    reason: 'Supported by recorded evidence.',
    evidence: ['verification/result.json'],
    operationId: `operation-${id}`,
  };
}

describe('report judgment selection', () => {
  test('regrading changes only an explicitly rebuilt report, not samples or saved results', () => {
    const failed = grade('original', 'failed');
    const passed = grade('regraded', 'passed');
    const selection = { 'trial-a': { task: 'original' } };
    const original = buildQualityReport([trial], [failed], selection);
    const afterRegrade = buildQualityReport([trial], [failed, passed], selection);

    expect(afterRegrade).toEqual(original);
    expect(afterRegrade.summary.planned).toBe(1);
    const revised = buildQualityReport([trial], [failed, passed], {
      'trial-a': { task: 'regraded' },
    });

    expect(revised.summary.passed).toBe(1);
    expect(original.summary.failed).toBe(1);
  });

  test('diagnostics neither fail a supported task nor compensate for a core failure', () => {
    const passing = buildQualityReport(
      [trial],
      [grade('a', 'passed'), grade('b', 'failed', 'explanation')],
      {
        'trial-a': { task: 'a', explanation: 'b' },
      },
    );

    expect(passing.trials[0]?.status).toBe('passed');

    const failing = buildQualityReport(
      [trial],
      [grade('a', 'failed'), grade('b', 'passed', 'explanation')],
      {
        'trial-a': { task: 'a', explanation: 'b' },
      },
    );

    expect(failing.trials[0]?.status).toBe('failed');
  });

  test('missing selections and insufficient evidence remain unknown', () => {
    const missing = buildQualityReport([trial], [grade('unused', 'passed')], {});

    expect(missing.trials[0]?.status).toBe('unknown');
    expect(missing.trials[0]?.checks[0]?.gradingRecordId).toBeNull();
    const unknown = buildQualityReport([trial], [grade('inconclusive', 'unknown')], {
      'trial-a': { task: 'inconclusive' },
    });

    expect(unknown.summary).toMatchObject({
      unknown: 1,
      passRate: null,
      decisionCoverage: 0,
    });
  });

  test.each(['constructor', '__proto__'])('does not inherit a missing selection for %s', (id) => {
    const definition = {
      ...trial,
      id,
      criteria: [{ id, definitionId: 'criterion-v1', core: true }],
    };

    const absentTrial = buildQualityReport([definition], [], {});
    const absentCheck = buildQualityReport([definition], [], { [id]: {} });

    expect(absentTrial.summary.unknown).toBe(1);
    expect(absentCheck.summary.unknown).toBe(1);
    expect(absentCheck.trials[0]?.checks[0]?.gradingRecordId).toBeNull();
  });

  test('a proven core failure remains a failure when another core check is unknown', () => {
    const multiple: ITrialDefinition = {
      ...trial,
      criteria: [
        ...trial.criteria,
        {
          id: 'scope',
          definitionId: 'scope-v1',
          core: true,
        },
      ],
    };
    const report = buildQualityReport([multiple], [grade('failed', 'failed')], {
      'trial-a': { task: 'failed' },
    });

    expect(report.trials[0]?.status).toBe('failed');
  });

  test('invalid references are errors rather than missing judgments', () => {
    expect(() => buildQualityReport([trial], [], { 'trial-a': { task: 'missing' } })).toThrow(
      'Unknown grading record',
    );
    expect(() => buildQualityReport([trial], [], { other: {} })).toThrow('Unknown selected trial');
    expect(() => buildQualityReport([trial], [], { 'trial-a': { absent: 'grade' } })).toThrow(
      'Unknown selected check',
    );
  });

  test.each([
    { trialId: 'other-trial' },
    { criterionId: 'other-check' },
    { definitionId: 'task-v2' },
  ])('rejects a grading record with mismatched identity: %j', (override) => {
    expect(() =>
      buildQualityReport([trial], [{ ...grade('grade', 'passed'), ...override }], {
        'trial-a': { task: 'grade' },
      }),
    ).toThrow('does not match trial/check/definition');
  });

  test('empty core sets and ambiguous identifiers cannot produce automatic passes', () => {
    expect(() => buildQualityReport([{ ...trial, criteria: [] }], [], {})).toThrow(
      'no core criteria',
    );
    expect(() => buildQualityReport([trial, trial], [], {})).toThrow('Duplicate identifier');
    expect(() =>
      buildQualityReport([{ ...trial, criteria: [...trial.criteria, ...trial.criteria] }], [], {}),
    ).toThrow('Duplicate identifier');
    expect(() =>
      buildQualityReport([trial], [grade('same', 'passed'), grade('same', 'failed')], {}),
    ).toThrow('Duplicate identifier');
  });
});

describe('quality denominators', () => {
  test('reports decidable pass rate and decision coverage separately', () => {
    const statuses: QualityStatus[] = [
      'passed',
      'passed',
      'passed',
      'passed',
      'passed',
      'passed',
      'failed',
      'failed',
      'unknown',
      'unknown',
    ];
    const trials: ITrialQuality[] = statuses.map((status, index) => ({
      trialId: `trial-${index}`,
      caseId: `case-${index}`,
      status,
      checks: [],
    }));

    expect(summarizeQuality(trials)).toEqual({
      planned: 10,
      passed: 6,
      failed: 2,
      unknown: 2,
      decidable: 8,
      passRate: 0.75,
      decisionCoverage: 0.8,
    });
  });

  test('an empty report has unavailable rates', () => {
    expect(buildQualityReport([], [], {}).summary).toEqual({
      planned: 0,
      passed: 0,
      failed: 0,
      unknown: 0,
      decidable: 0,
      passRate: null,
      decisionCoverage: null,
    });
  });
});
