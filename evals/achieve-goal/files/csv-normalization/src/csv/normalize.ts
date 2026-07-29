/**
 * Partial implementation of the contract in docs/csv-normalization.md.
 *
 * Rules 1-3 are implemented. Rules 4-6 (underscore trimming, empty-header
 * placeholders, collision suffixes) are not implemented yet.
 */
export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function normalizeHeaderRow(headers: string[]): string[] {
  return headers.map((header) => normalizeHeader(header));
}
