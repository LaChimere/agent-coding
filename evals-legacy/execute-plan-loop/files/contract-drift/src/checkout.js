import { getShippingRate } from "./shipping/rates.js";

// Published synchronous API used by the checkout display and receipt builder.
export function checkoutTotal(subtotal, destination) {
  return subtotal + getShippingRate(destination);
}
