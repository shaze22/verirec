import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { getProfFromPath } from '../../lib/profConfig.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import toast from 'react-hot-toast';

const RISK_CONFIG = {
  none:          { label: 'Tiada Risiko',                    color: 'gray',   bg: 'bg-gray-50',   text: 'text-gray-600' },
  mental_health: { label: 'Masalah Kesihatan Mental',        color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-800' },
  self_harm:     { label: 'Kecenderungan Mencederakan Diri', color: 'orange', bg: 'bg-orange-50', text: 'text-orange-800' },
  suicidal:      { label: 'Kecenderungan Bunuh Diri',        color: 'red',    bg: 'bg-red-50',    text: 'text-red-800' },
};

export default function ProfClientFilePage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const prof = getProfFromPath(pathname);

  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [audioMap, setAudioMap] = useState({});
  const [progressNotes, setProgressNotes] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamReferrals, setTeamReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [showTeamReferral, setShowTeamReferral] = useState(false);
  const [planForm, setPlanForm] = useState({ goals: '', interventions: '', follow_up_date: '', notes: '' });
  const [referralForm, setReferralForm] = useState({ referred_to: '', referral_type: 'other', reason: '' });
  const [teamReferralForm, setTeamReferralForm] = useState({ to_email: '', reason: '', notes: '' });
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingReferral, setSavingReferral] = useState(false);
  const [savingTeamReferral, setSavingTeamReferral] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingNote, setSavingNote] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [calMonth, setCalMonth] = useState(new Date());
  const [calSelected, setCalSelected] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('subjects').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('sessions').select('id, title, created_at, duration, report, profession, session_number, risk_level').eq('subject_id', id).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').eq('subject_id', id).order('created_at', { ascending: false }),
      supabase.from('action_plans').select('*').eq('subject_id', id).order('created_at', { ascending: false }),
      supabase.from('clinical_referrals').select('*').eq('subject_id', id).order('created_at', { ascending: false }),
      supabase.from('audio_library').select('id, session_id, storage_path, duration').eq('subject_id', id),
      supabase.from('progress_notes').select('*').eq('subject_id', id).order('note_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('team_referrals').select('*').eq('subject_id', id).eq('from_user_id', user.id).order('created_at', { ascending: false }),
    ]).then(([{ data: c }, { data: s }, { data: a }, { data: plans }, { data: refs }, { data: audios }, { data: notes }, { data: trefs }]) => {
      if (!c) { navigate(`${prof.routePrefix}/clients`); return; }
      setClient(c); setEditForm(c);
      setSessions(s || []); setAppointments(a || []);
      setActionPlans(plans || []); setReferrals(refs || []);
      setProgressNotes(notes || []); setTeamReferrals(trefs || []);
      if (audios?.length) {
        const map = {};
        Promise.all(audios.map(async audio => {
          const { data } = await supabase.storage.from('recordings').createSignedUrl(audio.storage_path, 3600);
          if (data?.signedUrl) map[audio.session_id] = { url: data.signedUrl, duration: audio.duration };
        })).then(() => setAudioMap({ ...map })).catch(() => {});
      }
    }).finally(() => setLoading(false));

    supabase.from('team_members').select('email, role').eq('status', 'active').then(({ data }) => setTeamMembers(data || []));
  }, [id, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('subjects').update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setClient(editForm); setEditing(false);
      toast.success('Maklumat dikemaskini.');
    } catch { toast.error('Gagal menyimpan.'); }
    finally { setSaving(false); }
  };

  const startNewSession = () => {
    sessionStorage.setItem('session_setup', JSON.stringify({
      profession: prof.profession, subject_id: id, subject_name: client?.name,
      context_notes: appointments.find(a => a.confirmed_date === new Date().toISOString().slice(0, 10) && ['confirmed', 'rescheduled'].includes(a.status))?.presenting_issue || client?.presenting_issue || '',
      from_client_file: true,
    }));
    navigate('/session/new');
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!client) return null;

  const risk = RISK_CONFIG[client.risk_level || 'none'];

  const TABS = [
    { id: 'overview',     label: 'Maklumat' },
    { id: 'sessions',     label: `Sesi (${sessions.length})` },
    { id: 'calendar',     label: 'Kalendar' },
    { id: 'consent',      label: 'Kebenaran' },
    { id: 'plans',        label: `Plan (${actionPlans.length})` },
    { id: 'referrals',    label: `Rujukan (${referrals.length})` },
    { id: 'appointments', label: `${prof.appointmentLabel} (${appointments.length})` },
    { id: 'notes',        label: `Nota (${progressNotes.length})` },
  ];

  // Calendar helpers
  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const calPad  = getDay(startOfMonth(calMonth));
  const sessionsOnDay  = (day) => sessions.filter(s => isSameDay(parseISO(s.created_at), day));
  const apptsOnDay     = (day) => appointments.filter(a => (a.confirmed_date || a.requested_date) && isSameDay(parseISO(a.confirmed_date || a.requested_date), day));

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(`${prof.routePrefix}/clients`)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 truncate">{client.name}</h1>
              <Badge color={risk.color}>{risk.label}</Badge>
            </div>
            <p className="text-xs text-gray-400">{client.ic_number && `IC: ${client.ic_number}`}{client.student_id && ` · ${client.student_id}`}</p>
          </div>
          <Button size="sm" onClick={startNewSession}>+ Sesi Baru</Button>
        </div>

        {/* Risk banner */}
        {client.risk_level && client.risk_level !== 'none' && (
          <div className={`${risk.bg} border-t px-4 py-2 max-w-3xl mx-auto w-full`}>
            <p className={`text-xs font-semibold ${risk.text}`}>⚠️ {risk.label} — {client.presenting_issue || 'Semak fail klien'}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-4 pb-20 md:pb-6">

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-gray-900">{sessions.length}</p><p className="text-xs text-gray-500">Sesi</p></div>
                <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === 'completed').length}</p><p className="text-xs text-gray-500">{prof.appointmentLabel} Selesai</p></div>
                <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-gray-900">{actionPlans.length}</p><p className="text-xs text-gray-500">Plan</p></div>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Maklumat {prof.clientLabel}</h3>
                  {!editing ? (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" loading={saving} onClick={handleSave}>Simpan</Button>
                      <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setEditForm(client); }}>Batal</Button>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-3 text-sm">
                    {[['name', 'Nama'], ['ic_number', 'No. IC'], ['student_id', 'No. Matrik/Staf'], ['phone', 'Telefon'], ['email', 'E-mel'], ['address', 'Alamat']].map(([k, lbl]) => (
                      <div key={k}>
                        <label className="text-xs text-gray-500 mb-1 block">{lbl}</label>
                        <input value={editForm[k] || ''} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tahap Risiko</label>
                      <select value={editForm.risk_level || 'none'} onChange={e => setEditForm(f => ({ ...f, risk_level: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.entries(RISK_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Isu Utama</label>
                      <textarea value={editForm.presenting_issue || ''} onChange={e => setEditForm(f => ({ ...f, presenting_issue: e.target.value }))} rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {[['Nama', client.name], ['No. IC', client.ic_number], ['No. Matrik/Staf', client.student_id], ['Telefon', client.phone], ['E-mel', client.email], ['Alamat', client.address], ['Isu Utama', client.presenting_issue]].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex gap-3"><span className="text-gray-400 w-28 flex-shrink-0">{k}</span><span className="text-gray-800">{v}</span></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SESSIONS TAB */}
          {tab === 'sessions' && (
            <div className="space-y-3">
              <Button onClick={startNewSession} className="w-full">+ Mulakan Sesi Baru</Button>
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">🎙️</div><p>Belum ada sesi untuk {prof.clientLabel.toLowerCase()} ini.</p></div>
              ) : sessions.map((s, i) => (
                <div key={s.id} className="bg-white rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">Sesi {sessions.length - i} · {format(parseISO(s.created_at), 'dd MMM yyyy')}</p>
                      <p className="text-xs text-gray-400">{Math.floor((s.duration || 0) / 60)} minit</p>
                    </div>
                    <button onClick={() => navigate(`/session/${s.id}`)} className="text-xs text-blue-600 hover:underline flex-shrink-0">Lihat Laporan →</button>
                  </div>
                  {audioMap[s.id] && <audio src={audioMap[s.id].url} controls className="w-full" style={{ height: '32px' }} />}
                </div>
              ))}
            </div>
          )}

          {/* CALENDAR TAB */}
          {tab === 'calendar' && (() => {
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
                  <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="p-1 hover:bg-gray-100 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                  <h3 className="font-semibold">{format(calMonth, 'MMMM yyyy')}</h3>
                  <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="p-1 hover:bg-gray-100 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
                </div>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="grid grid-cols-7 bg-gray-50 border-b">{['A','I','S','R','K','J','S'].map((d, i) => <div key={i} className="text-center text-xs text-gray-500 py-2">{d}</div>)}</div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: calPad }).map((_, i) => <div key={`p${i}`} className="h-14 border-b border-r" />)}
                    {calDays.map(day => {
                      const s = sessionsOnDay(day); const a = apptsOnDay(day);
                      const sel = calSelected && isSameDay(day, calSelected);
                      return (
                        <button key={day.toISOString()} onClick={() => setCalSelected(sel ? null : day)}
                          className={`h-14 border-b border-r p-1 text-left ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <span className={`text-xs block ${isToday(day) ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>{format(day, 'd')}</span>
                          <div className="flex gap-0.5 mt-0.5">
                            {s.length > 0 && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                            {a.length > 0 && <span className="w-2 h-2 rounded-full bg-green-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {calSelected && (sessionsOnDay(calSelected).length > 0 || apptsOnDay(calSelected).length > 0) && (
                  <div className="bg-white rounded-xl border p-4 space-y-2">
                    <p className="font-semibold text-gray-900 text-sm">{format(calSelected, 'dd MMMM yyyy')}</p>
                    {sessionsOnDay(calSelected).map(s => <button key={s.id} onClick={() => navigate(`/session/${s.id}`)} className="w-full flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-left text-sm"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />Sesi · Lihat laporan →</button>)}
                    {apptsOnDay(calSelected).map(a => <div key={a.id} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm"><span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />{prof.appointmentLabel} · {a.confirmed_time?.slice(0,5) || ''}</div>)}
                  </div>
                )}
              </div>
            );
          })()}

          {/* CONSENT TAB */}
          {tab === 'consent' && (
            <div className="space-y-4">
              {appointments.filter(a => a.consent_signed).length === 0 ? (
                <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">📋</div><p>Tiada rekod kebenaran.</p></div>
              ) : appointments.filter(a => a.consent_signed).map(a => (
                <div key={a.id} className="bg-white rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{a.client_name}</p>
                      <p className="text-xs text-gray-500">Ditandatangani: {a.consent_at ? format(parseISO(a.consent_at), 'dd MMM yyyy, HH:mm') : '—'}</p>
                      {a.presenting_issue && <p className="text-xs text-gray-600 italic mt-1">"{a.presenting_issue}"</p>}
                    </div>
                    <Badge color="green">Ditandatangani</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PLANS TAB */}
          {tab === 'plans' && (
            <div className="space-y-3">
              <Button onClick={() => setShowAddPlan(true)} className="w-full">+ Plan Baru</Button>
              {actionPlans.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">📌</div><p>Belum ada plan.</p></div>
              ) : actionPlans.map(p => (
                <div key={p.id} className="bg-white rounded-xl border p-4 space-y-2">
                  {(p.goals || []).length > 0 && <div><p className="text-xs font-semibold text-gray-500 uppercase">Matlamat</p>{p.goals.map((g, i) => <p key={i} className="text-sm text-gray-700">· {g}</p>)}</div>}
                  {(p.interventions || []).length > 0 && <div><p className="text-xs font-semibold text-gray-500 uppercase mt-2">Intervensi</p>{p.interventions.map((v, i) => <p key={i} className="text-sm text-gray-700">· {v}</p>)}</div>}
                  {p.follow_up_date && <p className="text-xs text-blue-600">Susulan: {format(parseISO(p.follow_up_date), 'dd MMM yyyy')}</p>}
                  {p.notes && <p className="text-xs text-gray-500 italic">{p.notes}</p>}
                </div>
              ))}
              {showAddPlan && (
                <div className="bg-white rounded-xl border p-4 space-y-3">
                  <textarea value={planForm.goals} onChange={e => setPlanForm(f => ({ ...f, goals: e.target.value }))} rows={2} placeholder="Matlamat (satu baris = satu matlamat)" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  <textarea value={planForm.interventions} onChange={e => setPlanForm(f => ({ ...f, interventions: e.target.value }))} rows={2} placeholder="Intervensi (satu baris = satu intervensi)" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  <input type="date" value={planForm.follow_up_date} onChange={e => setPlanForm(f => ({ ...f, follow_up_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="flex gap-2">
                    <Button size="sm" loading={savingPlan} onClick={async () => {
                      setSavingPlan(true);
                      try {
                        const { data, error } = await supabase.from('action_plans').insert({ subject_id: id, user_id: user.id, goals: planForm.goals.split('\n').filter(Boolean), interventions: planForm.interventions.split('\n').filter(Boolean), follow_up_date: planForm.follow_up_date || null, notes: planForm.notes }).select().single();
                        if (error) throw error;
                        setActionPlans(prev => [data, ...prev]); setShowAddPlan(false); setPlanForm({ goals: '', interventions: '', follow_up_date: '', notes: '' }); toast.success('Plan disimpan.');
                      } catch { toast.error('Gagal menyimpan.'); } finally { setSavingPlan(false); }
                    }}>Simpan</Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowAddPlan(false)}>Batal</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REFERRALS TAB */}
          {tab === 'referrals' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={() => setShowAddReferral(true)} className="flex-1">+ Rujukan Profesional</Button>
                {teamMembers.length > 0 && <Button variant="secondary" onClick={() => setShowTeamReferral(true)} className="flex-1">👥 Rujuk ke Rakan</Button>}
              </div>
              {teamReferrals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rujukan Pasukan</p>
                  {teamReferrals.map(tr => (
                    <div key={tr.id} className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="text-sm font-medium text-blue-900">→ {tr.to_email}</p><p className="text-xs text-blue-700 mt-0.5">{tr.reason}</p></div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${tr.status === 'accepted' ? 'bg-green-100 text-green-700' : tr.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{tr.status === 'accepted' ? 'Diterima' : tr.status === 'declined' ? 'Ditolak' : 'Menunggu'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {referrals.length === 0 && !showAddReferral ? (
                <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">🏥</div><p>Belum ada rujukan.</p></div>
              ) : referrals.map(r => (
                <div key={r.id} className="bg-white rounded-xl border p-4 space-y-1">
                  <div className="flex items-start justify-between">
                    <div><p className="font-medium text-gray-900">{r.referred_to}</p><p className="text-xs text-gray-500">{r.referral_type} · {format(parseISO(r.created_at), 'dd MMM yyyy')}</p></div>
                    <Badge color={r.status === 'completed' ? 'green' : r.status === 'accepted' ? 'blue' : 'yellow'}>{r.status}</Badge>
                  </div>
                  {r.reason && <p className="text-xs text-gray-600 italic">"{r.reason}"</p>}
                </div>
              ))}
              {showAddReferral && (
                <div className="bg-white rounded-xl border p-4 space-y-3">
                  <input value={referralForm.referred_to} onChange={e => setReferralForm(f => ({ ...f, referred_to: e.target.value }))} placeholder="Nama pihak dirujuk" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <select value={referralForm.referral_type} onChange={e => setReferralForm(f => ({ ...f, referral_type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['psychiatry','hospital','social_welfare','ngo','other'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <textarea value={referralForm.reason} onChange={e => setReferralForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Sebab rujukan" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  <div className="flex gap-2">
                    <Button size="sm" loading={savingReferral} onClick={async () => {
                      setSavingReferral(true);
                      try {
                        const { data, error } = await supabase.from('clinical_referrals').insert({ subject_id: id, user_id: user.id, ...referralForm }).select().single();
                        if (error) throw error;
                        setReferrals(prev => [data, ...prev]); setShowAddReferral(false); setReferralForm({ referred_to: '', referral_type: 'other', reason: '' }); toast.success('Rujukan ditambah.');
                      } catch { toast.error('Gagal menyimpan.'); } finally { setSavingReferral(false); }
                    }}>Simpan</Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowAddReferral(false)}>Batal</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* APPOINTMENTS TAB */}
          {tab === 'appointments' && (
            <div className="space-y-2">
              {appointments.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">📅</div><p>Tiada rekod {prof.appointmentLabel.toLowerCase()}.</p></div>
              ) : appointments.map(a => {
                const displayDate = a.confirmed_date || a.requested_date;
                const displayTime = a.confirmed_time || a.requested_time;
                const badgeColor = a.status === 'confirmed' ? 'green' : a.status === 'completed' ? 'blue' : a.status === 'cancelled' ? 'gray' : 'yellow';
                const badgeLabel = a.status === 'confirmed' ? 'Disahkan' : a.status === 'completed' ? 'Selesai' : a.status === 'cancelled' ? 'Dibatalkan' : 'Menunggu';
                return (
                  <div key={a.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{displayDate ? format(parseISO(displayDate), 'dd MMM yyyy') : '—'} · {displayTime?.slice(0, 5)}</p>
                        {a.presenting_issue && <p className="text-sm text-gray-500 italic mt-0.5">"{a.presenting_issue}"</p>}
                      </div>
                      <Badge color={badgeColor}>{badgeLabel}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* NOTES TAB */}
          {tab === 'notes' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Nota Baru</p>
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Tarikh</label>
                  <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={3} placeholder="Nota perkembangan, pemerhatian, atau tindakan susulan..." className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <div className="flex justify-end">
                  <Button size="sm" loading={savingNote} disabled={!noteContent.trim()} onClick={async () => {
                    setSavingNote(true);
                    try {
                      const { data, error } = await supabase.from('progress_notes').insert({ subject_id: id, user_id: user.id, content: noteContent.trim(), note_date: noteDate }).select().single();
                      if (error) throw error;
                      setProgressNotes(prev => [data, ...prev]); setNoteContent(''); setNoteDate(new Date().toISOString().slice(0, 10)); toast.success('Nota disimpan.');
                    } catch { toast.error('Gagal menyimpan nota.'); } finally { setSavingNote(false); }
                  }}>Simpan Nota</Button>
                </div>
              </div>
              {progressNotes.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">📝</div><p>Belum ada nota perkembangan.</p></div>
              ) : (
                <div className="space-y-3">
                  {progressNotes.map(note => (
                    <div key={note.id} className="bg-white rounded-xl border p-4">
                      {editingNote === note.id ? (
                        <div className="space-y-2">
                          <textarea value={editNoteContent} onChange={e => setEditNoteContent(e.target.value)} rows={3} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="secondary" onClick={() => setEditingNote(null)}>Batal</Button>
                            <Button size="sm" onClick={async () => {
                              try {
                                const { data, error } = await supabase.from('progress_notes').update({ content: editNoteContent.trim(), updated_at: new Date().toISOString() }).eq('id', note.id).select().single();
                                if (error) throw error;
                                setProgressNotes(prev => prev.map(n => n.id === note.id ? data : n)); setEditingNote(null); toast.success('Nota dikemas kini.');
                              } catch { toast.error('Gagal.'); }
                            }}>Simpan</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs text-gray-400 mb-1">{format(parseISO(note.note_date), 'dd MMM yyyy')}</p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => { setEditingNote(note.id); setEditNoteContent(note.content); }} className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                              <button onClick={async () => {
                                if (!window.confirm('Padam nota ini?')) return;
                                try { const { error } = await supabase.from('progress_notes').delete().eq('id', note.id); if (error) throw error; setProgressNotes(prev => prev.filter(n => n.id !== note.id)); toast.success('Nota dipadam.'); } catch { toast.error('Gagal.'); }
                              }} className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">Padam</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Team Referral Modal */}
      {showTeamReferral && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rujuk ke Rakan Pasukan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Penerima</label>
                <select value={teamReferralForm.to_email} onChange={e => setTeamReferralForm(f => ({ ...f, to_email: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Pilih ahli pasukan --</option>
                  {teamMembers.map(m => <option key={m.email} value={m.email}>{m.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sebab Rujukan</label>
                <input type="text" value={teamReferralForm.reason} onChange={e => setTeamReferralForm(f => ({ ...f, reason: e.target.value }))} placeholder="Sebab rujukan..." className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => { setShowTeamReferral(false); setTeamReferralForm({ to_email: '', reason: '', notes: '' }); }}>Batal</Button>
                <Button className="flex-1" loading={savingTeamReferral} disabled={!teamReferralForm.to_email || !teamReferralForm.reason.trim()} onClick={async () => {
                  setSavingTeamReferral(true);
                  try {
                    const { data, error } = await supabase.from('team_referrals').insert({ from_user_id: user.id, subject_id: id, to_email: teamReferralForm.to_email, reason: teamReferralForm.reason.trim(), notes: teamReferralForm.notes.trim() || null }).select().single();
                    if (error) throw error;
                    setTeamReferrals(prev => [data, ...prev]); setShowTeamReferral(false); setTeamReferralForm({ to_email: '', reason: '', notes: '' }); toast.success('Rujukan dihantar.');
                  } catch { toast.error('Gagal menghantar rujukan.'); } finally { setSavingTeamReferral(false); }
                }}>Hantar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
