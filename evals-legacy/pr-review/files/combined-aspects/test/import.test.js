const assert = require('node:assert/strict');
assert.equal(require('../src/import').importProfile('{"name":"A"}').name, 'A');
