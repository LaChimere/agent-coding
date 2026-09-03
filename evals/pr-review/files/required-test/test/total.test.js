import { total } from '../src/total.js';

test('totals positive values', () => {
  expect(total([2, 3])).toBe(5);
});

test('totals an empty list', () => {
  expect(total([])).toBe(0);
});
