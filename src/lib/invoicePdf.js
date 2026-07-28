import { buildInvoiceDoc } from './invoicePdfDoc.js';

// Browser: build the invoice PDF on the counselor's letterhead and trigger a download.
export async function downloadInvoicePdf(invoice, opts = {}) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  buildInvoiceDoc(doc, invoice, opts);
  const safe = (invoice.invoice_number || 'invoice').replace(/[^\w-]+/g, '-').toLowerCase();
  doc.save(`invoice-${safe}.pdf`);
}
