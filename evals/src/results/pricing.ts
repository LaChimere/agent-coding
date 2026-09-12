import { resolve } from 'node:path';
import { type IPriceBook, validatePriceBook } from './resources.ts';

/** Read versioned local rates; evaluation startup never fetches mutable live prices. */
export async function loadPriceBook(project: string, file?: string): Promise<IPriceBook> {
  const path = resolve(file ?? resolve(project, 'pricing/openai-standard.json'));
  const priceBook = (await Bun.file(path).json()) as IPriceBook;
  validatePriceBook(priceBook);

  return priceBook;
}
