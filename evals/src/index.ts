import { resolve } from 'node:path';
import { runCli } from './cli.ts';

if (import.meta.main) {
  try {
    await runCli(process.argv.slice(2), resolve(import.meta.dir, '..'));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
