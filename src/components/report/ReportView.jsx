import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const riskColors = { low: 'green', medium: 'yellow', high: 'red' };
const riskLabels = { low: 'Rendah', medium: 'Sederhana', high: 'Tinggi' };
const sentimentLabels = { positive: 'Positif 😊', neutral: 'Neutral 😐', negative: 'Negatif 😔' };

export function ReportView({ session }) {
  const { report, hash, audio_url, created_at, subject_name, interviewer, profession, duration } = session;
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  if (!report) return <p className="text-gray-500 text-center py-12">Laporan belum dijana</p>;

  const exportPDF = async () => {
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`laporan-verirec-${session.id?.substring(0, 8)}.pdf`);
    } finally {
      setExporting(false);
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

      <div ref={reportRef} className="bg-white rounded-xl border p-8 space-y-8 print:border-none print:shadow-none">
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

        {/* Risk & Sentiment */}
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
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Rantai Jagaan (Chain of Custody)</h3>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs break-all">
            <p className="text-gray-500 mb-1">SHA-256 Hash (Dijana di Pelayan):</p>
            <p className="text-gray-800">{hash || 'Tiada hash'}</p>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Hash ini membuktikan laporan tidak diubah suai selepas dijana. Dokumen ini diperakui oleh sistem VeriRec.
          </p>
        </div>
      </div>
    </div>
  );
}
