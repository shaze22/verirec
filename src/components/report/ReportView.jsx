import { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { hashSession } from '../../lib/crypto.js';
import { SignaturePad } from '../session/SignaturePad.jsx';
import { saveSignature } from '../../api/sessions.js';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';

const riskColors  = { low: 'green', medium: 'yellow', high: 'red' };
const riskLabels  = { low: 'Rendah', medium: 'Sederhana', high: 'Tinggi' };
const sentimentLabels = { positive: 'Positif', neutral: 'Neutral', negative: 'Negatif' };

function Section({ title, children, color = 'gray' }) {
  const colors = {
    gray: 'text-gray-500',
    red: 'text-red-500',
    blue: 'text-blue-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
  };
  return (
    <div>
      <h3 className={`text-sm font-semibold uppercase mb-3 ${colors[color]}`}>{title}</h3>
      {children}
    </div>
  );
}

function FollowUpTracker({ sessionId, items }) {
  const storageKey = `followup_${sessionId}`;
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  });

  const toggle = (i) => {
    setChecked(prev => {
      const next = { ...prev, [i]: !prev[i] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  if (!items?.length) return null;
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-amber-900 uppercase">Tindakan Susulan</h3>
        <span className="text-xs text-amber-600 font-medium">{done}/{items.length} selesai</span>
      </div>
      <div className="w-full bg-amber-200 rounded-full h-1.5 mb-4">
        <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className={`flex items-start gap-3 cursor-pointer group p-2 rounded-lg transition-colors ${checked[i] ? 'bg-amber-100/60' : 'hover:bg-amber-100/40'}`} onClick={() => toggle(i)}>
            <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center mt-0.5 transition-colors ${checked[i] ? 'bg-green-500 border-green-500' : 'border-amber-400 group-hover:border-amber-600'}`}>
              {checked[i] && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1 flex items-start justify-between gap-2">
              <span className={`text-sm transition-colors ${checked[i] ? 'text-amber-600 opacity-60' : 'text-amber-900'}`}>{item}</span>
              {checked[i] && <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">Selesai</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnnotationSection({ sessionId, initialNote }) {
  const [note, setNote] = useState(initialNote || '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEdit = () => { setDraft(note); setEditing(true); };
  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('sessions').update({ counselor_notes: draft }).eq('id', sessionId);
      setNote(draft);
      setEditing(false);
      toast.success('Nota disimpan.');
    } catch {
      toast.error('Gagal menyimpan nota.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-900 uppercase">Nota Kaunselor</h3>
        {!editing && (
          <button onClick={handleEdit} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {note ? 'Edit' : '+ Tambah Nota'}
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={4}
            placeholder="Pemerhatian, penilaian tambahan, atau nota susulan untuk sesi ini..."
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border border-gray-200">Batal</button>
            <button onClick={handleSave} disabled={saving} className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      ) : note ? (
        <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">{note}</p>
      ) : (
        <p className="text-sm text-blue-400 italic">Tiada nota. Klik "+ Tambah Nota" untuk menambah pemerhatian.</p>
      )}
      <p className="text-xs text-blue-400 mt-3">Nota ini disimpan dalam sistem dan hanya kelihatan kepada pengendali sesi.</p>
    </div>
  );
}

function SOAPSection({ soap }) {
  if (!soap) return null;
  const fields = [
    { key: 'subjective', label: 'S — Subjektif', desc: 'Aduan pesakit dalam kata-katanya sendiri' },
    { key: 'objective', label: 'O — Objektif', desc: 'Penemuan yang boleh diukur dan diperhatikan' },
    { key: 'assessment', label: 'A — Penilaian', desc: 'Diagnosis atau penilaian klinikal' },
    { key: 'plan', label: 'P — Rancangan', desc: 'Tindakan susulan dan rawatan' },
  ];
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-red-700 uppercase mb-4">Nota SOAP</h3>
      <div className="space-y-4">
        {fields.map(({ key, label, desc }) => soap[key] && (
          <div key={key}>
            <p className="text-xs font-semibold text-red-600 mb-0.5">{label}</p>
            <p className="text-xs text-gray-500 mb-1">{desc}</p>
            <p className="text-sm text-gray-800 bg-white rounded-lg px-3 py-2 border border-red-100">{soap[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NCRSection({ ncr }) {
  if (!ncr) return null;
  const fields = [
    { key: 'nonconformance', label: 'Ketidakpatuhan (NC)' },
    { key: 'isoClause', label: 'Klausa ISO Berkaitan' },
    { key: 'rootCause', label: 'Punca Akar (Root Cause)' },
    { key: 'correctiveAction', label: 'Tindakan Pembetulan (CA)' },
    { key: 'targetDate', label: 'Tarikh Sasaran' },
  ];
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-amber-700 uppercase mb-4">Laporan Ketidakpatuhan (NCR/CAR)</h3>
      <div className="space-y-3">
        {fields.map(({ key, label }) => ncr[key] && (
          <div key={key} className="flex gap-3">
            <span className="text-xs font-semibold text-amber-600 w-36 flex-shrink-0 pt-0.5">{label}</span>
            <p className="text-sm text-gray-800 flex-1">{ncr[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DCPSection({ dcp }) {
  if (!dcp) return null;
  const fields = [
    { key: 'allegation', label: 'Tuduhan / Aduan' },
    { key: 'findings', label: 'Penemuan Siasatan' },
    { key: 'recommendation', label: 'Cadangan' },
    { key: 'proposedPenalty', label: 'Hukuman Yang Dicadangkan' },
  ];
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-purple-700 uppercase mb-4">Ringkasan Inkuiri Domestik (ID)</h3>
      <div className="space-y-3">
        {fields.map(({ key, label }) => dcp[key] && (
          <div key={key} className="flex gap-3">
            <span className="text-xs font-semibold text-purple-600 w-36 flex-shrink-0 pt-0.5">{label}</span>
            <p className="text-sm text-gray-800 flex-1">{dcp[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarningLetterSection({ session, dcp }) {
  const [copied, setCopied] = useState(false);
  const today = new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

  const allegation = dcp?.allegation || '[Sila isi tuduhan]';
  const findings = dcp?.findings || '[Sila isi penemuan]';
  const penalty = dcp?.proposedPenalty || '[Sila isi hukuman]';

  const level = dcp?.proposedPenalty?.toUpperCase()?.includes('PERTAMA') ? 'PERTAMA'
    : dcp?.proposedPenalty?.toUpperCase()?.includes('KEDUA') ? 'KEDUA' : 'TATATERTIB';

  const letter = `SULIT

SURAT AMARAN ${level}

Tarikh: ${today}

Kepada,
${session.subject_name}
[Jawatan]
[Jabatan]

PERKARA: SURAT AMARAN BERHUBUNG ${allegation.toUpperCase()}

Dengan hormatnya perkara di atas dirujuk.

Adalah dimaklumkan bahawa pihak pengurusan telah menerima laporan dan menjalankan siasatan berhubung dakwaan terhadap anda iaitu:

"${allegation}"

Hasil siasatan mendapati bahawa:

${findings}

Oleh yang demikian, pihak pengurusan memutuskan untuk mengeluarkan surat amaran ini kepada anda. Tindakan tatatertib yang dicadangkan adalah: ${penalty}.

Anda diperingatkan agar tidak mengulangi perbuatan seumpama ini pada masa hadapan. Sekiranya anda melakukan kesalahan yang sama atau kesalahan tatatertib yang lain, tindakan tatatertib yang lebih serius boleh diambil terhadap anda, termasuk penamatan perkhidmatan.

Anda dikehendaki mengakui penerimaan surat ini dengan menandatangani ruang yang disediakan.

Yang benar,

_______________________
${session.interviewer}
[Jawatan]
[Organisasi]

---
Saya telah menerima dan membaca surat amaran ini.

Tandatangan: _______________________ Tarikh: _____________
Nama: ${session.subject_name}`;

  const copy = () => {
    navigator.clipboard.writeText(letter).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 no-print">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-700 uppercase">Template Surat Amaran</h3>
        <button
          onClick={copy}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium border border-purple-300 rounded px-2 py-1 transition-colors"
        >
          {copied ? '✓ Disalin' : 'Salin Teks'}
        </button>
      </div>
      <p className="text-xs text-purple-500 mb-3">Draf berdasarkan laporan siasatan. Semak dan ubah suai sebelum digunakan secara rasmi.</p>
      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white border border-purple-100 rounded-lg p-4 leading-relaxed overflow-x-auto">
        {letter}
      </pre>
    </div>
  );
}

function StatementSection({ statement }) {
  if (!statement) return null;
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-blue-700 uppercase mb-4">Ringkasan Penyataan</h3>
      <div className="space-y-3">
        {statement.keyFacts?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1">Fakta Utama</p>
            <ul className="space-y-1">
              {statement.keyFacts.map((f, i) => (
                <li key={i} className="text-sm text-gray-800 flex gap-2"><span className="text-blue-400">•</span>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {statement.inconsistencies?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-600 mb-1">Ketidakkonsistenan</p>
            <ul className="space-y-1">
              {statement.inconsistencies.map((f, i) => (
                <li key={i} className="text-sm text-gray-800 flex gap-2"><span className="text-red-400">!</span>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {statement.evidenceNotes && (
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1">Nota Bukti</p>
            <p className="text-sm text-gray-800">{statement.evidenceNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SignatureSection({ session }) {
  const [signed, setSigned] = useState(!!session.signature);
  const [sigData, setSigData] = useState(session.signature || null);
  const [sigAt, setSigAt] = useState(session.signature_at || null);
  const [saving, setSaving] = useState(false);
  const [resigning, setResigning] = useState(false);

  const handleSave = async (dataUrl) => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await saveSignature(session.id, dataUrl, now);
      setSigData(dataUrl);
      setSigAt(now);
      setSigned(true);
      setResigning(false);
      toast.success('Tandatangan berjaya disimpan.');
    } catch {
      toast.error('Gagal menyimpan tandatangan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase">Pengesahan & Tandatangan Subjek</h3>
        {signed && !resigning && (
          <button
            onClick={() => setResigning(true)}
            className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
          >
            Tandatangan Semula
          </button>
        )}
      </div>

      {signed && !resigning ? (
        <div className="bg-gray-50 rounded-xl p-5 border">
          <div className="bg-white border rounded-xl p-4 mb-3 flex items-center justify-center">
            <img src={sigData} alt="Tandatangan subjek" className="max-h-28 max-w-full" />
          </div>
          <div className="flex items-center gap-2 text-xs text-green-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Ditandatangani oleh <strong>{session.subject_name}</strong> pada{' '}
              {sigAt ? format(new Date(sigAt), 'dd MMM yyyy, HH:mm') : '-'}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 no-print">
          <div className="mb-4">
            <p className="text-sm font-medium text-amber-900 mb-1">Akuan Subjek</p>
            <p className="text-sm text-amber-800">
              Saya, <strong>{session.subject_name}</strong>, mengesahkan bahawa maklumat yang diberikan dalam sesi ini
              adalah benar dan tepat setakat pengetahuan saya.
            </p>
          </div>
          <SignaturePad onSave={handleSave} saving={saving} />
        </div>
      )}
    </div>
  );
}

function TranscriptScript({ transcript = [], forceExpand = false }) {
  const [expanded, setExpanded] = useState(false);

  const lines = transcript.filter(e =>
    e.type === 'TRANSCRIPT' || e.type === 'INTERVIEWER' || e.type === 'NOTE' || e.type === 'FLAG'
  );

  if (!lines.length) return null;

  const isExpanded = expanded || forceExpand;
  const preview = lines.slice(0, 4);
  const shown = isExpanded ? lines : preview;

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Transkrip Penuh ({lines.length} entri)
        </h3>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg px-3 py-1 transition-colors no-print"
        >
          {isExpanded ? 'Sembunyikan' : 'Tunjukkan Semua'}
        </button>
      </div>

      <div className="space-y-1 font-mono text-sm bg-gray-50 rounded-xl p-4 border">
        {shown.map((entry, i) => {
          const isInterviewer = entry.type === 'INTERVIEWER';
          const isNote       = entry.type === 'NOTE';
          const isFlag       = entry.type === 'FLAG';
          const time = entry.timestamp
            ? format(new Date(entry.timestamp), 'HH:mm:ss')
            : '';

          return (
            <div key={entry.id || i} className={`flex gap-3 py-1.5 px-2 rounded-lg ${
              isInterviewer ? 'bg-blue-50' : isNote ? 'bg-amber-50' : isFlag ? 'bg-red-50' : ''
            }`}>
              <span className="text-gray-300 text-xs w-16 flex-shrink-0 pt-0.5 tabular-nums">{time}</span>
              <span className={`text-xs font-semibold w-24 flex-shrink-0 pt-0.5 ${
                isInterviewer ? 'text-blue-600' : isNote ? 'text-amber-600' : isFlag ? 'text-red-600' : 'text-gray-500'
              }`}>
                {isInterviewer ? (entry.speaker || 'Penemuduga') : isNote ? '[NOTA]' : isFlag ? '[BENDERA]' : 'Subjek'}
              </span>
              <span className={`flex-1 leading-relaxed ${
                isInterviewer ? 'text-blue-900' : isNote ? 'text-amber-900' : isFlag ? 'text-red-800' : 'text-gray-800'
              }`}>
                {entry.text}
              </span>
            </div>
          );
        })}

        {!isExpanded && lines.length > 4 && (
          <div className="text-center pt-2">
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-blue-500 hover:text-blue-700 no-print"
            >
              + {lines.length - 4} entri lagi...
            </button>
          </div>
        )}
      </div>

      {/* Print: always show full transcript */}
      {!isExpanded && (
        <div className="hidden print:block space-y-1 font-mono text-sm bg-gray-50 rounded-xl p-4 border mt-2">
          {lines.slice(4).map((entry, i) => {
            const isInterviewer = entry.type === 'INTERVIEWER';
            const isNote        = entry.type === 'NOTE';
            const isFlag        = entry.type === 'FLAG';
            const time = entry.timestamp ? format(new Date(entry.timestamp), 'HH:mm:ss') : '';
            return (
              <div key={entry.id || i} className="flex gap-3 py-1 px-2">
                <span className="text-gray-300 text-xs w-16 flex-shrink-0 tabular-nums">{time}</span>
                <span className={`text-xs font-semibold w-24 flex-shrink-0 ${
                  isInterviewer ? 'text-blue-600' : isNote ? 'text-amber-600' : isFlag ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {isInterviewer ? (entry.speaker || 'Penemuduga') : isNote ? '[NOTA]' : isFlag ? '[BENDERA]' : 'Subjek'}
                </span>
                <span className="flex-1 text-gray-800">{entry.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReportView({ session }) {
  const { report, hash, audio_url, created_at, subject_name, interviewer, profession, duration, transcript, id } = session;
  const reportRef  = useRef(null);
  const [exporting, setExporting]   = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // PDF section selector — persisted in localStorage per profession
  const SECTION_KEY = `pdf_sections_${profession || 'default'}`;
  const defaultSections = { summary: true, riskSentiment: true, findings: true, recommendations: true, followUp: true, flags: true, transcript: false };
  const [pdfSections, setPdfSections] = useState(() => {
    try { return { ...defaultSections, ...JSON.parse(localStorage.getItem(SECTION_KEY) || '{}') }; }
    catch { return defaultSections; }
  });
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const toggleSection = (key) => setPdfSections(prev => {
    const next = { ...prev, [key]: !prev[key] };
    localStorage.setItem(SECTION_KEY, JSON.stringify(next));
    return next;
  });

  // Editable header fields
  const [headerEdit, setHeaderEdit] = useState(false);
  const [orgName, setOrgName]             = useState(session.org_name || '');
  const [caseNumber, setCaseNumber]       = useState(session.case_number || '');
  const [witnessOfficer, setWitnessOfficer] = useState(session.witness_officer || '');
  const [savingHeader, setSavingHeader]   = useState(false);

  const saveHeader = async () => {
    setSavingHeader(true);
    try {
      await supabase.from('sessions').update({ org_name: orgName, case_number: caseNumber, witness_officer: witnessOfficer }).eq('id', id);
      setHeaderEdit(false);
      toast.success('Maklumat laporan dikemas kini.');
    } catch { toast.error('Gagal menyimpan.'); }
    finally { setSavingHeader(false); }
  };

  if (!report) return <p className="text-gray-500 text-center py-12">Laporan belum dijana</p>;

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, M = 15;
      let y = M;

      const checkPage = (needed = 12) => {
        if (y + needed > 278) { pdf.addPage(); y = M; }
      };

      const sectionTitle = (title, rgb = [60, 60, 60]) => {
        checkPage(14);
        pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...rgb);
        pdf.text(title.toUpperCase(), M, y);
        y += 2;
        pdf.setDrawColor(...rgb); pdf.setLineWidth(0.25);
        pdf.line(M, y, W - M, y);
        y += 5;
      };

      const bodyText = (text, size = 9, style = 'normal', rgb = [30, 30, 30]) => {
        if (!text) return;
        pdf.setFontSize(size); pdf.setFont('helvetica', style); pdf.setTextColor(...rgb);
        pdf.splitTextToSize(String(text), W - M * 2).forEach(line => {
          checkPage(5); pdf.text(line, M, y); y += 4.5;
        });
        y += 1.5;
      };

      const field = (label, value, rgb = [30, 30, 30]) => {
        if (!value) return;
        checkPage(10);
        pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 90, 90);
        pdf.text(label + ':', M, y); y += 4;
        bodyText(value, 9, 'normal', rgb);
      };

      const bulletList = (items, bullet = '•', rgb = [30, 30, 30]) => {
        if (!items?.length) return;
        items.forEach(item => {
          checkPage(6);
          pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...rgb);
          pdf.splitTextToSize(String(item), W - M * 2 - 5).forEach((line, i) => {
            checkPage(5);
            if (i === 0) pdf.text(bullet, M, y);
            pdf.text(line, M + 5, y); y += 4.5;
          });
        });
        y += 2;
      };

      // ── Header ──
      const headerHeight = (orgName || caseNumber || witnessOfficer) ? 38 : 32;
      pdf.setFillColor(245, 247, 250);
      pdf.rect(0, 0, W, headerHeight, 'F');
      pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 10, 10);
      pdf.text(orgName || 'Laporan Sesi VeriRec', M, 13);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
      const profLabel = profession ? profession.charAt(0).toUpperCase() + profession.slice(1) : '';
      pdf.text(`${profLabel} — ${subject_name || ''}`, M, 21);
      if (caseNumber) { pdf.setFontSize(8); pdf.text(`No. Kes: ${caseNumber}`, M, 28); }
      if (orgName) { pdf.setFontSize(7.5); pdf.setTextColor(120, 120, 120); pdf.text('VeriRec', M, headerHeight - 3); }
      const dateStr = created_at ? format(new Date(created_at), 'dd MMM yyyy, HH:mm') : '';
      pdf.setFontSize(9); pdf.setTextColor(80, 80, 80);
      pdf.text(dateStr, W - M, 13, { align: 'right' });
      pdf.text(interviewer || '', W - M, 21, { align: 'right' });
      if (witnessOfficer) { pdf.setFontSize(8); pdf.text(witnessOfficer, W - M, 28, { align: 'right' }); }
      y = headerHeight + 6;

      // ── Risk / Sentiment / Duration ──
      const sec = pdfSections;
      if (sec.riskSentiment) {
      const boxW = (W - M * 2 - 6) / 3;
      const riskLbl = { low: 'Rendah', medium: 'Sederhana', high: 'Tinggi' }[report.riskLevel] || (report.riskLevel || '-');
      const sentLbl = { positive: 'Positif', neutral: 'Neutral', negative: 'Negatif' }[report.sentiment] || (report.sentiment || '-');
      const durMin  = Math.round((duration || 0) / 60);
      [
        [`Risiko: ${riskLbl}`, report.riskJustification],
        [`Sentimen: ${sentLbl}`, report.sentimentNote],
        [`Tempoh: ${durMin} minit`, report.followUpRequired ? 'Susulan diperlukan' : ''],
      ].forEach(([title, note], i) => {
        const bx = M + i * (boxW + 3);
        pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.25); pdf.rect(bx, y, boxW, 18);
        pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 30, 30);
        pdf.text(title, bx + 3, y + 7);
        if (note) {
          pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(90, 90, 90);
          pdf.splitTextToSize(String(note), boxW - 6).slice(0, 1).forEach(l => pdf.text(l, bx + 3, y + 13));
        }
      });
      y += 24;
      } // end riskSentiment

      // ── Summary ──
      // ── Custom org fields ──
      const customFields = session.custom_fields || {};
      if (Object.keys(customFields).length > 0) {
        sectionTitle('Maklumat Tambahan Organisasi');
        Object.entries(customFields).filter(([, v]) => v).forEach(([k, v]) => field(k, v));
      }

      if (sec.summary) { sectionTitle('Ringkasan Eksekutif'); bodyText(report.summary); }

      // ── Key Findings ──
      if (sec.findings && report.keyFindings?.length > 0) {
        sectionTitle('Penemuan Utama');
        bulletList(report.keyFindings);
      }

      // ── Red Flags ──
      if (sec.flags && report.redFlags?.length > 0) {
        sectionTitle('Bendera Merah', [180, 30, 30]);
        bulletList(report.redFlags, '★', [160, 20, 20]);
      }

      // ── Profession-specific ──
      if (profession === 'counselor' && report.caseSessionNote) {
        sectionTitle('Case Session Note', [30, 70, 180]);
        const csn = report.caseSessionNote;
        [
          ['Isu yang Dibawa (Presented Issue)', csn.presentedIssue],
          ['Isu yang Dikenal Pasti (Identified Issue)', csn.identifiedIssue],
          ['Matlamat Bersama (Mutual Goal)', csn.mutualGoal],
          ['Aktiviti / Intervensi', csn.activitiesInterventions],
          ['Kemajuan / Pencapaian Matlamat', csn.progressGoalAchievement],
          ['Rancangan Susulan', csn.followUpPlan],
          ['Penamatan Sesi', csn.terminationNotes],
          ['Dapatan Assessment (MBTI/RIASEC)', csn.assessmentFindings],
        ].filter(([, v]) => v).forEach(([lbl, val]) => field(lbl, val));
        if (report.problemTypes?.length > 0) field('Jenis Masalah', report.problemTypes.join(', '));
      }

      if (profession === 'counselor' && report.crisisIndicators?.detected) {
        const ci = report.crisisIndicators;
        sectionTitle('Penunjuk Krisis', [180, 30, 30]);
        const ciLbl = ci.level === 'critical' ? 'Kritikal' : ci.level === 'watch' ? 'Perlu Pemantauan' : (ci.level || '-');
        bodyText(`Tahap: ${ciLbl}`, 9, 'bold', [180, 30, 30]);
        if (ci.notes) bodyText(ci.notes, 9, 'normal', [160, 30, 30]);
        if (ci.resources?.length > 0) bulletList(ci.resources, '•', [160, 30, 30]);
      }

      if (profession === 'doctor' && report.soapNote) {
        sectionTitle('SOAP Note', [20, 100, 60]);
        const s = report.soapNote;
        [['Subjective', s.subjective], ['Objective', s.objective], ['Assessment', s.assessment], ['Plan', s.plan]]
          .filter(([, v]) => v).forEach(([lbl, val]) => field(lbl, val));
      }

      if ((profession === 'police' || profession === 'sprm') && report.statementSummary) {
        sectionTitle('Ringkasan Pernyataan');
        bodyText(report.statementSummary);
      }

      if (profession === 'iso' && report.ncrReport) {
        sectionTitle('NCR Report');
        const n = report.ncrReport;
        [['Non-Conformance', n.nonConformance], ['Root Cause', n.rootCause], ['Corrective Action', n.correctiveAction], ['Preventive Action', n.preventiveAction]]
          .filter(([, v]) => v).forEach(([lbl, val]) => field(lbl, val));
      }

      if (profession === 'hr' && report.dcpReport) {
        sectionTitle('DCP Report');
        const d = report.dcpReport;
        [['Misconduct', d.misconduct], ['Findings', d.findings], ['Recommendation', d.recommendation]]
          .filter(([, v]) => v).forEach(([lbl, val]) => field(lbl, val));
      }

      // ── Recommendations ──
      if (sec.recommendations && report.recommendations?.length > 0) {
        sectionTitle('Cadangan', [20, 110, 50]);
        bulletList(report.recommendations, '→', [20, 90, 30]);
      }

      // ── Follow-up items ──
      if (sec.followUp && report.followUpItems?.length > 0) {
        sectionTitle('Tindakan Susulan');
        bulletList(report.followUpItems.map(i => `${i.text}${i.dueDate ? ` (${i.dueDate})` : ''}`), '□');
      }

      // ── Transcript ──
      if (sec.transcript && transcript?.length > 0) {
        sectionTitle('Transkrip Penuh');
        transcript.forEach(entry => {
          checkPage(8);
          const time = entry.timestamp ? format(new Date(entry.timestamp), 'HH:mm:ss') : '';
          const spk  = entry.type === 'INTERVIEWER' ? (entry.speaker || 'Penemuduga')
            : entry.type === 'NOTE' ? '[NOTA]' : entry.type === 'FLAG' ? '[BENDERA]' : 'Subjek';
          const rgb  = entry.type === 'INTERVIEWER' ? [30, 60, 180]
            : entry.type === 'FLAG' ? [180, 30, 30] : entry.type === 'NOTE' ? [140, 90, 0] : [60, 60, 60];
          pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...rgb);
          pdf.text(`${time}  ${spk}`, M, y); y += 4;
          pdf.setFont('helvetica', 'normal'); pdf.setTextColor(40, 40, 40);
          pdf.splitTextToSize(entry.text || '', W - M * 2 - 5).forEach(line => {
            checkPage(5); pdf.text(line, M + 5, y); y += 4;
          });
          y += 1;
        });
      }

      // ── Chain of Custody ──
      checkPage(40);
      y += 4;
      sectionTitle('Rantai Jagaan (Chain of Custody)');
      bodyText('Hash SHA-256 (dijana di pelayan):', 8, 'normal', [90, 90, 90]);
      if (hash) {
        pdf.setFontSize(7.5); pdf.setFont('courier', 'normal'); pdf.setTextColor(30, 30, 30);
        pdf.splitTextToSize(hash, W - M * 2).forEach(line => { checkPage(5); pdf.text(line, M, y); y += 4; });
        y += 4;
      }
      bodyText(`Dicetak: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 8, 'normal', [130, 130, 130]);
      bodyText('VeriRec — Platform Rakaman Sesi Profesional Malaysia', 7.5, 'normal', [130, 130, 130]);

      // ── Page numbers ──
      const pages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(160, 160, 160);
        pdf.text('VeriRec — SULIT', M, 292);
        pdf.text(`${i} / ${pages}`, W - M, 292, { align: 'right' });
      }

      pdf.save(`laporan-verirec-${id?.substring(0, 8) || 'session'}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const printCaseNote = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, M = 15;
      let y = 14;

      const PROBLEM_MAP = {
        'Emosional': 'EMOTIONAL', 'Perhubungan Sosial': 'SOCIAL RELATIONSHIP',
        'Pembangunan Kerjaya': 'CAREER DEVELOPMENT', 'Keluarga/Rumah': 'FAMILY/HOME',
        'Akademik': 'ACADEMIC', 'Kewangan': 'FINANCIAL',
        'Agama': 'RELIGION', 'Seksual': 'SEXUAL',
        'Undang-undang': 'LEGAL', 'Kesihatan': 'HEALTH',
        'Tabiat/Sikap': 'HABIT/ATTITUDE', 'Krisis': 'CRISIS',
      };
      const checked = new Set((report.problemTypes || []).map(p => PROBLEM_MAP[p] || p.toUpperCase()));
      const csn = report.caseSessionNote || {};

      // ── Appendix 2 ──
      pdf.setFontSize(7); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(80,80,80);
      pdf.text('Appendix 2', W - M, y, { align: 'right' });
      y += 4;

      // ── STRICTLY CONFIDENTIAL (left) ──
      pdf.setFillColor(20,20,20);
      pdf.rect(M, y, 56, 20, 'F');
      pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255,255,255);
      pdf.text('STRICTLY', M + 28, y + 8, { align: 'center' });
      pdf.text('CONFIDENTIAL', M + 28, y + 15, { align: 'center' });

      // ── Work Station box (right) ──
      const bx = M + 80;
      pdf.setDrawColor(60,60,60); pdf.setLineWidth(0.3);
      pdf.rect(bx, y, W - M - bx, 20);
      pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30,30,30);
      [['Work Station', ': Counselling unit'], ['Version', ': 01        Revision: 00'],
       ['Effective Date', ': 1st July 2022'], ['Date of Revision', ':']].forEach(([lbl, val], i) => {
        pdf.text(lbl, bx + 2, y + 5 + i * 4.2);
        pdf.text(val, bx + 29, y + 5 + i * 4.2);
      });
      y += 27;

      // ── CASE SESSION NOTE title ──
      pdf.setDrawColor(40,40,40); pdf.setLineWidth(0.5);
      pdf.rect(M + 20, y, W - M * 2 - 40, 14);
      pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10,10,10);
      pdf.text('CASE SESSION NOTE', W / 2, y + 9.5, { align: 'center' });
      y += 19;

      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80,80,80);
      pdf.text('Please fill up this form with related information.', W / 2, y, { align: 'center' });
      y += 9;

      // ── Dashed underline helper ──
      const uline = (x1, y1, x2) => {
        pdf.setDrawColor(130,130,130); pdf.setLineWidth(0.2);
        pdf.setLineDashPattern([0.8, 0.5], 0);
        pdf.line(x1, y1, x2, y1);
        pdf.setLineDashPattern([], 0);
      };

      // ── Client info ──
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30,30,30);
      pdf.text('Name of Student', M, y);
      pdf.text(':', M + 35, y);
      uline(M + 38, y, W - M);
      pdf.setFont('helvetica', 'bold');
      pdf.text(subject_name || '', M + 40, y - 0.5);
      pdf.setFont('helvetica', 'normal');
      y += 8;

      pdf.text('ID Number', M, y);
      pdf.text(':', M + 35, y);
      uline(M + 38, y, W / 2 - 5);
      pdf.text('I/C Number', W / 2, y);
      pdf.text(':', W / 2 + 23, y);
      uline(W / 2 + 26, y, W - M);
      y += 9;

      const sDate = created_at ? format(new Date(created_at), 'dd/MM/yyyy') : '';
      const sTime = created_at ? format(new Date(created_at), 'HH:mm') : '';
      [['Type of Session', ''], ['Date of Session', sDate], ['Time of Session', sTime]].forEach(([lbl, val]) => {
        pdf.text(lbl, M, y);
        pdf.text(':', M + 35, y);
        uline(M + 38, y, W / 2 + 25);
        if (val) { pdf.setFont('helvetica', 'bold'); pdf.text(val, M + 40, y - 0.5); pdf.setFont('helvetica', 'normal'); }
        y += 7;
      });
      y += 4;

      // ── Type of Problem ──
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(20,20,20);
      pdf.text('Type of Problem:', M, y);
      y += 5;

      const PL = ['EMOTIONAL','SOCIAL RELATIONSHIP','CAREER DEVELOPMENT','FAMILY/HOME','ACADEMIC','FINANCIAL'];
      const PR = ['RELIGION','SEXUAL','LEGAL','HEALTH','HABIT/ATTITUDE','CRISIS'];
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
      const rowH = 6;
      [[PL, M], [PR, W / 2]].forEach(([probs, px]) => {
        probs.forEach((p, i) => {
          const py = y + i * rowH;
          pdf.setDrawColor(40,40,40); pdf.setLineWidth(0.3);
          pdf.rect(px, py - 3.5, 4.5, 4.5);
          if (checked.has(p)) {
            pdf.setDrawColor(10,10,10); pdf.setLineWidth(0.7);
            pdf.line(px + 0.6, py - 1.3, px + 1.9, py + 0.4);
            pdf.line(px + 1.9, py + 0.4, px + 4.1, py - 2.8);
            pdf.setLineWidth(0.3);
          }
          pdf.setTextColor(20,20,20);
          pdf.text(p, px + 6.5, py);
        });
      });
      y += 6 * rowH + 7;

      // ── Text box helper ──
      const textBox = (label, content, boxH = 26) => {
        if (y + boxH + 8 > 275) { pdf.addPage(); y = M; }
        pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(20,20,20);
        pdf.text(label, M, y);
        y += 2;
        pdf.setDrawColor(80,80,80); pdf.setLineWidth(0.3);
        pdf.rect(M, y, W - M * 2, boxH);
        if (content) {
          pdf.setFontSize(8.5); pdf.setTextColor(30,30,30);
          const lines = pdf.splitTextToSize(content, W - M * 2 - 4);
          lines.slice(0, Math.floor((boxH - 2) / 4.2)).forEach((line, i) => {
            pdf.text(line, M + 2, y + 4 + i * 4.2);
          });
        }
        y += boxH + 6;
      };

      textBox('Presented Issue:', csn.presentedIssue, 28);
      textBox('Identified Issue:', csn.identifiedIssue, 28);

      // ── Page 2 ──
      pdf.addPage(); y = M;
      textBox('Mutual Goal:', csn.mutualGoal, 28);
      textBox('Activities/Interventions/Treatment:', csn.activitiesInterventions, 28);
      textBox('Progress/Goal Achievement:', csn.progressGoalAchievement, 28);
      textBox('Needs for follow-up session/Plan for Next Follow-up Session:', csn.followUpPlan, 28);
      textBox('Termination of session:', csn.terminationNotes, 28);
      if (csn.assessmentFindings) {
        textBox('Assessment Findings (MBTI/RIASEC):', csn.assessmentFindings, 28);
      }

      // ── Signature ──
      if (y + 40 > 275) { pdf.addPage(); y = M; }
      y += 4;
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(20,20,20);
      pdf.text('Signature of Counsellor:', M, y);
      y += 18;
      pdf.setDrawColor(80,80,80); pdf.setLineWidth(0.25);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(M + 20, y, M + 90, y);
      pdf.setLineDashPattern([], 0);
      y += 6;
      pdf.setFontSize(8.5);
      pdf.text('Name  :', M + 20, y); pdf.text(interviewer || '', M + 38, y); y += 5;
      pdf.text('Date   :', M + 20, y); pdf.text(format(new Date(), 'dd/MM/yyyy'), M + 38, y); y += 5;
      pdf.text('Time   :', M + 20, y); pdf.text(format(new Date(), 'HH:mm'), M + 38, y);

      // ── Footer ──
      const pages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(130,130,130);
        pdf.text('STRICTLY CONFIDENTIAL', M, 290);
        pdf.text(`${i} / ${pages}`, W - M, 290, { align: 'right' });
      }

      pdf.save(`case-session-note-${(subject_name || id?.substring(0,8) || 'session').replace(/\s+/g,'-')}-${format(new Date(),'yyyyMMdd')}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const verifyHash = async () => {
    if (!hash) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const computed = await hashSession({ report, transcript: transcript || [], session_id: id });
      const matches = computed === hash;
      setVerifyResult({
        ok: matches,
        hash: computed,
        note: matches
          ? 'Hash sepadan — laporan tidak diubah suai sejak dijana.'
          : 'Hash tidak sepadan — kandungan laporan mungkin telah diubah.',
      });
    } catch {
      setVerifyResult({ ok: false, note: 'Gagal mengira semula hash.' });
    } finally {
      setVerifying(false);
    }
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-4 no-print">
        <h2 className="text-xl font-bold text-gray-900">Laporan Sesi</h2>
        <div className="flex gap-3 flex-wrap justify-end">
          {profession === 'counselor' && (
            <Button variant="secondary" onClick={printCaseNote} loading={exporting}>📄 Case Session Note</Button>
          )}
          <button onClick={() => setShowSectionPicker(p => !p)} className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">⚙️ Bahagian PDF</button>
          <Button onClick={exportPDF} loading={exporting}>Eksport PDF</Button>
        </div>
      </div>

      {/* Section picker */}
      {showSectionPicker && (
        <div className="no-print mb-4 bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Pilih bahagian dalam PDF</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'summary',         label: 'Ringkasan Eksekutif' },
              { key: 'riskSentiment',   label: 'Risiko & Sentimen' },
              { key: 'findings',        label: 'Penemuan Utama' },
              { key: 'recommendations', label: 'Cadangan Tindakan' },
              { key: 'followUp',        label: 'Item Susulan' },
              { key: 'flags',           label: 'Bendera Penting' },
              { key: 'transcript',      label: 'Transkrip Penuh' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={pdfSections[key]} onChange={() => toggleSection(key)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Tetapan disimpan automatik ikut profesion.</p>
        </div>
      )}

      {/* Editable report header fields */}
      <div className="no-print mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Maklumat Pengepala Laporan</p>
          {!headerEdit ? (
            <button onClick={() => setHeaderEdit(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setHeaderEdit(false)} className="text-xs text-gray-400 hover:text-gray-600">Batal</button>
              <button onClick={saveHeader} disabled={savingHeader} className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50">
                {savingHeader ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          )}
        </div>
        {headerEdit ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nama Organisasi</label>
              <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="cth. Klinik Kesihatan Bestari"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">No. Kes / Rujukan</label>
              <input value={caseNumber} onChange={e => setCaseNumber(e.target.value)} placeholder="cth. KES/2026/001"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Saksi / Pegawai</label>
              <input value={witnessOfficer} onChange={e => setWitnessOfficer(e.target.value)} placeholder="Nama saksi atau pegawai"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span><span className="text-gray-400">Organisasi:</span> {orgName || <em className="text-gray-300">—</em>}</span>
            <span><span className="text-gray-400">No. Kes:</span> {caseNumber || <em className="text-gray-300">—</em>}</span>
            <span><span className="text-gray-400">Saksi:</span> {witnessOfficer || <em className="text-gray-300">—</em>}</span>
          </div>
        )}
      </div>

      {/* Follow-up Tracker — above the printable report */}
      <div className="mb-6 space-y-4 no-print">
        <FollowUpTracker sessionId={id} items={report.followUpItems} />
        <AnnotationSection sessionId={id} initialNote={session.counselor_notes} />
      </div>

      <div ref={reportRef} className="bg-white rounded-xl border p-8 space-y-8 print:border-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{orgName || 'Laporan Sesi VeriRec'}</h1>
            {orgName && <p className="text-xs text-gray-400 mt-0.5">VeriRec</p>}
            <p className="text-gray-500 mt-1 capitalize">{profession} — {subject_name}</p>
            {caseNumber && <p className="text-sm text-gray-400 mt-0.5">No. Kes: {caseNumber}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Tarikh</p>
            <p className="font-medium">{format(new Date(created_at), 'dd MMM yyyy, HH:mm')}</p>
            <p className="text-sm text-gray-500 mt-1">Pengendali Sesi</p>
            <p className="font-medium">{interviewer}</p>
            {witnessOfficer && (
              <>
                <p className="text-sm text-gray-500 mt-1">Saksi / Pegawai</p>
                <p className="font-medium">{witnessOfficer}</p>
              </>
            )}
          </div>
        </div>

        {/* Risk, Sentiment, Duration */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-2">Tahap Risiko</p>
            <Badge color={riskColors[report.riskLevel] || 'gray'} className="text-sm px-3 py-1">
              {riskLabels[report.riskLevel] || report.riskLevel}
            </Badge>
            <p className="text-xs text-gray-600 mt-2">{report.riskJustification}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-2">Sentimen</p>
            <p className="font-semibold">{sentimentLabels[report.sentiment] || report.sentiment}</p>
            <p className="text-xs text-gray-600 mt-2">{report.sentimentNote}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-2">Tempoh</p>
            <p className="font-semibold">{Math.round((duration || 0) / 60)} minit</p>
            {report.followUpRequired && (
              <p className="text-xs text-amber-600 mt-2">Susulan diperlukan</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <Section title="Ringkasan Eksekutif">
          <p className="text-gray-800 leading-relaxed">{report.summary}</p>
        </Section>

        {/* Key Findings */}
        {report.keyFindings?.length > 0 && (
          <Section title="Penemuan Utama">
            <ul className="space-y-2">
              {report.keyFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-800">
                  <span className="text-blue-500 mt-1">•</span>{f}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Red Flags */}
        {report.redFlags?.length > 0 && (
          <Section title="Bendera Merah" color="red">
            <div className="space-y-2">
              {report.redFlags.map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <span className="text-red-500">🚩</span>
                  <p className="text-red-800 text-sm">{f}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Profession-specific sections */}
        {profession === 'doctor' && <SOAPSection soap={report.soapNote} />}
        {profession === 'iso' && <NCRSection ncr={report.ncrReport} />}
        {profession === 'hr' && (
          <>
            <DCPSection dcp={report.dcpReport} />
            <WarningLetterSection session={session} dcp={report.dcpReport} />
          </>
        )}
        {(profession === 'police' || profession === 'sprm') && <StatementSection statement={report.statementSummary} />}

        {/* Counselor — Case Session Note */}
        {profession === 'counselor' && report.caseSessionNote && (
          <div className="bg-white border-2 border-blue-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Case Session Note</h3>
            {[
              ['Isu yang Dibawa (Presented Issue)', report.caseSessionNote.presentedIssue],
              ['Isu yang Dikenal Pasti (Identified Issue)', report.caseSessionNote.identifiedIssue],
              ['Matlamat Bersama (Mutual Goal)', report.caseSessionNote.mutualGoal],
              ['Aktiviti / Intervensi', report.caseSessionNote.activitiesInterventions],
              ['Kemajuan / Pencapaian Matlamat', report.caseSessionNote.progressGoalAchievement],
              ['Rancangan Susulan', report.caseSessionNote.followUpPlan],
              ['Penamatan Sesi', report.caseSessionNote.terminationNotes],
              ['Dapatan Assessment (MBTI/RIASEC)', report.caseSessionNote.assessmentFindings],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{label}</p>
                <p className="text-sm text-gray-800 leading-relaxed">{value}</p>
              </div>
            ))}
            {report.problemTypes?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Jenis Masalah</p>
                <div className="flex flex-wrap gap-2">
                  {report.problemTypes.map(t => (
                    <span key={t} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Counselor crisis indicators */}
        {profession === 'counselor' && report.crisisIndicators?.detected && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-red-700 uppercase mb-2">Penunjuk Krisis</h3>
            <p className="text-sm font-medium text-red-800 mb-2">
              Tahap: <Badge color={report.crisisIndicators.level === 'critical' ? 'red' : 'yellow'}>
                {report.crisisIndicators.level === 'critical' ? 'Kritikal' : report.crisisIndicators.level === 'watch' ? 'Perlu Pemantauan' : 'Tiada'}
              </Badge>
            </p>
            {report.crisisIndicators.notes && <p className="text-sm text-red-700 mb-2">{report.crisisIndicators.notes}</p>}
            {report.crisisIndicators.resources?.length > 0 && (
              <div>
                <p className="text-xs text-red-600 font-semibold mb-1">Sumber Rujukan:</p>
                <ul className="space-y-1">
                  {report.crisisIndicators.resources.map((r, i) => (
                    <li key={i} className="text-sm text-red-800">• {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations?.length > 0 && (
          <Section title="Cadangan" color="green">
            <ul className="space-y-2">
              {report.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-800">
                  <span className="text-green-500 mt-1">→</span>{r}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Full Transcript / Script */}
        <TranscriptScript transcript={transcript} />

        {/* Audio */}
        {audio_url && (
          <Section title="Rakaman Audio">
            <audio controls className="w-full" src={audio_url} />
          </Section>
        )}

        {/* Chain of Custody */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Rantai Jagaan (Chain of Custody)</h3>
            <Button size="sm" variant="outline" onClick={verifyHash} loading={verifying}>
              Sahkan Hash
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs break-all">
            <p className="text-gray-500 mb-1">Hash SHA-256 (dijana di pelayan):</p>
            <p className="text-gray-800 select-all">{hash || 'Tiada hash'}</p>
          </div>

          {verifyResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${verifyResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-medium mb-1 ${verifyResult.ok ? 'text-green-700' : 'text-red-700'}`}>
                {verifyResult.ok ? '✓ Pengesahan berjaya — laporan tulen' : '✗ Pengesahan gagal — laporan mungkin diubah'}
              </p>
              {verifyResult.hash && (
                <p className="font-mono text-xs text-gray-600 break-all mb-1">Hash dikira semula: {verifyResult.hash}</p>
              )}
              <p className="text-xs text-gray-500">{verifyResult.note}</p>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">
            Hash ini membuktikan laporan tidak diubah suai selepas dijana. Dokumen ini diperakui oleh sistem VeriRec.
          </p>
        </div>

        {/* E-Signature — hidden for counselor (consent captured during booking) */}
        {profession !== 'counselor' && <SignatureSection session={session} />}
      </div>
    </div>
  );
}
