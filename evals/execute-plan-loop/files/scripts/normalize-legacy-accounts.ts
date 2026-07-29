export type LegacyAccount = {
  email: string;
};

export function normalizeLegacyAccount(account: LegacyAccount): LegacyAccount {
  return account;
}
