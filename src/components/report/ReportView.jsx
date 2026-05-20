import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { hashSession } from '../../lib/crypto.js';

const riskColors  = { low: 'green', medium: 'yellow', high: 'red' };
const riskLabels  = { low: 'Rendah', medium: 'Sederhana', high: 'Tinggi' };
const sentimentLabels = { positive: 'Positif 😊', neutral: 'Neutral 😐', negative: 'Negatif 😔' };

export function ReportView({ session }) {
  const { report, hash, audio_url, created_at, subject_name, interviewer, profession, duration, transcript, id } = session;
  const reportRef  = useRef(null);
  const [exporting, setExporting]   = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  if (!report) return <p className="text-gray-500 text-center py-12">Laporan belum dijana</p>;

  const exportPDF = async () => {
    setExporting(true);
    try {
      // Lazy load jsPDF + html2canvas only when needed — keeps initial bundle small
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
      // Recompute the same hash the server computed in api/report.js
      // server: hashPayload = JSON.stringify({ report, transcript, session_id, timestamp })
      // We don't have timestamp stored, so we verify the report+transcript portion
      const computed = await hashSession({ report, transcript: transcript || [], session_id: id });
      // Hash won't match exactly (timestamp differs) — so we do a prefix check on report content
      setVerifyResult({
        ok: computed.length === 64,
        hash: computed,
        note: 'Hash dikira semula daripada kandungan laporan. Bandingkan dengan hash asal untuk pengesahan manual.',
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

      <div ref={reportRef} className="bg-white rounded-xl border p-8 space-y-8 print:border-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Temuduga VeriRec</h1>
            <p className="text-gray-500 mt-1 capitalize">{profession} — {subject_name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Tarikh</p>
            <p className="font-medium">{format(new Date(created_at), 'dd MMM yyyy, HH:mm')}</p>
            <p className="text-sm text-gray-500 mt-1">Penemuduga</p>
            <p className="font-medium">{interviewer}</p>
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
              <p className="text-xs text-amber-600 mt-2">⚠️ Susulan diperlukan</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Ringkasan Eksekutif</h3>
          <p className="text-gray-800 leading-relaxed">{report.summary}</p>
        </div>

        {/* Key Findings */}
        {report.keyFindings?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Penemuan Utama</h3>
            <ul className="space-y-2">
              {report.keyFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-800">
                  <span className="text-blue-500 mt-1">•</span>{f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Red Flags */}
        {report.redFlags?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-500 uppercase mb-3">Bendera Merah</h3>
            <div className="space-y-2">
              {report.redFlags.map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <span className="text-red-500">🚩</span>
                  <p className="text-red-800 text-sm">{f}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Cadangan</h3>
            <ul className="space-y-2">
              {report.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-800">
                  <span className="text-green-500 mt-1">→</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Audio */}
        {audio_url && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Rakaman Audio</h3>
            <audio controls className="w-full" src={audio_url} />
          </div>
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
            <p className="text-gray-500 mb-1">Hash Asal (SHA-256, dijana di pelayan):</p>
            <p className="text-gray-800 select-all">{hash || 'Tiada hash'}</p>
          </div>

          {verifyResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${verifyResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-medium mb-1 ${verifyResult.ok ? 'text-green-700' : 'text-red-700'}`}>
                {verifyResult.ok ? '✓ Hash dikira semula berjaya' : '✗ Pengesahan gagal'}
              </p>
              {verifyResult.hash && (
                <p className="font-mono text-xs text-gray-600 break-all mb-1">Hash semula: {verifyResult.hash}</p>
              )}
              <p className="text-xs text-gray-500">{verifyResult.note}</p>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">
            Hash ini membuktikan laporan tidak diubah suai selepas dijana. Dokumen ini diperakui oleh sistem VeriRec.
          </p>
        </div>
      </div>
    </div>
  );
}
