export interface CliOptions {
  output: string | null;
  batchSize: number;
  dryRun: boolean;
}

export const DEFAULT_OPTIONS: CliOptions = {
  output: null,
  batchSize: 500,
  dryRun: false,
};

/** `--out-file` is the deprecated spelling of `--output` and is removed in 0.5.0. */
export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { ...DEFAULT_OPTIONS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output" || arg === "--out-file") {
      options.output = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--batch-size") {
      options.batchSize = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else {
      throw new Error(`unknown flag: ${arg}`);
    }
  }
  return options;
}
