import { normalizeLegacyAccount } from "../scripts/normalize-legacy-accounts";

test("normalizes legacy account email", () => {
  expect(normalizeLegacyAccount({ email: " USER@EXAMPLE.COM " })).toEqual({
    email: "user@example.com",
  });
});
