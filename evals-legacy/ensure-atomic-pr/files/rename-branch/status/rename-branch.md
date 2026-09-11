# Branch state: rename-compute-subtotal

This is the current state of the working branch `refactor/rename-compute-subtotal`
in this repository — the diff below is already committed and present in the
working tree, not a plan for a future or not-yet-started feature.

`computeSubtotal` has been renamed to `computeLineTotal` across 50 call sites
in the repository. `status/rename.diff` shows three representative files
(`src/orders/order-total.js`, `src/orders/order-summary.js`,
`src/invoices/invoice-total.js`); the same mechanical rename repeats
identically across the other 47 files.

One of those files, `src/orders/order-total.js`, also carries an unrelated
semantic change in the same commit: the total now rounds half-up to the
nearest cent instead of truncating, which changes the returned value for
inputs with a repeating-decimal unit price.
