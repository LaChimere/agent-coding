"use strict";

function formatInvoiceReference(invoiceId) {
  return `invoice-${invoiceId}`;
}

module.exports = { formatInvoiceReference };
