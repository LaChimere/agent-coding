export type ResourcePhase = 'preparation' | 'candidate' | 'verification' | 'grading';

export type OperationStatus =
  | 'not-run'
  | 'running'
  | 'completed'
  | 'failed'
  | 'superseded'
  | 'interrupted'
  | 'incomplete';

export type UsageObservationKind = 'cumulative' | 'delta';

export type MeasurementCoverage = 'complete' | 'partial' | 'unknown';

export interface ITokenUsage {
  input: number | null;
  output: number | null;
  cachedInput: number | null;
  reasoningOutput: number | null;
}

export interface IUsageObservation {
  id: string;
  /** One stable native context and cumulative-counter scope within this operation. */
  actorId: string;
  model: string | null;
  threadId: string | null;
  turnId: string | null;
  kind: UsageObservationKind;
  observedAt: number;
  usage: ITokenUsage;
  evidenceSource: string;
  /**
   * Inclusion covers each named actor's entire counter scope in this operation.
   * Use null when this is not established; per-notification overlap is unsupported.
   */
  includedActorIds: readonly string[] | null;
}

export interface IResourceOperation {
  id: string;
  trialId: string | null;
  phase: ResourcePhase;
  status: OperationStatus;
  /** False for local preparation/verification work that cannot consume model tokens. */
  usesModel: boolean;
  startedAt: number | null;
  endedAt: number | null;
  observations: readonly IUsageObservation[];
}

export interface IResourceMeasurement {
  value: number | null;
  coverage: MeasurementCoverage;
  reason: string | null;
}

export interface ITokenUsageTotals {
  input: IResourceMeasurement;
  output: IResourceMeasurement;
  cachedInput: IResourceMeasurement;
  reasoningOutput: IResourceMeasurement;
  /** total is input + output; cached and reasoning values are subsets. */
  total: IResourceMeasurement;
}

export interface IPriceRates {
  input: number | null;
  output: number | null;
  cachedInput: number | null;
}

export interface IPriceBook {
  source: string;
  version: string;
  currency: string;
  rates: Readonly<Record<string, IPriceRates>>;
  modelMapping: Readonly<Record<string, string>>;
  /** Official pages or other evidence supporting this versioned rate snapshot. */
  references?: readonly string[];
  /** Explicit scenario used for the reference estimate, not a claim about actual charges. */
  assumptions?: readonly string[];
  /** Missing pricing conditions keep the numeric reference estimate partial. */
  uncertainties?: readonly string[];
}

export interface IActualChargeEvidence {
  id: string;
  operationId: string;
  amount: number | null;
  currency: string;
  source: string;
  attributable: boolean;
  reason: string | null;
}

export interface ICostMeasurement extends IResourceMeasurement {
  currency: string | null;
  source: string | null;
  version: string | null;
}

export interface IResourcePhaseReport {
  phase: ResourcePhase;
  operationIds: readonly string[];
  operationCount: number;
  operationDuration: IResourceMeasurement;
  usage: ITokenUsageTotals;
  estimatedCost: ICostMeasurement;
  actualCost: ICostMeasurement;
}

export interface IResourceAccountingInput {
  operations: readonly IResourceOperation[];
  selectedOperationIds: readonly string[];
  wallClock?: { startedAt: number; endedAt: number | null };
  priceBook?: IPriceBook;
  actualCharges?: readonly IActualChargeEvidence[];
}

export interface IResourceReport {
  selectedOperationIds: readonly string[];
  operationCount: number;
  operationDuration: IResourceMeasurement;
  wallElapsed: IResourceMeasurement;
  usage: ITokenUsageTotals;
  estimatedCost: ICostMeasurement;
  actualCost: ICostMeasurement;
  phases: readonly IResourcePhaseReport[];
}

const usageKeys = ['input', 'output', 'cachedInput', 'reasoningOutput'] as const;
type UsageKey = (typeof usageKeys)[number];

const phases: readonly ResourcePhase[] = ['preparation', 'candidate', 'verification', 'grading'];

function freezeList<TValue>(values: readonly TValue[]): readonly TValue[] {
  return Object.freeze([...values]);
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

function requireTokenValue(value: number | null, label: string): void {
  if (value === null) {
    return;
  }
  requireFinite(value, label);
  if (value < 0) {
    throw new Error(`${label} must not be negative.`);
  }
}

function validateUsage(usage: ITokenUsage, label: string): void {
  requireTokenValue(usage.input, `${label}.input`);
  requireTokenValue(usage.output, `${label}.output`);
  requireTokenValue(usage.cachedInput, `${label}.cachedInput`);
  requireTokenValue(usage.reasoningOutput, `${label}.reasoningOutput`);
}

function validateOperation(operation: IResourceOperation): void {
  requireText(operation.id, 'Operation id');
  if (operation.trialId !== null) {
    requireText(operation.trialId, 'Trial id');
  }
  if (!operation.usesModel && operation.observations.length > 0) {
    throw new Error(`Model-free operation ${operation.id} cannot have usage observations.`);
  }
  if (operation.startedAt === null && operation.endedAt !== null) {
    throw new Error(`Operation ${operation.id} ended without a start time.`);
  }
  if (operation.startedAt !== null) {
    requireFinite(operation.startedAt, `Operation ${operation.id} start time`);
  }
  if (operation.endedAt !== null) {
    requireFinite(operation.endedAt, `Operation ${operation.id} end time`);
    if (operation.startedAt !== null && operation.endedAt < operation.startedAt) {
      throw new Error(`Operation ${operation.id} ends before it starts.`);
    }
  }

  const observationIds = new Set<string>();

  for (const observation of operation.observations) {
    requireText(observation.id, 'Usage observation id');
    if (observationIds.has(observation.id)) {
      throw new Error(`Duplicate usage observation id: ${observation.id}`);
    }
    observationIds.add(observation.id);
    requireText(observation.actorId, `Observation ${observation.id} actor id`);
    if (observation.model !== null) {
      requireText(observation.model, 'Usage model');
    }
    requireFinite(observation.observedAt, `Observation ${observation.id} time`);
    requireText(observation.evidenceSource, `Observation ${observation.id} evidence source`);
    validateUsage(observation.usage, `Observation ${observation.id} usage`);
    if (observation.includedActorIds !== null) {
      const includedIds = new Set<string>();
      for (const actorId of observation.includedActorIds) {
        requireText(actorId, `Observation ${observation.id} included actor id`);
        if (actorId === observation.actorId) {
          throw new Error('An actor cannot include itself.');
        }
        if (includedIds.has(actorId)) {
          throw new Error(`Duplicate included actor id: ${actorId}`);
        }
        includedIds.add(actorId);
      }
    }
  }

  const { byActor, includedActors } = groupActorObservations(operation);

  const visit = (actorId: string, ancestry: ReadonlySet<string>): void => {
    if (ancestry.has(actorId)) {
      throw new Error('Cyclic usage inclusion.');
    }

    const observations = byActor.get(actorId);
    if (observations === undefined) {
      return;
    }

    const first = observations[0];
    if (first === undefined) {
      return;
    }

    const relation = JSON.stringify(first.includedActorIds?.toSorted() ?? null);
    if (
      observations.some(
        (observation) =>
          observation.threadId !== first.threadId ||
          JSON.stringify(observation.includedActorIds?.toSorted() ?? null) !== relation,
      )
    ) {
      throw new Error(`Changing counter or inclusion scope for actor ${actorId}.`);
    }

    const ancestors = new Set([...ancestry, actorId]);

    for (const childId of first.includedActorIds ?? []) {
      visit(childId, ancestors);
    }
  };

  for (const actorId of byActor.keys()) {
    visit(actorId, new Set());
  }

  const ownerByActor = new Map<string, string>();

  const claim = (actorId: string, rootId: string): void => {
    const owner = ownerByActor.get(actorId);
    if (owner === rootId) {
      return;
    }
    if (owner !== undefined) {
      throw new Error(`Overlapping parent usage scopes include ${actorId}.`);
    }
    ownerByActor.set(actorId, rootId);

    for (const childId of byActor.get(actorId)?.[0]?.includedActorIds ?? []) {
      claim(childId, rootId);
    }
  };

  for (const actorId of byActor.keys()) {
    if (!includedActors.has(actorId)) {
      claim(actorId, actorId);
    }
  }
}

export function validatePriceBook(priceBook: IPriceBook): void {
  requireText(priceBook.source, 'Price source');
  requireText(priceBook.version, 'Price version');
  requireText(priceBook.currency, 'Price currency');

  for (const field of ['references', 'assumptions', 'uncertainties'] as const) {
    const values = priceBook[field];
    if (values === undefined) {
      continue;
    }
    if (!Array.isArray(values)) {
      throw new Error(`Price ${field} must be an array.`);
    }

    for (const value of values) {
      requireText(value, `Price ${field} entry`);
    }
  }

  for (const [rateId, rates] of Object.entries(priceBook.rates)) {
    requireText(rateId, 'Price rate id');
    requireTokenValue(rates.input, `Price ${rateId}.input`);
    requireTokenValue(rates.output, `Price ${rateId}.output`);
    requireTokenValue(rates.cachedInput, `Price ${rateId}.cachedInput`);
  }

  for (const [model, rateId] of Object.entries(priceBook.modelMapping)) {
    requireText(model, 'Price model mapping model');
    requireText(rateId, `Price mapping for ${model}`);
  }
}

function validateInput(input: IResourceAccountingInput): Map<string, IResourceOperation> {
  const operations = new Map<string, IResourceOperation>();

  for (const operation of input.operations) {
    validateOperation(operation);
    if (operations.has(operation.id)) {
      throw new Error(`Duplicate operation id: ${operation.id}`);
    }
    operations.set(operation.id, operation);
  }

  const selected = new Set<string>();

  for (const operationId of input.selectedOperationIds) {
    requireText(operationId, 'Selected operation id');
    if (selected.has(operationId)) {
      throw new Error(`Duplicate selected operation id: ${operationId}`);
    }
    if (!operations.has(operationId)) {
      throw new Error(`Unknown selected operation: ${operationId}`);
    }
    selected.add(operationId);
  }

  if (input.wallClock !== undefined) {
    requireFinite(input.wallClock.startedAt, 'Wall-clock start time');
    if (input.wallClock.endedAt !== null) {
      requireFinite(input.wallClock.endedAt, 'Wall-clock end time');
      if (input.wallClock.endedAt < input.wallClock.startedAt) {
        throw new Error('Wall-clock interval ends before it starts.');
      }
    }
  }
  if (input.priceBook !== undefined) {
    validatePriceBook(input.priceBook);
  }
  if (input.actualCharges !== undefined) {
    const chargeIds = new Set<string>();
    for (const charge of input.actualCharges) {
      requireText(charge.id, 'Actual charge id');
      if (chargeIds.has(charge.id)) {
        throw new Error(`Duplicate actual charge id: ${charge.id}`);
      }
      chargeIds.add(charge.id);
      if (!operations.has(charge.operationId)) {
        throw new Error(`Unknown actual-charge operation: ${charge.operationId}`);
      }
      if (!operations.get(charge.operationId)?.usesModel) {
        throw new Error(
          `Model-free operation ${charge.operationId} cannot have model-charge evidence.`,
        );
      }
      requireText(charge.currency, `Actual charge ${charge.id} currency`);
      requireText(charge.source, `Actual charge ${charge.id} source`);
      if (charge.amount !== null) {
        requireFinite(charge.amount, `Actual charge ${charge.id} amount`);
        if (charge.amount < 0) {
          throw new Error(`Actual charge ${charge.id} is negative.`);
        }
      }
      if (charge.reason !== null) {
        requireText(charge.reason, `Actual charge ${charge.id} reason`);
      }
    }
  }

  return operations;
}

function unknownMeasurement(reason: string): IResourceMeasurement {
  return {
    value: null,
    coverage: 'unknown',
    reason,
  };
}

function zeroMeasurement(): IResourceMeasurement {
  return {
    value: 0,
    coverage: 'complete',
    reason: null,
  };
}

function uniqueReasons(reasons: readonly (string | null)[]): string | null {
  const values = [...new Set(reasons.filter((reason): reason is string => reason !== null))];
  return values.length === 0 ? null : values.join(' ');
}

function coverageRank(coverage: MeasurementCoverage): number {
  if (coverage === 'complete') {
    return 0;
  }
  if (coverage === 'partial') {
    return 1;
  }
  return 2;
}

function worseCoverage(left: MeasurementCoverage, right: MeasurementCoverage): MeasurementCoverage {
  return coverageRank(left) >= coverageRank(right) ? left : right;
}

function measure(
  value: number | null,
  coverage: MeasurementCoverage,
  reason: string | null,
): IResourceMeasurement {
  return {
    value,
    coverage,
    reason,
  };
}

function aggregateActorObservations(observations: readonly IUsageObservation[]): ITokenUsageTotals {
  const cumulative = observations.filter((observation) => observation.kind === 'cumulative');
  const deltas = observations.filter((observation) => observation.kind === 'delta');
  const reasons: string[] = [];
  let source = cumulative;
  if (cumulative.length > 0 && deltas.length > 0) {
    reasons.push('Cumulative and delta observations were mixed; cumulative values were used.');
  } else if (source.length === 0) {
    source = deltas;
  }

  const result = {} as Record<UsageKey, IResourceMeasurement>;

  for (const key of usageKeys) {
    const values = source.map((observation) => observation.usage[key]);
    const known = values.filter((value): value is number => value !== null);
    if (known.length === 0) {
      result[key] = unknownMeasurement('The provider did not report this token category.');
      continue;
    }

    let value: number;
    let nonMonotonic = false;
    let missing = values.length !== known.length;
    if (cumulative.length > 0) {
      const ordered = [...source].sort((left, right) => left.observedAt - right.observedAt);
      let previous: number | null = null;

      for (const observation of ordered) {
        const current = observation.usage[key];
        if (current !== null) {
          if (previous !== null && current < previous) {
            nonMonotonic = true;
          }
          previous = current;
        }
      }

      value = Math.max(...known);
      missing = ordered.at(-1)?.usage[key] === null;
    } else {
      value = known.reduce((sum, current) => sum + current, 0);
    }

    const incomplete = missing || nonMonotonic || reasons.length > 0;
    result[key] = measure(
      value,
      incomplete ? 'partial' : 'complete',
      uniqueReasons([
        missing ? 'The authoritative observations omitted this token category.' : null,
        nonMonotonic ? 'Cumulative usage decreased between observations.' : null,
        ...reasons,
      ]),
    );
  }

  return {
    input: result.input,
    output: result.output,
    cachedInput: result.cachedInput,
    reasoningOutput: result.reasoningOutput,
    total: totalFromUsage(result.input, result.output),
  };
}

function totalFromUsage(
  input: IResourceMeasurement,
  output: IResourceMeasurement,
): IResourceMeasurement {
  if (input.value !== null && output.value !== null) {
    return measure(
      input.value + output.value,
      worseCoverage(input.coverage, output.coverage),
      uniqueReasons([input.reason, output.reason]),
    );
  }
  if (input.value !== null || output.value !== null) {
    return measure(
      null,
      'partial',
      uniqueReasons([
        input.reason,
        output.reason,
        'Input and output are both required for total tokens.',
      ]),
    );
  }
  return unknownMeasurement('Input and output are both unknown; total tokens cannot be derived.');
}

function combineMeasurements(measurements: readonly IResourceMeasurement[]): IResourceMeasurement {
  if (measurements.length === 0) {
    return zeroMeasurement();
  }

  const known = measurements.filter((measurement) => measurement.value !== null);
  if (known.length === 0) {
    return unknownMeasurement(
      uniqueReasons(measurements.map((measurement) => measurement.reason)) ??
        'No usable measurement was recorded.',
    );
  }

  const hasUnknown = measurements.some((measurement) => measurement.coverage === 'unknown');
  const hasPartial = measurements.some((measurement) => measurement.coverage === 'partial');

  return measure(
    known.reduce((sum, current) => sum + (current.value ?? 0), 0),
    hasUnknown || hasPartial ? 'partial' : 'complete',
    uniqueReasons(measurements.map((measurement) => measurement.reason)),
  );
}

function combineUsage(usages: readonly ITokenUsageTotals[]): ITokenUsageTotals {
  const combined = {} as Record<UsageKey, IResourceMeasurement>;
  for (const key of usageKeys) {
    combined[key] = combineMeasurements(usages.map((usage) => usage[key]));
  }
  return {
    input: combined.input,
    output: combined.output,
    cachedInput: combined.cachedInput,
    reasoningOutput: combined.reasoningOutput,
    total: totalFromUsage(combined.input, combined.output),
  };
}

function groupActorObservations(operation: IResourceOperation) {
  const byActor = new Map<string, IUsageObservation[]>();
  const includedActors = new Set<string>();
  let inclusionUnknown = false;

  for (const observation of operation.observations) {
    const actorObservations = byActor.get(observation.actorId) ?? [];
    actorObservations.push(observation);
    byActor.set(observation.actorId, actorObservations);
    if (observation.includedActorIds === null) {
      inclusionUnknown = true;
    } else {
      for (const actorId of observation.includedActorIds) {
        includedActors.add(actorId);
      }
    }
  }

  return {
    byActor,
    includedActors,
    inclusionUnknown,
  };
}

function aggregateOperationUsage(operation: IResourceOperation): ITokenUsageTotals {
  if (!operation.usesModel) {
    const zero = zeroMeasurement();
    return {
      input: zero,
      output: zero,
      cachedInput: zero,
      reasoningOutput: zero,
      total: zero,
    };
  }
  if (operation.observations.length === 0) {
    const unknown = unknownMeasurement('No usage observation was recorded for this operation.');
    return {
      input: unknown,
      output: unknown,
      cachedInput: unknown,
      reasoningOutput: unknown,
      total: unknownMeasurement('No usage observation was recorded for this operation.'),
    };
  }

  const { byActor, includedActors, inclusionUnknown } = groupActorObservations(operation);
  const actors = [...byActor.entries()]
    .filter(([actorId]) => !includedActors.has(actorId))
    .map(([, observations]) => aggregateActorObservations(observations));

  const usage = combineUsage(
    actors.map((actorUsage) => {
      const reason = uniqueReasons([
        inclusionUnknown ? 'Parent-child usage inclusion was not established.' : null,
        unfinishedUsageReason(operation),
      ]);

      if (reason === null) {
        return actorUsage;
      }

      const adjusted = {} as Record<UsageKey, IResourceMeasurement>;

      for (const key of usageKeys) {
        const current = actorUsage[key];
        adjusted[key] = measure(
          current.value,
          current.value === null ? 'unknown' : 'partial',
          uniqueReasons([current.reason, reason]),
        );
      }

      return {
        input: adjusted.input,
        output: adjusted.output,
        cachedInput: adjusted.cachedInput,
        reasoningOutput: adjusted.reasoningOutput,
        total: totalFromUsage(adjusted.input, adjusted.output),
      };
    }),
  );

  usage.total = totalFromUsage(usage.input, usage.output);

  return usage;
}

function unfinishedUsageReason(operation: IResourceOperation): string | null {
  return operation.status === 'running' ||
    operation.status === 'interrupted' ||
    operation.status === 'incomplete'
    ? 'Execution ended without established final usage coverage.'
    : null;
}

function durationForOperations(operations: readonly IResourceOperation[]): IResourceMeasurement {
  if (operations.length === 0) {
    return zeroMeasurement();
  }

  let known = 0;
  let total = 0;
  const reasons: (string | null)[] = [];

  for (const operation of operations) {
    if (operation.startedAt !== null && operation.endedAt !== null) {
      known += 1;
      total += operation.endedAt - operation.startedAt;
    } else {
      reasons.push(`Operation ${operation.id} has no complete interval.`);
    }
  }

  if (known === 0) {
    return unknownMeasurement(reasons.join(' '));
  }

  return measure(
    total,
    known === operations.length ? 'complete' : 'partial',
    reasons.join(' ') || null,
  );
}

function wallElapsedForOperations(
  operations: readonly IResourceOperation[],
  wallClock: IResourceAccountingInput['wallClock'],
): IResourceMeasurement {
  if (wallClock !== undefined) {
    if (wallClock.endedAt === null) {
      return unknownMeasurement('The overall wall-clock interval is unfinished.');
    }
    return measure(wallClock.endedAt - wallClock.startedAt, 'complete', null);
  }
  if (operations.length === 0) {
    return zeroMeasurement();
  }

  const starts = operations
    .map((operation) => operation.startedAt)
    .filter((value): value is number => value !== null);
  const ends = operations
    .map((operation) => operation.endedAt)
    .filter((value): value is number => value !== null);
  if (starts.length === 0 || ends.length === 0) {
    return unknownMeasurement('No complete operation interval establishes wall-clock duration.');
  }

  const elapsed = Math.max(...ends) - Math.min(...starts);
  const complete = starts.length === operations.length && ends.length === operations.length;

  return measure(
    elapsed,
    complete ? 'complete' : 'partial',
    complete ? null : 'Some selected operations have no complete interval.',
  );
}

function costMeasurement(
  value: number | null,
  coverage: MeasurementCoverage,
  reason: string | null,
  priceBook: IPriceBook | undefined,
): ICostMeasurement {
  return {
    value,
    coverage,
    reason,
    currency: priceBook?.currency ?? null,
    source: priceBook?.source ?? null,
    version: priceBook?.version ?? null,
  };
}

function actorEstimatedCost(
  actorId: string,
  model: string | null,
  usage: ITokenUsageTotals,
  priceBook: IPriceBook,
): IResourceMeasurement {
  if (model === null) {
    return unknownMeasurement(`Actor ${actorId} has no attributable model.`);
  }

  const rateId = Object.hasOwn(priceBook.modelMapping, model)
    ? priceBook.modelMapping[model]
    : undefined;
  if (rateId === undefined) {
    return unknownMeasurement(`No price mapping exists for model ${model}.`);
  }

  const rates = Object.hasOwn(priceBook.rates, rateId) ? priceBook.rates[rateId] : undefined;
  if (rates === undefined) {
    return unknownMeasurement(`Price mapping ${rateId} has no rate definition.`);
  }

  const reasons: (string | null)[] = [];
  let known = 0;
  let amount = 0;

  if (usage.input.value === null || rates.input === null) {
    reasons.push(
      usage.input.value === null ? 'Input tokens are unknown.' : 'Input price is unknown.',
    );
  } else if (
    usage.cachedInput.value === null ||
    (usage.cachedInput.value !== 0 && rates.cachedInput === null)
  ) {
    reasons.push('Cached-input tokens or their price are unknown.');
  } else if (usage.cachedInput.value !== null && usage.cachedInput.value > usage.input.value) {
    reasons.push('Cached-input tokens exceed input tokens.');
  } else {
    const cached = usage.cachedInput.value;
    const cachedRate = rates.cachedInput ?? 0;
    amount += ((usage.input.value - cached) * rates.input + cached * cachedRate) / 1_000_000;
    known += 1;
    if (usage.input.coverage !== 'complete' || usage.cachedInput.coverage === 'partial') {
      reasons.push('Input usage coverage is partial.');
    }
  }
  if (usage.output.value === null || rates.output === null) {
    reasons.push(
      usage.output.value === null ? 'Output tokens are unknown.' : 'Output price is unknown.',
    );
  } else {
    amount += (usage.output.value * rates.output) / 1_000_000;
    known += 1;
    if (usage.output.coverage !== 'complete') {
      reasons.push('Output usage coverage is partial.');
    }
  }
  if (known === 0) {
    return unknownMeasurement(reasons.join(' '));
  }

  return measure(amount, reasons.length === 0 ? 'complete' : 'partial', reasons.join(' ') || null);
}

function estimatedCostForOperations(
  operations: readonly IResourceOperation[],
  priceBook: IPriceBook | undefined,
): ICostMeasurement {
  const modelOperations = operations.filter((operation) => operation.usesModel);
  if (modelOperations.length === 0) {
    return costMeasurement(0, 'complete', null, priceBook);
  }
  if (priceBook === undefined) {
    return costMeasurement(null, 'unknown', 'No price book was supplied.', undefined);
  }

  const costs = modelOperations.map((operation) => {
    if (operation.observations.length === 0) {
      return unknownMeasurement(`No usage observation was recorded for ${operation.id}.`);
    }

    const { byActor, includedActors, inclusionUnknown } = groupActorObservations(operation);

    const modelsForActor = (actorId: string): Set<string | null> => {
      const observations = byActor.get(actorId);
      if (observations === undefined) {
        return new Set([null]);
      }

      const models = new Set(observations.map((observation) => observation.model));

      for (const childId of observations[0]?.includedActorIds ?? []) {
        for (const model of modelsForActor(childId)) {
          models.add(model);
        }
      }

      return models;
    };

    const costs = [...byActor.entries()]
      .filter(([actorId]) => !includedActors.has(actorId))
      .map(([actorId, observations]) => {
        const models = modelsForActor(actorId);
        const model = models.size === 1 ? (models.values().next().value ?? null) : null;

        const cost = actorEstimatedCost(
          actorId,
          model,
          aggregateActorObservations(observations),
          priceBook,
        );

        const reason = uniqueReasons([
          cost.reason,
          inclusionUnknown ? 'Parent-child usage inclusion was not established.' : null,
          unfinishedUsageReason(operation),
        ]);

        if (
          (inclusionUnknown || unfinishedUsageReason(operation) !== null) &&
          cost.value !== null
        ) {
          return measure(cost.value, 'partial', reason);
        }

        return cost;
      });

    return combineMeasurements(costs);
  });

  const combined = combineMeasurements(costs);
  const uncertainties = priceBook.uncertainties ?? [];

  return costMeasurement(
    combined.value,
    combined.value !== null && uncertainties.length > 0 ? 'partial' : combined.coverage,
    uniqueReasons([
      combined.reason,
      uncertainties.length > 0
        ? 'Pricing conditions are not fully observed; see price-book uncertainties.'
        : null,
    ]),
    priceBook,
  );
}

function actualCostForOperations(
  operations: readonly IResourceOperation[],
  charges: readonly IActualChargeEvidence[] | undefined,
): ICostMeasurement {
  const modelOperations = operations.filter((operation) => operation.usesModel);
  if (modelOperations.length === 0) {
    return {
      ...zeroMeasurement(),
      currency: null,
      source: null,
      version: null,
    };
  }
  if (charges === undefined) {
    return {
      ...unknownMeasurement('No attributable charge evidence was supplied.'),
      currency: null,
      source: null,
      version: null,
    };
  }

  const operationIds = new Set(modelOperations.map((operation) => operation.id));
  const relevant = charges.filter((charge) => operationIds.has(charge.operationId));
  const known = relevant.filter((charge) => charge.attributable && charge.amount !== null);
  const currencies = new Set(known.map((charge) => charge.currency));
  const sources = [...new Set(relevant.map((charge) => charge.source))];
  const missingOperationIds = modelOperations
    .filter((operation) => !known.some((charge) => charge.operationId === operation.id))
    .map((operation) => operation.id);
  const reasons = relevant
    .filter((charge) => !charge.attributable || charge.amount === null)
    .map((charge) => charge.reason ?? `Charge ${charge.id} is not attributable.`);
  if (currencies.size > 1) {
    return {
      ...unknownMeasurement('Attributable charges use multiple currencies and were not converted.'),
      currency: null,
      source: sources.join(', ') || null,
      version: null,
    };
  }
  if (known.length === 0) {
    return {
      ...unknownMeasurement(
        [...reasons, 'No attributable charge was available for a selected operation.'].join(' '),
      ),
      currency: currencies.values().next().value ?? null,
      source: sources.join(', ') || null,
      version: null,
    };
  }

  const value = known.reduce((sum, charge) => sum + (charge.amount ?? 0), 0);
  const allCovered = missingOperationIds.length === 0 && reasons.length === 0;

  return {
    value,
    coverage: allCovered ? 'complete' : 'partial',
    reason:
      missingOperationIds.length === 0
        ? uniqueReasons(reasons)
        : uniqueReasons([
            ...reasons,
            `No attributable charge was available for: ${missingOperationIds.join(', ')}.`,
          ]),
    currency: currencies.values().next().value ?? null,
    source: sources.join(', ') || null,
    version: null,
  };
}

function phaseReport(
  phase: ResourcePhase,
  operations: readonly IResourceOperation[],
  usages: ReadonlyMap<string, ITokenUsageTotals>,
  priceBook: IPriceBook | undefined,
  charges: readonly IActualChargeEvidence[] | undefined,
): IResourcePhaseReport {
  const operationIds = freezeList(operations.map((operation) => operation.id));
  return {
    phase,
    operationIds,
    operationCount: operations.length,
    operationDuration: durationForOperations(operations),
    usage: combineUsage(
      operations.map((operation) => usages.get(operation.id) as ITokenUsageTotals),
    ),
    estimatedCost: estimatedCostForOperations(operations, priceBook),
    actualCost: actualCostForOperations(operations, charges),
  };
}

export function accountResources(input: IResourceAccountingInput): IResourceReport {
  const operationsById = validateInput(input);
  const selectedOperationIds = freezeList(input.selectedOperationIds);

  const selectedOperations = selectedOperationIds.map((operationId) => {
    const operation = operationsById.get(operationId);
    if (operation === undefined) {
      throw new Error(`Unknown selected operation: ${operationId}`);
    }
    return operation;
  });

  const usages = new Map<string, ITokenUsageTotals>();

  for (const operation of selectedOperations) {
    usages.set(operation.id, aggregateOperationUsage(operation));
  }

  const phaseReports = phases.map((phase) =>
    phaseReport(
      phase,
      selectedOperations.filter((operation) => operation.phase === phase),
      usages,
      input.priceBook,
      input.actualCharges,
    ),
  );

  return {
    selectedOperationIds,
    operationCount: selectedOperations.length,
    operationDuration: durationForOperations(selectedOperations),
    wallElapsed: wallElapsedForOperations(selectedOperations, input.wallClock),
    usage: combineUsage(
      selectedOperations.map((operation) => usages.get(operation.id) as ITokenUsageTotals),
    ),
    estimatedCost: estimatedCostForOperations(selectedOperations, input.priceBook),
    actualCost: actualCostForOperations(selectedOperations, input.actualCharges),
    phases: Object.freeze(phaseReports),
  };
}
