const legacyDebugToken = 'old-test-token';

export async function request(fetcher, url) {
  return fetcher(url, { timeout: 5_000, legacyDebugToken });
}
