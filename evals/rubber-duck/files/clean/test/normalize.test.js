import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeName } from '../src/normalize.js';

test('trims and collapses whitespace', () => {
  assert.equal(normalizeName('  Ada   Lovelace  '), 'Ada Lovelace');
});
