-- 20260618_add_refund_ledger
-- forward
CREATE TABLE refund_ledger (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders (id),
  amount_cents BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO refund_ledger (order_id, amount_cents, created_at)
SELECT id, refund_cents, updated_at FROM orders WHERE refund_cents > 0;

ALTER TABLE orders DROP COLUMN refund_cents;

-- rollback
-- ALTER TABLE orders ADD COLUMN refund_cents BIGINT NOT NULL DEFAULT 0;
-- UPDATE orders SET refund_cents = (
--   SELECT COALESCE(SUM(amount_cents), 0) FROM refund_ledger WHERE refund_ledger.order_id = orders.id
-- );
-- DROP TABLE refund_ledger;
