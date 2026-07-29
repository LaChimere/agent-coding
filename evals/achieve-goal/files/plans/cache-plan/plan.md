# Plan: cache-plan

## Objective

Add a bounded in-memory cache in front of the pricing lookup to cut redundant upstream calls.

## Approved scope

- `src/pricing/cache.ts`
- `src/pricing/cache.test.ts`

## Approval

Approved by the user; the next milestone is the eviction-policy slice.
