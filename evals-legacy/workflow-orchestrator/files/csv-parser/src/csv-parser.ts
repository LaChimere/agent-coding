export function parseHeaders(csv: string): string[] {
  const [headerLine = ""] = csv.split(/\r?\n/, 1);
  return headerLine.split(",");
}
