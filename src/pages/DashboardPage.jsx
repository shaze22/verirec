import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { getSessions, deleteSessions } from '../api/sessions.js';
import { getTeamSessions } from '../api/teams.js';
import { PROFESSIONS, professionLabel } from '../data/professions.js';
import { supabase } from '../lib/supabase.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { OnboardingModal } from '../components/onboarding/OnboardingModal.jsx';
import toast from 'react-hot-toast';

async function exportBulkPDF(sessions) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const lineH = 7;

  sessions.forEach((s, idx) => {
    if (idx > 0) pdf.addPage();
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

    addLine('VeriRec — Laporan Sesi', 16, true, [37, 99, 235]);
    y += 3;
    addLine(`Tajuk: ${s.title}`, 12, true);
    addLine(`Profesion: ${professionLabel(s.profession)}`);
    addLine(`Subjek: ${s.subject_name}`);
    addLine(`Tarikh: ${format(new Date(s.created_at), 'dd MMM yyyy, HH:mm')}`);
    addLine(`Tempoh: ${Math.round((s.duration || 0) / 60)} minit`);
    if (s.report?.riskLevel) addLine(`Tahap Risiko: ${s.report.riskLevel}`);
    y += 4;

    if (s.report?.summary) {
      addLine('Ringkasan:', 11, true);
      addLine(s.report.summary, 10);
      y += 3;
    }
    if (s.report?.keyFindings?.length) {
      addLine('Penemuan Utama:', 11, true);
      s.report.keyFindings.forEach(f => addLine(`• ${f}`, 10));
      y += 3;
    }
    if (s.report?.recommendations?.length) {
      addLine('Cadangan:', 11, true);
      s.report.recommendations.forEach(r => addLine(`→ ${r}`, 10));
    }

    addLine(`─── ${idx + 1} / ${sessions.length} ───`, 9, false, [150, 150, 150]);
  });

  pdf.save(`verirec-eksport-pukal-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

function getOverdueFollowUps(sessions) {
  let count = 0;
  for (const s of sessions) {
    if (!s.report?.followUpItems?.length) continue;
    const checked = (() => { try { return JSON.parse(localStorage.getItem(`followup_${s.id}`) || '{}'); } catch { return {}; } })();
    const unchecked = s.report.followUpItems.filter((_, i) => !checked[i]).length;
    count += unchecked;
  }
  return count;
}

const statusConfig = {
  active:  { label: 'Aktif',        color: 'green' },
  pending: { label: 'Ditangguhkan', color: 'yellow' },
  closed:  { label: 'Ditutup',      color: 'gray' },
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-4 animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3 bg-gray-100 rounded w-20" />
        <div className="h-3 bg-gray-100 rounded w-14" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { canStartSession, subscription } = useBillingStore();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProfession, setFilterProfession] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [teamSessions, setTeamSessions] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showQuickRecord, setShowQuickRecord] = useState(false);
  const [quickProfession, setQuickProfession] = useState(
    () => localStorage.getItem('preferred_profession') || 'counselor'
  );
  const [quickRecording, setQuickRecording] = useState(false);
  const navigate = useNavigate();
  const preferredProfession = localStorage.getItem('preferred_profession');

  useEffect(() => {
    if (!user) return;
    getSessions(user.id)
      .then(data => {
        setSessions(data);
        if (data.length === 0 && !localStorage.getItem(`onboarding_done_${user.id}`)) {
          setShowOnboarding(true);
        }
      })
      .catch(() => toast.error('Gagal memuatkan sesi'))
      .finally(() => setLoading(false));

    getTeamSessions()
      .then(data => setTeamSessions(data))
      .catch(() => {}); // non-critical

    supabase
      .from('scheduled_sessions')
      .select('id, title, profession, subject_name, scheduled_at')
      .eq('user_id', user.id)
      .eq('status', 'upcoming')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(3)
      .then(({ data }) => setUpcomingSessions(data || []))
      .catch(() => {}); // non-critical
  }, [user]);

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.subject_name?.toLowerCase().includes(q) ||
        s.case_number?.toLowerCase().includes(q) ||
        professionLabel(s.profession)?.toLowerCase().includes(q) ||
        s.report?.summary?.toLowerCase().includes(q) ||
        s.report?.keyFindings?.some(f => f.toLowerCase().includes(q)) ||
        s.report?.recommendations?.some(r => r.toLowerCase().includes(q))
      );
    }
    if (filterProfession) result = result.filter(s => s.profession === filterProfession);
    if (filterStatus) result = result.filter(s => (s.status || 'active') === filterStatus);
    return result;
  }, [sessions, search, filterProfession, filterStatus]);

  const handleNewSession = () => {
    if (!canStartSession()) { navigate('/pricing'); return; }
    if (preferredProfession) {
      navigate(`/session/setup/${preferredProfession}`);
    } else {
      navigate('/session/new');
    }
  };

  const handleChooseProfession = () => {
    if (!canStartSession()) { navigate('/pricing'); return; }
    navigate('/session/new');
  };

  const handleQuickRecord = async () => {
    if (!canStartSession()) { navigate('/pricing'); return; }
    setQuickRecording(true);
    try {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const autoTitle = `Rakaman ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const interviewer = user.email.split('@')[0];
      const setup = {
        profession: quickProfession,
        title: autoTitle,
        subject_name: 'Tidak dinyatakan',
        subject_role: '',
        case_number: '',
        context_notes: '',
        interviewer,
      };
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          title: autoTitle,
          profession: quickProfession,
          interviewer,
          subject_name: 'Tidak dinyatakan',
          consent_signed: false,
        })
        .select()
        .single();
      if (error) throw error;
      sessionStorage.setItem('session_setup', JSON.stringify(setup));
      sessionStorage.setItem('active_session_id', session.id);
      localStorage.setItem('preferred_profession', quickProfession);
      navigate('/session/active');
    } catch {
      toast.error('Gagal memulakan sesi.');
      setQuickRecording(false);
    }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredSessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const confirmed = window.confirm(`Padam ${selected.size} sesi yang dipilih? Tindakan ini tidak boleh dibatalkan.`);
    if (!confirmed) return;
    setBulkDeleting(true);
    try {
      await deleteSessions([...selected]);
      setSessions(prev => prev.filter(s => !selected.has(s.id)));
      setSelected(new Set());
      setSelectMode(false);
      toast.success(`${selected.size} sesi dipadam`);
    } catch {
      toast.error('Gagal memadam sesi');
    } finally {
      setBulkDeleting(false);
    }
  };

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const handleBulkExport = async () => {
    const targets = filteredSessions.filter(s => selected.has(s.id) && s.report);
    if (!targets.length) { toast.error('Tiada sesi berpilih yang mempunyai laporan.'); return; }
    setBulkExporting(true);
    try {
      await exportBulkPDF(targets);
      toast.success(`${targets.length} laporan dieksport sebagai PDF.`);
    } catch {
      toast.error('Gagal mengeksport PDF.');
    } finally {
      setBulkExporting(false);
    }
  };

  const overdueCount = useMemo(() => getOverdueFollowUps(sessions), [sessions]);

  const usageWarning = subscription && subscription.sessions_limit !== -1 &&
    subscription.sessions_used >= subscription.sessions_limit - 1 &&
    subscription.sessions_used < subscription.sessions_limit;

  return (
    <div className="flex flex-col h-screen">
      {showOnboarding && (
        <OnboardingModal userId={user?.id} onDismiss={() => setShowOnboarding(false)} />
      )}

      {showQuickRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Rekod Cepat</h2>
                <p className="text-xs text-gray-500">Terus rakam tanpa isi borang</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Profesion</label>
              <select
                value={quickProfession}
                onChange={e => setQuickProfession(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROFESSIONS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                Tajuk dan butiran boleh dikemaskini selepas sesi.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowQuickRecord(false)}
                disabled={quickRecording}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={handleQuickRecord}
                loading={quickRecording}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Mula Rakaman
              </Button>
            </div>
          </div>
        </div>
      )}
      <TopBar
        title="Papan Pemuka"
        actions={
          selectMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{selected.size} dipilih</span>
              <Button size="sm" variant="secondary" onClick={handleBulkExport} loading={bulkExporting} disabled={selected.size === 0}>
                Eksport PDF
              </Button>
              <Button size="sm" variant="danger" onClick={handleBulkDelete} loading={bulkDeleting} disabled={selected.size === 0}>
                Padam
              </Button>
              <Button size="sm" variant="secondary" onClick={exitSelectMode}>Batal</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setShowQuickRecord(true)} title="Rekod Cepat">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="hidden sm:inline">Rekod Cepat</span>
              </Button>
              <Button onClick={handleNewSession}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Sesi Baru</span>
              </Button>
            </div>
          )
        }
      />

      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        {usageWarning && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              Anda hampir mencapai had sesi bulan ini ({subscription.sessions_used}/{subscription.sessions_limit}).
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate('/pricing')}>Naik Taraf</Button>
          </div>
        )}

        {!loading && overdueCount > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-sm text-blue-800 flex-1">
              <span className="font-semibold">{overdueCount} item susulan</span> belum diselesaikan merentas sesi anda.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tiada Sesi Lagi</h3>
            <p className="text-gray-500 mb-2 max-w-sm mx-auto text-sm">Mulakan sesi pertama anda untuk merakam dan menganalisis sesi profesional secara automatik.</p>
            <p className="text-gray-400 text-xs mb-6 max-w-xs mx-auto">Isi butiran sesi, dapatkan persetujuan subjek, kemudian rakam dan jana laporan AI secara automatik.</p>
            <Button onClick={handleNewSession}>
              {preferredProfession
                ? `Mulakan Sesi ${professionLabel(preferredProfession)} Pertama`
                : 'Mulakan Sesi Pertama'}
            </Button>
            {preferredProfession && (
              <button onClick={handleChooseProfession} className="block mt-3 text-xs text-gray-400 hover:text-gray-600 mx-auto">
                Pilih profesion lain →
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Sesi Terkini ({sessions.length})
                </h3>
                {sessions.length > 1 && !selectMode && (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="text-xs text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md px-2.5 py-1 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Pilih &amp; Padam
                  </button>
                )}
                {selectMode && (
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {selected.size === filteredSessions.length ? 'Nyahpilih Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari tajuk, subjek, no. kes..."
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <select
                  value={filterProfession}
                  onChange={e => setFilterProfession(e.target.value)}
                  className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Profesion</option>
                  {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="pending">Ditangguhkan</option>
                  <option value="closed">Ditutup</option>
                </select>
                {(search || filterProfession || filterStatus) && (
                  <button
                    onClick={() => { setSearch(''); setFilterProfession(''); setFilterStatus(''); }}
                    className="text-xs text-gray-400 hover:text-gray-700 underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">Tiada sesi sepadan dengan carian "{search}"</p>
            ) : (
              <div className="grid gap-3">
                {filteredSessions.map(s => {
                  const sc = statusConfig[s.status] || statusConfig.active;
                  const isSelected = selected.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => selectMode ? toggleSelect(s.id, { stopPropagation: () => {} }) : navigate(`/session/${s.id}`)}
                      className={`bg-white rounded-xl border p-4 transition-all cursor-pointer flex items-center gap-4 group ${
                        isSelected ? 'border-blue-400 bg-blue-50 shadow-sm' : 'hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      {selectMode && (
                        <div
                          onClick={e => toggleSelect(s.id, e)}
                          className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-blue-100' : 'bg-blue-50 group-hover:bg-blue-100'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-gray-900 truncate">{s.title}</h4>
                          <Badge color="blue" className="flex-shrink-0 text-xs">
                            {professionLabel(s.profession)}
                          </Badge>
                          {s.status && s.status !== 'active' && (
                            <Badge color={sc.color} className="flex-shrink-0 text-xs">{sc.label}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">
                          {s.subject_name}
                          {s.case_number && <span className="ml-2 text-gray-400">· {s.case_number}</span>}
                        </p>
                        {s.report?.summary && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{s.report.summary}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-xs text-gray-400">{format(new Date(s.created_at), 'dd MMM yyyy')}</p>
                        <p className="text-xs text-gray-400">{Math.round((s.duration || 0) / 60)} minit</p>
                        {s.recording_status === 'draft' ? (
                          <Badge color="yellow" className="text-xs">Draf</Badge>
                        ) : s.recording_status === 'in_progress' ? (
                          <Badge color="orange" className="text-xs">Dalam Proses</Badge>
                        ) : s.report ? (
                          <Badge color="green" className="text-xs">Laporan Siap</Badge>
                        ) : (
                          <Badge color="gray" className="text-xs">Belum dijana</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upcoming scheduled sessions */}
        {upcomingSessions.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Sesi Berjadual
              </h3>
              <button onClick={() => navigate('/jadual')} className="text-xs text-blue-600 hover:text-blue-700">
                Lihat semua →
              </button>
            </div>
            <div className="grid gap-2">
              {upcomingSessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => navigate('/jadual')}
                  className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-amber-900">{s.title}</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {professionLabel(s.profession)}{s.subject_name ? ` · ${s.subject_name}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-amber-700 font-medium flex-shrink-0 ml-3">
                    {format(new Date(s.scheduled_at), 'dd MMM, HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team sessions — only shown to active team members */}
        {teamSessions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Sesi Pasukan ({teamSessions.length})
            </h3>
            <div className="grid gap-3">
              {teamSessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/session/${s.id}`)}
                  className="bg-white rounded-xl border p-4 cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 bg-purple-50 group-hover:bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-gray-900 truncate">{s.title}</h4>
                      <Badge color="purple" className="flex-shrink-0 text-xs">{professionLabel(s.profession)}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                      {s.subject_name}
                      {s.case_number && <span className="ml-2 text-gray-400">· {s.case_number}</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-xs text-gray-400">{format(new Date(s.created_at), 'dd MMM yyyy')}</p>
                    <p className="text-xs text-gray-400">{Math.round((s.duration || 0) / 60)} minit</p>
                    {s.report ? (
                      <Badge color="green" className="text-xs">Laporan Siap</Badge>
                    ) : (
                      <Badge color="gray" className="text-xs">Belum dijana</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
