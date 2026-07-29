# Discount formula

The loyalty-tier discount rate is applied to the order subtotal before tax:

| Tier | Rate |
|---|---|
| gold | 15% |
| silver | 10% |
| other | 5% |

The applied rate is capped at 15% regardless of tier, so the discount can
never exceed `subtotal * 0.15`. The result is rounded to the nearest cent.
