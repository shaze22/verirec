import { renderLetterhead, renderLetterFooter } from './letterhead.js';

const W = 210, M = 16, CW = W - M * 2;

const money = (n, cur) => `${cur} ${(Number(n) || 0).toFixed(2)}`;

function fmtDate(d) {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_LABEL = { paid: 'PAID', cancelled: 'CANCELLED', sent: '', draft: 'DRAFT' };

/**
 * Draw a full invoice onto a given jsPDF `doc`, on the counselor's letterhead.
 * Shared by the browser (download) and the server (email attachment) — the
 * caller creates and saves/outputs the doc.
 */
export function buildInvoiceDoc(invoiceDoc, invoice, opts = {}) {
  const doc = invoiceDoc;
  const {
    clientName = '', clientEmail = '', clientPhone = '',
    profile = null, currency = 'RM', payUrl = '', counselorEmail = '',
  } = opts;

  let y = renderLetterhead(doc, profile || {});

  // ── Title + status stamp ──
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(17, 24, 39);
  doc.text('INVOICE', M, y + 2);

  const stamp = STATUS_LABEL[invoice.status];
  if (stamp) {
    const paid = invoice.status === 'paid';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.setTextColor(...(paid ? [22, 101, 52] : [107, 114, 128]));
    doc.setDrawColor(...(paid ? [34, 197, 94] : [209, 213, 219]));
    const tw = doc.getTextWidth(stamp) + 8;
    doc.roundedRect(W - M - tw, y - 4, tw, 8, 1.5, 1.5);
    doc.text(stamp, W - M - tw + 4, y + 1.5);
  }
  y += 10;

  // ── Meta (left: invoice details, right: bill to) ──
  const colR = M + CW / 2 + 6;
  let yL = y, yR = y;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(124, 58, 237);
  doc.text('INVOICE DETAILS', M, yL); yL += 5;
  doc.text('BILL TO', colR, yR); yR += 5;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(55, 65, 81);
  const metaRows = [
    ['No.', invoice.invoice_number || '—'],
    ['Date', fmtDate(invoice.invoice_date)],
    invoice.due_date ? ['Due', fmtDate(invoice.due_date)] : null,
  ].filter(Boolean);
  metaRows.forEach(([k, v]) => {
    doc.setTextColor(107, 114, 128); doc.text(`${k}:`, M, yL);
    doc.setTextColor(31, 41, 55); doc.text(String(v), M + 16, yL);
    yL += 4.8;
  });

  doc.setTextColor(31, 41, 55); doc.setFont('helvetica', 'bold');
  doc.text(clientName || 'Client', colR, yR); yR += 4.8;
  doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128); doc.setFontSize(9);
  if (clientEmail) { doc.text(clientEmail, colR, yR); yR += 4.4; }
  if (clientPhone) { doc.text(clientPhone, colR, yR); yR += 4.4; }

  y = Math.max(yL, yR) + 6;

  // ── Line items table ──
  const colQty = M + CW - 62, colUnit = M + CW - 42, colAmt = M + CW;

  doc.setFillColor(245, 243, 255);
  doc.rect(M, y - 5, CW, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(91, 33, 182);
  doc.text('DESCRIPTION', M + 2, y);
  doc.text('QTY', colQty, y, { align: 'right' });
  doc.text('UNIT', colUnit, y, { align: 'right' });
  doc.text('AMOUNT', colAmt - 2, y, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(55, 65, 81);
  const lines = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  lines.forEach(l => {
    if (y > 240) { doc.addPage(); y = M + 6; }
    const qty = Number(l.qty) || 0;
    const unit = Number(l.unit_price) || 0;
    const desc = doc.splitTextToSize(String(l.description || ''), CW - 70);
    doc.text(desc.slice(0, 3), M + 2, y);
    doc.text(String(qty), colQty, y, { align: 'right' });
    doc.text(money(unit, currency), colUnit, y, { align: 'right' });
    doc.text(money(qty * unit, currency), colAmt - 2, y, { align: 'right' });
    y += Math.max(desc.length, 1) * 4.4 + 2.2;
    doc.setDrawColor(243, 244, 246); doc.setLineWidth(0.2);
    doc.line(M, y - 2, M + CW, y - 2);
  });

  // ── Totals ──
  y += 4;
  const labelX = colUnit, valX = colAmt - 2;
  const totalsRows = [
    ['Subtotal', invoice.subtotal],
    Number(invoice.tax_rate) ? [`Tax (${invoice.tax_rate}%)`, invoice.tax_amount] : null,
  ].filter(Boolean);

  doc.setFontSize(9.5); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
  totalsRows.forEach(([k, v]) => {
    doc.text(k, labelX, y, { align: 'right' });
    doc.text(money(v, currency), valX, y, { align: 'right' });
    y += 5;
  });

  doc.setDrawColor(124, 58, 237); doc.setLineWidth(0.5);
  doc.line(labelX - 30, y - 1, M + CW, y - 1);
  y += 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(17, 24, 39);
  doc.text('TOTAL', labelX, y, { align: 'right' });
  doc.text(money(invoice.total, currency), valX, y, { align: 'right' });
  y += 10;

  // ── Payment instructions ──
  if (invoice.status !== 'paid') {
    const payLines = [];
    if (payUrl) payLines.push(`Pay online: ${payUrl}`);
    if (profile?.payment_url && profile.payment_url !== payUrl) payLines.push(`Or: ${profile.payment_url}`);
    if (counselorEmail || profile?.official_email || profile?.phone) {
      payLines.push(`Questions? ${[profile?.phone, profile?.official_email || counselorEmail].filter(Boolean).join('  ·  ')}`);
    }
    if (payLines.length) {
      if (y > 250) { doc.addPage(); y = M + 6; }
      doc.setFillColor(250, 245, 255);
      doc.setDrawColor(233, 213, 255); doc.setLineWidth(0.3);
      const boxH = payLines.length * 5 + 10;
      doc.roundedRect(M, y, CW, boxH, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(91, 33, 182);
      doc.text('PAYMENT', M + 4, y + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(88, 28, 135);
      let py = y + 11.5;
      payLines.forEach(l => {
        doc.text(doc.splitTextToSize(l, CW - 8)[0], M + 4, py);
        py += 5;
      });
      y += boxH + 6;
    }
  }

  // ── Notes ──
  if (invoice.notes) {
    if (y > 255) { doc.addPage(); y = M + 6; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text('NOTES', M, y); y += 4.6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(75, 85, 99);
    doc.splitTextToSize(String(invoice.notes), CW).slice(0, 6).forEach(l => { doc.text(l, M, y); y += 4.2; });
  }

  renderLetterFooter(doc, profile || {});
  return y;
}
