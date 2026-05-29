import { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { hashSession } from '../../lib/crypto.js';
import { SignaturePad } from '../session/SignaturePad.jsx';
import { saveSignature } from '../../api/sessions.js';
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

function AnnotationSection({ sessionId }) {
  const storageKey = `annotation_${sessionId}`;
  const [note, setNote] = useState(() => localStorage.getItem(storageKey) || '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const handleEdit = () => { setDraft(note); setEditing(true); };
  const handleSave = () => {
    setNote(draft);
    localStorage.setItem(storageKey, draft);
    setEditing(false);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-900 uppercase">Nota Peribadi Pengendali Sesi</h3>
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
            placeholder="Nota peribadi anda tentang sesi ini (tidak termasuk dalam laporan rasmi)..."
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border border-gray-200">Batal</button>
            <button onClick={handleSave} className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded">Simpan</button>
          </div>
        </div>
      ) : note ? (
        <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">{note}</p>
      ) : (
        <p className="text-sm text-blue-400 italic">Tiada nota. Klik "Tambah Nota" untuk menambah pemerhatian peribadi.</p>
      )}
      <p className="text-xs text-blue-400 mt-3">Nota ini disimpan dalam peranti ini sahaja dan tidak termasuk dalam laporan rasmi.</p>
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

function TranscriptScript({ transcript = [] }) {
  const [expanded, setExpanded] = useState(false);

  const lines = transcript.filter(e =>
    e.type === 'TRANSCRIPT' || e.type === 'INTERVIEWER' || e.type === 'NOTE' || e.type === 'FLAG'
  );

  if (!lines.length) return null;

  const preview = lines.slice(0, 4);
  const shown = expanded ? lines : preview;

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
          {expanded ? 'Sembunyikan' : 'Tunjukkan Semua'}
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

        {!expanded && lines.length > 4 && (
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
      {!expanded && (
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
  const { report, hash, audio_url, created_at, subject_name, interviewer, profession, duration, transcript, id, case_number, witness_officer } = session;
  const reportRef  = useRef(null);
  const [exporting, setExporting]   = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  if (!report) return <p className="text-gray-500 text-center py-12">Laporan belum dijana</p>;

  const exportPDF = async () => {
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`laporan-verirec-${id?.substring(0, 8)}.pdf`);
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
      <div className="flex items-center justify-between mb-6 no-print">
        <h2 className="text-xl font-bold text-gray-900">Laporan Sesi</h2>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()}>Cetak</Button>
          <Button onClick={exportPDF} loading={exporting}>Eksport PDF</Button>
        </div>
      </div>

      {/* Follow-up Tracker — above the printable report */}
      <div className="mb-6 space-y-4 no-print">
        <FollowUpTracker sessionId={id} items={report.followUpItems} />
        <AnnotationSection sessionId={id} />
      </div>

      <div ref={reportRef} className="bg-white rounded-xl border p-8 space-y-8 print:border-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Sesi VeriRec</h1>
            <p className="text-gray-500 mt-1 capitalize">{profession} — {subject_name}</p>
            {case_number && <p className="text-sm text-gray-400 mt-0.5">No. Kes: {case_number}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Tarikh</p>
            <p className="font-medium">{format(new Date(created_at), 'dd MMM yyyy, HH:mm')}</p>
            <p className="text-sm text-gray-500 mt-1">Pengendali Sesi</p>
            <p className="font-medium">{interviewer}</p>
            {witness_officer && (
              <>
                <p className="text-sm text-gray-500 mt-1">Saksi / Pegawai</p>
                <p className="font-medium">{witness_officer}</p>
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

        {/* Counselor crisis indicators */}
        {profession === 'counselor' && report.crisisIndicators?.detected && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-red-700 uppercase mb-2">Penunjuk Krisis</h3>
            <p className="text-sm font-medium text-red-800 mb-2">
              Tahap: <Badge color={report.crisisIndicators.level === 'critical' ? 'red' : 'yellow'}>
                {report.crisisIndicators.level === 'critical' ? 'Kritikal' : report.crisisIndicators.level === 'watch' ? 'Perlu Pemantauan' : 'Tiada'}
              </Badge>
            </p>
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

        {/* E-Signature */}
        <SignatureSection session={session} />
      </div>
    </div>
  );
}
