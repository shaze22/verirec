import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  getCase, getCaseSessions, getUnassignedSessions,
  updateCase, assignSessionToCase, removeSessionFromCase,
} from '../api/cases.js';
import { supabase } from '../lib/supabase.js';
import { useAuthStore } from '../store/authStore.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { professionLabel } from '../data/professions.js';
import toast from 'react-hot-toast';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'video/mp4'];
const MAX_SIZE_BYTES = 52428800; // 50MB

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function EvidenceAttachments({ caseId, userId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState(null);
  const fileInputRef = useRef(null);

  const loadFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase.storage.from('evidence').list(`${userId}/${caseId}`, { sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      setFiles(data || []);
    } catch {
      /* silent — bucket may be empty */
    }
  }, [caseId, userId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('File type not allowed. Use PDF, JPG, PNG, DOCX, or MP4.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('File size exceeds 50MB.');
      return;
    }
    setUploading(true);
    try {
      const path = `${userId}/${caseId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('evidence').upload(path, file);
      if (error) throw error;
      toast.success('File uploaded successfully.');
      loadFiles();
    } catch (err) {
      toast.error(err.message || 'Failed to upload file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (fileName) => {
    try {
      const { data, error } = await supabase.storage.from('evidence').createSignedUrl(`${userId}/${caseId}/${fileName}`, 300);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      toast.error('Failed to generate download link.');
    }
  };

  const handleDelete = async (fileName) => {
    if (!window.confirm(`Delete fail "${fileName}"?`)) return;
    setDeletingFile(fileName);
    try {
      const { error } = await supabase.storage.from('evidence').remove([`${userId}/${caseId}/${fileName}`]);
      if (error) throw error;
      toast.success('File deleted.');
      setFiles(prev => prev.filter(f => f.name !== fileName));
    } catch {
      toast.error('Failed to delete file.');
    } finally {
      setDeletingFile(null);
    }
  };

  const extIcon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (ext === 'mp4') return '🎬';
    return '📎';
  };

  return (
    <div className="bg-white border rounded-xl p-5 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Evidence Attachments</h3>
        <div>
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.mp4" onChange={handleUpload} className="hidden" id="evidence-upload" />
          <label htmlFor="evidence-upload">
            <Button
              size="sm"
              as="span"
              loading={uploading}
              className="cursor-pointer"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? 'Uploading...' : '+ Add File'}
            </Button>
          </label>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">PDF, JPG, PNG, DOCX, MP4 — maximum 50MB per file</p>
      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-300">
          <p className="text-2xl mb-1">📎</p>
          <p className="text-sm">No evidence attachments yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.name} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg flex-shrink-0">{extIcon(f.name)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{f.name.replace(/^\d+_/, '')}</p>
                  <p className="text-xs text-gray-400">
                    {f.metadata?.size ? formatBytes(f.metadata.size) : '—'} · {f.created_at ? format(new Date(f.created_at), 'dd MMM yyyy') : '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDownload(f.name)}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(f.name)}
                  disabled={deletingFile === f.name}
                  className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingFile === f.name ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  addLine('VeriRec — Case File Export', 16, true, [37, 99, 235]);
  addLine(`Confidential — For Official Use Only`, 9, false, [150, 150, 150]);
  y += 4;

  // Case details
  addLine(`Case Title: ${caseData.title}`, 13, true);
  if (caseData.case_number) addLine(`Case No.: ${caseData.case_number}`);
  addLine(`Profession: ${professionLabel(caseData.profession)}`);
  addLine(`Status: ${caseData.status === 'active' ? 'Active' : caseData.status === 'closed' ? 'Closed' : 'Pending'}`);
  if (caseData.description) addLine(`Description: ${caseData.description}`);
  addLine(`Total Sessions: ${sessions.length}`);
  addLine(`Reports Generated: ${sessions.filter(s => s.report).length}`);
  y += 5;

  // Sessions list
  addLine('Session List', 12, true, [37, 99, 235]);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, W - margin, y);
  y += 5;

  sessions.forEach((s, i) => {
    if (y > 250) { pdf.addPage(); y = margin; }
    addLine(`${i + 1}. ${s.title}`, 11, true);
    addLine(`   Subject: ${s.subject_name} | Date: ${format(new Date(s.created_at), 'dd/MM/yyyy')} | Duration: ${Math.round((s.duration || 0) / 60)} min`);
    if (s.report?.riskLevel) addLine(`   Risk Level: ${s.report.riskLevel === 'high' ? 'High' : s.report.riskLevel === 'medium' ? 'Moderate' : 'Low'}`);
    if (s.report?.summary) addLine(`   Summary: ${s.report.summary}`, 10, false, [80, 80, 80]);
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
  addLine('Confidential — For Official Use Only', 9, true, [150, 50, 50]);
  addLine(`Export Date: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, 9, false, [130, 130, 130]);
  if (caseHash) addLine(`SHA-256 Case: ${caseHash.slice(0, 32)}…`, 8, false, [130, 130, 130]);

  pdf.save(`verirec-kes-${(caseData.case_number || caseData.id).replace(/[^a-z0-9]/gi, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

const statusConfig = {
  active:  { label: 'Active',   color: 'green' },
  pending: { label: 'Pending',  color: 'yellow' },
  closed:  { label: 'Closed',   color: 'gray' },
};

const riskColors = { low: 'green', medium: 'yellow', high: 'red' };
const riskLabels = { low: 'Low', medium: 'Moderate', high: 'High' };

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [caseData, setCaseData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [unassigned, setUnassigned] = useState([]);
  const [adding, setAdding] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [closeStep, setCloseStep] = useState(1);
  const [closingRemarks, setClosingRemarks] = useState('');
  const [exported, setExported] = useState(false);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceSaving, setEvidenceSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([getCase(id), getCaseSessions(id)]);
      setCaseData(c);
      setSessions(s);
      setEvidenceNote(localStorage.getItem(`case_evidence_${id}`) || c.description || '');
      setAiSummary(c.ai_summary || localStorage.getItem(`case_ai_summary_${id}`) || '');
    } catch {
      toast.error('Case file not found.');
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
      toast.error('Failed to load sessions.');
    }
  };

  const startNewSession = () => {
    sessionStorage.setItem('case_prefill', JSON.stringify({
      case_id: caseData.id,
      case_number: caseData.case_number || '',
      case_title: caseData.title,
      profession: caseData.profession || '',
    }));
    navigate('/session/setup');
  };

  const handleAdd = async (sessionId) => {
    setAdding(sessionId);
    try {
      await assignSessionToCase(sessionId, id);
      toast.success('Session added to case file.');
      setAddModal(false);
      load();
    } catch {
      toast.error('Failed to add session.');
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (sessionId) => {
    if (!window.confirm('Remove this session from the case file?')) return;
    setRemoving(sessionId);
    try {
      await removeSessionFromCase(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session removed from case file.');
    } catch {
      toast.error('Failed to remove session.');
    } finally {
      setRemoving(null);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusSaving(true);
    try {
      const updated = await updateCase(id, { status: newStatus });
      setCaseData(updated);
      toast.success('Status updated.');
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleCloseCase = async () => {
    setStatusSaving(true);
    try {
      const closingNote = closingRemarks.trim()
        ? `[Closing Remarks — ${format(new Date(), 'dd/MM/yyyy')}]\n${closingRemarks.trim()}`
        : '';
      const descUpdate = closingNote
        ? (caseData.description ? `${caseData.description}\n\n${closingNote}` : closingNote)
        : caseData.description;
      const updated = await updateCase(id, { status: 'closed', description: descUpdate });
      setCaseData(updated);
      setEvidenceNote(descUpdate || '');
      setCloseModal(false);
      setCloseStep(1);
      setClosingRemarks('');
      setExported(false);
      toast.success('Case closed successfully.');
    } catch {
      toast.error('Failed to close case.');
    } finally {
      setStatusSaving(false);
    }
  };

  const generateAISummary = async () => {
    const sessionsWithReport = sessions.filter(s => s.report);
    if (sessionsWithReport.length < 2) return;
    setGeneratingAI(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const case_summaries = sessionsWithReport.map(s => ({
        date: format(new Date(s.created_at), 'dd/MM/yyyy'),
        subject: s.subject_name || '—',
        riskLevel: s.report.riskLevel === 'high' ? 'Tinggi' : s.report.riskLevel === 'medium' ? 'Sederhana' : s.report.riskLevel === 'low' ? 'Rendah' : '—',
        summary: s.report.summary || '',
        findings: s.report.keyFindings || [],
      }));
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        body: JSON.stringify({ mode: 'case_summary', case_title: caseData?.title, case_summaries }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate summary');
      }
      const data = await res.json();
      const summaryText = data.summary || '';
      setAiSummary(summaryText);
      localStorage.setItem(`case_ai_summary_${id}`, summaryText);
      try { await updateCase(id, { ai_summary: summaryText }); } catch { /* fallback ke localStorage OK */ }
      toast.success('AI summary generated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to generate summary AI.');
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="Case File" onBack={() => navigate('/cases')} />
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
      <TopBar title="Case File" />
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
            All Case Files
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
                  <p className="text-sm text-gray-500">Case No.: {caseData.case_number}</p>
                )}
                {caseData.description && (
                  <p className="text-sm text-gray-600 mt-2">{caseData.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {caseData.status === 'closed' ? (
                  <button
                    onClick={() => handleStatusChange('active')}
                    disabled={statusSaving}
                    className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Reopen Case
                  </button>
                ) : (
                  <>
                    <select
                      value={caseData.status}
                      onChange={e => handleStatusChange(e.target.value)}
                      disabled={statusSaving}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                    </select>
                    <button
                      onClick={() => { setCloseStep(1); setCloseModal(true); }}
                      className="text-xs border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors font-medium"
                    >
                      🔒 Close Case
                    </button>
                  </>
                )}
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
                <p className="text-xs text-gray-500">Total minutes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => s.report).length}
                </p>
                <p className="text-xs text-gray-500">Reports generated</p>
              </div>
            </div>
          </div>

          {/* AI Case Summary */}
          <div className="mb-4">
            {aiSummary ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <h3 className="text-sm font-semibold text-blue-800">AI Overall Case Summary</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={generatingAI}
                    onClick={generateAISummary}
                    disabled={sessions.filter(s => s.report).length < 2}
                  >
                    Regenerate
                  </Button>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
                <p className="text-xs text-blue-400 mt-3">Generated by AI based on {sessions.filter(s => s.report).length} session reports</p>
              </div>
            ) : sessions.filter(s => s.report).length >= 2 ? (
              <button
                onClick={generateAISummary}
                disabled={generatingAI}
                className="w-full flex items-center justify-center gap-2.5 py-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 border-dashed rounded-xl transition-colors disabled:opacity-60"
              >
                {generatingAI ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-blue-700 font-medium">Generating case summary...</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">🤖</span>
                    <span className="text-sm text-blue-700 font-medium">Generate Case Summary (AI)</span>
                    <span className="text-xs text-blue-400">based on {sessions.filter(s => s.report).length} reports</span>
                  </>
                )}
              </button>
            ) : null}
          </div>

          {/* Sessions */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Sessions in Case File ({sessions.length})
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
                      toast.success('Case PDF exported successfully.');
                    } catch {
                      toast.error('Failed to export case PDF.');
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  📦 Export Case
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={openAddModal}>+ Existing Session</Button>
              <Button size="sm" onClick={startNewSession}>🎙 New Session</Button>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-xl text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-sm">No sessions in this case file yet.</p>
              <button onClick={startNewSession} className="mt-2 text-sm text-blue-600 hover:underline font-medium">
                🎙 Start first session →
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
                        ? <Badge color="green" className="text-xs">Report Ready</Badge>
                        : <Badge color="gray" className="text-xs">Not Generated</Badge>
                      }
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(s.id)}
                    disabled={removing === s.id}
                    className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    {removing === s.id ? '...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Nota Bukti */}
          <div className="bg-white border rounded-xl p-5 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Evidence Notes & Case Comments</h3>
              <Button
                size="sm"
                variant="secondary"
                loading={evidenceSaving}
                onClick={async () => {
                  setEvidenceSaving(true);
                  try {
                    localStorage.setItem(`case_evidence_${id}`, evidenceNote);
                    await updateCase(id, { description: evidenceNote });
                    toast.success('Nota saved.');
                  } catch {
                    localStorage.setItem(`case_evidence_${id}`, evidenceNote);
                    toast.success('Note saved locally.');
                  } finally {
                    setEvidenceSaving(false);
                  }
                }}
              >
                Save
              </Button>
            </div>
            <textarea
              value={evidenceNote}
              onChange={e => setEvidenceNote(e.target.value)}
              rows={4}
              placeholder="Catatan bukti, nota siasatan, senarai dokumen, status tindakan polis/pendakwa raya..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">This note is saved in the case file. Not counted in session hash.</p>
          </div>

          {/* Evidence Attachments */}
          {user && <EvidenceAttachments caseId={id} userId={user.id} />}

          {/* Timeline Kes */}
          <div className="bg-white border rounded-xl overflow-hidden mt-4">
            <button
              onClick={() => setShowTimeline(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Case Activity Timeline</h3>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showTimeline ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showTimeline && (
              <div className="px-5 pb-5">
                <div className="relative pl-5 border-l-2 border-gray-200 space-y-4">
                  {/* Case created */}
                  <div className="relative">
                    <span className="absolute -left-[21px] w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                    <p className="text-xs text-gray-400">{format(new Date(caseData.created_at), 'dd MMM yyyy, HH:mm')}</p>
                    <p className="text-sm font-medium text-gray-700">Case file created</p>
                    <p className="text-xs text-gray-500">{caseData.title}</p>
                  </div>
                  {/* Sessions in chronological order */}
                  {[...sessions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(s => (
                    <div key={s.id} className="relative">
                      <span className={`absolute -left-[21px] w-4 h-4 rounded-full border-2 border-white ${s.report ? 'bg-green-500' : 'bg-amber-400'}`} />
                      <p className="text-xs text-gray-400">{format(new Date(s.created_at), 'dd MMM yyyy, HH:mm')}</p>
                      <p className="text-sm font-medium text-gray-700 cursor-pointer hover:text-blue-600" onClick={() => navigate(`/session/${s.id}`)}>
                        {s.title}
                      </p>
                      <p className="text-xs text-gray-500">{s.subject_name} · {Math.round((s.duration || 0) / 60)} min · {s.report ? '✓ Report Ready' : 'Not Generated'}</p>
                    </div>
                  ))}
                  {/* Status if closed */}
                  {caseData.status === 'closed' && (
                    <div className="relative">
                      <span className="absolute -left-[21px] w-4 h-4 rounded-full bg-gray-400 border-2 border-white" />
                      <p className="text-xs text-gray-400">{format(new Date(caseData.updated_at || caseData.created_at), 'dd MMM yyyy')}</p>
                      <p className="text-sm font-medium text-gray-700">Case closed</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Session Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Session to Case File">
        {unassigned.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">All sessions are already linked to a case file.</p>
            <p className="text-xs mt-1">Create a new session first.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">Select sessions to add to this case file:</p>
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
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Close Case Guided Flow Modal ── */}
      {closeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">🔒 Close Case</h2>
                <p className="text-xs text-gray-400 mt-0.5">Step {closeStep} of 3</p>
              </div>
              <div className="flex gap-1">
                {[1,2,3].map(s => (
                  <div key={s} className={`w-8 h-1.5 rounded-full transition-colors ${s <= closeStep ? 'bg-red-500' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>

            {/* Step 1 — Review */}
            {closeStep === 1 && (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">Review this case before closing. Once closed, it will be archived.</p>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Case Title</span>
                    <span className="font-medium text-gray-900 text-right max-w-xs truncate">{caseData.title}</span>
                  </div>
                  {caseData.case_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Case Number</span>
                      <span className="font-medium text-gray-900">{caseData.case_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Sessions</span>
                    <span className="font-medium text-gray-900">{sessions.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Reports Generated</span>
                    <span className={`font-medium ${sessions.filter(s=>s.report).length < sessions.length ? 'text-amber-600' : 'text-green-600'}`}>
                      {sessions.filter(s=>s.report).length} / {sessions.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">AI Case Summary</span>
                    <span className={`font-medium ${aiSummary ? 'text-green-600' : 'text-gray-400'}`}>{aiSummary ? '✓ Ready' : 'Not generated'}</span>
                  </div>
                </div>
                {sessions.filter(s=>!s.report).length > 0 && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <span className="text-amber-500 text-sm">⚠️</span>
                    <p className="text-xs text-amber-700">{sessions.filter(s=>!s.report).length} session(s) have no AI report. Consider generating reports before closing.</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setCloseModal(false)} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={() => setCloseStep(2)} className="flex-1 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Continue →</button>
                </div>
              </div>
            )}

            {/* Step 2 — Export */}
            {closeStep === 2 && (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">Export case documents before closing for your records.</p>
                <div className="space-y-2">
                  <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${exported ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{exported ? '✅' : '📦'}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Export Full Case PDF</p>
                        <p className="text-xs text-gray-500">{sessions.length} sessions · {sessions.filter(s=>s.report).length} reports</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={exported ? 'secondary' : 'primary'}
                      loading={exporting}
                      onClick={async () => {
                        setExporting(true);
                        try {
                          await exportCasePDF(caseData, sessions);
                          setExported(true);
                          toast.success('Case PDF exported.');
                        } catch { toast.error('Export failed.'); }
                        finally { setExporting(false); }
                      }}
                    >
                      {exported ? 'Done' : 'Export'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">Export is recommended but not required to proceed.</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setCloseStep(1)} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">← Back</button>
                  <button onClick={() => setCloseStep(3)} className="flex-1 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Continue →</button>
                </div>
              </div>
            )}

            {/* Step 3 — Confirm */}
            {closeStep === 3 && (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">Add closing remarks and confirm. This action can be undone by reopening the case.</p>
                <textarea
                  value={closingRemarks}
                  onChange={e => setClosingRemarks(e.target.value)}
                  placeholder="Closing remarks, outcome summary, final findings... (optional)"
                  rows={4}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 placeholder-gray-400"
                />
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700 font-medium">This will archive the case and mark it as Closed.</p>
                  <p className="text-xs text-red-500 mt-0.5">All sessions and evidence remain accessible. You can reopen at any time.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setCloseStep(2)} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">← Back</button>
                  <button
                    onClick={handleCloseCase}
                    disabled={statusSaving}
                    className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {statusSaving ? 'Closing...' : '🔒 Close Case'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
