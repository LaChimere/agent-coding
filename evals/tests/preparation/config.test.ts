import { describe, expect, test } from 'bun:test';
import { overlayConfig, parseConfig, runtimeEnvironment } from '../../src/preparation/config.ts';

describe('candidate configuration', () => {
  test('recursively overlays tables and replaces arrays without mutating inputs', () => {
    const baseline = parseConfig(
      'model="baseline"\n[agents]\nenabled=true\n[paths]\nroots=["a","b"]',
    );
    const candidate = parseConfig('model="candidate"\n[agents]\ncount=2\n[paths]\nroots=["c"]');

    expect(overlayConfig(baseline, candidate)).toEqual({
      model: 'candidate',
      agents: { enabled: true, count: 2 },
      paths: { roots: ['c'] },
    });

    expect(baseline).toEqual({
      model: 'baseline',
      agents: { enabled: true },
      paths: { roots: ['a', 'b'] },
    });
  });

  test.each([
    ['setting=1', 'setting="1"'],
    ['setting=[1]', 'setting=1'],
    ['[setting]\nx=1', 'setting=[]'],
  ])('rejects type conflicts between %s and %s', (base, candidate) => {
    expect(() => overlayConfig(parseConfig(base), parseConfig(candidate))).toThrow('type conflict');
  });

  test('rejects unsupported dates, infinities, and malformed TOML', () => {
    for (const value of ['date=1979-05-27', 'value=inf', 'value=']) {
      expect(() => parseConfig(value)).toThrow();
    }
  });
});

describe('child environment', () => {
  const paths = {
    home: '/trial/home',
    codexHome: '/trial/home/.codex',
    workspace: '/trial/workspace',
    temporary: '/trial/tmp',
    path: '/trial/workspace/bin:/usr/bin:/bin',
  };

  test('uses only declared credentials and controlled runtime paths', () => {
    const source = Object.fromEntries([
      ['EVAL_AUTH_TOKEN', 'fixture-value'],
      ['UNRELATED_TOKEN', 'not-inherited'],
      ['GIT_WORK_TREE', '/host/worktree'],
      ['NODE_OPTIONS', '--require=/host/instructions.js'],
      ['HOME', '/host/home'],
    ]);

    const environment = runtimeEnvironment(paths, ['EVAL_AUTH_TOKEN'], source);

    expect(Object.entries(environment)).toContainEqual(['HOME', '/trial/home']);
    expect(Object.entries(environment)).toContainEqual(['EVAL_AUTH_TOKEN', 'fixture-value']);
    expect(Object.entries(environment)).toContainEqual(['PATH', paths.path]);
    expect(Object.keys(environment)).not.toContain('UNRELATED_TOKEN');
    expect(Object.keys(environment)).not.toContain('GIT_WORK_TREE');
    expect(Object.keys(environment)).not.toContain('NODE_OPTIONS');
  });

  test('refuses missing or reserved authentication references before launch', () => {
    for (const name of ['MISSING_KEY', 'HOME', 'GIT_DIR', 'invalid-name']) {
      expect(() => runtimeEnvironment(paths, [name], {})).toThrow();
    }

    expect(() =>
      runtimeEnvironment(paths, ['EVAL_KEY'], Object.fromEntries([['EVAL_KEY', '']])),
    ).toThrow();
  });
});
