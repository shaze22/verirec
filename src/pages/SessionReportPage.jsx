import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionById, updateSessionStatus, updateSession } from '../api/sessions.js';
import { supabase } from '../lib/supabase.js';
import { logEvent } from '../api/auditLog.js';
import { useAuthStore } from '../store/authStore.js';
import { generateReport } from '../api/claude.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { ReportView } from '../components/report/ReportView.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import toast from 'react-hot-toast';

async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('verirec:' + pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const STATUS_OPTIONS = [
  { value: 'active',  label: 'Aktif',        dot: 'bg-green-500' },
  { value: 'pending', label: 'Ditangguhkan',  dot: 'bg-amber-400' },
  { value: 'closed',  label: 'Ditutup',       dot: 'bg-gray-400' },
];

export default function SessionReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [reGenerating, setReGenerating] = useState(false);

  const handleReGenerateReport = async () => {
    if (!session?.transcript?.length) {
      toast.error('Tiada transkrip untuk dijana laporan.');
      return;
    }
    setReGenerating(true);
    try {
      await generateReport({
        session_id: session.id,
        transcript: session.transcript,
        flags: session.flags || [],
        session_info: {
          profession: session.profession,
          title: session.title,
          subject_name: session.subject_name,
          subject_role: session.subject_role,
          context_notes: session.context_notes,
          duration: session.duration,
        },
      });
      toast.success('Laporan berjaya dijana!');
      const updated = await getSessionById(id);
      setSession(updated);
    } catch {
      toast.error('Gagal menjana laporan. Cuba lagi.');
    } finally {
      setReGenerating(false);
    }
  };
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // Share state
  const [shareToken, setShareToken] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);

  // PIN state
  const [pinLocked, setPinLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinChecking, setPinChecking] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  useEffect(() => {
    getSessionById(id)
      .then(s => {
        setSession(s);
        setEditForm({ title: s.title, subject_name: s.subject_name, subject_role: s.subject_role || '', context_notes: s.context_notes || '' });
        if (s.report_pin) setPinLocked(true);
        if (s.share_token) setShareToken(s.share_token);
        if (user) logEvent(user.id, 'session.view', 'session', s.id, s.title);
      })
      .catch(() => toast.error('Sesi tidak dijumpai'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePinUnlock = async (e) => {
    e.preventDefault();
    if (!pinInput) return;
    setPinChecking(true);
    setPinError('');
    try {
      const h = await hashPin(pinInput);
      if (h === session.report_pin) {
        setPinLocked(false);
        setPinInput('');
        logEvent(user.id, 'report.pin.unlock', 'session', session.id, session.title);
        logEvent(user.id, 'report.view', 'session', session.id, session.title);
      } else {
        setPinError('PIN salah. Cuba lagi.');
      }
    } finally {
      setPinChecking(false);
    }
  };

  const handleSetPin = async (e) => {
    e.preventDefault();
    if (newPin.length < 4) { toast.error('PIN mestilah sekurang-kurangnya 4 digit.'); return; }
    setPinSaving(true);
    try {
      const h = newPin ? await hashPin(newPin) : null;
      await supabase.from('sessions').update({ report_pin: h }).eq('id', id);
      setSession(prev => ({ ...prev, report_pin: h }));
      setPinModal(false);
      setNewPin('');
      toast.success(h ? 'PIN laporan ditetapkan.' : 'PIN laporan dibuang.');
      if (h) logEvent(user.id, 'report.pin.set', 'session', session.id, session.title);
    } catch {
      toast.error('Gagal menetapkan PIN.');
    } finally {
      setPinSaving(false);
    }
  };

  const handleRemovePin = async () => {
    if (!window.confirm('Buang PIN perlindungan laporan ini?')) return;
    setPinSaving(true);
    try {
      await supabase.from('sessions').update({ report_pin: null }).eq('id', id);
      setSession(prev => ({ ...prev, report_pin: null }));
      toast.success('PIN laporan dibuang.');
    } catch {
      toast.error('Gagal membuang PIN.');
    } finally {
      setPinSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!session || newStatus === (session.status || 'active')) return;
    setStatusUpdating(true);
    try {
      const updated = await updateSessionStatus(id, newStatus);
      setSession(prev => ({ ...prev, status: updated.status }));
      const opt = STATUS_OPTIONS.find(o => o.value === newStatus);
      toast.success(`Status: ${opt?.label}`);
      if (user) logEvent(user.id, 'session.status', 'session', id, session.title, { from: session.status || 'active', to: newStatus });
    } catch {
      toast.error('Gagal mengemas kini status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token_existing = shareToken;
      if (token_existing) {
        const url = `${window.location.origin}/laporan/${token_existing}`;
        await navigator.clipboard.writeText(url);
        toast.success('Link copied ke papan klip!');
        return;
      }
      const res = await fetch('/api/share-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` },
        body: JSON.stringify({ session_id: id }),
      });
      const { token, error } = await res.json();
      if (error) throw new Error(error);
      setShareToken(token);
      const url = `${window.location.origin}/laporan/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Pautan dikongsi berjaya disalin!');
      if (user) logEvent(user.id, 'report.share', 'session', id, session?.title);
    } catch {
      toast.error('Gagal menjana pautan kongsi.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!window.confirm('Cancelkan pautan kongsi? Sesiapa yang ada pautan lama tidak akan dapat akses lagi.')) return;
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      await fetch('/api/share-session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` },
        body: JSON.stringify({ session_id: id }),
      });
      setShareToken(null);
      toast.success('Pautan kongsi dibatalkan.');
      if (user) logEvent(user.id, 'report.share.revoke', 'session', id, session?.title);
    } catch {
      toast.error('Gagal membatalkan pautan.');
    }
  };

  const handleWhatsApp = async () => {
    let token = shareToken;
    if (!token) {
      setShareLoading(true);
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const res = await fetch('/api/share-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` },
          body: JSON.stringify({ session_id: id }),
        });
        const data = await res.json();
        token = data.token;
        if (token) setShareToken(token);
      } catch {
        toast.error('Gagal menjana pautan.');
        setShareLoading(false);
        return;
      } finally {
        setShareLoading(false);
      }
    }
    const url = `${window.location.origin}/laporan/${token}`;
    const text = `Laporan sesi VeriRec: *${session?.title}*\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(`/api/report?verify=true&session_id=${id}`, {
        headers: { Authorization: `Bearer ${authSession.access_token}` },
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setVerifyResult(json.match ? 'authentic' : 'tampered');
    } catch {
      toast.error('Failed to verify dokumen.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      sessionStorage.setItem('session_setup', JSON.stringify({
        profession: session.profession,
        title: session.title,
        subject_name: session.subject_name,
        subject_role: session.subject_role || '',
        case_number: session.case_number || '',
        context_notes: session.context_notes || '',
      }));
      sessionStorage.setItem('active_session_id', session.id);
      sessionStorage.setItem('resuming', 'true');
      navigate('/session/active');
    } catch {
      toast.error('Gagal menyambung sesi.');
      setResuming(false);
    }
  };

  const handleEditSave = async () => {
    if (!editForm.title?.trim() || !editForm.subject_name?.trim()) {
      toast.error('Tajuk dan nama subjek diperlukan.');
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updateSession(id, {
        title: editForm.title.trim(),
        subject_name: editForm.subject_name.trim(),
        subject_role: editForm.subject_role?.trim() || null,
        context_notes: editForm.context_notes?.trim() || null,
      });
      setSession(prev => ({ ...prev, ...updated }));
      setEditModal(false);
      toast.success('Butiran sesi dikemas kini.');
      if (user) logEvent(user.id, 'session.edit', 'session', id, session?.title);
    } catch {
      toast.error('Gagal menyimpan perubahan.');
    } finally {
      setEditSaving(false);
    }
  };

  const currentStatus = session?.status || 'active';
  const statusOpt = STATUS_OPTIONS.find(o => o.value === currentStatus) || STATUS_OPTIONS[0];

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title="Session Report"
        actions={
          <div className="flex items-center gap-2">
            {session && (
              <>
                {/* WhatsApp button */}
                {session?.report && (
                  <button
                    onClick={handleWhatsApp}
                    disabled={shareLoading}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Hantar via WhatsApp"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </button>
                )}

                {/* Share button */}
                {session?.report && (
                  <button
                    onClick={shareToken ? handleRevokeShare : handleShare}
                    disabled={shareLoading}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${shareToken ? 'text-blue-600 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                    title={shareToken ? 'Pautan aktif — klik untuk batalkan' : 'Share laporan'}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                )}

                {/* PIN button */}
                <button
                  onClick={() => session?.report_pin ? handleRemovePin() : setPinModal(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={session?.report_pin ? 'Buang PIN laporan' : 'Tetapkan PIN laporan'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={session?.report_pin ? "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 9a2 2 0 114 0v1H10V9z"} />
                  </svg>
                </button>

                {/* Edit button */}
                <button
                  onClick={() => setEditModal(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit butiran sesi"
                  aria-label="Edit butiran sesi"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* Status selector */}
                <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1 bg-white">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusOpt.dot}`} />
                  <select
                    value={currentStatus}
                    onChange={e => handleStatusChange(e.target.value)}
                    disabled={statusUpdating}
                    className="text-xs text-gray-700 border-0 bg-transparent focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-60 pr-1"
                    aria-label="Status kes"
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>← Kembali</Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : session ? (
          pinLocked ? (
            <div className="flex items-center justify-center h-full">
              <div className="bg-white rounded-2xl border shadow-sm p-8 w-full max-w-sm text-center">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 9a2 2 0 114 0v1H10V9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Laporan Dilindungi PIN</h3>
                <p className="text-sm text-gray-500 mb-6">Masukkan PIN untuk membuka laporan sesi <strong>{session.title}</strong>.</p>
                <form onSubmit={handlePinUnlock} className="space-y-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pinInput}
                    onChange={e => { setPinInput(e.target.value); setPinError(''); }}
                    placeholder="Masukkan PIN"
                    className="w-full text-center text-xl tracking-widest px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {pinError && <p className="text-sm text-red-600">{pinError}</p>}
                  <Button type="submit" className="w-full" loading={pinChecking}>Buka Laporan</Button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              {session.recording_status === 'completed' && !session.report && session.transcript?.length > 0 && (
                <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-purple-900">Laporan AI Belum Dijana</p>
                      <p className="text-xs text-purple-700 mt-0.5">Sesi ini selesai dirakam tetapi analisis AI belum berjaya. Klik untuk jana laporan sekarang.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleReGenerateReport}
                    disabled={reGenerating}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-60"
                  >
                    {reGenerating ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {reGenerating ? 'Menjana...' : 'Jana Laporan'}
                  </button>
                </div>
              )}
              {session.recording_status !== 'completed' && (
                <div className={`mb-5 rounded-xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  session.recording_status === 'in_progress'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      session.recording_status === 'in_progress' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      <svg className={`w-5 h-5 ${session.recording_status === 'in_progress' ? 'text-amber-600' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${session.recording_status === 'in_progress' ? 'text-amber-900' : 'text-blue-900'}`}>
                        {session.recording_status === 'in_progress' ? 'Rakaman Belum Selesai' : 'Sesi Belum Dirakam'}
                      </p>
                      <p className={`text-xs mt-0.5 ${session.recording_status === 'in_progress' ? 'text-amber-700' : 'text-blue-700'}`}>
                        {session.recording_status === 'in_progress'
                          ? 'Sesi ini tergendala. Transkrip sebelum ini telah disimpan — sambung semula untuk teruskan rakaman.'
                          : 'Sesi ini belum dimulakan. Klik untuk mula merakam.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleResume}
                    disabled={resuming}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                      session.recording_status === 'in_progress'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    {resuming ? 'Memuatkan...' : session.recording_status === 'in_progress' ? 'Sambung Rakaman' : 'Mula Rakaman'}
                  </button>
                </div>
              )}
              <ReportView session={session} />

              {/* Hash verification */}
              {session.hash && (
                <div className="mt-6 bg-gray-50 border rounded-xl p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Integriti Dokumen</p>
                      <p className="text-sm text-gray-600 font-mono">SHA-256: <span className="font-semibold text-gray-800">{session.hash.slice(0, 8)}…</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      {verifyResult === 'authentic' && (
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Dokumen Asal — Tidak Diubah
                        </span>
                      )}
                      {verifyResult === 'tampered' && (
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                          Dokumen Telah Diubah
                        </span>
                      )}
                      <button
                        onClick={handleVerify}
                        disabled={verifying}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                      >
                        {verifying ? (
                          <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        )}
                        {verifying ? 'Menyemak...' : 'Verify Authenticity Dokumen'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <p className="text-center text-gray-500 py-20">Laporan tidak dijumpai</p>
        )}
      </div>

      {/* Set PIN modal */}
      <Modal open={pinModal} onClose={() => setPinModal(false)} title="Tetapkan PIN Laporan">
        <form onSubmit={handleSetPin} className="space-y-4">
          <p className="text-sm text-gray-600">PIN ini akan dikehendaki setiap kali laporan ini dibuka. Gunakan 4–8 digit angka.</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Masukkan PIN (4–8 digit)"
            className="w-full text-center text-xl tracking-widest px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setPinModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={pinSaving} disabled={newPin.length < 4}>
              Save PIN
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Butiran Sesi"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={handleEditSave} loading={editSaving}>Save Perubahan</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tajuk Sesi *</label>
            <Input
              value={editForm.title || ''}
              onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Tajuk sesi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Subjek *</label>
            <Input
              value={editForm.subject_name || ''}
              onChange={e => setEditForm(p => ({ ...p, subject_name: e.target.value }))}
              placeholder="Nama subjek"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peranan / Jawatan Subjek</label>
            <Input
              value={editForm.subject_role || ''}
              onChange={e => setEditForm(p => ({ ...p, subject_role: e.target.value }))}
              placeholder="cth. Saksi, Pesakit, Pekerja"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota Konteks</label>
            <Textarea
              value={editForm.context_notes || ''}
              onChange={e => setEditForm(p => ({ ...p, context_notes: e.target.value }))}
              rows={3}
              placeholder="Latar belakang kes..."
            />
          </div>
          <p className="text-xs text-gray-400">Nota: Transkrip, laporan AI, dan hash chain of custody tidak boleh diubah selepas dijana.</p>
        </div>
      </Modal>
    </div>
  );
}
