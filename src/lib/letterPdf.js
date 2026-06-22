import { renderLetterhead, renderLetterFooter } from './letterhead.js';

// Render an AI-generated letter (or any text) as a PDF on the counselor's letterhead.
export async function downloadLetterPdf({ body = '', title = 'Letter', clientName = '', profile = null }) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 16, CW = W - M * 2;

  let y = profile ? renderLetterhead(doc, profile, { W, M }) : 18;

  // Title + date
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(17, 24, 39);
  doc.text(title, M, y);
  const dateStr = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(107, 114, 128);
  doc.text(dateStr, W - M, y, { align: 'right' });
  y += 9;

  // Body (paginates as needed)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(31, 41, 55);
  const lines = doc.splitTextToSize(body || '', CW);
  for (const line of lines) {
    if (y > 255) { doc.addPage(); y = 18; }
    doc.text(line, M, y); y += 5;
  }

  // Signature image (the AI text already carries the typed name/credentials)
  if (profile?.signature_data) {
    if (y > 250) { doc.addPage(); y = 24; }
    try {
      const p = doc.getImageProperties(profile.signature_data);
      const w = 45, h = Math.min(18, w * (p.height / p.width));
      doc.addImage(profile.signature_data, (p.fileType || 'PNG').toUpperCase() === 'JPG' ? 'JPEG' : 'PNG', M, y + 4, w, h);
    } catch { /* ignore */ }
  }

  if (profile) renderLetterFooter(doc, profile, { W, M });

  const safe = (clientName || 'letter').replace(/\s+/g, '-').toLowerCase();
  doc.save(`kaunselor-letter-${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
