function normalizeLabel(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function supplierLabel(name) {
  return `Supplier: ${normalizeLabel(name)}`;
}
