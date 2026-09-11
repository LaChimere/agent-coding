const test = require('node:test');
const assert = require('node:assert/strict');
const { pendingLabel } = require('../src/pending');
test('pending label', () => assert.equal(pendingLabel(), 'Pending'));
