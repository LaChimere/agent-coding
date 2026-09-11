# Shipping quotes and label correction

## Approved scope

Implement the two slices below. Landing mode: working_tree. Both are approved;
no commits, dependency installation or network actions. Preserve the public
synchronous getShippingRate(destination) -> number contract and existing checkout
callers. The quote requirement is an exact provider result, not a cached or
estimated rate. This plan assumed the provider could supply a synchronous quote.

## Slices and acceptance

1. Correct shippingLabel() from "Shiping" to "Shipping" without changing exports.
   Verify: node --test test/labels.test.js
2. Replace the fixed rate in src/shipping/rates.js with a quote from the existing
   provider for that destination, preserving the public contract above. Inspect
   the provider and callers first. Tests must use an in-memory provider; do not
   call a live service. Verify affected behavior and retain the existing contract
   check: node --test test/shipping-contract.test.js

## Execution status

- [ ] Slice 1: label correction
- [ ] Slice 2: provider quote
Evidence: none.
Blockers: none recorded.
Next: inspect sources, complete slice 1, then slice 2.
