import { CONSENT_SECTIONS, CRISIS_RESOURCES } from '../data/consentDocument.js';
import { renderLetterhead, renderLetterFooter } from './letterhead.js';

const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const LABELS = {
  en: {
    title: 'Informed Consent for Counseling',
    client: 'Client', counselor: 'Counselor', signedBy: 'Signed by',
    ic: 'IC / Passport', guardian: 'Guardian', relationship: 'Relationship',
    date: 'Date & time', version: 'Document version', language: 'Language',
    signature: 'Signature', seal: 'Integrity seal (SHA-256)',
    crisis: 'Crisis resources', status: 'Status', withdrawn: 'WITHDRAWN',
    footer: 'This document was digitally signed and sealed via Kaunselor. The SHA-256 seal lets its integrity be verified.',
    reaffirm: 'Re-affirmations',
  },
  ms: {
    title: 'Kebenaran Termaklum untuk Kaunseling',
    client: 'Klien', counselor: 'Kaunselor', signedBy: 'Ditandatangani oleh',
    ic: 'No. IC / Pasport', guardian: 'Penjaga', relationship: 'Hubungan',
    date: 'Tarikh & masa', version: 'Versi dokumen', language: 'Bahasa',
    signature: 'Tandatangan', seal: 'Meterai integriti (SHA-256)',
    crisis: 'Sumber krisis', status: 'Status', withdrawn: 'DITARIK BALIK',
    footer: 'Dokumen ini ditandatangani dan dimeterai secara digital melalui Kaunselor. Meterai SHA-256 membolehkan integritinya disahkan.',
    reaffirm: 'Pengesahan semula',
  },
};

/**
 * Draw the full informed-consent document onto a given jsPDF `doc`.
 * Shared by the browser (download) and the server (email attachment) —
 * the caller creates/saves/outputs the doc.
 */
export function buildConsentDoc(doc, consent, { clientName = '', counselorName = '', profile = null } = {}) {
  const lang = consent.language === 'en' ? 'en' : 'ms';
  const L = LABELS[lang];
  const vars = { counselor: counselorName || (lang === 'ms' ? 'kaunselor anda' : 'your counselor'), client: clientName };

  const W = 210, M = 16, CW = W - M * 2;
  let y = M;

  const ensure = (need) => { if (y + need > 285) { doc.addPage(); y = M; } };
  const text = (str, size, style = 'normal', color = [31, 41, 55]) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(str, CW);
    lines.forEach(line => { ensure(size * 0.45 + 1.5); doc.text(line, M, y); y += size * 0.45 + 1.5; });
  };

  // Letterhead (logo, org, credentials, reg no)
  y = profile ? renderLetterhead(doc, profile, { W, M }) : 16;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(124, 58, 237);
  doc.text(L.title, M, y); y += 7;

  if (consent.status === 'withdrawn') {
    doc.setFillColor(254, 226, 226); doc.rect(M, y - 4, CW, 9, 'F');
    text(`${L.status}: ${L.withdrawn}`, 10, 'bold', [185, 28, 28]); y += 2;
  }

  // Meta
  text(`${L.client}: ${clientName}`, 11, 'bold');
  text(`${L.counselor}: ${counselorName}`, 10);
  text(`${L.signedBy}: ${consent.full_name}${consent.ic_number ? `  ·  ${L.ic}: ${consent.ic_number}` : ''}`, 10);
  if (consent.is_guardian) {
    text(`${L.guardian}: ${consent.guardian_name || ''}${consent.guardian_relationship ? `  ·  ${L.relationship}: ${consent.guardian_relationship}` : ''}`, 10);
  }
  const dt = new Date(consent.signed_at).toLocaleString(lang === 'ms' ? 'ms-MY' : 'en-MY');
  text(`${L.date}: ${dt}`, 10);
  text(`${L.version}: ${consent.version}  ·  ${L.language}: ${lang.toUpperCase()}`, 10, 'normal', [107, 114, 128]);
  if (consent.reaffirmation_count) text(`${L.reaffirm}: ${consent.reaffirmation_count}`, 10, 'normal', [107, 114, 128]);
  y += 3;

  // Clauses
  CONSENT_SECTIONS.forEach(s => {
    ensure(14);
    const acked = consent.clauses && consent.clauses[s.id];
    text(`${acked ? '[x] ' : ''}${s.title[lang]}`, 11, 'bold', [124, 58, 237]);
    text(fill(s.body[lang], vars), 9.5, 'normal', [55, 65, 81]);
    y += 2;
  });

  // Crisis resources
  ensure(20);
  text(L.crisis, 10, 'bold', [185, 28, 28]);
  CRISIS_RESOURCES.forEach(r => text(`• ${r.label}: ${r.value}`, 9.5, 'normal', [55, 65, 81]));
  y += 2;

  // Signature
  ensure(38);
  text(L.signature, 10, 'bold');
  try {
    if (consent.signature_data) { doc.addImage(consent.signature_data, 'PNG', M, y, 60, 22); y += 26; }
  } catch { /* ignore broken image */ }
  doc.setDrawColor(209, 213, 219); doc.line(M, y, M + 70, y); y += 5;
  text(consent.full_name, 9, 'normal', [107, 114, 128]);
  y += 2;

  // Seal
  ensure(14);
  text(L.seal, 9, 'bold', [107, 114, 128]);
  text(consent.hash, 7.5, 'normal', [107, 114, 128]);
  y += 4;
  text(L.footer, 8, 'italic', [156, 163, 175]);

  if (profile) renderLetterFooter(doc, profile, { W, M });
  return doc;
}
