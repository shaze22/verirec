import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import toast from 'react-hot-toast';

const PROBLEM_TYPES = [
  'Emosional', 'Perhubungan Sosial', 'Pembangunan Kerjaya', 'Keluarga/Rumah',
  'Akademik', 'Kewangan', 'Agama', 'Seksual', 'Undang-undang',
  'Kesihatan', 'Tabiat/Sikap', 'Krisis',
];

const RISK_CONFIG = {
  none:          { label: 'Tiada',                    color: 'gray',   bg: 'bg-gray-50',   text: 'text-gray-600' },
  mental_health: { label: 'Masalah Kesihatan Mental', color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-800' },
  self_harm:     { label: 'Kecenderungan Mencederakan Diri', color: 'orange', bg: 'bg-orange-50', text: 'text-orange-800' },
  suicidal:      { label: 'Kecenderungan Bunuh Diri', color: 'red',    bg: 'bg-red-50',    text: 'text-red-800' },
};

export default function KaunslorClientFilePage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [actionPlans, setActionPlans] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [audioMap, setAudioMap] = useState({}); // sessionId → { url, duration }
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [planForm, setPlanForm] = useState({ goals: '', interventions: '', follow_up_date: '', notes: '' });
  const [referralForm, setReferralForm] = useState({ referred_to: '', referral_type: 'other', reason: '' });
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingReferral, setSavingReferral] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [calSelected, setCalSelected] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('subjects').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('sessions').select('id, title, created_at, duration, report, profession, session_number, risk_level, risk_severity')
        .eq('subject_id', id).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*')
        .eq('subject_id', id).order('created_at', { ascending: false }),
      supabase.from('action_plans').select('*').eq('subject_id', id).order('created_at', { ascending: false }),
      supabase.from('clinical_referrals').select('*').eq('subject_id', id).order('created_at', { ascending: false }),
      supabase.from('audio_library').select('id, session_id, storage_path, file_name, duration').eq('subject_id', id),
    ]).then(([{ data: c }, { data: s }, { data: a }, { data: plans }, { data: refs }, { data: audios }]) => {
      if (!c) { navigate('/kaunselor/clients'); return; }
      setClient(c);
      setEditForm(c);
      setSessions(s || []);
      setAppointments(a || []);
      setActionPlans(plans || []);
      setReferrals(refs || []);
      // Map audio by session_id and generate signed URLs
      if (audios?.length) {
        const map = {};
        Promise.all(audios.map(async (audio) => {
          const { data } = await supabase.storage.from('recordings').createSignedUrl(audio.storage_path, 3600);
          if (data?.signedUrl) {
            map[audio.session_id] = { url: data.signedUrl, duration: audio.duration };
          }
        })).then(() => setAudioMap({ ...map })).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [id, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('subjects')
        .update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setClient(editForm);
      setEditing(false);
      toast.success('Maklumat klien dikemaskini.');
    } catch { toast.error('Gagal menyimpan.'); }
    finally { setSaving(false); }
  };

  const startNewSession = () => {
    sessionStorage.setItem('session_setup', JSON.stringify({
      profession: 'counselor',
      subject_name: client.name,
      subject_id: client.id,
      interviewer: user?.user_metadata?.full_name || '',
      title: `Sesi ${sessions.length + 1} — ${client.name}`,
      session_number: sessions.length + 1,
    }));
    navigate('/session/consent');
  };

  const updateRiskLevel = async (risk_level) => {
    setClient(c => ({ ...c, risk_level }));
    await supabase.from('subjects').update({ risk_level }).eq('id', id);
  };

  const toggleProblemType = async (type) => {
    const current = client.problem_types || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setClient(c => ({ ...c, problem_types: updated }));
    setEditForm(f => ({ ...f, problem_types: updated }));
    await supabase.from('subjects').update({ problem_types: updated }).eq('id', id);
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.from('action_plans').insert({
        subject_id: id, user_id: user.id,
        goals: planForm.goals ? [{ goal: planForm.goals, status: 'active' }] : [],
        interventions: planForm.interventions ? [planForm.interventions] : [],
        follow_up_date: planForm.follow_up_date || null,
        notes: planForm.notes || null,
      }).select().single();
      if (error) throw error;
      setActionPlans(prev => [data, ...prev]);
      setPlanForm({ goals: '', interventions: '', follow_up_date: '', notes: '' });
      setShowAddPlan(false);
      toast.success('Plan tindakan ditambah.');
    } catch { toast.error('Gagal menyimpan.'); }
    finally { setSavingPlan(false); }
  };

  const handleAddReferral = async (e) => {
    e.preventDefault();
    setSavingReferral(true);
    try {
      const { data, error } = await supabase.from('clinical_referrals').insert({
        subject_id: id, user_id: user.id,
        referred_to: referralForm.referred_to,
        referral_type: referralForm.referral_type,
        reason: referralForm.reason || null,
      }).select().single();
      if (error) throw error;
      setReferrals(prev => [data, ...prev]);
      setReferralForm({ referred_to: '', referral_type: 'other', reason: '' });
      setShowAddReferral(false);
      toast.success('Rujukan ditambah.');
    } catch { toast.error('Gagal menyimpan.'); }
    finally { setSavingReferral(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!client) return null;

  const lastSession = sessions[0];
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={client.name} onBack={() => navigate('/kaunselor/clients')} />
      <div className="flex-1 overflow-auto">
        {/* Client header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                {client.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{client.name}</h2>
                <p className="text-sm text-gray-500">{client.phone} · {client.email}</p>
                <p className="text-xs text-gray-400">{sessions.length} sesi · {Math.round(totalDuration / 60)} minit jumlah</p>
              </div>
            </div>
            <Button onClick={startNewSession} className="flex-shrink-0">+ Sesi Baru</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b px-6">
          <div className="max-w-2xl mx-auto flex gap-1">
            {[
              { id: 'overview',     label: 'Maklumat' },
              { id: 'sessions',     label: `Sesi (${sessions.length})` },
              { id: 'calendar',     label: 'Kalendar' },
              { id: 'consent',      label: 'Kebenaran' },
              { id: 'plans',        label: `Plan (${actionPlans.length})` },
              { id: 'referrals',    label: `Rujukan (${referrals.length})` },
              { id: 'appointments', label: `Temujanji (${appointments.length})` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 max-w-2xl mx-auto space-y-4">

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{sessions.length}</p>
                  <p className="text-xs text-blue-600">Sesi</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{Math.round(totalDuration / 60)}</p>
                  <p className="text-xs text-green-600">Minit</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${RISK_CONFIG[client.risk_level || 'none']?.bg || 'bg-gray-50'}`}>
                  <p className={`text-sm font-bold ${RISK_CONFIG[client.risk_level || 'none']?.text || 'text-gray-600'}`}>
                    {RISK_CONFIG[client.risk_level || 'none']?.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Tahap Risiko</p>
                </div>
              </div>

              {/* Risk level selector */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Tahap Risiko Klien</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => updateRiskLevel(key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all text-sm font-medium ${client.risk_level === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className={cfg.text}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
                {(client.risk_level === 'self_harm' || client.risk_level === 'suicidal') && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    <strong>Tindakan Segera Diperlukan.</strong> Sila hubungi Talian Kasih 15999 atau hospital berdekatan jika klien dalam bahaya.
                  </div>
                )}
              </div>

              {/* Personal details */}
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Maklumat Peribadi</h3>
                  {editing
                    ? <div className="flex gap-2"><Button size="sm" loading={saving} onClick={handleSave}>Simpan</Button><Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Batal</Button></div>
                    : <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
                  }
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Maklumat Peribadi</p>
                    {[
                      { k: 'name', label: 'Nama', type: 'text' },
                      { k: 'phone', label: 'Telefon', type: 'tel' },
                      { k: 'email', label: 'E-mel', type: 'email' },
                      { k: 'ic_number', label: 'No. IC', type: 'text' },
                      { k: 'student_id', label: 'No. Matrik / ID', type: 'text' },
                      { k: 'date_of_birth', label: 'Tarikh Lahir', type: 'date' },
                      { k: 'gender', label: 'Jantina', type: 'text' },
                      { k: 'race', label: 'Bangsa', type: 'text' },
                      { k: 'religion', label: 'Agama', type: 'text' },
                      { k: 'occupation', label: 'Pekerjaan', type: 'text' },
                      { k: 'address', label: 'Alamat', type: 'text' },
                      { k: 'emergency_contact_name', label: 'Kontak Kecemasan', type: 'text' },
                      { k: 'emergency_contact_phone', label: 'Tel. Kecemasan', type: 'tel' },
                    ].map(f => (
                      <div key={f.k} className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-sm text-gray-500">{f.label}</label>
                        <input type={f.type} value={editForm[f.k] || ''} onChange={e => setEditForm(p => ({ ...p, [f.k]: e.target.value }))}
                          className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ))}
                    {/* Selects */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <label className="text-sm text-gray-500">Status</label>
                      <select value={editForm.marital_status || 'single'} onChange={e => setEditForm(p => ({ ...p, marital_status: e.target.value }))}
                        className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="single">Bujang</option>
                        <option value="married">Berkahwin</option>
                        <option value="divorced">Bercerai</option>
                        <option value="widowed">Balu/Duda</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <label className="text-sm text-gray-500">Jenis Sesi</label>
                      <select value={editForm.session_type || 'voluntary'} onChange={e => setEditForm(p => ({ ...p, session_type: e.target.value }))}
                        className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="voluntary">Sukarela</option>
                        <option value="referred">Rujukan</option>
                      </select>
                    </div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Sejarah Klinikal</p>
                    {[
                      { k: 'previous_counseling', label: 'Pernah terima kaunseling sebelum?' },
                      { k: 'psychiatric_history', label: 'Ada sejarah psikiatri?' },
                      { k: 'psychiatric_medication', label: 'Sedang ambil ubat psikiatri?' },
                      { k: 'hostel_resident', label: 'Penghuni asrama?' },
                    ].map(f => (
                      <div key={f.k} className="flex items-center justify-between">
                        <label className="text-sm text-gray-500">{f.label}</label>
                        <button type="button" onClick={() => setEditForm(p => ({ ...p, [f.k]: !p[f.k] }))}
                          className={`w-10 h-5 rounded-full transition-colors ${editForm[f.k] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                          <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${editForm[f.k] ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Nota Sesi</p>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-sm text-gray-500">Isu Utama</label>
                      <textarea value={editForm.presenting_issue || ''} onChange={e => setEditForm(p => ({ ...p, presenting_issue: e.target.value }))} rows={2}
                        className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-sm text-gray-500">Nota</label>
                      <textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                        className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {[
                      ['Nama', client.name],
                      ['Telefon', client.phone],
                      ['E-mel', client.email],
                      ['No. IC', client.ic_number],
                      ['No. Matrik / ID', client.student_id],
                      ['Tarikh Lahir', client.date_of_birth],
                      ['Jantina', client.gender],
                      ['Bangsa', client.race],
                      ['Agama', client.religion],
                      ['Status', client.marital_status === 'married' ? 'Berkahwin' : client.marital_status === 'divorced' ? 'Bercerai' : client.marital_status === 'widowed' ? 'Balu/Duda' : client.marital_status ? 'Bujang' : null],
                      ['Pekerjaan', client.occupation],
                      ['Alamat', client.address],
                      ['Kontak Kecemasan', client.emergency_contact_name ? `${client.emergency_contact_name} (${client.emergency_contact_phone || '-'})` : null],
                      ['Jenis Sesi', client.session_type === 'referred' ? 'Rujukan' : client.session_type ? 'Sukarela' : null],
                      ['Kaunseling sebelum', client.previous_counseling ? 'Ya' : client.previous_counseling === false ? 'Tidak' : null],
                      ['Sejarah Psikiatri', client.psychiatric_history ? 'Ya' : client.psychiatric_history === false ? 'Tidak' : null],
                      ['Ubat Psikiatri', client.psychiatric_medication ? 'Ya' : client.psychiatric_medication === false ? 'Tidak' : null],
                      ['Isu Utama', client.presenting_issue],
                      ['Nota', client.notes],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex gap-4">
                        <span className="text-gray-400 w-32 flex-shrink-0">{k}</span>
                        <span className="text-gray-900">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Problem Types */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Jenis Masalah (Case Session Note)</h3>
                <div className="flex flex-wrap gap-2">
                  {PROBLEM_TYPES.map(type => (
                    <button key={type} onClick={() => toggleProblemType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        (client.problem_types || []).includes(type)
                          ? 'bg-blue-100 text-blue-700 border-blue-300'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Last session summary */}
              {lastSession?.report && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Sesi Terakhir</h3>
                  <p className="text-xs text-gray-400 mb-2">{format(parseISO(lastSession.created_at), 'dd MMM yyyy')}</p>
                  {lastSession.report.summary && <p className="text-sm text-gray-700 mb-3">{lastSession.report.summary}</p>}
                  {lastSession.risk_level && lastSession.risk_level !== 'none' && (
                    <div className={`flex items-center gap-2 p-2 rounded-lg ${RISK_CONFIG[lastSession.risk_level]?.bg}`}>
                      <span className={`text-xs font-medium ${RISK_CONFIG[lastSession.risk_level]?.text}`}>
                        Risiko sesi: {RISK_CONFIG[lastSession.risk_level]?.label}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SESSIONS TAB ── */}
          {tab === 'sessions' && (
            <div className="space-y-3">
              <Button onClick={startNewSession} className="w-full">+ Mulakan Sesi Baru</Button>
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">🎙️</div>
                  <p>Belum ada sesi untuk klien ini.</p>
                </div>
              ) : sessions.map((s, i) => (
                <div key={s.id} className="bg-white rounded-xl border hover:border-blue-200 transition-all">
                  <button onClick={() => navigate(`/session/${s.id}`)} className="w-full p-4 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Sesi {sessions.length - i}</span>
                          {s.risk_level && s.risk_level !== 'none' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_CONFIG[s.risk_level]?.bg} ${RISK_CONFIG[s.risk_level]?.text}`}>
                              {RISK_CONFIG[s.risk_level]?.label}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">{s.title}</p>
                        <p className="text-xs text-gray-400">{format(parseISO(s.created_at), 'dd MMM yyyy')} · {Math.round((s.duration || 0) / 60)} minit</p>
                        {s.report?.caseSessionNote?.presentedIssue && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">"{s.report.caseSessionNote.presentedIssue}"</p>
                        )}
                        {!s.report?.caseSessionNote && s.report?.summary && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.report.summary}</p>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm flex-shrink-0">→</span>
                    </div>
                  </button>
                  {audioMap[s.id] && (
                    <div className="px-4 pb-3 pt-2 border-t border-gray-50">
                      <p className="text-xs text-gray-400 mb-1">🎙 Rakaman Audio</p>
                      <audio controls className="w-full" style={{ height: '32px' }}>
                        <source src={audioMap[s.id].url} type="audio/webm" />
                        <source src={audioMap[s.id].url} type="audio/mp4" />
                      </audio>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── CALENDAR TAB ── */}
          {tab === 'calendar' && (() => {
            const days = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
            const startPad = getDay(startOfMonth(calMonth)); // 0=Sun
            const DAY_LABELS = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];

            // Build event map: date string → [{type, label, id}]
            const eventMap = {};
            sessions.forEach(s => {
              const d = s.created_at?.slice(0, 10);
              if (d) {
                if (!eventMap[d]) eventMap[d] = [];
                eventMap[d].push({ type: 'session', label: s.title || 'Sesi', id: s.id, report: s.report });
              }
            });
            appointments.forEach(a => {
              const d = a.confirmed_date || a.requested_date;
              if (d) {
                if (!eventMap[d]) eventMap[d] = [];
                eventMap[d].push({ type: 'appointment', label: a.client_name, status: a.status, id: a.id });
              }
            });

            const selectedKey = calSelected ? format(calSelected, 'yyyy-MM-dd') : null;
            const selectedEvents = selectedKey ? (eventMap[selectedKey] || []) : [];

            return (
              <div className="space-y-4">
                {/* Month navigation */}
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setCalMonth(m => subMonths(m, 1))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="font-semibold text-gray-900">{format(calMonth, 'MMMM yyyy')}</h3>
                    <button onClick={() => setCalMonth(m => addMonths(m, 1))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>

                  {/* Day labels */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAY_LABELS.map(d => (
                      <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {/* Leading empty cells */}
                    {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}

                    {days.map(day => {
                      const key = format(day, 'yyyy-MM-dd');
                      const events = eventMap[key] || [];
                      const hasSessions = events.some(e => e.type === 'session');
                      const hasAppts = events.some(e => e.type === 'appointment');
                      const isSelected = calSelected && isSameDay(day, calSelected);
                      const today = isToday(day);

                      return (
                        <button key={key} onClick={() => setCalSelected(isSameDay(day, calSelected || new Date(0)) ? null : day)}
                          className={`relative flex flex-col items-center py-2 rounded-lg transition-all ${
                            isSelected ? 'bg-blue-600 text-white' :
                            today ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                          }`}>
                          <span className="text-sm font-medium leading-none">{format(day, 'd')}</span>
                          {events.length > 0 && (
                            <div className="flex gap-0.5 mt-1">
                              {hasSessions && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                              {hasAppts && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-yellow-200' : 'bg-green-500'}`} />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 mt-3 pt-3 border-t justify-center text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Sesi</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Temujanji</span>
                  </div>
                </div>

                {/* Selected day events */}
                {calSelected && (
                  <div className="bg-white rounded-xl border p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {format(calSelected, 'dd MMMM yyyy')}
                    </h4>
                    {selectedEvents.length === 0 ? (
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-gray-400">Tiada aktiviti pada tarikh ini.</p>
                        <button onClick={startNewSession}
                          className="text-xs text-blue-600 font-medium hover:underline">+ Mulakan Sesi</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedEvents.map((ev, i) => (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${ev.type === 'session' ? 'bg-blue-50' : 'bg-green-50'}`}>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{ev.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {ev.type === 'session' ? '🎙 Sesi rakaman' : `📅 Temujanji — ${ev.status === 'confirmed' ? 'Disahkan' : ev.status === 'completed' ? 'Selesai' : 'Menunggu'}`}
                              </p>
                            </div>
                            {ev.type === 'session' && (
                              <button onClick={() => navigate(`/session/${ev.id}`)}
                                className="text-xs text-blue-600 font-medium hover:underline">Lihat →</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{sessions.length}</p>
                    <p className="text-xs text-blue-600">Jumlah Sesi</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length}</p>
                    <p className="text-xs text-green-600">Temujanji Sahkan</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── CONSENT TAB ── */}
          {tab === 'consent' && (
            <div className="space-y-4">
              {appointments.filter(a => a.consent_signed).length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📋</div>
                  <p>Tiada surat kebenaran ditandatangani lagi.</p>
                  <p className="text-sm mt-1">Kebenaran akan direkod apabila klien mengisi borang tempahan.</p>
                </div>
              ) : appointments.filter(a => a.consent_signed).map(a => (
                <div key={a.id} className="bg-white rounded-xl border p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Borang Persetujuan Makluman</h3>
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✓ Ditandatangani</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3 leading-relaxed">
                    <p className="font-bold text-gray-900 text-center">BORANG PERSETUJUAN MAKLUMAN (Informed Consent Form)</p>
                    <p><strong>Kaunseling</strong> adalah hubungan profesional antara anda dan kaunselor. Matlamat utama adalah untuk memudahkan perubahan tingkah laku, meningkatkan keupayaan membina hubungan, menggalakkan proses membuat keputusan, dan memudahkan potensi serta perkembangan peribadi.</p>
                    <p><strong>Kerahsiaan:</strong> Kaunselor bertanggungjawab menjaga maklumat yang diperoleh semasa sesi kaunseling. Semua maklumat dirahsiakan kecuali: bahaya kepada diri/orang lain, perlindungan kanak-kanak, perintah mahkamah.</p>
                    <p><strong>Hak Klien:</strong> Anda berhak bertanya tentang apa sahaja dalam sesi. Anda boleh meminta kaunselor merujuk kepada profesional lain. Anda bebas meninggalkan sesi pada bila-bila masa.</p>
                    <p className="text-xs text-gray-500">Sesi mungkin dirakam untuk tujuan dokumentasi dengan teknologi AI, dilindungi berdasarkan PDPA 2010.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Tandatangan Klien</p>
                      <p className="font-medium text-gray-900">{a.client_name}</p>
                      <p className="text-xs text-gray-400 mt-1">{a.consent_at ? format(new Date(a.consent_at), 'dd MMM yyyy, HH:mm') : 'Tarikh tidak direkod'}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Butiran Tempahan</p>
                      <p className="font-medium text-gray-900">{a.requested_date}</p>
                      <p className="text-xs text-gray-400 mt-1">Pukul {a.requested_time?.slice(0,5)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ACTION PLANS TAB ── */}
          {tab === 'plans' && (
            <div className="space-y-3">
              <Button onClick={() => setShowAddPlan(true)} className="w-full">+ Plan Tindakan Baru</Button>
              {actionPlans.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📋</div>
                  <p>Belum ada plan tindakan untuk klien ini.</p>
                </div>
              ) : actionPlans.map(p => (
                <div key={p.id} className="bg-white rounded-xl border p-4 space-y-2">
                  <p className="text-xs text-gray-400">{format(parseISO(p.created_at), 'dd MMM yyyy')}</p>
                  {p.goals?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Matlamat</p>
                      {p.goals.map((g, i) => (
                        <p key={i} className="text-sm text-gray-700">• {typeof g === 'string' ? g : g.goal}</p>
                      ))}
                    </div>
                  )}
                  {p.interventions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Intervensi</p>
                      {p.interventions.map((iv, i) => <p key={i} className="text-sm text-gray-700">• {iv}</p>)}
                    </div>
                  )}
                  {p.follow_up_date && <p className="text-xs text-blue-600">Susulan: {format(parseISO(p.follow_up_date), 'dd MMM yyyy')}</p>}
                  {p.notes && <p className="text-xs text-gray-500 italic">{p.notes}</p>}
                </div>
              ))}
              {showAddPlan && (
                <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                    <h3 className="font-semibold text-lg">Plan Tindakan Baru</h3>
                    <form onSubmit={handleAddPlan} className="space-y-3">
                      <div><label className="text-xs text-gray-500 mb-1 block">Matlamat *</label>
                        <textarea value={planForm.goals} onChange={e => setPlanForm(p => ({ ...p, goals: e.target.value }))} rows={2} required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Nyatakan matlamat klien..." /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Intervensi</label>
                        <textarea value={planForm.interventions} onChange={e => setPlanForm(p => ({ ...p, interventions: e.target.value }))} rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Pendekatan / teknik yang digunakan..." /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Tarikh Susulan</label>
                        <input type="date" value={planForm.follow_up_date} onChange={e => setPlanForm(p => ({ ...p, follow_up_date: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Nota</label>
                        <input type="text" value={planForm.notes} onChange={e => setPlanForm(p => ({ ...p, notes: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nota tambahan..." /></div>
                      <div className="flex gap-3 pt-2">
                        <Button type="submit" loading={savingPlan} className="flex-1">Simpan</Button>
                        <Button type="button" variant="secondary" onClick={() => setShowAddPlan(false)}>Batal</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── REFERRALS TAB ── */}
          {tab === 'referrals' && (
            <div className="space-y-3">
              <Button onClick={() => setShowAddReferral(true)} className="w-full">+ Rujukan Baru</Button>
              {referrals.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">🏥</div>
                  <p>Belum ada rujukan untuk klien ini.</p>
                </div>
              ) : referrals.map(r => (
                <div key={r.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{r.referred_to}</p>
                      <p className="text-xs text-gray-500 capitalize">{r.referral_type}</p>
                      {r.reason && <p className="text-sm text-gray-600 mt-1">{r.reason}</p>}
                      <p className="text-xs text-gray-400 mt-1">{format(parseISO(r.created_at), 'dd MMM yyyy')}</p>
                    </div>
                    <Badge color={r.status === 'completed' ? 'green' : r.status === 'sent' ? 'blue' : 'yellow'}>
                      {r.status === 'completed' ? 'Selesai' : r.status === 'sent' ? 'Dihantar' : 'Menunggu'}
                    </Badge>
                  </div>
                </div>
              ))}
              {showAddReferral && (
                <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                    <h3 className="font-semibold text-lg">Rujukan Baru</h3>
                    <form onSubmit={handleAddReferral} className="space-y-3">
                      <div><label className="text-xs text-gray-500 mb-1 block">Dirujuk Kepada *</label>
                        <input type="text" value={referralForm.referred_to} onChange={e => setReferralForm(p => ({ ...p, referred_to: e.target.value }))} required
                          placeholder="cth. Hospital Besar Kuala Lumpur, Psikiatri..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Jenis Rujukan</label>
                        <select value={referralForm.referral_type} onChange={e => setReferralForm(p => ({ ...p, referral_type: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {[['psychiatry','Psikiatri'],['hospital','Hospital'],['social_welfare','Kebajikan Masyarakat'],['ngo','NGO / Badan Amal'],['other','Lain-lain']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                        </select></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Sebab Rujukan</label>
                        <textarea value={referralForm.reason} onChange={e => setReferralForm(p => ({ ...p, reason: e.target.value }))} rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
                      <div className="flex gap-3 pt-2">
                        <Button type="submit" loading={savingReferral} className="flex-1">Simpan</Button>
                        <Button type="button" variant="secondary" onClick={() => setShowAddReferral(false)}>Batal</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── APPOINTMENTS TAB ── */}
          {tab === 'appointments' && (
            <div className="space-y-2">
              {appointments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📅</div>
                  <p>Tiada rekod temujanji.</p>
                </div>
              ) : appointments.map(a => (
                <div key={a.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{format(parseISO(a.requested_date), 'dd MMM yyyy')} · {a.requested_time?.slice(0, 5)}</p>
                      {a.presenting_issue && <p className="text-sm text-gray-500 italic mt-0.5">"{a.presenting_issue}"</p>}
                      {a.counselor_notes && <p className="text-xs text-gray-400 mt-1">Nota: {a.counselor_notes}</p>}
                    </div>
                    <Badge color={a.status === 'confirmed' ? 'green' : a.status === 'cancelled' ? 'gray' : 'yellow'}>
                      {a.status === 'confirmed' ? 'Disahkan' : a.status === 'cancelled' ? 'Dibatalkan' : a.status === 'completed' ? 'Selesai' : 'Menunggu'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
