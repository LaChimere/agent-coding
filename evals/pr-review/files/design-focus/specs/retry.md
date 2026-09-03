# Retry requirements

Every attempt for one payment operation must reuse the same idempotency key so the provider cannot
charge the customer more than once.
