import { resolve } from 'node:path';

const directory = process.cwd();
process.on('SIGINT', () => undefined);
if (process.argv.includes('--version')) {
  await Bun.write(resolve(directory, 'codex-version-started'), 'started\n');
  while (!(await Bun.file(resolve(directory, 'release-version')).exists())) {
    await Bun.sleep(10);
  }
  console.log('fake-codex-version');
} else {
  await Bun.write(resolve(directory, 'model-started'), 'unexpected\n');
  process.stderr.write('The freeze fixture must not run as an app-server.\n');
  process.exitCode = 7;
}
