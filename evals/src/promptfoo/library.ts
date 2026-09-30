export const promptfooVersion = '0.123.0';
const promptfooConfigDirectoryKey = 'PROMPTFOO_CONFIG_DIR';

/** The caller must select Promptfoo's data directory before importing the package. */
export async function loadPromptfoo(): Promise<typeof import('promptfoo')> {
  const configDirectory = process.env[promptfooConfigDirectoryKey];
  if (configDirectory === undefined || configDirectory.trim().length === 0) {
    throw new Error('PROMPTFOO_CONFIG_DIR must be set before loading Promptfoo.');
  }

  const metadataPath = Bun.resolveSync('promptfoo/package.json', import.meta.dir);
  const { version } = (await Bun.file(metadataPath).json()) as { version?: unknown };
  if (version !== promptfooVersion) {
    throw new Error(`Promptfoo must be pinned to ${promptfooVersion}.`);
  }

  const entry = Bun.resolveSync('promptfoo', import.meta.dir);

  return (await import(entry)) as typeof import('promptfoo');
}
