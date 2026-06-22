// Reusable jsPDF letterhead for counselor documents (consent receipt, AI letters, reports).
// Pulls branding from a counselor_profiles row. All fields optional — degrades gracefully.

const PAGE_W = 210, MARGIN = 16;

function fitImage(doc, dataUrl, maxW, maxH) {
  try {
    const p = doc.getImageProperties(dataUrl);
    const ratio = p.width / p.height;
    let w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    const fmt = (p.fileType || 'PNG').toUpperCase();
    return { w, h, fmt: fmt === 'JPG' ? 'JPEG' : fmt };
  } catch { return null; }
}

/**
 * Draw the letterhead header at the top of the current page.
 * Returns the y-coordinate (mm) where body content should start.
 */
export function renderLetterhead(doc, profile = {}, { W = PAGE_W, M = MARGIN } = {}) {
  const org = profile.klinik_name || '';
  const name = profile.display_name || '';
  const creds = Array.isArray(profile.credentials) ? profile.credentials.filter(Boolean).join(', ') : '';
  const reg = profile.registration_number ? `LKM: ${profile.registration_number}` : '';

  let textX = M;
  let y = 16;

  // Logo (left)
  if (profile.logo_data) {
    const fit = fitImage(doc, profile.logo_data, 26, 20);
    if (fit) {
      try { doc.addImage(profile.logo_data, fit.fmt, M, 12, fit.w, fit.h); textX = M + fit.w + 6; } catch { /* ignore */ }
    }
  }

  // Org + practitioner block
  doc.setTextColor(17, 24, 39);
  if (org) { doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(org, textX, y); y += 6; }
  if (name) {
    doc.setFont('helvetica', org ? 'normal' : 'bold'); doc.setFontSize(org ? 10.5 : 13);
    doc.setTextColor(55, 65, 81);
    doc.text(creds ? `${name}, ${creds}` : name, textX, y); y += 4.5;
  }
  if (reg) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(107, 114, 128); doc.text(reg, textX, y); y += 4.5; }

  const headerBottom = Math.max(y, 34);
  doc.setDrawColor(124, 58, 237); doc.setLineWidth(0.6);
  doc.line(M, headerBottom, W - M, headerBottom);
  doc.setLineWidth(0.2);
  return headerBottom + 8;
}

/**
 * Draw the letterhead footer (contact line) near the bottom of the page.
 */
export function renderLetterFooter(doc, profile = {}, { W = PAGE_W, M = MARGIN, y = 286 } = {}) {
  const parts = [
    profile.klinik_address, profile.phone, profile.official_email, profile.website,
    profile.org_registration_no ? `Reg: ${profile.org_registration_no}` : null,
  ].filter(Boolean);
  if (!parts.length) return;
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2);
  doc.line(M, y - 4, W - M, y - 4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(156, 163, 175);
  const line = parts.join('   ·   ');
  const wrapped = doc.splitTextToSize(line, W - M * 2);
  let yy = y;
  wrapped.slice(0, 2).forEach(l => { doc.text(l, W / 2, yy, { align: 'center' }); yy += 3.4; });
}

/**
 * Draw a signature block (image if available + name/credentials/reg/date) for letters.
 * Returns the y after the block.
 */
export function renderSignatureBlock(doc, profile = {}, { M = MARGIN, y = 230, dateStr = '' } = {}) {
  let yy = y;
  if (profile.signature_data) {
    const fit = fitImage(doc, profile.signature_data, 50, 18);
    if (fit) { try { doc.addImage(profile.signature_data, fit.fmt, M, yy, fit.w, fit.h); yy += fit.h + 1; } catch { /* ignore */ } }
  } else { yy += 14; }
  doc.setDrawColor(156, 163, 175); doc.setLineWidth(0.3); doc.line(M, yy, M + 60, yy); yy += 4.5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(31, 41, 55);
  if (profile.display_name) { doc.text(profile.display_name, M, yy); yy += 4.2; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(107, 114, 128);
  const creds = Array.isArray(profile.credentials) ? profile.credentials.filter(Boolean).join(', ') : '';
  if (creds) { doc.text(creds, M, yy); yy += 3.6; }
  if (profile.registration_number) { doc.text(`LKM: ${profile.registration_number}`, M, yy); yy += 3.6; }
  if (dateStr) { doc.text(`Date: ${dateStr}`, M, yy); yy += 3.6; }
  return yy;
}
