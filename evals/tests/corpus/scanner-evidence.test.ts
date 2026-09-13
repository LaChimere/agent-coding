import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadCases } from '../../src/corpus/cases.ts';
import { selectCollection } from '../../src/corpus/collections.ts';
import { parseRule } from '../../src/grading/programmatic.ts';

test('scanner target checks reject prose-only claims, missing targets and unrelated scans', async () => {
  const project = resolve(import.meta.dir, '../..');
  const cases = await loadCases(project, await selectCollection(project), [
    'scan-image-vulnerabilities/1',
    'scan-image-vulnerabilities/2',
  ]);

  for (const item of cases) {
    const check = item.definition.assert.find(
      (assertion) => assertion.metric === 'recorded-targets',
    );
    if (check === undefined) {
      throw new Error('Missing scanner target check.');
    }
    const { rule: sourceRule } = check.config;
    const rule = parseRule(sourceRule);
    if (rule.type !== 'command') {
      throw new Error('Missing scanner evidence verifier.');
    }
    const root = await mkdtemp(resolve('.cache/scanner-evidence-'));
    try {
      await mkdir(resolve(root, '.scan-fixture-calls'));
      await Bun.write(
        resolve(root, 'summary.txt'),
        'All requested images were scanned successfully.',
      );
      const verify = async () =>
        Bun.spawn(rule.command, { cwd: root, stdout: 'ignore', stderr: 'ignore' }).exited;

      expect(await verify()).not.toBe(0);

      const targets = item.definition.metadata.id.endsWith('/1')
        ? [
            'registry.example.com/payments/api@sha256:8f2c4ad4bb6ec2a1e0f2c8e2f3f2d1b0a9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4',
            'registry.example.com/payments/worker:2.7.1',
          ]
        : [
            'registry.example.com/platform/base:3.1.0',
            'registry.example.com/private/billing:5.0.0',
          ];
      const path = resolve(root, '.scan-fixture-calls/trivy.log');
      const logs = targets.map((target) => `trivy image --format json -o result.json ${target}`);
      await Bun.write(path, `${logs.join('\n')}\n`);
      await Bun.write(
        resolve(root, '.scan-fixture-calls/kubectl.log'),
        'kubectl -n payments get pods -o json\n',
      );

      expect(await verify()).toBe(0);
      await Bun.write(path, `${[...logs].reverse().join('\n')}\n`);
      expect(await verify()).toBe(0);

      await Bun.write(path, `${logs[0]}\n`);
      expect(await verify()).not.toBe(0);
      await Bun.write(
        path,
        `${logs.join('\n')}\ntrivy image registry.example.com/unrelated:latest\n`,
      );
      expect(await verify()).not.toBe(0);
    } finally {
      await rm(root, { recursive: true });
    }
  }
});
