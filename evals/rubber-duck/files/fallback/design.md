# Retry design

Each retry attempt sends a newly generated idempotency key. The receiver deduplicates requests by
that key, while the product requirement is that one logical payment operation creates at most one
charge even when several attempts time out.
