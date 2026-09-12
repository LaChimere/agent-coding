import { runCli } from '../../src/cli.ts';

const [project, runDirectory, ...options] = process.argv.slice(2);
if (project === undefined || runDirectory === undefined) {
  throw new Error('Missing regrade paths.');
}

try {
  await runCli(['regrade', runDirectory, ...options], project);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
