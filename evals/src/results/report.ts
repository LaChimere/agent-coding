import {
  buildQualityReport,
  type GradingSelection,
  type IQualitySummary,
  type ITrialQuality,
} from './quality.ts';
import type {
  IPlannedTrial,
  IRunManifest,
  IStoredGrade,
  ITrialResult,
  TrialExecutionStatus,
} from './records.ts';
import {
  accountResources,
  type IActualChargeEvidence,
  type IPriceBook,
  type IResourceAccountingInput,
  type IResourceMeasurement,
  type IResourceOperation,
  type IResourceReport,
} from './resources.ts';

export interface IReportDefinitionInput {
  id: string;
  runId: string;
  createdAt: number;

  /** Omit to use the manifest definitions; supplying it is the explicit rubric choice. */
  trialDefinitions?: readonly IPlannedTrial[];
  gradingSelection: GradingSelection;

  operationIds: readonly string[];
  accountingPolicy: IAccountingPolicy;
  wallClock?: IResourceAccountingInput['wallClock'];
  priceBook?: IPriceBook;
  actualCharges?: readonly IActualChargeEvidence[];
  nativeExport?: { jsonPath: string; htmlPath: string };
}

export interface IAccountingPolicy {
  /** Include every operation available through the immutable report cutoff. */
  mode: 'all-available';
  cutoffAt: number;
}

export interface IReportDefinition {
  id: string;
  runId: string;
  createdAt: number;

  definitionSource: 'manifest' | 'explicit';
  trialDefinitions: readonly IPlannedTrial[];
  gradingSelection: GradingSelection;

  operationIds: readonly string[];
  accountingPolicy: IAccountingPolicy;
  wallClock?: IResourceAccountingInput['wallClock'];
  priceBook?: IPriceBook;
  actualCharges?: readonly IActualChargeEvidence[];
  nativeExport?: { jsonPath: string; htmlPath: string };
}

export interface IReportExecution {
  status: TrialExecutionStatus | 'not-recorded';

  queuedAt: number | null;
  startedAt: number | null;
  endedAt: number | null;

  queueDuration: IResourceMeasurement;
  executionDuration: IResourceMeasurement;

  errors: readonly string[];
  evidence: readonly string[];
}

export interface IReportTrial {
  id: string;
  caseId: string;
  executionVersion: string;
  candidateId: string;
  repetition: number;
  environmentFingerprint: string | null;
  execution: IReportExecution;
  quality: ITrialQuality;
  resources: IResourceReport;
}

export interface IExecutionSummary {
  planned: number;
  recorded: number;
  notRecorded: number;
  notRun: number;
  completed: number;
  error: number;
  incomplete: number;
}

export interface IReportSummary {
  plannedTrials: number;
  quality: IQualitySummary;
  execution: IExecutionSummary;
  resources: Pick<
    IResourceReport,
    | 'operationCount'
    | 'operationDuration'
    | 'wallElapsed'
    | 'usage'
    | 'estimatedCost'
    | 'actualCost'
  >;
}

export interface IRunOutcome {
  status: 'completed' | 'interrupted' | 'error' | 'unknown';
  error: string | null;
  evidence: string | null;
}

export interface IReport {
  schema: 'codex-evals/report-v1';
  id: string;
  runId: string;
  createdAt: number;

  /** Absent in older reports; absence does not establish a successful run. */
  runOutcome?: IRunOutcome;
  definition: IReportDefinition;
  manifest: IRunManifest;

  trialResults: readonly ITrialResult[];
  grades: readonly IStoredGrade[];

  trials: readonly IReportTrial[];
  quality: ReturnType<typeof buildQualityReport>;
  resources: IResourceReport;
  summary: IReportSummary;
}

function requireText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function validateAccountingPolicy(policy: IAccountingPolicy): void {
  if (policy.mode !== 'all-available') {
    throw new Error(`Unknown accounting policy: ${policy.mode}.`);
  }
  requireFinite(policy.cutoffAt, 'Accounting cutoff');
}

function indexUnique<TValue extends { id: string }>(values: readonly TValue[], label: string) {
  const index = new Map<string, TValue>();
  for (const value of values) {
    if (index.has(value.id)) {
      throw new Error(`Duplicate ${label}: ${value.id}`);
    }
    index.set(value.id, value);
  }
  return index;
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

function measureDuration(
  startedAt: number | null,
  endedAt: number | null,
  missingReason: string,
): IResourceMeasurement {
  if (startedAt === null || endedAt === null) {
    return {
      value: null,
      coverage: 'unknown',
      reason: missingReason,
    };
  }

  if (endedAt < startedAt) {
    throw new Error('An execution interval ends before it starts.');
  }

  return {
    value: endedAt - startedAt,
    coverage: 'complete',
    reason: null,
  };
}

function definitionsFor(
  manifest: IRunManifest,
  explicit: readonly IPlannedTrial[] | undefined,
): { definitions: readonly IPlannedTrial[]; source: IReportDefinition['definitionSource'] } {
  const definitions = explicit ?? manifest.trials;
  const manifestById = indexUnique(manifest.trials, 'manifest trial');
  const definitionsById = indexUnique(definitions, 'trial definition');
  if (manifestById.size !== definitionsById.size) {
    throw new Error('Report trial definitions must preserve the manifest trial set.');
  }

  for (const [trialId, manifestTrial] of manifestById) {
    const definition = definitionsById.get(trialId);
    if (
      definition === undefined ||
      definition.caseId !== manifestTrial.caseId ||
      definition.candidateId !== manifestTrial.candidateId ||
      definition.caseVersion !== manifestTrial.caseVersion ||
      definition.executionVersion !== manifestTrial.executionVersion ||
      definition.repetition !== manifestTrial.repetition
    ) {
      throw new Error(`Report trial definition does not match manifest trial ${trialId}.`);
    }
  }

  return { definitions, source: explicit === undefined ? 'manifest' : 'explicit' };
}

function selectedGradeIds(selection: GradingSelection): readonly string[] {
  const ids: string[] = [];
  for (const checks of Object.values(selection)) {
    for (const gradeId of Object.values(checks)) {
      ids.push(gradeId);
    }
  }
  return ids;
}

function validateSelectedGrades(
  selection: GradingSelection,
  grades: readonly IStoredGrade[],
  operationIds: ReadonlySet<string>,
  operations: ReadonlyMap<string, IResourceOperation>,
  trialIds: ReadonlySet<string>,
): void {
  const gradesById = indexUnique(grades, 'grading record');
  for (const gradeId of selectedGradeIds(selection)) {
    const grade = gradesById.get(gradeId);
    if (grade === undefined) {
      continue;
    }
    if (!operationIds.has(grade.operationId)) {
      throw new Error(`Selected grading record ${gradeId} is outside the report operation scope.`);
    }

    const operation = operations.get(grade.operationId);
    if (operation === undefined || operation.trialId !== grade.trialId) {
      throw new Error(`Selected grading record ${gradeId} does not match its trial operation.`);
    }
    if (!trialIds.has(grade.trialId)) {
      throw new Error(`Selected grading record ${gradeId} references an unknown trial.`);
    }
  }
}

function executionDetails(result: ITrialResult | undefined): IReportExecution {
  if (result === undefined) {
    return {
      status: 'not-recorded',
      queuedAt: null,
      startedAt: null,
      endedAt: null,
      queueDuration: {
        value: null,
        coverage: 'unknown',
        reason: 'No execution record was supplied.',
      },
      executionDuration: {
        value: null,
        coverage: 'unknown',
        reason: 'No execution record was supplied.',
      },
      errors: [],
      evidence: [],
    };
  }

  const evidence = [result.evidencePath, result.protocolPath, result.artifacts?.directory].filter(
    (path): path is string => typeof path === 'string',
  );

  return {
    status: result.status,
    queuedAt: result.queuedAt,
    startedAt: result.startedAt,
    endedAt: result.endedAt,
    queueDuration: measureDuration(result.queuedAt, result.startedAt, 'Execution never started.'),
    executionDuration: measureDuration(
      result.startedAt,
      result.endedAt,
      'Execution has no complete interval.',
    ),
    errors: [...result.errors],
    evidence,
  };
}

function operationScopeForTrial(
  operations: readonly IResourceOperation[],
  trialId: string,
  selected: ReadonlySet<string>,
): readonly IResourceOperation[] {
  return operations.filter(
    (operation) => operation.trialId === trialId && selected.has(operation.id),
  );
}

function chargesForOperations(
  charges: readonly IActualChargeEvidence[] | undefined,
  operations: readonly IResourceOperation[],
): readonly IActualChargeEvidence[] | undefined {
  if (charges === undefined) {
    return undefined;
  }

  const operationIds = new Set(operations.map((operation) => operation.id));
  return charges.filter((charge) => operationIds.has(charge.operationId));
}

function executionSummary(results: readonly ITrialResult[], planned: number): IExecutionSummary {
  const notRun = results.filter((result) => result.status === 'not-run').length;
  const completed = results.filter((result) => result.status === 'completed').length;
  const error = results.filter((result) => result.status === 'error').length;
  const incomplete = results.filter((result) => result.status === 'incomplete').length;

  return {
    planned,
    recorded: results.length,
    notRecorded: planned - results.length,
    notRun,
    completed,
    error,
    incomplete,
  };
}

export function buildReport(input: {
  definition: IReportDefinitionInput;
  manifest: IRunManifest;
  trialResults: readonly ITrialResult[];
  grades: readonly IStoredGrade[];
  operations: readonly IResourceOperation[];
  runOutcome?: IRunOutcome;
}): IReport {
  const { definition, manifest } = input;
  requireText(definition.id, 'Report id');
  requireText(definition.runId, 'Report run id');
  if (definition.runId !== manifest.id) {
    throw new Error('Report run id does not match manifest.');
  }
  requireFinite(definition.createdAt, 'Report creation time');
  validateAccountingPolicy(definition.accountingPolicy);

  const trialDefinitions = definitionsFor(manifest, definition.trialDefinitions);
  const trialIds = new Set(trialDefinitions.definitions.map((trial) => trial.id));

  const operationIds = new Set(definition.operationIds);
  if (operationIds.size !== definition.operationIds.length) {
    throw new Error('Duplicate report operation id.');
  }

  const operationIndex = indexUnique(input.operations, 'operation');

  for (const operationId of operationIds) {
    if (!operationIndex.has(operationId)) {
      throw new Error(`Unknown report operation: ${operationId}`);
    }

    const operation = operationIndex.get(operationId);
    if (operation?.trialId !== null && !trialIds.has(operation?.trialId ?? '')) {
      throw new Error(`Selected operation ${operationId} references an unknown trial.`);
    }
  }

  const availableOperationIds = new Set(
    input.operations
      .filter((operation) => {
        const availableAt = operation.endedAt ?? operation.startedAt;

        return availableAt === null || availableAt <= definition.accountingPolicy.cutoffAt;
      })
      .map((operation) => operation.id),
  );

  for (const operationId of availableOperationIds) {
    if (!operationIds.has(operationId)) {
      throw new Error(`Accounting scope omits available operation: ${operationId}`);
    }
  }

  for (const operationId of operationIds) {
    if (!availableOperationIds.has(operationId)) {
      throw new Error(`Accounting scope includes operation after cutoff: ${operationId}`);
    }
  }

  const resultIndex = indexUnique(input.trialResults, 'trial result');

  for (const trialId of resultIndex.keys()) {
    if (!trialDefinitions.definitions.some((trial) => trial.id === trialId)) {
      throw new Error(`Trial result is outside the report manifest: ${trialId}`);
    }
  }

  validateSelectedGrades(
    definition.gradingSelection,
    input.grades,
    operationIds,
    operationIndex,
    trialIds,
  );

  const quality = buildQualityReport(
    trialDefinitions.definitions,
    input.grades,
    definition.gradingSelection,
  );

  const accountingInput: IResourceAccountingInput = {
    operations: input.operations,
    selectedOperationIds: definition.operationIds,
    ...(definition.wallClock === undefined ? {} : { wallClock: definition.wallClock }),
    ...(definition.priceBook === undefined ? {} : { priceBook: definition.priceBook }),
    ...(definition.actualCharges === undefined ? {} : { actualCharges: definition.actualCharges }),
  };

  const resources = accountResources(accountingInput);

  const selected = new Set(definition.operationIds);
  const qualityByTrial = new Map(quality.trials.map((trial) => [trial.trialId, trial]));

  const trials = trialDefinitions.definitions.map((trial) => {
    const result = resultIndex.get(trial.id);
    const trialOperations = operationScopeForTrial(input.operations, trial.id, selected);
    const trialCharges = chargesForOperations(definition.actualCharges, trialOperations);

    const trialResourceInput: IResourceAccountingInput = {
      operations: trialOperations,
      selectedOperationIds: trialOperations.map((operation) => operation.id),
      ...(definition.priceBook === undefined ? {} : { priceBook: definition.priceBook }),
      ...(trialCharges === undefined ? {} : { actualCharges: trialCharges }),
    };

    const qualityResult = qualityByTrial.get(trial.id);
    if (qualityResult === undefined) {
      throw new Error(`Missing quality result for ${trial.id}.`);
    }

    return {
      id: trial.id,
      caseId: trial.caseId,
      executionVersion: trial.executionVersion,
      candidateId: trial.candidateId,
      repetition: trial.repetition,
      environmentFingerprint: result?.environmentFingerprint ?? null,
      execution: executionDetails(result),
      quality: qualityResult,
      resources: accountResources(trialResourceInput),
    } satisfies IReportTrial;
  });

  const reportDefinition: IReportDefinition = {
    id: definition.id,
    runId: definition.runId,
    createdAt: definition.createdAt,
    definitionSource: trialDefinitions.source,
    ...(definition.nativeExport === undefined ? {} : { nativeExport: definition.nativeExport }),
    trialDefinitions: trialDefinitions.definitions,
    gradingSelection: definition.gradingSelection,
    operationIds: definition.operationIds,
    accountingPolicy: definition.accountingPolicy,
    ...(definition.wallClock === undefined ? {} : { wallClock: definition.wallClock }),
    ...(definition.priceBook === undefined ? {} : { priceBook: definition.priceBook }),
    ...(definition.actualCharges === undefined ? {} : { actualCharges: definition.actualCharges }),
  };

  const summary: IReportSummary = {
    plannedTrials: trialDefinitions.definitions.length,
    quality: quality.summary,
    execution: executionSummary(input.trialResults, trialDefinitions.definitions.length),
    resources: {
      operationCount: resources.operationCount,
      operationDuration: resources.operationDuration,
      wallElapsed: resources.wallElapsed,
      usage: resources.usage,
      estimatedCost: resources.estimatedCost,
      actualCost: resources.actualCost,
    },
  };

  return deepFreeze({
    schema: 'codex-evals/report-v1',
    id: definition.id,
    runId: definition.runId,
    createdAt: definition.createdAt,
    definition: reportDefinition,
    runOutcome: input.runOutcome ?? {
      status: 'unknown',
      error: null,
      evidence: null,
    },
    manifest,
    trialResults: input.trialResults,
    grades: input.grades,
    trials,
    quality,
    resources,
    summary,
  });
}

function formatMeasurement(measurement: IResourceMeasurement): string {
  if (measurement.value === null) {
    return `unknown (${measurement.coverage})`;
  }

  return `${measurement.value} (${measurement.coverage})${
    measurement.reason === null ? '' : ` — ${measurement.reason}`
  }`;
}

function formatTokens(label: string, measurement: IResourceMeasurement): string {
  if (measurement.value === null) {
    return `- ${label}: unknown tokens (${measurement.coverage})${
      measurement.reason === null ? '' : ` — ${measurement.reason}`
    }`;
  }

  return `- ${label}: ${measurement.value} tokens (${measurement.coverage})${
    measurement.reason === null ? '' : ` — ${measurement.reason}`
  }`;
}

function formatCost(label: string, measurement: IResourceReport['estimatedCost']): string {
  const amount =
    measurement.value === null
      ? 'unknown'
      : `${measurement.value} ${measurement.currency ?? ''}`.trim();

  return `- ${label}: ${amount} (${measurement.coverage})${
    measurement.reason === null ? '' : ` — ${measurement.reason}`
  }`;
}

function markdownLink(path: string): string {
  // Record references are relative to the run; reports live one directory below it.
  // Free-form judge citations remain text rather than fabricated clickable paths.
  if (path.startsWith('/')) {
    return `[${path}](<${path}>)`;
  }
  if (path === 'run-finished.json') {
    return `[${path}](<../${path}>)`;
  }
  if (!/^(?:trials|operations|private|inputs)\//u.test(path)) {
    return path;
  }

  return `[${path}](<../${path}>)`;
}

export function renderReportMarkdown(report: IReport): string {
  const lines = [
    `# Evaluation report ${report.id}`,
    '',
    `- Run: ${report.runId}`,
    `- Run status: ${report.runOutcome?.status ?? 'unknown'}`,
    ...(report.runOutcome?.error == null ? [] : [`- Run error: ${report.runOutcome.error}`]),
    ...(report.runOutcome?.evidence == null
      ? []
      : [`- Run evidence: ${markdownLink(report.runOutcome.evidence)}`]),
    `- Planned trials: ${report.summary.plannedTrials}`,
    `- Quality: ${report.summary.quality.passed} passed, ${report.summary.quality.failed} failed, ${report.summary.quality.unknown} unknown`,
    `- Decidable pass rate: ${report.summary.quality.passRate ?? 'unavailable'}`,
    `- Decision coverage: ${report.summary.quality.decisionCoverage ?? 'unavailable'}`,
    `- Operation duration (ms): ${formatMeasurement(report.resources.operationDuration)}`,
    `- Wall elapsed (ms): ${formatMeasurement(report.resources.wallElapsed)}`,
    formatTokens('Input tokens', report.resources.usage.input),
    formatTokens('Output tokens', report.resources.usage.output),
    formatTokens('Total tokens', report.resources.usage.total),
    formatCost('Estimated cost', report.resources.estimatedCost),
    formatCost('Actual cost', report.resources.actualCost),
    '',
  ];

  const priceBook = report.definition.priceBook;
  if (priceBook !== undefined) {
    lines.push(
      '## Estimate basis',
      '',
      `- Source: ${priceBook.source}`,
      `- Price version: ${priceBook.version}`,
      `- Currency: ${priceBook.currency}`,
    );

    for (const reference of priceBook.references ?? []) {
      lines.push(`- Reference: ${reference}`);
    }

    for (const assumption of priceBook.assumptions ?? []) {
      lines.push(`- Assumption: ${assumption}`);
    }

    for (const uncertainty of priceBook.uncertainties ?? []) {
      lines.push(`- Uncertainty: ${uncertainty}`);
    }

    lines.push('');
  }

  lines.push('## Resources by phase');

  for (const phase of report.resources.phases) {
    lines.push(
      `### ${phase.phase}`,
      '',
      `- Operation duration (ms): ${formatMeasurement(phase.operationDuration)}`,
      formatTokens('Input tokens', phase.usage.input),
      formatTokens('Output tokens', phase.usage.output),
      formatTokens('Cached input tokens', phase.usage.cachedInput),
      formatTokens('Reasoning output tokens', phase.usage.reasoningOutput),
      formatTokens('Total tokens', phase.usage.total),
      formatCost('Estimated cost', phase.estimatedCost),
      formatCost('Actual cost', phase.actualCost),
      '',
    );
  }

  lines.push('## Trials', '');

  for (const trial of report.trials) {
    lines.push(
      `### ${trial.id}`,
      '',
      `- Case: ${trial.caseId}`,
      `- Execution: ${trial.execution.status}`,
      `- Quality: ${trial.quality.status}`,
      `- Queue duration (ms): ${formatMeasurement(trial.execution.queueDuration)}`,
      `- Execution duration (ms): ${formatMeasurement(trial.execution.executionDuration)}`,
    );

    for (const check of trial.quality.checks) {
      lines.push(`- Check ${check.id}: ${check.status} — ${check.reason}`);
      if (check.evidence.length > 0) {
        lines.push(`  Evidence: ${check.evidence.map(markdownLink).join(', ')}`);
      }
    }

    if (trial.execution.errors.length > 0) {
      lines.push(`- Execution errors: ${trial.execution.errors.join('; ')}`);
    }
    if (trial.execution.evidence.length === 0) {
      lines.push('- Evidence: none recorded');
    } else {
      lines.push(`- Evidence: ${trial.execution.evidence.map(markdownLink).join(', ')}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
