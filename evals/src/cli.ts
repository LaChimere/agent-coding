import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadCases } from './corpus/cases.ts';
import { regradeRun } from './execution/regrade.ts';
import { runWorker, saveReport } from './execution/worker.ts';
import { calibrateGraders } from './grading/calibration.ts';
import { freezeRun } from './preparation/run.ts';
import { writeJsonRecord } from './preparation/snapshot.ts';
import { resolveCodexExecutable } from './preparation/tools.ts';
import { compareReports, type ITrialPair } from './results/compare.ts';
import { loadPriceBook } from './results/pricing.ts';
import type { IRunManifest } from './results/records.ts';
import type { IReport } from './results/report.ts';
import type { IActualChargeEvidence } from './results/resources.ts';

const help = `Codex evaluations

  bun run start -- validate
  bun run start -- calibrate
  bun run start -- run [--candidate REPO] [--case ID ...] [--profile default]
                      [--repeat 1] [--concurrency 2] [--codex EXECUTABLE]
  bun run start -- regrade RUN_DIRECTORY [--case ID ...]
  bun run start -- report RUN_DIRECTORY [--prices FILE] [--charges FILE]
  bun run start -- compare LEFT_REPORT.json RIGHT_REPORT.json
  bun run start -- view REPORT.json

Run defaults: current repository, full Codex suite, one fresh trial per case.
Compare two explicitly executed candidates using case ID and repetition pairing.
There are no task time or token limits. Ctrl-C preserves available evidence.
`;

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const number = Number(value);
  if (!/^\d+$/u.test(value) || !Number.isSafeInteger(number) || number < 1) {
    throw new Error('Counts must be positive integers.');
  }

  return number;
}

function requireArgument(values: readonly string[], index: number, label: string): string {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing ${label}.`);
  }
  return resolve(value);
}

export async function runCli(args: readonly string[], project: string): Promise<void> {
  const argv = args[0] === '--' ? args.slice(1) : [...args];
  const command = argv[0];
  if (command === undefined || command === 'help' || command === '--help') {
    console.log(help);
    return;
  }

  const controller = new AbortController();
  const interrupt = () => controller.abort(new Error('Manual interruption.'));
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);

  try {
    if (command === '_worker') {
      console.log(await runWorker(requireArgument(argv, 1, 'run directory'), controller.signal));
      return;
    }

    if (command === 'validate') {
      if (argv.length !== 1) {
        throw new Error('validate accepts no positional arguments.');
      }

      const cases = await loadCases(project);
      const checks = cases.reduce((total, item) => total + item.definition.assert.length, 0);
      console.log(
        JSON.stringify({
          valid: true,
          cases: cases.length,
          checks,
        }),
      );

      return;
    }

    if (command === 'calibrate') {
      if (argv.length !== 1) {
        throw new Error('calibrate accepts no positional arguments.');
      }
      console.log(await calibrateGraders(project, controller.signal));
      return;
    }

    if (command === 'run') {
      const { values, positionals } = parseArgs({
        args: argv.slice(1),
        strict: true,
        allowPositionals: true,
        options: {
          candidate: { type: 'string' },
          case: { type: 'string', multiple: true },
          profile: { type: 'string' },
          repeat: { type: 'string' },
          concurrency: { type: 'string' },
          codex: { type: 'string' },
        },
      });

      if (positionals.length !== 0) {
        throw new Error('Unexpected run arguments.');
      }

      const executable = await resolveCodexExecutable(
        resolve(project, 'profiles', values.profile ?? 'default'),
        values.codex,
      );

      const frozen = await freezeRun({
        project,
        candidates: [resolve(values.candidate ?? resolve(project, '..'))],
        selectedCases: values.case ?? [],
        profile: values.profile ?? 'default',
        concurrency: positiveInteger(values.concurrency, 2),
        repetitions: positiveInteger(values.repeat, 1),
        codexExecutable: resolve(executable),
      });

      controller.signal.throwIfAborted();
      console.log(
        `Run ${frozen.manifest.id}: ${frozen.manifest.trials.length} planned trials\n${frozen.directory}`,
      );

      const worker = Bun.spawn(
        [
          process.execPath,
          resolve(frozen.directory, 'private/src/index.ts'),
          '_worker',
          frozen.directory,
        ],
        {
          cwd: project,
          stdout: 'inherit',
          stderr: 'inherit',
        },
      );

      const stop = () => worker.kill('SIGINT');
      controller.signal.addEventListener('abort', stop, { once: true });
      if (controller.signal.aborted) {
        stop();
      }

      try {
        process.exitCode = await worker.exited;
      } finally {
        controller.signal.removeEventListener('abort', stop);
      }

      return;
    }

    if (command === 'regrade') {
      const { values, positionals } = parseArgs({
        args: argv.slice(1),
        strict: true,
        allowPositionals: true,
        options: { case: { type: 'string', multiple: true } },
      });

      if (positionals.length !== 1) {
        throw new Error('regrade requires one run directory.');
      }

      console.log(
        await regradeRun(
          project,
          requireArgument(positionals, 0, 'run directory'),
          controller.signal,
          values.case ?? [],
        ),
      );

      return;
    }

    if (command === 'report') {
      const { values, positionals } = parseArgs({
        args: argv.slice(1),
        strict: true,
        allowPositionals: true,
        options: { prices: { type: 'string' }, charges: { type: 'string' } },
      });

      if (positionals.length !== 1) {
        throw new Error('report requires one run directory.');
      }

      const runDirectory = requireArgument(positionals, 0, 'run directory');
      const manifest = (await Bun.file(
        resolve(runDirectory, 'manifest.json'),
      ).json()) as IRunManifest;

      const priceBook =
        values.prices === undefined
          ? (manifest.priceBook ?? (await loadPriceBook(project)))
          : await loadPriceBook(project, values.prices);

      const actualCharges =
        values.charges === undefined
          ? undefined
          : ((await Bun.file(resolve(values.charges)).json()) as IActualChargeEvidence[]);

      console.log(
        await saveReport({
          directory: runDirectory,
          priceBook,
          ...(actualCharges === undefined ? {} : { actualCharges }),
        }),
      );

      return;
    }

    if (command === 'compare') {
      if (argv.length !== 3) {
        throw new Error('compare requires two saved report files.');
      }

      const left = (await Bun.file(requireArgument(argv, 1, 'left report')).json()) as IReport;
      const right = (await Bun.file(requireArgument(argv, 2, 'right report')).json()) as IReport;
      if (left.schema !== 'codex-evals/report-v1' || right.schema !== 'codex-evals/report-v1') {
        throw new Error('Unsupported saved report.');
      }
      if (left.manifest.candidates.length !== 1 || right.manifest.candidates.length !== 1) {
        throw new Error('CLI comparisons require one candidate per saved run.');
      }

      const pairs: ITrialPair[] = [];

      for (const trial of left.manifest.trials) {
        const matching = right.manifest.trials.filter(
          (candidate) =>
            candidate.caseId === trial.caseId && candidate.repetition === trial.repetition,
        );

        if (matching.length > 1) {
          throw new Error('Ambiguous case/repetition pairing.');
        }

        const match = matching[0];
        if (match !== undefined) {
          pairs.push({ leftTrialId: trial.id, rightTrialId: match.id });
        }
      }

      const comparison = compareReports({
        left,
        right,
        pairs,
      });

      const path = resolve(project, 'out/comparisons', `${randomUUID()}.json`);
      await writeJsonRecord(path, {
        ...comparison,
        pairingRule: 'case-id-and-repetition; independent of outcomes',
        unpaired: {
          left: left.manifest.trials
            .filter((trial) => !pairs.some((pair) => pair.leftTrialId === trial.id))
            .map((trial) => trial.id),
          right: right.manifest.trials
            .filter((trial) => !pairs.some((pair) => pair.rightTrialId === trial.id))
            .map((trial) => trial.id),
        },
      });

      console.log(path);

      return;
    }

    if (command === 'view') {
      if (argv.length !== 2) {
        throw new Error('view requires one saved report file.');
      }

      const file = requireArgument(argv, 1, 'report');
      const report = (await Bun.file(file).json()) as IReport;
      if (report.schema !== 'codex-evals/report-v1') {
        throw new Error('Unsupported saved report.');
      }

      const native = report.definition.nativeExport?.htmlPath;
      console.log(
        `${file}\n${file.replace(/\.json$/u, '.md')}\n${native ?? 'No native export is associated with this report.'}`,
      );
      if (native !== undefined && (await Bun.file(native).exists())) {
        const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
        const processHandle = Bun.spawn([opener, native], { stdout: 'inherit', stderr: 'inherit' });
        if ((await processHandle.exited) !== 0) {
          throw new Error('Could not open native export.');
        }
      }

      return;
    }
    throw new Error(`Unknown command: ${command}`);
  } finally {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
  }
}
