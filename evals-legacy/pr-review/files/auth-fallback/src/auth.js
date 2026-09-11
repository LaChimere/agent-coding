export async function authenticate(token, verifier) {
  try {
    return await verifier.verify(token);
  } catch {
    return { role: 'guest' };
  }
}
