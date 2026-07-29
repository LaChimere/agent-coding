export type Profile = {
  email: string;
  displayName: string;
};

export function parseProfileCsv(csv: string): Profile[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [email, displayName] = line.split(",");
      return { email, displayName };
    });
}
