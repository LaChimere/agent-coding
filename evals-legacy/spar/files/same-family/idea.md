# Cache proposal
Use process-local caches in several application instances. Database writes return immediately, then publish best-effort invalidations. Product requires every subsequent read on any instance to see the completed write. Operators want writes available when the message broker is offline. No invalidation failure or acknowledgment mechanism is specified.
