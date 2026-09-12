export const promptfooVersion = '0.123.0';

/** Keep the published package's native bindings and templates at their installed paths. */
export async function loadPromptfoo(): Promise<typeof import('promptfoo')> {
  const metadataPath = Bun.resolveSync('promptfoo/package.json', import.meta.dir);
  const { version } = (await Bun.file(metadataPath).json()) as { version?: unknown };
  if (version !== promptfooVersion) {
    throw new Error(`Promptfoo must be pinned to ${promptfooVersion}.`);
  }

  const entry = Bun.resolveSync('promptfoo', import.meta.dir);

  return (await import(entry)) as typeof import('promptfoo');
}
