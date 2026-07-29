function normalizeLabel(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function customerLabel(name) {
  return `Customer: ${normalizeLabel(name)}`;
}
