import { buildConsentDoc } from './consentPdfDoc.js';

// Browser: build the consent PDF on the counselor's letterhead and trigger a download.
export async function downloadConsentPdf(consent, opts = {}) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  buildConsentDoc(doc, consent, opts);
  const safe = (opts.clientName || 'client').replace(/\s+/g, '-').toLowerCase();
  doc.save(`kaunselor-consent-${safe}-${consent.signed_at?.slice(0, 10) || 'signed'}.pdf`);
}
