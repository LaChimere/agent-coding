export function getShippingRate(destination) {
  return destination === "local" ? 5 : 12;
}
