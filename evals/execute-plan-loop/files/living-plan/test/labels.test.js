const test = require('node:test');
const assert = require('node:assert/strict');
const labels = require('../src/labels.js');
test('first label', () => assert.equal(labels.first(), 'first'));
test('second label', () => assert.equal(labels.second(), 'second'));
