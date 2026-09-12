export type ConfigValue = string | number | boolean | ConfigValue[] | IConfigTable;

export interface IConfigTable {
  [key: string]: ConfigValue;
}

export function isConfigTable(value: ConfigValue | undefined): value is IConfigTable {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** TOML tables merge recursively; arrays replace in full; incompatible types fail. */
export function overlayConfig(base: IConfigTable, candidate: IConfigTable): IConfigTable {
  const merged = structuredClone(base);
  for (const [key, value] of Object.entries(candidate)) {
    const previous = merged[key];
    if (previous === undefined) {
      merged[key] = structuredClone(value);
    } else if (isConfigTable(previous) && isConfigTable(value)) {
      merged[key] = overlayConfig(previous, value);
    } else if (Array.isArray(previous) && Array.isArray(value)) {
      merged[key] = structuredClone(value);
    } else if (
      !isConfigTable(previous) &&
      !isConfigTable(value) &&
      !Array.isArray(previous) &&
      !Array.isArray(value) &&
      typeof previous === typeof value
    ) {
      merged[key] = value;
    } else {
      throw new Error(`Configuration type conflict at ${key}.`);
    }
  }
  return merged;
}

/** Accept only values used by Codex configuration; never coerce invalid input. */
export function parseConfig(text: string): IConfigTable {
  const parsed: unknown = Bun.TOML.parse(text);

  const validate = (value: unknown): ConfigValue => {
    if (typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(validate);
    }
    if (
      value === null ||
      typeof value !== 'object' ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    ) {
      throw new Error('Unsupported TOML configuration value.');
    }

    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, validate(item)]));
  };

  const result = validate(parsed);
  if (!isConfigTable(result)) {
    throw new Error('Configuration must be a TOML table.');
  }

  return result;
}

export interface IRuntimePaths {
  home: string;
  codexHome: string;
  workspace: string;
  temporary: string;
  path: string;
}

/** Do not inherit Git context, host instruction roots, or unrelated credentials. */
export function runtimeEnvironment(
  paths: IRuntimePaths,
  authentication: readonly string[],
  source: Readonly<Record<string, string | undefined>> = process.env,
): Record<string, string> {
  const entries: [string, string][] = [
    ['HOME', paths.home],
    ['CODEX_HOME', paths.codexHome],
    ['XDG_CONFIG_HOME', `${paths.home}/.config`],
    ['XDG_CACHE_HOME', `${paths.home}/.cache`],
    ['TMPDIR', paths.temporary],
    ['PATH', paths.path],
    ['PWD', paths.workspace],
    ['SHELL', '/bin/zsh'],
    ['LANG', 'en_US.UTF-8'],
    ['TERM', 'dumb'],
    ['GIT_CONFIG_NOSYSTEM', '1'],
    ['GIT_CONFIG_GLOBAL', '/dev/null'],
  ];

  const reserved = new Set(entries.map(([name]) => name));

  for (const name of authentication) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name) || reserved.has(name) || name.startsWith('GIT_')) {
      throw new Error(`Invalid authentication environment reference: ${name}`);
    }

    const value = source[name];
    if (value === undefined || value.length === 0) {
      throw new Error(`Missing authentication environment reference: ${name}`);
    }
    entries.push([name, value]);
    reserved.add(name);
  }

  return Object.fromEntries(entries);
}
