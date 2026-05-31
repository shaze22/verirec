import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  getCase, getCaseSessions, getUnassignedSessions,
  updateCase, assignSessionToCase, removeSessionFromCase,
} from '../api/cases.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { professionLabel } from '../data/professions.js';
import toast from 'react-hot-toast';

async function exportCasePDF(caseData, sessions) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const lineH = 7;
  let y = margin;

  const addLine = (text, size = 11, bold = false, color = [30, 30, 30]) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(String(text || ''), W - margin * 2);
    lines.forEach(line => {
      if (y > 270) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += lineH;
    });
  };

  // Header
  addLine('VeriRec — Eksport Fail Kes', 16, true, [37, 99, 235]);
  addLine(`Sulit — Untuk Kegunaan Rasmi Sahaja`, 9, false, [150, 150, 150]);
  y += 4;

  // Case details
  addLine(`Tajuk Kes: ${caseData.title}`, 13, true);
  if (caseData.case_number) addLine(`No. Kes: ${caseData.case_number}`);
  addLine(`Profesion: ${professionLabel(caseData.profession)}`);
  addLine(`Status: ${caseData.status === 'active' ? 'Aktif' : caseData.status === 'closed' ? 'Ditutup' : 'Ditangguhkan'}`);
  if (caseData.description) addLine(`Keterangan: ${caseData.description}`);
  addLine(`Jumlah Sesi: ${sessions.length}`);
  addLine(`Laporan Dijana: ${sessions.filter(s => s.report).length}`);
  y += 5;

  // Sessions list
  addLine('Senarai Sesi', 12, true, [37, 99, 235]);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, W - margin, y);
  y += 5;

  sessions.forEach((s, i) => {
    if (y > 250) { pdf.addPage(); y = margin; }
    addLine(`${i + 1}. ${s.title}`, 11, true);
    addLine(`   Subjek: ${s.subject_name} | Tarikh: ${format(new Date(s.created_at), 'dd/MM/yyyy')} | Tempoh: ${Math.round((s.duration || 0) / 60)} min`);
    if (s.report?.riskLevel) addLine(`   Tahap Risiko: ${s.report.riskLevel === 'high' ? 'Tinggi' : s.report.riskLevel === 'medium' ? 'Sederhana' : 'Rendah'}`);
    if (s.report?.summary) addLine(`   Ringkasan: ${s.report.summary}`, 10, false, [80, 80, 80]);
    if (s.hash) addLine(`   Hash: ${s.hash.slice(0, 16)}…`, 9, false, [130, 130, 130]);
    y += 2;
  });

  y += 5;

  // Case hash
  const crypto = await import('crypto');
  const caseHashPayload = JSON.stringify({ case_id: caseData.id, sessions: sessions.map(s => s.hash || s.id) });
  const caseHash = typeof window !== 'undefined'
    ? await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(caseHashPayload))
      .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''))
    : '';

  // Footer
  if (y > 260) { pdf.addPage(); y = margin; }
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, W - margin, y);
  y += 5;
  addLine('Sulit — Untuk Kegunaan Rasmi Sahaja', 9, true, [150, 50, 50]);
  addLine(`Tarikh Eksport: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, 9, false, [130, 130, 130]);
  if (caseHash) addLine(`SHA-256 Kes: ${caseHash.slice(0, 32)}…`, 8, false, [130, 130, 130]);

  pdf.save(`verirec-kes-${(caseData.case_number || caseData.id).replace(/[^a-z0-9]/gi, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

const statusConfig = {
  active:  { label: 'Aktif',        color: 'green' },
  pending: { label: 'Ditangguhkan', color: 'yellow' },
  closed:  { label: 'Ditutup',      color: 'gray' },
};

const riskColors = { low: 'green', medium: 'yellow', high: 'red' };
const riskLabels = { low: 'Rendah', medium: 'Sederhana', high: 'Tinggi' };

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [unassigned, setUnassigned] = useState([]);
  const [adding, setAdding] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([getCase(id), getCaseSessions(id)]);
      setCaseData(c);
      setSessions(s);
    } catch {
      toast.error('Fail kes tidak dijumpai.');
      navigate('/cases');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openAddModal = async () => {
    try {
      const data = await getUnassignedSessions();
      setUnassigned(data);
      setAddModal(true);
    } catch {
      toast.error('Gagal memuatkan sesi.');
    }
  };

  const handleAdd = async (sessionId) => {
    setAdding(sessionId);
    try {
      await assignSessionToCase(sessionId, id);
      toast.success('Sesi berjaya ditambah ke fail kes.');
      setAddModal(false);
      load();
    } catch {
      toast.error('Gagal menambah sesi.');
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (sessionId) => {
    if (!window.confirm('Buang sesi ini dari fail kes?')) return;
    setRemoving(sessionId);
    try {
      await removeSessionFromCase(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Sesi dibuang dari fail kes.');
    } catch {
      toast.error('Gagal membuang sesi.');
    } finally {
      setRemoving(null);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusSaving(true);
    try {
      const updated = await updateCase(id, { status: newStatus });
      setCaseData(updated);
      toast.success('Status dikemas kini.');
    } catch {
      toast.error('Gagal mengemas kini status.');
    } finally {
      setStatusSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="Fail Kes" onBack={() => navigate('/cases')} />
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  const sc = statusConfig[caseData.status] || statusConfig.active;
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Fail Kes" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto">

          {/* Back */}
          <button
            onClick={() => navigate('/cases')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Semua Fail Kes
          </button>

          {/* Case Header */}
          <div className="bg-white border rounded-xl p-5 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-lg font-semibold text-gray-900">{caseData.title}</h2>
                  <Badge color={sc.color}>{sc.label}</Badge>
                  {caseData.profession && <Badge color="blue">{professionLabel(caseData.profession)}</Badge>}
                </div>
                {caseData.case_number && (
                  <p className="text-sm text-gray-500">No. Kes: {caseData.case_number}</p>
                )}
                {caseData.description && (
                  <p className="text-sm text-gray-600 mt-2">{caseData.description}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                <select
                  value={caseData.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={statusSaving}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="active">Aktif</option>
                  <option value="pending">Ditangguhkan</option>
                  <option value="closed">Ditutup</option>
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                <p className="text-xs text-gray-500">Sesi</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{Math.round(totalDuration / 60)}</p>
                <p className="text-xs text-gray-500">Minit jumlah</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => s.report).length}
                </p>
                <p className="text-xs text-gray-500">Laporan dijana</p>
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Sesi dalam Fail Kes ({sessions.length})
            </h3>
            <div className="flex items-center gap-2">
              {sessions.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={exporting}
                  onClick={async () => {
                    setExporting(true);
                    try {
                      await exportCasePDF(caseData, sessions);
                      toast.success('PDF kes berjaya dieksport.');
                    } catch {
                      toast.error('Gagal mengeksport PDF kes.');
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  📦 Eksport Kes
                </Button>
              )}
              <Button size="sm" onClick={openAddModal}>+ Tambah Sesi</Button>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-xl text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-sm">Belum ada sesi dalam fail kes ini.</p>
              <button onClick={openAddModal} className="mt-2 text-sm text-blue-600 hover:underline">
                Tambah sesi →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id} className="bg-white border rounded-xl p-4 flex items-center gap-4 group hover:border-blue-200 transition-colors">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/session/${s.id}`)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-gray-900 truncate">{s.title}</h4>
                      <Badge color="blue" className="text-xs">{professionLabel(s.profession)}</Badge>
                      {s.report?.riskLevel && (
                        <Badge color={riskColors[s.report.riskLevel]} className="text-xs">
                          Risiko {riskLabels[s.report.riskLevel]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{s.subject_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{format(new Date(s.created_at), 'dd MMM yyyy')}</span>
                      <span className="text-xs text-gray-400">{Math.round((s.duration || 0) / 60)} min</span>
                      {s.report
                        ? <Badge color="green" className="text-xs">Laporan Siap</Badge>
                        : <Badge color="gray" className="text-xs">Belum dijana</Badge>
                      }
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(s.id)}
                    disabled={removing === s.id}
                    className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    {removing === s.id ? '...' : 'Buang'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Session Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Tambah Sesi ke Fail Kes">
        {unassigned.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Semua sesi sudah dikaitkan dengan fail kes.</p>
            <p className="text-xs mt-1">Buat sesi baru terlebih dahulu.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">Pilih sesi yang ingin ditambah ke fail kes ini:</p>
            {unassigned.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{s.title}</p>
                  <p className="text-xs text-gray-500">
                    {s.subject_name} · {professionLabel(s.profession)} · {format(new Date(s.created_at), 'dd MMM yyyy')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAdd(s.id)}
                  loading={adding === s.id}
                  className="flex-shrink-0 ml-3"
                >
                  Tambah
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
