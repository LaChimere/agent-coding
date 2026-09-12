import { homedir } from 'node:os';
import { resolve } from 'node:path';

export interface IAuthenticationReference {
  environment: string;
  jsonFile?: { path: string; pointer: string };
}

/** Resolve only declared runtime references. Returned values must never be persisted. */
export async function resolveAuthentication(
  references: readonly IAuthenticationReference[],
  environment: Readonly<Record<string, string | undefined>> = process.env,
  userDirectory: string = homedir(),
): Promise<Record<string, string>> {
  const credentials: Record<string, string> = {};
  for (const reference of references) {
    const name = reference.environment;
    if (!/^[A-Z][A-Z0-9_]*$/.test(name) || Object.hasOwn(credentials, name)) {
      throw new Error(`Invalid or duplicate authentication reference: ${name}`);
    }

    let value: unknown = environment[name];
    if ((value === undefined || value === '') && reference.jsonFile !== undefined) {
      const { path, pointer } = reference.jsonFile;
      const file = path.startsWith('~/') ? resolve(userDirectory, path.slice(2)) : resolve(path);
      if (!pointer.startsWith('/')) {
        throw new Error(`Invalid JSON pointer for ${name}.`);
      }

      try {
        value = await Bun.file(file).json();
        for (const encoded of pointer.slice(1).split('/')) {
          const key = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
          if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) {
            value = undefined;
            break;
          }
          value = (value as Record<string, unknown>)[key];
        }
      } catch {
        // JSON parser errors can include source text containing a credential.
        throw new Error(`Cannot read the configured authentication JSON file for ${name}.`);
      }
    }
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`Missing authentication value for ${name}.`);
    }
    credentials[name] = value;
  }
  return credentials;
}
