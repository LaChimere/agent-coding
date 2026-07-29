export const HELP_TEXT = `recordctl - inspect a record store

usage: recordctl [options] <command>

commands:
  list          list records in the current store
  show <id>     print one record
  verify        check the store for corupt records

options:
  --store <path>       path to the record store (default ./store)
  --format <json|text> output format (default text)
  --quiet              suppress non error output
`;

export const OPTIONS = ["--store", "--format", "--verbose", "--quiet"];

export function renderHelp(): string {
  return HELP_TEXT;
}
