import { renderUser } from '../src/render-user.js';

test('renders a missing user safely', () => {
  expect(renderUser(null)).toBe('Anonymous');
});
