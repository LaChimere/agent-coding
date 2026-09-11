// The provider SDK exposes only asynchronous per-request quotes. It has no
// synchronous quote or cache API. Production supplies the existing transport;
// tests supply an in-memory transport with the same Promise contract.
export function createQuoteProvider(transport) {
  return {
    async quote(destination) {
      const response = await transport.request({ destination });
      return response.amount;
    },
  };
}
