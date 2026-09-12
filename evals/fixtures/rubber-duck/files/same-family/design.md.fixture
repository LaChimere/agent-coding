# Payment retry design
The API retries failed charge requests automatically. Each network attempt receives a fresh idempotency key. Timeout means the API can safely retry, even if the downstream charge might already have committed. The goal is one charge per user operation.
