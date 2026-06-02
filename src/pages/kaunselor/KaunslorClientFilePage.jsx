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
  'Emotional', 'Social Relationships', 'Career Development', 'Family/Home',
  'Academic', 'Financial', 'Religious', 'Sexual', 'Legal',
  'Health', 'Behaviour/Attitude', 'Crisis',
];

const RISK_CONFIG = {
  none:          { label: 'None',                    color: 'gray',   bg: 'bg-gray-50',   text: 'text-gray-600' },
  mental_health: { label: 'Mental Health Issue',     color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-800' },
  self_harm:     { label: 'Self-Harm Tendency',      color: 'orange', bg: 'bg-orange-50', text: 'text-orange-800' },
  suicidal:      { label: 'Suicidal Tendency',       color: 'red',    bg: 'bg-red-50',    text: 'text-red-800' },
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
  const [progressNotes, setProgressNotes] = useState([]);
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingNote, setSavingNote] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamReferrals, setTeamReferrals] = useState([]);
  const [showTeamReferral, setShowTeamReferral] = useState(false);
  const [teamReferralForm, setTeamReferralForm] = useState({ to_email: '', reason: '', notes: '' });
  const [savingTeamReferral, setSavingTeamReferral] = useState(false);

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
      supabase.from('progress_notes').select('*').eq('subject_id', id).order('note_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('team_referrals').select('*').eq('subject_id', id).eq('from_user_id', user.id).order('created_at', { ascending: false }),
    ]).then(([{ data: c }, { data: s }, { data: a }, { data: plans }, { data: refs }, { data: audios }, { data: notes }, { data: trefs }]) => {
      if (!c) { navigate('/kaunselor/clients'); return; }
      setClient(c);
      setEditForm(c);
      setSessions(s || []);
      setAppointments(a || []);
      setActionPlans(plans || []);
      setReferrals(refs || []);
      setProgressNotes(notes || []);
      setTeamReferrals(trefs || []);
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

    // Fetch team members (active only) for referral dropdown
    supabase.from('team_members').select('email, role')
      .eq('status', 'active')
      .then(({ data }) => setTeamMembers(data || []));
  }, [id, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('subjects')
        .update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setClient(editForm);
      setEditing(false);
      toast.success('Client information updated.');
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const startNewSession = () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayAppt = appointments.find(a =>
      a.status === 'confirmed' && a.confirmed_date === today
    );
    sessionStorage.setItem('session_setup', JSON.stringify({
      profession: 'counselor',
      subject_name: client.name,
      subject_id: client.id,
      interviewer: user?.user_metadata?.full_name || '',
      title: `Session ${sessions.length + 1} — ${client.name}`,
      context_notes: client.presenting_issue || todayAppt?.presenting_issue || '',
      appointment_id: todayAppt?.id || null,
    }));
    navigate('/session/setup/counselor');
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
      toast.success('Action plan added.');
    } catch { toast.error('Failed to save.'); }
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
      toast.success('Referral added.');
    } catch { toast.error('Failed to save.'); }
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
                <p className="text-xs text-gray-400">{sessions.length} sessions · {Math.round(totalDuration / 60)} total minutes</p>
              </div>
            </div>
            <Button onClick={startNewSession} className="flex-shrink-0">+ New Session</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b px-6">
          <div className="max-w-2xl mx-auto flex gap-1">
            {[
              { id: 'overview',     label: 'Overview' },
              { id: 'sessions',     label: `Sessions (${sessions.length})` },
              { id: 'calendar',     label: 'Calendar' },
              { id: 'consent',      label: 'Consent' },
              { id: 'plans',        label: `Plans (${actionPlans.length})` },
              { id: 'referrals',    label: `Referrals (${referrals.length})` },
              { id: 'appointments', label: `Appointments (${appointments.length})` },
              { id: 'notes',        label: `Notes (${progressNotes.length})` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
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
                <div className="bg-violet-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-violet-700">{sessions.length}</p>
                  <p className="text-xs text-violet-600">Sessions</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{Math.round(totalDuration / 60)}</p>
                  <p className="text-xs text-blue-600">Minutes</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${RISK_CONFIG[client.risk_level || 'none']?.bg || 'bg-gray-50'}`}>
                  <p className={`text-sm font-bold ${RISK_CONFIG[client.risk_level || 'none']?.text || 'text-gray-600'}`}>
                    {RISK_CONFIG[client.risk_level || 'none']?.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Risk Level</p>
                </div>
              </div>

              {/* Risk level selector */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Client Risk Level</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => updateRiskLevel(key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all text-sm font-medium ${client.risk_level === key ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-200'}`}>
                      <span className={cfg.text}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
                {(client.risk_level === 'self_harm' || client.risk_level === 'suicidal') && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    <strong>Immediate Action Required.</strong> Please contact Talian Kasih 15999 or the nearest hospital if the client is in danger.
                  </div>
                )}
              </div>

              {/* Intake completeness warning for walk-in clients */}
              {!client?.ic_number && !client?.date_of_birth && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">Intake Form Incomplete</p>
                    <p className="text-xs text-amber-700 mt-0.5">This client was a walk-in. Please complete personal information (IC, date of birth, etc.) according to Intake Form SOP.</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Complete</Button>
                </div>
              )}

              {/* Personal details */}
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Personal Information</h3>
                  {editing
                    ? <div className="flex gap-2"><Button size="sm" loading={saving} onClick={handleSave}>Save</Button><Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button></div>
                    : <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => {
                          const counselorName = user?.user_metadata?.full_name || 'Counselor';
                          const win = window.open('', '_blank', 'width=794,height=1123');
                          const dobFmt = client.date_of_birth ? format(new Date(client.date_of_birth), 'dd/MM/yyyy') : '___________';
                          const maritalMap = { single: 'Bujang', married: 'Berkahwin', divorced: 'Bercerai', widowed: 'Balu/Duda' };
                          win.document.write(`<!DOCTYPE html><html><head>
                            <title>Borang Intake — ${client.name}</title>
                            <style>
                              body{font-family:Arial,sans-serif;font-size:11px;padding:30px;color:#111;line-height:1.5}
                              h1{font-size:13px;text-align:center;text-transform:uppercase;margin:0}
                              h2{font-size:11px;text-align:center;color:#444;margin:2px 0 16px}
                              .section{margin-bottom:14px}
                              .sec-title{font-size:10px;font-weight:bold;text-transform:uppercase;background:#eee;padding:3px 6px;margin-bottom:6px}
                              .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
                              .field{margin-bottom:6px}
                              .label{font-size:9px;color:#666;text-transform:uppercase;margin-bottom:1px}
                              .value{border-bottom:1px solid #999;min-height:16px;padding-bottom:1px;font-size:11px}
                              .checkbox-row{display:flex;gap:16px;align-items:center;margin-bottom:4px}
                              .cb{width:12px;height:12px;border:1px solid #333;display:inline-block;margin-right:4px;vertical-align:middle}
                              .cb.checked{background:#333}
                              .footer{margin-top:24px;font-size:8px;color:#888;text-align:center;border-top:1px solid #ddd;padding-top:6px}
                              @media print{body{padding:15px}}
                            </style></head><body>
                            <h1>COUNSELING INTAKE FORM</h1>
                            <h2>(Counseling Intake Form — CIF)</h2>
                            <div class="sec-title">A. Personal Information</div>
                            <div class="grid">
                              <div class="field"><div class="label">Nama Penuh</div><div class="value">${client.name||''}</div></div>
                              <div class="field"><div class="label">No. IC / Passport</div><div class="value">${client.ic_number||''}</div></div>
                              <div class="field"><div class="label">No. Matrik / Kakitangan</div><div class="value">${client.student_id||''}</div></div>
                              <div class="field"><div class="label">Tarikh Lahir</div><div class="value">${dobFmt}</div></div>
                              <div class="field"><div class="label">Jantina</div><div class="value">${client.gender||''}</div></div>
                              <div class="field"><div class="label">Bangsa</div><div class="value">${client.race||''}</div></div>
                              <div class="field"><div class="label">Agama</div><div class="value">${client.religion||''}</div></div>
                              <div class="field"><div class="label">Status Perkahwinan</div><div class="value">${maritalMap[client.marital_status]||''}</div></div>
                              <div class="field"><div class="label">Tahun Pengajian</div><div class="value">${client.year_of_study||''}</div></div>
                              <div class="field"><div class="label">Pekerjaan / Program</div><div class="value">${client.occupation||''}</div></div>
                              <div class="field"><div class="label">No. Telefon</div><div class="value">${client.phone||''}</div></div>
                              <div class="field"><div class="label">E-mel</div><div class="value">${client.email||''}</div></div>
                            </div>
                            <div class="field"><div class="label">Alamat</div><div class="value">${client.address||''}</div></div>
                            <div class="field"><div class="label">Kontak Kecemasan (Nama / Tel.)</div><div class="value">${client.emergency_contact_name||''} ${client.emergency_contact_phone ? '/ '+client.emergency_contact_phone : ''}</div></div>
                            <div class="sec-title" style="margin-top:10px">B. Session Information</div>
                            <div class="grid">
                              <div class="field"><div class="label">Jenis Sesi</div><div class="value">${client.session_type==='referred'?'Rujukan':'Sukarela'}</div></div>
                              <div class="field"><div class="label">Sumber Rujukan</div><div class="value">${client.referral_source||''}</div></div>
                            </div>
                            <div class="field"><div class="label">Isu yang Dibawa (Presenting Issue)</div><div class="value" style="min-height:30px">${client.presenting_issue||''}</div></div>
                            <div class="sec-title" style="margin-top:10px">C. Clinical History</div>
                            <div class="checkbox-row"><span class="${client.previous_counseling?'cb checked':'cb'}"></span>Pernah menerima kaunseling sebelum ini</div>
                            <div class="checkbox-row"><span class="${client.psychiatric_history?'cb checked':'cb'}"></span>Ada sejarah psikiatri</div>
                            <div class="checkbox-row"><span class="${client.psychiatric_medication?'cb checked':'cb'}"></span>Sedang mengambil ubat psikiatri</div>
                            <div class="checkbox-row"><span class="${client.hostel_resident?'cb checked':'cb'}"></span>Penghuni asrama</div>
                            <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
                              <div><div style="border-top:1px solid #333;padding-top:4px;margin-top:40px"><strong>${client.name||'___________________'}</strong><br/>Client Signature<br/><span style="font-size:9px">Date: ${format(new Date(),'dd/MM/yyyy')}</span></div></div>
                              <div><div style="border-top:1px solid #333;padding-top:4px;margin-top:40px"><strong>${counselorName}</strong><br/>Counselor Signature<br/><span style="font-size:9px">Tarikh: ${format(new Date(),'dd/MM/yyyy')}</span></div></div>
                            </div>
                            <div class="footer">SULIT — Unit Kaunseling — VeriRec Platform — verirec.app</div>
                            <script>window.onload=function(){window.print()}</script>
                          </body></html>`);
                          win.document.close();
                        }}>📋 Print Intake</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
                      </div>
                  }
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Personal Information</p>
                    {[
                      { k: 'name', label: 'Name', type: 'text' },
                      { k: 'phone', label: 'Phone', type: 'tel' },
                      { k: 'email', label: 'Email', type: 'email' },
                      { k: 'ic_number', label: 'IC No.', type: 'text' },
                      { k: 'student_id', label: 'Matric / ID No.', type: 'text' },
                      { k: 'date_of_birth', label: 'Date of Birth', type: 'date' },
                      { k: 'gender', label: 'Gender', type: 'text' },
                      { k: 'race', label: 'Race', type: 'text' },
                      { k: 'religion', label: 'Religion', type: 'text' },
                      { k: 'occupation', label: 'Occupation', type: 'text' },
                      { k: 'year_of_study', label: 'Year of Study', type: 'text' },
                      { k: 'address', label: 'Address', type: 'text' },
                      { k: 'emergency_contact_name', label: 'Emergency Contact', type: 'text' },
                      { k: 'emergency_contact_phone', label: 'Emergency Tel.', type: 'tel' },
                      { k: 'referral_source', label: 'Referral Source', type: 'text' },
                    ].map(f => (
                      <div key={f.k} className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-sm text-gray-500">{f.label}</label>
                        <input type={f.type} value={editForm[f.k] || ''} onChange={e => setEditForm(p => ({ ...p, [f.k]: e.target.value }))}
                          className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ))}
                    {/* Selects */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <label className="text-sm text-gray-500">Marital Status</label>
                      <select value={editForm.marital_status || 'single'} onChange={e => setEditForm(p => ({ ...p, marital_status: e.target.value }))}
                        className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <label className="text-sm text-gray-500">Session Type</label>
                      <select value={editForm.session_type || 'voluntary'} onChange={e => setEditForm(p => ({ ...p, session_type: e.target.value }))}
                        className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="voluntary">Voluntary</option>
                        <option value="referred">Referred</option>
                      </select>
                    </div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Clinical History</p>
                    {[
                      { k: 'previous_counseling', label: 'Previously received counseling?' },
                      { k: 'psychiatric_history', label: 'Has psychiatric history?' },
                      { k: 'psychiatric_medication', label: 'Currently taking psychiatric medication?' },
                      { k: 'hostel_resident', label: 'Hostel resident?' },
                    ].map(f => (
                      <div key={f.k} className="flex items-center justify-between">
                        <label className="text-sm text-gray-500">{f.label}</label>
                        <button type="button" onClick={() => setEditForm(p => ({ ...p, [f.k]: !p[f.k] }))}
                          className={`w-10 h-5 rounded-full transition-colors ${editForm[f.k] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                          <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${editForm[f.k] ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Session Notes</p>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-sm text-gray-500">Presenting Issue</label>
                      <textarea value={editForm.presenting_issue || ''} onChange={e => setEditForm(p => ({ ...p, presenting_issue: e.target.value }))} rows={2}
                        className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-sm text-gray-500">Notes</label>
                      <textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                        className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {[
                      ['Name', client.name],
                      ['Phone', client.phone],
                      ['Email', client.email],
                      ['IC No.', client.ic_number],
                      ['Matric / ID No.', client.student_id],
                      ['Date of Birth', client.date_of_birth],
                      ['Gender', client.gender],
                      ['Race', client.race],
                      ['Religion', client.religion],
                      ['Marital Status', client.marital_status === 'married' ? 'Married' : client.marital_status === 'divorced' ? 'Divorced' : client.marital_status === 'widowed' ? 'Widowed' : client.marital_status ? 'Single' : null],
                      ['Occupation', client.occupation],
                      ['Address', client.address],
                      ['Emergency Contact', client.emergency_contact_name ? `${client.emergency_contact_name} (${client.emergency_contact_phone || '-'})` : null],
                      ['Session Type', client.session_type === 'referred' ? 'Referred' : client.session_type ? 'Voluntary' : null],
                      ['Previous Counseling', client.previous_counseling ? 'Yes' : client.previous_counseling === false ? 'No' : null],
                      ['Psychiatric History', client.psychiatric_history ? 'Yes' : client.psychiatric_history === false ? 'No' : null],
                      ['Psychiatric Medication', client.psychiatric_medication ? 'Yes' : client.psychiatric_medication === false ? 'No' : null],
                      ['Presenting Issue', client.presenting_issue],
                      ['Notes', client.notes],
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
                <h3 className="font-semibold text-gray-900 mb-3">Problem Types (Case Session Note)</h3>
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
                  <h3 className="font-semibold text-gray-900 mb-3">Last Session</h3>
                  <p className="text-xs text-gray-400 mb-2">{format(parseISO(lastSession.created_at), 'dd MMM yyyy')}</p>
                  {lastSession.report.summary && <p className="text-sm text-gray-700 mb-3">{lastSession.report.summary}</p>}
                  {lastSession.risk_level && lastSession.risk_level !== 'none' && (
                    <div className={`flex items-center gap-2 p-2 rounded-lg ${RISK_CONFIG[lastSession.risk_level]?.bg}`}>
                      <span className={`text-xs font-medium ${RISK_CONFIG[lastSession.risk_level]?.text}`}>
                        Session risk: {RISK_CONFIG[lastSession.risk_level]?.label}
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
              <Button onClick={startNewSession} className="w-full">+ Start New Session</Button>

              {/* Risk trend */}
              {sessions.length > 1 && sessions.some(s => s.risk_level && s.risk_level !== 'none') && (
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Risk Trend Across Sessions</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[...sessions].reverse().map((s, i) => {
                      const riskHeight = { none: 10, mental_health: 40, self_harm: 65, suicidal: 90 };
                      const riskColor = { none: 'bg-green-400', mental_health: 'bg-amber-400', self_harm: 'bg-orange-500', suicidal: 'bg-red-500' };
                      const level = s.risk_level || 'none';
                      return (
                        <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`w-full rounded-t-md transition-all ${riskColor[level]}`} style={{ height: `${riskHeight[level]}%` }} title={RISK_CONFIG[level]?.label} />
                          <span className="text-[9px] text-gray-400">{i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {[['none','bg-green-400','Low'],['mental_health','bg-amber-400','Moderate'],['self_harm','bg-orange-500','High'],['suicidal','bg-red-500','Critical']].map(([k,c,l]) => (
                      <div key={k} className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${c}`}/><span className="text-[10px] text-gray-400">{l}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">🎙️</div>
                  <p>No sessions yet for this client.</p>
                </div>
              ) : sessions.map((s, i) => (
                <div key={s.id} className="bg-white rounded-xl border hover:border-blue-200 transition-all">
                  <button onClick={() => navigate(`/session/${s.id}`)} className="w-full p-4 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Session {sessions.length - i}</span>
                          {s.risk_level && s.risk_level !== 'none' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_CONFIG[s.risk_level]?.bg} ${RISK_CONFIG[s.risk_level]?.text}`}>
                              {RISK_CONFIG[s.risk_level]?.label}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">{s.title}</p>
                        <p className="text-xs text-gray-400">{format(parseISO(s.created_at), 'dd MMM yyyy')} · {Math.round((s.duration || 0) / 60)} min</p>
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
                      <p className="text-xs text-gray-400 mb-1">🎙 Audio Recording</p>
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
            const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Sessions</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Appointments</span>
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
                        <p className="text-sm text-gray-400">No activity on this date.</p>
                        <button onClick={startNewSession}
                          className="text-xs text-blue-600 font-medium hover:underline">+ Start Session</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedEvents.map((ev, i) => (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${ev.type === 'session' ? 'bg-blue-50' : 'bg-green-50'}`}>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{ev.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {ev.type === 'session' ? '🎙 Recorded session' : `📅 Appointment — ${ev.status === 'confirmed' ? 'Confirmed' : ev.status === 'completed' ? 'Completed' : 'Pending'}`}
                              </p>
                            </div>
                            {ev.type === 'session' && (
                              <button onClick={() => navigate(`/session/${ev.id}`)}
                                className="text-xs text-blue-600 font-medium hover:underline">View →</button>
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
                    <p className="text-xs text-blue-600">Total Sessions</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length}</p>
                    <p className="text-xs text-green-600">Confirmed Appointments</p>
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
                  <p>No signed consent forms yet.</p>
                  <p className="text-sm mt-1">Consent will be recorded when the client fills in the booking form.</p>
                </div>
              ) : appointments.filter(a => a.consent_signed).map(a => {
                const sessionDate = a.confirmed_date || a.requested_date;
                const sessionTime = a.confirmed_time || a.requested_time;
                const counselorName = user?.user_metadata?.full_name || '—';

                const handlePrintConsent = () => {
                  const win = window.open('', '_blank', 'width=794,height=1123');
                  win.document.write(`<!DOCTYPE html><html><head>
                    <title>Borang Persetujuan Makluman — ${a.client_name}</title>
                    <style>
                      body { font-family: Arial, sans-serif; font-size: 12px; padding: 40px; color: #111; line-height: 1.6; }
                      h1 { font-size: 14px; text-align: center; text-transform: uppercase; margin-bottom: 4px; }
                      h2 { font-size: 12px; text-align: center; color: #444; margin-top: 0; margin-bottom: 24px; }
                      .section { margin-bottom: 16px; }
                      .label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
                      .value { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 2px; min-height: 20px; }
                      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
                      .body-text { font-size: 11px; line-height: 1.7; margin-bottom: 12px; }
                      .sig-block { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                      .sig-line { border-top: 1px solid #333; padding-top: 4px; margin-top: 40px; font-size: 11px; }
                      .footer { margin-top: 30px; font-size: 9px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
                      @media print { body { padding: 20px; } }
                    </style>
                  </head><body>
                    <h1>BORANG PERSETUJUAN MAKLUMAN</h1>
                    <h2>(Informed Consent Form)</h2>
                    <div class="grid">
                      <div><div class="label">Nama Klien</div><div class="value">${a.client_name || '—'}</div></div>
                      <div><div class="label">No. IC / Passport</div><div class="value">${a.client_ic || '—'}</div></div>
                      <div><div class="label">No. Matrik / Kakitangan</div><div class="value">${a.client_student_id || '—'}</div></div>
                      <div><div class="label">Jantina</div><div class="value">${a.client_gender || '—'}</div></div>
                      <div><div class="label">Tarikh Sesi</div><div class="value">${format(parseISO(sessionDate), 'dd MMMM yyyy')}</div></div>
                      <div><div class="label">Masa Sesi</div><div class="value">${sessionTime?.slice(0,5) || '—'}</div></div>
                    </div>
                    <div class="section">
                      <p class="body-text"><strong>1. Perkhidmatan Kaunseling.</strong> Kaunseling adalah hubungan profesional antara anda dan kaunselor bertauliah. Matlamat utama adalah untuk memudahkan perubahan tingkah laku, meningkatkan keupayaan membina hubungan, menggalakkan proses membuat keputusan, dan memudahkan potensi serta perkembangan peribadi klien.</p>
                      <p class="body-text"><strong>2. Kerahsiaan.</strong> Kaunselor bertanggungjawab menjaga kerahsiaan semua maklumat yang diperoleh semasa sesi kaunseling berdasarkan Akta Kaunselor 1998 dan PDPA 2010. Maklumat hanya boleh didedahkan dalam situasi berikut: (a) bahaya kepada diri sendiri atau orang lain; (b) perlindungan kanak-kanak; (c) perintah mahkamah.</p>
                      <p class="body-text"><strong>3. Rakaman &amp; Dokumentasi.</strong> Sesi ini mungkin dirakam suara untuk tujuan dokumentasi klinikal menggunakan teknologi AI yang dilindungi. Semua data disimpan secara selamat mengikut PDPA 2010. Rakaman tidak akan dikongsi tanpa kebenaran anda.</p>
                      <p class="body-text"><strong>4. Hak Klien.</strong> Anda berhak: (a) bertanya tentang apa sahaja berkaitan sesi; (b) meminta kaunselor merujuk kepada profesional lain; (c) memberhentikan sesi pada bila-bila masa; (d) mendapatkan salinan rekod anda dengan permohonan bertulis.</p>
                      <p class="body-text"><strong>5. Had Kaunseling.</strong> Kaunseling bukan rawatan perubatan dan kaunselor bukan doktor. Jika anda memerlukan rawatan perubatan atau psikiatri, kaunselor akan membuat rujukan yang sesuai.</p>
                    </div>
                    <p class="body-text">Dengan menandatangani / menyatakan persetujuan secara digital di bawah, saya mengakui bahawa saya telah membaca, memahami, dan bersetuju dengan syarat-syarat di atas.</p>
                    <div class="sig-block">
                      <div>
                        <div class="sig-line">
                          <strong>${a.client_name || '___________________'}</strong><br/>
                          Client Signature / Consent<br/>
                          Tarikh: ${a.consent_at ? format(new Date(a.consent_at), 'dd/MM/yyyy HH:mm') : '___________'}
                        </div>
                      </div>
                      <div>
                        <div class="sig-line">
                          <strong>${counselorName}</strong><br/>
                          Tandatangan Kaunselor<br/>
                          Tarikh: ${format(new Date(), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>
                    <div class="footer">STRICTLY CONFIDENTIAL — VeriRec Counselor Platform — verirec.app</div>
                    <script>window.onload = function(){ window.print(); }</script>
                  </body></html>`);
                  win.document.close();
                };

                return (
                  <div key={a.id} className="bg-white rounded-xl border p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Informed Consent Form</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {a.consent_at ? format(new Date(a.consent_at), 'dd MMM yyyy, HH:mm') : 'Date not recorded'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✓ Signed</span>
                        <Button size="sm" variant="secondary" onClick={handlePrintConsent}>🖨 Print</Button>
                      </div>
                    </div>

                    {/* Client details */}
                    <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
                      {[
                        ['Nama', a.client_name],
                        ['No. IC / Passport', a.client_ic],
                        ['No. Matrik / Kakitangan', a.client_student_id],
                        ['Jantina', a.client_gender],
                        ['Tarikh Sesi', format(parseISO(sessionDate), 'dd MMM yyyy')],
                        ['Masa Sesi', sessionTime?.slice(0, 5)],
                      ].map(([label, val]) => val ? (
                        <div key={label}>
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="font-medium text-gray-800">{val}</p>
                        </div>
                      ) : null)}
                    </div>

                    {/* Consent text summary */}
                    <div className="border rounded-xl p-4 text-sm text-gray-600 space-y-2 leading-relaxed">
                      <p className="font-semibold text-gray-800 text-center text-xs uppercase tracking-wide mb-3">Agreed Consent Terms</p>
                      <p><strong>Confidentiality:</strong> Session information is kept confidential under the Counselors Act 1998 and PDPA 2010, except for danger to self/others, child protection, or court orders.</p>
                      <p><strong>Recording:</strong> Sessions may be voice-recorded for clinical documentation using protected AI technology. Data is stored securely per PDPA 2010.</p>
                      <p><strong>Client Rights:</strong> Client has the right to ask questions, request referrals, stop the session, or obtain copies of records.</p>
                    </div>

                    {/* Presenting issue */}
                    {a.presenting_issue && (
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs text-blue-500 mb-1">Presenting Issue</p>
                        <p className="text-sm text-blue-900 italic">"{a.presenting_issue}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ACTION PLANS TAB ── */}
          {tab === 'plans' && (
            <div className="space-y-3">
              <Button onClick={() => setShowAddPlan(true)} className="w-full">+ New Action Plan</Button>
              {actionPlans.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📋</div>
                  <p>No action plans yet for this client.</p>
                </div>
              ) : actionPlans.map(p => (
                <div key={p.id} className="bg-white rounded-xl border p-4 space-y-2">
                  <p className="text-xs text-gray-400">{format(parseISO(p.created_at), 'dd MMM yyyy')}</p>
                  {p.goals?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Goals</p>
                      {p.goals.map((g, i) => (
                        <p key={i} className="text-sm text-gray-700">• {typeof g === 'string' ? g : g.goal}</p>
                      ))}
                    </div>
                  )}
                  {p.interventions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Interventions</p>
                      {p.interventions.map((iv, i) => <p key={i} className="text-sm text-gray-700">• {iv}</p>)}
                    </div>
                  )}
                  {p.follow_up_date && <p className="text-xs text-blue-600">Follow-up: {format(parseISO(p.follow_up_date), 'dd MMM yyyy')}</p>}
                  {p.notes && <p className="text-xs text-gray-500 italic">{p.notes}</p>}
                </div>
              ))}
              {showAddPlan && (
                <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                    <h3 className="font-semibold text-lg">New Action Plan</h3>
                    <form onSubmit={handleAddPlan} className="space-y-3">
                      <div><label className="text-xs text-gray-500 mb-1 block">Goals *</label>
                        <textarea value={planForm.goals} onChange={e => setPlanForm(p => ({ ...p, goals: e.target.value }))} rows={2} required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="State client goals..." /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Interventions</label>
                        <textarea value={planForm.interventions} onChange={e => setPlanForm(p => ({ ...p, interventions: e.target.value }))} rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Approach / technique used..." /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Follow-up Date</label>
                        <input type="date" value={planForm.follow_up_date} onChange={e => setPlanForm(p => ({ ...p, follow_up_date: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Notes</label>
                        <input type="text" value={planForm.notes} onChange={e => setPlanForm(p => ({ ...p, notes: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Additional notes..." /></div>
                      <div className="flex gap-3 pt-2">
                        <Button type="submit" loading={savingPlan} className="flex-1">Save</Button>
                        <Button type="button" variant="secondary" onClick={() => setShowAddPlan(false)}>Cancel</Button>
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
              <div className="flex gap-2">
                <Button onClick={() => setShowAddReferral(true)} className="flex-1">+ Professional Referral</Button>
                {teamMembers.length > 0 && (
                  <Button variant="secondary" onClick={() => setShowTeamReferral(true)} className="flex-1">👥 Refer to Another Counselor</Button>
                )}
              </div>

              {/* Outgoing team referrals */}
              {teamReferrals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team Referrals</p>
                  {teamReferrals.map(tr => (
                    <div key={tr.id} className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-blue-900">→ {tr.to_email}</p>
                          <p className="text-xs text-blue-700 mt-0.5">{tr.reason}</p>
                          {tr.notes && <p className="text-xs text-blue-600 italic mt-0.5">{tr.notes}</p>}
                          <p className="text-xs text-blue-400 mt-1">{format(parseISO(tr.created_at), 'dd MMM yyyy')}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          tr.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          tr.status === 'declined' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'}`}>
                          {tr.status === 'accepted' ? 'Accepted' : tr.status === 'declined' ? 'Declined' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {referrals.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">🏥</div>
                  <p>No referrals yet for this client.</p>
                </div>
              ) : referrals.map(r => {
                const REFERRAL_LABELS = { psychiatry: 'Psychiatry', hospital: 'Hospital', social_welfare: 'Social Welfare', ngo: 'NGO / Charity', other: 'Others' };
                const handlePrintMemo = () => {
                  const counselorName = user?.user_metadata?.full_name || 'Kaunselor';
                  const refDate = format(parseISO(r.created_at), 'dd MMMM yyyy');
                  const win = window.open('', '_blank', 'width=794,height=1123');
                  win.document.write(`<!DOCTYPE html><html><head>
                    <title>Memo Bantuan Profesional — ${client.name}</title>
                    <style>
                      body{font-family:Arial,sans-serif;font-size:11px;padding:40px;color:#111;line-height:1.7}
                      .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px}
                      .header h1{font-size:14px;text-transform:uppercase;margin:0 0 2px}
                      .header p{font-size:10px;color:#555;margin:0}
                      .memo-block{margin-bottom:16px}
                      .memo-row{display:grid;grid-template-columns:120px 1fr;margin-bottom:4px}
                      .memo-label{font-weight:bold;font-size:11px}
                      .memo-value{font-size:11px}
                      .subject-box{background:#f5f5f5;border:1px solid #ddd;border-radius:4px;padding:10px;margin:14px 0}
                      .subject-row{display:grid;grid-template-columns:140px 1fr;margin-bottom:3px;font-size:11px}
                      .body-text{font-size:11px;line-height:1.8;margin-bottom:10px}
                      .sig-block{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
                      .sig-line{border-top:1px solid #333;padding-top:4px;margin-top:36px;font-size:10px}
                      .footer{margin-top:24px;font-size:8px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:6px}
                      @media print{body{padding:20px}}
                    </style></head><body>
                    <div class="header">
                      <h1>Universiti Teknologi Malaysia</h1>
                      <p>Unit Kaunseling | Bahagian Hal Ehwal Pelajar</p>
                    </div>
                    <div style="text-align:center;margin-bottom:20px">
                      <strong style="font-size:13px;text-transform:uppercase;text-decoration:underline">MEMO UNTUK BANTUAN PROFESIONAL TAMBAHAN</strong><br/>
                      <span style="font-size:10px;color:#555">(Memo for Extra Professional Assistance)</span>
                    </div>
                    <div class="memo-block">
                      <div class="memo-row"><span class="memo-label">KEPADA</span><span class="memo-value">: ${r.referred_to}</span></div>
                      <div class="memo-row"><span class="memo-label">DARIPADA</span><span class="memo-value">: ${counselorName}, Unit Kaunseling UTM</span></div>
                      <div class="memo-row"><span class="memo-label">TARIKH</span><span class="memo-value">: ${refDate}</span></div>
                      <div class="memo-row"><span class="memo-label">JENIS RUJUKAN</span><span class="memo-value">: ${REFERRAL_LABELS[r.referral_type]||r.referral_type}</span></div>
                    </div>
                    <div class="subject-box">
                      <strong style="font-size:10px;text-transform:uppercase">Maklumat Klien</strong>
                      <div style="margin-top:6px">
                        <div class="subject-row"><span>Nama</span><span>: ${client.name||'—'}</span></div>
                        <div class="subject-row"><span>No. IC / Passport</span><span>: ${client.ic_number||'—'}</span></div>
                        <div class="subject-row"><span>No. Matrik / ID</span><span>: ${client.student_id||'—'}</span></div>
                        <div class="subject-row"><span>Program / Tahun</span><span>: ${client.occupation||'—'} ${client.year_of_study?'/ '+client.year_of_study:''}</span></div>
                        <div class="subject-row"><span>No. Telefon</span><span>: ${client.phone||'—'}</span></div>
                      </div>
                    </div>
                    <p class="body-text"><strong>1. Tujuan Memo</strong><br/>
                    Memo ini adalah untuk merujuk klien di atas kepada ${r.referred_to} bagi mendapatkan bantuan profesional tambahan dalam menangani isu yang dibincangkan dalam sesi kaunseling.</p>
                    <p class="body-text"><strong>2. Sebab Rujukan</strong><br/>
                    ${r.reason||'Klien memerlukan penilaian dan sokongan profesional tambahan yang di luar skop kaunseling.'}</p>
                    <p class="body-text"><strong>3. Maklumat Isu</strong><br/>
                    ${client.presenting_issue||'Rujuk rekod kaunseling untuk maklumat lanjut.'}</p>
                    <p class="body-text"><strong>4. Tindakan Diperlukan</strong><br/>
                    Pihak ${r.referred_to} dimohon untuk memberikan penilaian dan rawatan yang sesuai. Sebarang maklumbalas boleh dihantar kepada Unit Kaunseling UTM.</p>
                    <p class="body-text" style="font-size:10px;color:#555">* Maklumat dalam memo ini adalah SULIT dan hanya untuk kegunaan pihak yang berkenaan sahaja.</p>
                    <div class="sig-block">
                      <div><div class="sig-line"><strong>${counselorName}</strong><br/>Registered Counselor<br/>Unit Kaunseling UTM<br/>Tarikh: ${format(new Date(),'dd/MM/yyyy')}</div></div>
                      <div><div class="sig-line">___________________<br/>Pengesahan Penerima<br/>Tarikh: ___________</div></div>
                    </div>
                    <div class="footer">SULIT — Unit Kaunseling UTM — VeriRec Platform — verirec.app</div>
                    <script>window.onload=function(){window.print()}</script>
                  </body></html>`);
                  win.document.close();
                };
                return (
                  <div key={r.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{r.referred_to}</p>
                        <p className="text-xs text-gray-500">{REFERRAL_LABELS[r.referral_type] || r.referral_type}</p>
                        {r.reason && <p className="text-sm text-gray-600 mt-1">{r.reason}</p>}
                        <p className="text-xs text-gray-400 mt-1">{format(parseISO(r.created_at), 'dd MMM yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button size="sm" variant="secondary" onClick={handlePrintMemo}>🖨 Generate Memo</Button>
                        <Badge color={r.status === 'completed' ? 'green' : r.status === 'sent' ? 'blue' : 'yellow'}>
                          {r.status === 'completed' ? 'Completed' : r.status === 'sent' ? 'Sent' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
              {showAddReferral && (
                <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                    <h3 className="font-semibold text-lg">New Referral</h3>
                    <form onSubmit={handleAddReferral} className="space-y-3">
                      <div><label className="text-xs text-gray-500 mb-1 block">Referred To *</label>
                        <input type="text" value={referralForm.referred_to} onChange={e => setReferralForm(p => ({ ...p, referred_to: e.target.value }))} required
                          placeholder="e.g. Kuala Lumpur General Hospital, Psychiatry..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Referral Type</label>
                        <select value={referralForm.referral_type} onChange={e => setReferralForm(p => ({ ...p, referral_type: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {[['psychiatry','Psychiatry'],['hospital','Hospital'],['social_welfare','Social Welfare'],['ngo','NGO / Charity'],['other','Others']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                        </select></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Reason for Referral</label>
                        <textarea value={referralForm.reason} onChange={e => setReferralForm(p => ({ ...p, reason: e.target.value }))} rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
                      <div className="flex gap-3 pt-2">
                        <Button type="submit" loading={savingReferral} className="flex-1">Save</Button>
                        <Button type="button" variant="secondary" onClick={() => setShowAddReferral(false)}>Cancel</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROGRESS NOTES TAB ── */}
          {tab === 'notes' && (
            <div className="space-y-4">
              {/* Add note form */}
              <div className="bg-white rounded-xl border p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">New Note</p>
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Date</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={e => setNoteDate(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  rows={3}
                  placeholder="Write client progress, observations, or follow-up actions..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    loading={savingNote}
                    disabled={!noteContent.trim()}
                    onClick={async () => {
                      if (!noteContent.trim()) return;
                      setSavingNote(true);
                      try {
                        const { data, error } = await supabase.from('progress_notes').insert({
                          subject_id: id, user_id: user.id,
                          content: noteContent.trim(), note_date: noteDate,
                        }).select().single();
                        if (error) throw error;
                        setProgressNotes(prev => [data, ...prev]);
                        setNoteContent('');
                        setNoteDate(new Date().toISOString().slice(0, 10));
                        toast.success('Note saved.');
                      } catch { toast.error('Failed to save note.'); }
                      finally { setSavingNote(false); }
                    }}
                  >Save Note</Button>
                </div>
              </div>

              {/* Notes list */}
              {progressNotes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📝</div>
                  <p>No progress notes yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {progressNotes.map(note => (
                    <div key={note.id} className="bg-white rounded-xl border p-4">
                      {editingNote === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editNoteContent}
                            onChange={e => setEditNoteContent(e.target.value)}
                            rows={3}
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="secondary" onClick={() => setEditingNote(null)}>Cancel</Button>
                            <Button size="sm" onClick={async () => {
                              if (!editNoteContent.trim()) return;
                              try {
                                const { data, error } = await supabase.from('progress_notes')
                                  .update({ content: editNoteContent.trim(), updated_at: new Date().toISOString() })
                                  .eq('id', note.id).select().single();
                                if (error) throw error;
                                setProgressNotes(prev => prev.map(n => n.id === note.id ? data : n));
                                setEditingNote(null);
                                toast.success('Note updated.');
                              } catch { toast.error('Failed to update note.'); }
                            }}>Save</Button>
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
                              <button
                                onClick={() => { setEditingNote(note.id); setEditNoteContent(note.content); }}
                                className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                              >Edit</button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm('Delete this note?')) return;
                                  try {
                                    const { error } = await supabase.from('progress_notes').delete().eq('id', note.id);
                                    if (error) throw error;
                                    setProgressNotes(prev => prev.filter(n => n.id !== note.id));
                                    toast.success('Note deleted.');
                                  } catch { toast.error('Failed to delete note.'); }
                                }}
                                className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >Delete</button>
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

          {/* ── APPOINTMENTS TAB ── */}
          {tab === 'appointments' && (
            <div className="space-y-2">
              {appointments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📅</div>
                  <p>No appointment records.</p>
                </div>
              ) : appointments.map(a => {
                const displayDate = a.confirmed_date || a.requested_date;
                const displayTime = a.confirmed_time || a.requested_time;
                const badgeColor = a.status === 'confirmed' ? 'green' : a.status === 'completed' ? 'blue' : a.status === 'cancelled' ? 'gray' : 'yellow';
                const badgeLabel = a.status === 'confirmed' ? 'Confirmed' : a.status === 'completed' ? 'Completed' : a.status === 'cancelled' ? 'Cancelled' : 'Pending';
                return (
                  <div key={a.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{format(parseISO(displayDate), 'dd MMM yyyy')} · {displayTime?.slice(0, 5)}</p>
                        {a.presenting_issue && <p className="text-sm text-gray-500 italic mt-0.5">"{a.presenting_issue}"</p>}
                        {a.counselor_notes && <p className="text-xs text-gray-400 mt-1">Notes: {a.counselor_notes}</p>}
                      </div>
                      <Badge color={badgeColor}>{badgeLabel}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Team Referral Modal */}
      {showTeamReferral && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Refer to Another Counselor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receiving Counselor</label>
                <select
                  value={teamReferralForm.to_email}
                  onChange={e => setTeamReferralForm(f => ({ ...f, to_email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">-- Select team member --</option>
                  {teamMembers.map(m => (
                    <option key={m.email} value={m.email}>{m.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Referral</label>
                <input
                  type="text"
                  value={teamReferralForm.reason}
                  onChange={e => setTeamReferralForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. specialist expertise in family crisis"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes (optional)</label>
                <textarea
                  value={teamReferralForm.notes}
                  onChange={e => setTeamReferralForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => { setShowTeamReferral(false); setTeamReferralForm({ to_email: '', reason: '', notes: '' }); }}>Cancel</Button>
                <Button
                  className="flex-1"
                  loading={savingTeamReferral}
                  disabled={!teamReferralForm.to_email || !teamReferralForm.reason.trim()}
                  onClick={async () => {
                    setSavingTeamReferral(true);
                    try {
                      const { data, error } = await supabase.from('team_referrals').insert({
                        from_user_id: user.id,
                        subject_id: id,
                        to_email: teamReferralForm.to_email,
                        reason: teamReferralForm.reason.trim(),
                        notes: teamReferralForm.notes.trim() || null,
                      }).select().single();
                      if (error) throw error;
                      setTeamReferrals(prev => [data, ...prev]);
                      setShowTeamReferral(false);
                      setTeamReferralForm({ to_email: '', reason: '', notes: '' });
                      toast.success('Referral sent to ' + teamReferralForm.to_email);
                    } catch { toast.error('Failed to send referral.'); }
                    finally { setSavingTeamReferral(false); }
                  }}
                >Send Referral</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
