import { authenticate } from '../src/auth.js';

test('returns a verified user', async () => {
  const verifier = { verify: async () => ({ role: 'member' }) };
  expect(await authenticate('valid', verifier)).toEqual({ role: 'member' });
});
