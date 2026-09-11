# Queue decision

Replace synchronous invoice generation with a queue to reduce request latency. Customers currently
expect an invoice number in the response, while operations wants retries and load isolation.
