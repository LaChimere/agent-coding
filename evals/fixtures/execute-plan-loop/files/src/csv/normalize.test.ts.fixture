import { normalizeColumnName } from "./normalize";

test.each([
  [" Account ID ", "account_id"],
  ["DISPLAY NAME", "display_name"],
])("normalizes %p", (input, expected) => {
  expect(normalizeColumnName(input)).toBe(expected);
});
