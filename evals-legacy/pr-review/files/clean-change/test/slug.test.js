import { normalizeSlug } from '../src/slug.js';

test('normalizes a title', () => {
  expect(normalizeSlug(' Hello World ')).toBe('hello-world');
});
