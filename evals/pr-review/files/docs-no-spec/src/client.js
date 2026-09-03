export async function requestOnce(fetcher, url) {
  const first = await fetcher(url);
  return first.ok ? first : fetcher(url);
}
