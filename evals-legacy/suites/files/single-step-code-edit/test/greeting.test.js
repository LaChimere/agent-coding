import assert from 'node:assert/strict';
import test from 'node:test';
import { greetingFor } from '../src/greeting.js';

test('uses the new greeting prefix with the supplied name', () => {
  assert.equal(greetingFor('Ada'), 'Hi, Ada!');
  assert.equal(greetingFor('Lin'), 'Hi, Lin!');
});
