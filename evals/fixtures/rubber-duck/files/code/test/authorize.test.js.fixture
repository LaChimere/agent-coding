import assert from 'node:assert/strict';
import test from 'node:test';
import { mayAdmin } from '../src/authorize.js';

test('allows admins', () => {
  assert.equal(mayAdmin({ role: 'admin' }), true);
});
