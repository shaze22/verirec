import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { useBillingStore } from '../../store/billingStore.js';
import { supabase } from '../../lib/supabase.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { format, parseISO } from 'date-fns';
import { importFromStoragePath } from '../../api/whisper.js';
import { generateReport, generateDocument, analyseContradictions } from '../../api/claude.js';
import { updateSession } from '../../api/sessions.js';
import toast from 'react-hot-toast';
import { ASSESSMENTS, ASSESSMENT_LIST, BADGE_COLORS } from '../../data/assessments.js';
import { getConsentDetail, withdrawConsent, getCounselorLetterhead } from '../../api/consent.js';
import { downloadConsentPdf } from '../../lib/consentPdf.js';
import { downloadLetterPdf } from '../../lib/letterPdf.js';

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
  const { canStartSession, incrementUsage } = useBillingStore();
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
  const [consentRecord, setConsentRecord] = useState(null);
  const [letterhead, setLetterhead] = useState(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
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
  const [clientRecordings, setClientRecordings] = useState([]);
  const [uploadingRec, setUploadingRec] = useState(false);
  const [recDragging, setRecDragging] = useState(false);
  const recFileRef = useRef(null);
  const rawAudiosRef = useRef([]);
  const urlsResolvedRef = useRef(false);
  const [pendingTranscribeRec, setPendingTranscribeRec] = useState(null); // rec waiting for confirm
  const [transcribeCounselorName, setTranscribeCounselorName] = useState('');
  const [transcribingRec, setTranscribingRec] = useState(null); // rec currently being processed
  const [transcribeStep, setTranscribeStep] = useState(''); // creating|transcribing|generating|done
  const [transcribeDetail, setTranscribeDetail] = useState('');
  const [clientAssessments, setClientAssessments] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTestType, setAssignTestType] = useState('phq9');
  const [assigning, setAssigning] = useState(false);
  const [viewingResult, setViewingResult] = useState(null);
  const [noteType, setNoteType] = useState('free');
  const [soapForm, setSoapForm] = useState({ s: '', o: '', a: '', p: '' });
  const [dapForm, setDapForm] = useState({ d: '', a: '', p: '' });
  const [showDocModal, setShowDocModal] = useState(false);
  const [docType, setDocType] = useState('employment');
  const [docContext, setDocContext] = useState('');
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState('');
  // Fasa 4
  const [clientIntakeForms, setClientIntakeForms] = useState([]);
  const [homework, setHomework] = useState([]);
  const [showAddHomework, setShowAddHomework] = useState(false);
  const [homeworkForm, setHomeworkForm] = useState({ title: '', description: '', due_date: '' });
  const [savingHomework, setSavingHomework] = useState(false);
  // Fasa 6D — Resources
  const [clientResources, setClientResources] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [showAssignResource, setShowAssignResource] = useState(false);
  const [assigningResource, setAssigningResource] = useState(false);
  // Messages
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesLoadedRef = useRef(false);
  // Invoices
  const [clientInvoices, setClientInvoices] = useState([]);
  // Activity log
  const [activityLog, setActivityLog] = useState([]);
  // Reschedule requests
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  // New features
  const [sendingConsentId, setSendingConsentId] = useState(null);
  const [sendingAckId, setSendingAckId] = useState(null);
  const [insightsResult, setInsightsResult] = useState(null);
  const [analysingInsights, setAnalysingInsights] = useState(false);
  const [insightsAnalysedAt, setInsightsAnalysedAt] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('subjects').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('sessions').select('id, title, created_at, duration, report, profession, session_number, risk_level, risk_severity')
        .eq('subject_id', id).order('created_at', { ascending: false }).limit(100),
      supabase.from('appointments').select('id, client_name, client_email, client_phone, requested_date, requested_time, confirmed_date, confirmed_time, status, presenting_issue, counselor_notes, created_at, subject_id, counselor_id, consent_given, consent_given_at')
        .eq('subject_id', id).order('created_at', { ascending: false }).limit(100),
      supabase.from('action_plans').select('id, subject_id, user_id, goals, interventions, follow_up_date, notes, status, created_at, updated_at').eq('subject_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('clinical_referrals').select('id, subject_id, user_id, referral_type, reason, referred_to, status, notes, created_at').eq('subject_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('audio_library').select('id, session_id, storage_path, file_name, duration, created_at, mime_type').eq('subject_id', id).limit(100),
      supabase.from('progress_notes').select('id, subject_id, user_id, note_type, note_data, note_text, note_date, session_id, created_at').eq('subject_id', id).order('note_date', { ascending: false }).order('created_at', { ascending: false }).limit(50),
      supabase.from('team_referrals').select('id, subject_id, from_user_id, to_email, referral_reason, status, created_at').eq('subject_id', id).eq('from_user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('kaunselor_audit_logs').select('action,metadata,created_at').eq('subject_id', id).eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('reschedule_requests').select('id, subject_id, user_id, appointment_id, requested_date, requested_time, reason, status, created_at').eq('subject_id', id).eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
    ]).then(([{ data: c }, { data: s }, { data: a }, { data: plans }, { data: refs }, { data: audios }, { data: notes }, { data: trefs }, { data: alogs }, { data: rreqs }]) => {
      if (!c) { navigate('/kaunselor/clients'); return; }
      setClient(c);
      setEditForm(c);
      setSessions(s || []);
      setAppointments(a || []);
      setActionPlans(plans || []);
      setReferrals(refs || []);
      setProgressNotes(notes || []);
      setTeamReferrals(trefs || []);
      setActivityLog(alogs || []);
      setRescheduleRequests(rreqs || []);
      // Store raw metadata; resolve signed URLs lazily when user opens Sessions/Recordings tab
      rawAudiosRef.current = audios || [];
      // Show count in tab without URLs
      setClientRecordings((audios || []).filter(a => !a.session_id));
    }).finally(() => setLoading(false));

    // Fetch team members (active only) for referral dropdown
    supabase.from('team_members').select('email, role')
      .eq('status', 'active')
      .then(({ data }) => setTeamMembers(data || []));

    // Fetch assessments assigned to this client
    supabase.from('client_assessments')
      .select('id, subject_id, user_id, test_id, token, status, scores, interpretation, assigned_at, completed_at, expires_at')
      .eq('subject_id', id)
      .eq('user_id', user.id)
      .order('assigned_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setClientAssessments(data || []));

    // Fasa 4 — intake forms and homework
    supabase.from('client_intake_forms')
      .select('id, subject_id, user_id, token, status, assigned_at, completed_at, expires_at, form_answers')
      .eq('subject_id', id)
      .eq('user_id', user.id)
      .order('assigned_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setClientIntakeForms(data || []));

    supabase.from('client_homework')
      .select('id, subject_id, user_id, title, description, due_date, status, created_at')
      .eq('subject_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setHomework(data || []));

    // Fasa 6D — assigned resources for this client
    supabase.from('client_resource_assignments')
      .select('id, subject_id, user_id, resource_id, assigned_at, viewed_at, psychoed_resources(id, title, description, resource_type, url, file_path)')
      .eq('subject_id', id)
      .eq('user_id', user.id)
      .order('assigned_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setClientResources(data || []));

    // All resources in counselor library (for assign dropdown)
    supabase.from('psychoed_resources')
      .select('id, user_id, title, description, resource_type, url, file_path, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setAllResources(data || []));

    // Invoices for this client
    supabase.from('counselor_invoices')
      .select('id, subject_id, user_id, invoice_number, invoice_date, due_date, status, line_items, total_amount, notes, created_at')
      .eq('subject_id', id)
      .eq('user_id', user.id)
      .order('invoice_date', { ascending: false })
      .limit(50)
      .then(({ data }) => setClientInvoices(data || []));
  }, [id, user]);

  // Resolve signed URLs lazily when user opens Sessions or Recordings tab
  useEffect(() => {
    if (!['sessions', 'recordings'].includes(tab)) return;
    if (urlsResolvedRef.current) return;
    if (!rawAudiosRef.current.length) return;
    urlsResolvedRef.current = true;
    const audios = rawAudiosRef.current;
    const sessionMap = {};
    const standalone = [];
    Promise.all(audios.map(async (audio) => {
      const { data } = await supabase.storage.from('recordings').createSignedUrl(audio.storage_path, 3600);
      if (data?.signedUrl) {
        if (audio.session_id) {
          sessionMap[audio.session_id] = { url: data.signedUrl, duration: audio.duration };
        } else {
          standalone.push({ ...audio, url: data.signedUrl });
        }
      }
    })).then(() => {
      setAudioMap({ ...sessionMap });
      setClientRecordings(standalone);
    }).catch(() => {});
  }, [tab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('subjects')
        .update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setClient(editForm);
      setEditing(false);
      logActivity('client_updated');
      toast.success('Client information updated.');
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const startNewSession = () => {
    navigate(`/kaunselor/clients/${id}/upload-session`);
  };

  const loadConsent = async () => {
    setConsentLoading(true);
    try { setConsentRecord(await getConsentDetail(id)); }
    catch (err) { console.error('consent load failed:', err?.message); }
    finally { setConsentLoading(false); }
  };
  useEffect(() => { if (user && id) loadConsent(); }, [user, id]);
  useEffect(() => { if (user?.id) getCounselorLetterhead(user.id).then(setLetterhead).catch(() => {}); }, [user?.id]);

  const handleWithdrawConsent = async () => {
    if (!consentRecord) return;
    if (!window.confirm('Withdraw this client’s active consent? They will need to sign a new consent before the next session.')) return;
    setWithdrawing(true);
    try {
      await withdrawConsent(consentRecord.id);
      toast.success('Consent withdrawn.');
      await loadConsent();
      setShowConsentModal(false);
    } catch (err) { toast.error(err.message || 'Failed to withdraw consent.'); }
    finally { setWithdrawing(false); }
  };

  const handleDownloadConsent = async () => {
    if (!consentRecord) return;
    setPdfBusy(true);
    try { await downloadConsentPdf(consentRecord, { clientName: client?.name, counselorName, profile: letterhead }); }
    catch (err) { toast.error(err.message || 'Failed to generate PDF.'); }
    finally { setPdfBusy(false); }
  };

  const updateRiskLevel = async (risk_level) => {
    const prev = client.risk_level;
    setClient(c => ({ ...c, risk_level }));
    const { error } = await supabase.from('subjects').update({ risk_level }).eq('id', id).eq('user_id', user.id);
    if (error) {
      setClient(c => ({ ...c, risk_level: prev }));
      toast.error('Failed to update risk level.');
      console.error('updateRiskLevel error:', error);
    }
  };

  const toggleProblemType = async (type) => {
    const current = client.problem_types || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setClient(c => ({ ...c, problem_types: updated }));
    setEditForm(f => ({ ...f, problem_types: updated }));
    const { error } = await supabase.from('subjects').update({ problem_types: updated }).eq('id', id).eq('user_id', user.id);
    if (error) {
      setClient(c => ({ ...c, problem_types: current }));
      setEditForm(f => ({ ...f, problem_types: current }));
      toast.error('Failed to update problem types.');
      console.error('toggleProblemType error:', error);
    }
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
      logActivity('plan_created');
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
      logActivity('referral_created', { referred_to: referralForm.referred_to });
      toast.success('Referral added.');
    } catch { toast.error('Failed to save.'); }
    finally { setSavingReferral(false); }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      let content, note_type, note_data;
      if (noteType === 'soap') {
        if (!soapForm.s.trim()) { toast.error('Subjective (S) is required.'); setSavingNote(false); return; }
        note_type = 'soap';
        note_data = { ...soapForm };
        content = `SOAP: ${soapForm.s.slice(0, 80)}${soapForm.s.length > 80 ? '...' : ''}`;
      } else if (noteType === 'dap') {
        if (!dapForm.d.trim()) { toast.error('Data (D) is required.'); setSavingNote(false); return; }
        note_type = 'dap';
        note_data = { ...dapForm };
        content = `DAP: ${dapForm.d.slice(0, 80)}${dapForm.d.length > 80 ? '...' : ''}`;
      } else {
        if (!noteContent.trim()) return;
        note_type = 'free';
        note_data = null;
        content = noteContent.trim();
      }
      const { data, error } = await supabase.from('progress_notes').insert({
        subject_id: id, user_id: user.id,
        content, note_date: noteDate, note_type, note_data,
      }).select().single();
      if (error) throw error;
      setProgressNotes(prev => [data, ...prev]);
      setNoteContent('');
      setNoteDate(new Date().toISOString().slice(0, 10));
      setSoapForm({ s: '', o: '', a: '', p: '' });
      setDapForm({ d: '', a: '', p: '' });
      logActivity('note_created', { note_type: note_type });
      toast.success('Note saved.');
    } catch { toast.error('Failed to save note.'); }
    finally { setSavingNote(false); }
  };

  const handlePrintNote = (note) => {
    const counselorName = user?.user_metadata?.full_name || 'Counselor';
    const noteDateFmt = format(parseISO(note.note_date), 'dd MMMM yyyy');
    let bodyContent = '';
    if (note.note_type === 'soap' && note.note_data) {
      const { s, o, a, p } = note.note_data;
      bodyContent = [
        s ? `<div class="section"><div class="sec-label">S — Subjective</div><div class="sec-body">${s.replace(/\n/g,'<br/>')}</div></div>` : '',
        o ? `<div class="section"><div class="sec-label">O — Objective</div><div class="sec-body">${o.replace(/\n/g,'<br/>')}</div></div>` : '',
        a ? `<div class="section"><div class="sec-label">A — Assessment</div><div class="sec-body">${a.replace(/\n/g,'<br/>')}</div></div>` : '',
        p ? `<div class="section"><div class="sec-label">P — Plan</div><div class="sec-body">${p.replace(/\n/g,'<br/>')}</div></div>` : '',
      ].join('');
    } else if (note.note_type === 'dap' && note.note_data) {
      const { d, a, p } = note.note_data;
      bodyContent = [
        d ? `<div class="section"><div class="sec-label">D — Data</div><div class="sec-body">${d.replace(/\n/g,'<br/>')}</div></div>` : '',
        a ? `<div class="section"><div class="sec-label">A — Assessment</div><div class="sec-body">${a.replace(/\n/g,'<br/>')}</div></div>` : '',
        p ? `<div class="section"><div class="sec-label">P — Plan</div><div class="sec-body">${p.replace(/\n/g,'<br/>')}</div></div>` : '',
      ].join('');
    } else {
      bodyContent = `<div class="sec-body">${(note.content || '').replace(/\n/g,'<br/>')}</div>`;
    }
    const win = window.open('', '_blank', 'width=794,height=1123');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Session Note — ${client.name}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:11px;padding:40px;color:#111;line-height:1.6}
        .header{text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:16px}
        .header h1{font-size:13px;text-transform:uppercase;margin:0 0 2px}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;font-size:11px}
        .meta-row{display:flex;gap:6px}.meta-label{color:#666;width:70px;flex-shrink:0}
        .section{margin-bottom:12px;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden}
        .sec-label{background:#f3f4f6;padding:5px 10px;font-weight:bold;font-size:9px;text-transform:uppercase;color:#374151;letter-spacing:0.5px}
        .sec-body{padding:10px;font-size:11px;line-height:1.6;min-height:32px}
        .sig{margin-top:28px;border-top:1px solid #333;padding-top:4px;font-size:10px}
        .footer{margin-top:20px;font-size:8px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:6px}
        @media print{body{padding:20px}}
      </style></head><body>
      <div class="header">
        <h1>COUNSELING PROGRESS NOTE</h1>
        <p>${note.note_type === 'soap' ? 'SOAP Format' : note.note_type === 'dap' ? 'DAP Format' : 'Progress Note'}</p>
      </div>
      <div class="meta">
        <div class="meta-row"><span class="meta-label">Client</span><strong>${client.name}</strong></div>
        <div class="meta-row"><span class="meta-label">Date</span><strong>${noteDateFmt}</strong></div>
        <div class="meta-row"><span class="meta-label">IC / ID</span><span>${client.ic_number || '—'}</span></div>
        <div class="meta-row"><span class="meta-label">Sessions</span><span>${sessions.length} total</span></div>
      </div>
      ${bodyContent}
      <div class="sig"><strong>${counselorName}</strong><br/>Registered Counselor · Date: ${format(new Date(),'dd/MM/yyyy')}</div>
      <div class="footer">STRICTLY CONFIDENTIAL — Kaunselor Platform — kaunselor.app</div>
      <script>window.onload=function(){window.print()}</script>
    </body></html>`);
    win.document.close();
  };

  const handleUploadRecording = async (file) => {
    if (file.size > 500 * 1024 * 1024) { toast.error('File exceeds 500MB limit.'); return; }
    setUploadingRec(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/clients/${id}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from('recordings')
        .upload(storagePath, file, { contentType: file.type || 'audio/mpeg', upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: row, error: dbErr } = await supabase.from('audio_library').insert({
        user_id: user.id,
        subject_id: id,
        session_id: null,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'audio/mpeg',
      }).select().single();
      if (dbErr) throw dbErr;

      const { data: signed } = await supabase.storage.from('recordings').createSignedUrl(storagePath, 3600);
      setClientRecordings(prev => [...prev, { ...row, url: signed?.signedUrl }]);
      toast.success('Recording uploaded.');
    } catch (err) {
      toast.error(err.message || 'Upload failed.');
    } finally {
      setUploadingRec(false);
      if (recFileRef.current) recFileRef.current.value = '';
    }
  };

  const handleDeleteRecording = async (rec) => {
    if (!window.confirm('Delete this recording?')) return;
    try {
      await supabase.storage.from('recordings').remove([rec.storage_path]);
      await supabase.from('audio_library').delete().eq('id', rec.id);
      setClientRecordings(prev => prev.filter(r => r.id !== rec.id));
      toast.success('Recording deleted.');
    } catch { toast.error('Failed to delete recording.'); }
  };

  const openTranscribeModal = (rec) => {
    if (!canStartSession()) {
      toast.error('Session limit reached. Please upgrade or purchase more sessions.');
      return;
    }
    setPendingTranscribeRec(rec);
    setTranscribeCounselorName(user?.user_metadata?.full_name || '');
  };

  const handleTranscribeRecording = async () => {
    const rec = pendingTranscribeRec;
    if (!rec) return;
    setPendingTranscribeRec(null);
    setTranscribingRec(rec);
    setTranscribeStep('creating');
    setTranscribeDetail('');
    let sessionId = null;

    try {
      const title = `Counseling Session — ${client.name}`;
      const { data: session, error: sessionErr } = await supabase.from('sessions').insert({
        user_id: user.id,
        title,
        profession: 'counselor',
        interviewer: transcribeCounselorName.trim() || user?.email || '',
        subject_name: client.name,
        subject_id: id,
        consent_signed: true,
        consent_data: { items: ['Transcribed from uploaded recording'], subject_name: client.name, import_mode: true },
        recording_status: 'in_progress',
      }).select().single();
      if (sessionErr) throw sessionErr;
      sessionId = session.id;

      const usageResult = await incrementUsage();
      if (usageResult?.error) throw new Error(
        usageResult.error === 'limit_reached'
          ? 'Session limit reached. Please upgrade or purchase more sessions.'
          : 'Failed to update session count.'
      );

      // Link audio_library row to this session
      await supabase.from('audio_library').update({ session_id: sessionId }).eq('id', rec.id).catch(() => {});

      setTranscribeStep('transcribing');
      setTranscribeDetail('Transcribing with Gemini AI — this may take a few minutes...');
      const utterances = await importFromStoragePath({
        storagePath: rec.storage_path,
        interviewer: transcribeCounselorName.trim(),
        subject_name: client.name,
      });
      setTranscribeDetail('');

      const speakers = [...new Set(utterances.map(u => u.speaker))].sort();
      const speakerMap = {};
      speakers.forEach((sp, i) => {
        speakerMap[sp] = i === 0
          ? (transcribeCounselorName.trim() || 'Counselor')
          : client.name;
      });

      const transcript = utterances.map(u => ({
        id: crypto.randomUUID(),
        type: 'TRANSCRIPT',
        text: u.text,
        speaker: speakerMap[u.speaker],
        identified_name: u.identified_name || null,
        timestamp: new Date(Date.now() - ((utterances.at(-1)?.end ?? 0) - u.start)).toISOString(),
      }));

      const totalDuration = utterances.length > 0
        ? Math.round((utterances.at(-1)?.end ?? 0) / 1000)
        : 0;

      await updateSession(sessionId, {
        transcript,
        duration: totalDuration,
        recording_status: 'completed',
        synced: true,
      });

      setTranscribeStep('generating');
      setTranscribeDetail('');
      await generateReport({
        session_id: sessionId,
        transcript,
        flags: [],
        session_info: {
          profession: 'counselor',
          title,
          subject_name: client.name,
          subject_role: '',
          context_notes: '',
          duration: totalDuration,
          interviewer: transcribeCounselorName.trim(),
        },
      });

      setTranscribeStep('done');
      toast.success('Transcription complete! Redirecting to session report...');
      setTimeout(() => navigate(`/session/${sessionId}`), 1200);

    } catch (err) {
      console.error('Transcribe error:', err);
      toast.error(err.message || 'Transcription failed. Please try again.');
      if (sessionId) {
        await updateSession(sessionId, { recording_status: 'completed' }).catch(() => {});
      }
      setTranscribingRec(null);
      setTranscribeStep('');
      setTranscribeDetail('');
    }
  };

  // Fire-and-forget audit logger
  const logActivity = (action, metadata = {}) => {
    if (!user || !id) return;
    supabase.from('kaunselor_audit_logs').insert({ user_id: user.id, subject_id: id, action, metadata }).then(() => {}).catch(() => {});
  };

  // Lazy-load messages when tab opens
  useEffect(() => {
    if (tab !== 'messages' || messagesLoadedRef.current || !user) return;
    messagesLoadedRef.current = true;
    supabase.from('portal_messages')
      .select('*').eq('subject_id', id).eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data || []);
        const unreadIds = (data || []).filter(m => m.sender_role === 'client' && !m.read_at).map(m => m.id);
        if (unreadIds.length) {
          supabase.from('portal_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds).then(() => {}).catch(() => {});
        }
      });
  }, [tab, id, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const { data, error } = await supabase.from('portal_messages').insert({
        subject_id: id,
        user_id: user.id,
        sender_role: 'counselor',
        message: newMessage.trim(),
      }).select().single();
      if (error) throw error;
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch { toast.error('Failed to send message.'); }
    finally { setSendingMessage(false); }
  };

  const handleHandleReschedule = async (reqId) => {
    try {
      await supabase.from('reschedule_requests').update({ status: 'handled' }).eq('id', reqId);
      setRescheduleRequests(prev => prev.filter(r => r.id !== reqId));
      toast.success('Request marked as handled.');
    } catch { toast.error('Failed to update.'); }
  };

  const handleSendReminder = (appt) => {
    const displayDate = appt.confirmed_date || appt.requested_date;
    const displayTime = appt.confirmed_time || appt.requested_time;
    const counselorName = user?.user_metadata?.full_name || 'Your Counselor';
    const dateStr = displayDate ? format(parseISO(displayDate), 'EEEE, d MMMM yyyy') : 'the scheduled date';
    const timeStr = displayTime ? displayTime.slice(0, 5) : 'the scheduled time';
    const msg = `Dear ${client.name},\n\nThis is a reminder for your counseling session:\n\nDate: ${dateStr}\nTime: ${timeStr}\nCounselor: ${counselorName}\n\nPlease be on time. Reply if you need to reschedule.\n\n— ${counselorName}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSendConsentForm = async (appt) => {
    setSendingConsentId(appt.id);
    try {
      const counselorName = user?.user_metadata?.full_name || 'Your Counselor';
      const { data, error } = await supabase.from('counselor_consent_requests').insert({
        user_id: user.id,
        appointment_id: appt.id,
        subject_name: client.name,
        counselor_name: counselorName,
        purpose: 'Counseling Session',
      }).select('token').single();
      if (error) throw error;
      const link = `${window.location.origin}/counselor-consent/${data.token}`;
      const msg = `Dear ${client.name},\n\nPlease complete your consent form before our session:\n\n${link}\n\nThis link expires in 7 days.\n\n— ${counselorName}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    } catch {
      toast.error('Failed to create consent form. Please try again.');
    } finally {
      setSendingConsentId(null);
    }
  };

  const handleSendAck = async (session) => {
    setSendingAckId(session.id);
    try {
      const counselorName = user?.user_metadata?.full_name || 'Your Counselor';
      const sessionSummary = session.report?.summary ||
        (session.report?.caseSessionNote?.presentedIssue ? `Presented issue: ${session.report.caseSessionNote.presentedIssue}` : 'Session completed.');
      const { data, error } = await supabase.from('counselor_session_acks').insert({
        user_id: user.id,
        session_id: session.id,
        client_name: client.name,
        session_summary: sessionSummary,
      }).select('token').single();
      if (error) throw error;
      const link = `${window.location.origin}/counselor-ack/${data.token}`;
      const msg = `Dear ${client.name},\n\nPlease review your session summary and acknowledge:\n\n${link}\n\nThis link is valid for 30 days.\n\n— ${counselorName}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    } catch {
      toast.error('Failed to create acknowledgement. Please try again.');
    } finally {
      setSendingAckId(null);
    }
  };

  const handleAnalyseContradictions = async () => {
    setAnalysingInsights(true);
    setInsightsResult(null);
    try {
      // Fetch sessions with transcripts
      const { data: sessionsWithTranscripts } = await supabase
        .from('sessions')
        .select('id, title, created_at, transcript')
        .eq('subject_id', id)
        .not('transcript', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      const transcriptSessions = (sessionsWithTranscripts || [])
        .filter(s => Array.isArray(s.transcript) && s.transcript.length > 0)
        .reverse()
        .map(s => ({
          date: format(parseISO(s.created_at), 'dd MMM yyyy'),
          title: s.title,
          entries: s.transcript,
        }));

      // Build pseudo-sessions from progress notes when transcripts are scarce
      const noteSessions = progressNotes.slice(0, 10).reverse().map(note => {
        let text = note.content || '';
        if (note.note_type === 'soap' && note.note_data) {
          const { s, o, a, p } = note.note_data;
          text = [s && `S: ${s}`, o && `O: ${o}`, a && `A: ${a}`, p && `P: ${p}`].filter(Boolean).join('\n');
        } else if (note.note_type === 'dap' && note.note_data) {
          const { d, a, p } = note.note_data;
          text = [d && `D: ${d}`, a && `A: ${a}`, p && `P: ${p}`].filter(Boolean).join('\n');
        }
        return text.trim() ? {
          date: note.note_date,
          title: `Progress Note (${(note.note_type || 'free').toUpperCase()})`,
          entries: [{ speaker: 'Client', text }],
        } : null;
      }).filter(Boolean);

      const allSources = [...transcriptSessions, ...noteSessions]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-8);

      if (allSources.length < 2) {
        toast.error('Need at least 2 sessions or progress notes to analyse.');
        return;
      }

      const result = await analyseContradictions({ sessions: allSources });
      setInsightsResult(result);
      setInsightsAnalysedAt(new Date().toISOString());
    } catch (err) {
      toast.error(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalysingInsights(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col h-screen animate-pulse">
      <div className="h-14 bg-white border-b px-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="w-32 h-4 bg-gray-200 rounded" />
      </div>
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-200 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="w-40 h-5 bg-gray-200 rounded" />
            <div className="w-24 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
      <div className="bg-white border-b">
        <div className="grid grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="py-3 flex justify-center"><div className="w-16 h-3 bg-gray-200 rounded" /></div>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-2">
              <div className="w-24 h-3 bg-gray-200 rounded" />
              <div className="w-full h-4 bg-gray-100 rounded" />
              <div className="w-3/4 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (!client) return null;

  const lastSession = sessions[0];
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={client.name} onBack={() => navigate('/kaunselor/clients')} />
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR NAV — desktop only ── */}
        <aside className="hidden md:flex flex-col w-48 border-r bg-white flex-shrink-0">
          <div className="px-3 py-4 border-b">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">
                {client.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                <p className="text-xs text-gray-400">{sessions.length} sessions</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-1">
            {[
              { id: 'overview',     icon: '🏠', label: 'Overview',     count: 0 },
              { id: 'sessions',     icon: '🎙️', label: 'Sessions',     count: sessions.length },
              { id: 'appointments', icon: '📅', label: 'Appointments', count: appointments.length },
              { id: 'plans',        icon: '📌', label: 'Plans',        count: actionPlans.length + referrals.length },
              { id: 'notes',        icon: '📝', label: 'Notes',        count: progressNotes.length },
              { id: 'assessments',  icon: '📊', label: 'Assessments',  count: clientAssessments.length },
              { id: 'insights',     icon: '🔍', label: 'Insights',     count: 0 },
              { id: 'messages',     icon: '💬', label: 'Messages',     count: 0 },
              { id: 'homework',     icon: '✅', label: 'Homework',     count: homework.length },
              { id: 'intake',       icon: '📋', label: 'Intake',       count: 0 },
              { id: 'resources',    icon: '📚', label: 'Resources',    count: clientResources.length },
              { id: 'billing',      icon: '🧾', label: 'Billing',       count: clientInvoices.length },
              { id: 'recordings',   icon: '🎞️', label: 'Recordings',   count: clientRecordings.length },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                  tab === t.id ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'
                }`}>
                {tab === t.id && <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-gradient-to-b from-violet-600 to-fuchsia-600 rounded-r" />}
                <span className="leading-none flex-shrink-0">{t.icon}</span>
                <span className="flex-1 truncate">{t.label}</span>
                {t.count > 0 && <span className="text-xs tabular-nums text-gray-400 font-normal flex-shrink-0">{t.count}</span>}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t">
            <Button onClick={startNewSession} className="w-full text-xs">+ New Session</Button>
          </div>
        </aside>

        {/* ── RIGHT COLUMN — scrollable ── */}
        <div className="flex-1 overflow-auto flex flex-col min-w-0">

          {/* Client header */}
          <div className="bg-white border-b px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="md:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 flex items-center justify-center text-violet-700 font-bold text-base flex-shrink-0">
                  {client.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-base">{client.name}</h2>
                  <p className="text-xs text-gray-400">{[client.phone, client.email].filter(Boolean).join(' · ')} · {sessions.length} sessions · {Math.round(totalDuration / 60)} min</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button onClick={startNewSession} className="hidden md:flex">+ New Session</Button>
                <Button onClick={startNewSession} className="md:hidden text-sm py-1.5 px-3">+ New</Button>
              </div>
            </div>
          </div>

          {/* Mobile tab selector */}
          <div className="md:hidden bg-white border-b px-4 py-2.5 flex-shrink-0">
            <select value={tab} onChange={e => setTab(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {[
                { id: 'overview',     label: 'Overview' },
                { id: 'sessions',     label: `Sessions (${sessions.length})` },
                { id: 'appointments', label: `Appointments (${appointments.length})` },
                { id: 'plans',        label: `Plans (${actionPlans.length + referrals.length})` },
                { id: 'notes',        label: `Notes (${progressNotes.length})` },
                { id: 'assessments',  label: `Assessments (${clientAssessments.length})` },
                { id: 'insights',     label: 'Insights' },
                { id: 'messages',     label: 'Messages' },
                { id: 'homework',     label: `Homework (${homework.length})` },
                { id: 'intake',       label: 'Intake' },
                { id: 'resources',    label: `Resources (${clientResources.length})` },
                { id: 'billing',      label: `Billing (${clientInvoices.length})` },
                { id: 'recordings',   label: `Recordings (${clientRecordings.length})` },
              ].map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div className="p-5 max-w-2xl space-y-4">

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-violet-700">{sessions.length}</p>
                  <p className="text-xs text-violet-600">Sessions</p>
                </div>
                <div className="bg-blue-50 ring-1 ring-blue-100 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{Math.round(totalDuration / 60)}</p>
                  <p className="text-xs text-blue-600">Minutes</p>
                </div>
                <div className={`rounded-2xl p-4 text-center ${RISK_CONFIG[client.risk_level || 'none']?.bg || 'bg-gray-50'}`}>
                  <p className={`text-sm font-bold ${RISK_CONFIG[client.risk_level || 'none']?.text || 'text-gray-600'}`}>
                    {RISK_CONFIG[client.risk_level || 'none']?.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Risk Level</p>
                </div>
              </div>

              {/* Client Portal Access */}
              <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Client Portal Access</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {client.email
                        ? <>Client logs in with <strong className="text-gray-600">{client.email}</strong></>
                        : <span className="text-amber-600">No email registered — portal requires email</span>}
                    </p>
                  </div>
                  <span className="text-xs bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Self-serve</span>
                </div>
                <p className="text-xs text-gray-500 font-mono bg-gray-50 rounded-lg px-3 py-2 mb-3 select-all">https://kaunselor.app/portal</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText('https://kaunselor.app/portal'); toast.success('Portal link copied!'); }}
                    className="flex-1 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
                    Copy Link
                  </button>
                  <button
                    onClick={() => {
                      const phone = (client.phone || '').replace(/\D/g, '');
                      const msg = `Hi ${client.name}, you can now access your counseling portal here:\nhttps://kaunselor.app/portal\n\nLog in using your email: ${client.email || '(your email)'}\n\nYou can view appointments, tasks, assessments and messages from your counselor.`;
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="flex-1 py-2 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                    Share via WhatsApp
                  </button>
                </div>
              </div>

              {/* Informed Consent */}
              <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Informed Consent</h3>
                  {consentRecord && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      consentRecord.status === 'active' ? 'bg-green-100 text-green-700'
                      : consentRecord.status === 'withdrawn' ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {consentRecord.status === 'active' ? 'Active'
                        : consentRecord.status === 'withdrawn' ? 'Withdrawn' : 'Superseded'}
                    </span>
                  )}
                </div>

                {consentLoading ? (
                  <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
                ) : !consentRecord ? (
                  <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-4 text-sm text-amber-700">
                    No consent on file yet. Consent is captured (signed by the client) the first time you start a session.
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Signed by <span className="font-medium text-gray-900">{consentRecord.full_name}</span>
                        {consentRecord.is_guardian ? ' (guardian)' : ''} on{' '}
                        {format(parseISO(consentRecord.signed_at), 'd MMM yyyy, h:mm a')}</p>
                      <p className="text-xs text-gray-400">
                        v{consentRecord.version} · {consentRecord.language?.toUpperCase()}
                        {consentRecord.reaffirmation_count > 0 ? ` · ${consentRecord.reaffirmation_count} re-affirmation(s)` : ''}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">SHA-256: {consentRecord.hash}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={() => setShowConsentModal(true)}
                        className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">
                        View
                      </button>
                      <button onClick={handleDownloadConsent} disabled={pdfBusy}
                        className="px-3 py-2 text-xs font-semibold border border-violet-200 text-violet-700 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-50">
                        {pdfBusy ? 'Preparing…' : 'Download PDF'}
                      </button>
                      {consentRecord.status === 'active' && (
                        <button onClick={handleWithdrawConsent} disabled={withdrawing}
                          className="px-3 py-2 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                          {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Risk level selector */}
              <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
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
              <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
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
                              <div class="field"><div class="label">Full Name</div><div class="value">${client.name||''}</div></div>
                              <div class="field"><div class="label">IC / Passport No.</div><div class="value">${client.ic_number||''}</div></div>
                              <div class="field"><div class="label">Matric / Staff No.</div><div class="value">${client.student_id||''}</div></div>
                              <div class="field"><div class="label">Date of Birth</div><div class="value">${dobFmt}</div></div>
                              <div class="field"><div class="label">Gender</div><div class="value">${client.gender||''}</div></div>
                              <div class="field"><div class="label">Ethnicity</div><div class="value">${client.race||''}</div></div>
                              <div class="field"><div class="label">Religion</div><div class="value">${client.religion||''}</div></div>
                              <div class="field"><div class="label">Marital Status</div><div class="value">${maritalMap[client.marital_status]||''}</div></div>
                              <div class="field"><div class="label">Year of Study</div><div class="value">${client.year_of_study||''}</div></div>
                              <div class="field"><div class="label">Occupation / Programme</div><div class="value">${client.occupation||''}</div></div>
                              <div class="field"><div class="label">Phone No.</div><div class="value">${client.phone||''}</div></div>
                              <div class="field"><div class="label">Email</div><div class="value">${client.email||''}</div></div>
                            </div>
                            <div class="field"><div class="label">Address</div><div class="value">${client.address||''}</div></div>
                            <div class="field"><div class="label">Emergency Contact (Name / Tel.)</div><div class="value">${client.emergency_contact_name||''} ${client.emergency_contact_phone ? '/ '+client.emergency_contact_phone : ''}</div></div>
                            <div class="sec-title" style="margin-top:10px">B. Session Information</div>
                            <div class="grid">
                              <div class="field"><div class="label">Session Type</div><div class="value">${client.session_type==='referred'?'Referred':'Voluntary'}</div></div>
                              <div class="field"><div class="label">Referral Source</div><div class="value">${client.referral_source||''}</div></div>
                            </div>
                            <div class="field"><div class="label">Presenting Issue</div><div class="value" style="min-height:30px">${client.presenting_issue||''}</div></div>
                            <div class="sec-title" style="margin-top:10px">C. Clinical History</div>
                            <div class="checkbox-row"><span class="${client.previous_counseling?'cb checked':'cb'}"></span>Previously received counseling</div>
                            <div class="checkbox-row"><span class="${client.psychiatric_history?'cb checked':'cb'}"></span>Has psychiatric history</div>
                            <div class="checkbox-row"><span class="${client.psychiatric_medication?'cb checked':'cb'}"></span>Currently taking psychiatric medication</div>
                            <div class="checkbox-row"><span class="${client.hostel_resident?'cb checked':'cb'}"></span>Hostel resident</div>
                            <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
                              <div><div style="border-top:1px solid #333;padding-top:4px;margin-top:40px"><strong>${client.name||'___________________'}</strong><br/>Client Signature<br/><span style="font-size:9px">Date: ${format(new Date(),'dd/MM/yyyy')}</span></div></div>
                              <div><div style="border-top:1px solid #333;padding-top:4px;margin-top:40px"><strong>${counselorName}</strong><br/>Counselor Signature<br/><span style="font-size:9px">Date: ${format(new Date(),'dd/MM/yyyy')}</span></div></div>
                            </div>
                            <div class="footer">SULIT — Unit Kaunseling — Kaunselor Platform — kaunselor.app</div>
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
                          className="col-span-2 px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                    ))}
                    {/* Selects */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <label className="text-sm text-gray-500">Marital Status</label>
                      <select value={editForm.marital_status || 'single'} onChange={e => setEditForm(p => ({ ...p, marital_status: e.target.value }))}
                        className="col-span-2 px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <label className="text-sm text-gray-500">Session Type</label>
                      <select value={editForm.session_type || 'voluntary'} onChange={e => setEditForm(p => ({ ...p, session_type: e.target.value }))}
                        className="col-span-2 px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
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
                          className={`w-10 h-5 rounded-full transition-colors ${editForm[f.k] ? 'bg-violet-600' : 'bg-gray-200'}`}>
                          <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${editForm[f.k] ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Session Notes</p>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-sm text-gray-500">Presenting Issue</label>
                      <textarea value={editForm.presenting_issue || ''} onChange={e => setEditForm(p => ({ ...p, presenting_issue: e.target.value }))} rows={2}
                        className="col-span-2 px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-sm text-gray-500">Notes</label>
                      <textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                        className="col-span-2 px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
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
                      ['Date of Birth', client.date_of_birth ? format(new Date(client.date_of_birth), 'dd MMM yyyy') : null],
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
              <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Problem Types (Case Session Note)</h3>
                <div className="flex flex-wrap gap-2">
                  {PROBLEM_TYPES.map(type => (
                    <button key={type} onClick={() => toggleProblemType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        (client.problem_types || []).includes(type)
                          ? 'bg-violet-100 text-violet-700 border-violet-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity log */}
              {activityLog.length > 0 && (
                <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {activityLog.slice(0, 8).map((log, i) => {
                      const labels = {
                        note_created: `📝 Progress note added${log.metadata?.note_type ? ` (${log.metadata.note_type.toUpperCase()})` : ''}`,
                        note_deleted: '🗑 Progress note deleted',
                        session_created: '🎙 Session recorded',
                        client_updated: '✏️ Client profile updated',
                        plan_created: '📌 Action plan added',
                        referral_created: `🏥 Referral created${log.metadata?.referred_to ? ` → ${log.metadata.referred_to}` : ''}`,
                        consent_sent: '📋 Consent form sent',
                        ack_sent: '📨 Acknowledgement sent',
                      };
                      return (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <p className="text-xs text-gray-600">{labels[log.action] || log.action}</p>
                          <p className="text-xs text-gray-400 flex-shrink-0">{format(new Date(log.created_at), 'dd MMM, HH:mm')}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Last session summary */}
              {lastSession?.report && (
                <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
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
                <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4">
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
                <div key={s.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm hover:ring-violet-200 transition-all">
                  <button onClick={() => navigate(`/session/${s.id}`)} className="w-full p-4 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-semibold">Session {sessions.length - i}</span>
                          {s.risk_level && s.risk_level !== 'none' && (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${RISK_CONFIG[s.risk_level]?.bg} ${RISK_CONFIG[s.risk_level]?.text}`}>
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
                  {s.report?.summary && (
                    <div className="px-4 pb-3 pt-2 border-t border-gray-50 flex justify-end">
                      <button
                        onClick={() => handleSendAck(s)}
                        disabled={sendingAckId === s.id}
                        className="text-xs text-violet-600 hover:text-violet-800 border border-violet-200 hover:bg-violet-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      >
                        {sendingAckId === s.id ? 'Sending...' : '📨 Send for Acknowledgement'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* ── PLANS TAB (action plans + referrals) ── */}
          {tab === 'plans' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Action Plans</p>
              <Button onClick={() => setShowAddPlan(true)} className="w-full">+ New Action Plan</Button>
              {actionPlans.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm">No action plans yet.</p>
                </div>
              ) : actionPlans.map(p => (
                <div key={p.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-2">
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
                  {p.follow_up_date && <p className="text-xs text-violet-600">Follow-up: {format(parseISO(p.follow_up_date), 'dd MMM yyyy')}</p>}
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
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" placeholder="State client goals..." /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Interventions</label>
                        <textarea value={planForm.interventions} onChange={e => setPlanForm(p => ({ ...p, interventions: e.target.value }))} rows={2}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" placeholder="Approach / technique used..." /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Follow-up Date</label>
                        <input type="date" value={planForm.follow_up_date} onChange={e => setPlanForm(p => ({ ...p, follow_up_date: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Notes</label>
                        <input type="text" value={planForm.notes} onChange={e => setPlanForm(p => ({ ...p, notes: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Additional notes..." /></div>
                      <div className="flex gap-3 pt-2">
                        <Button type="submit" loading={savingPlan} className="flex-1">Save</Button>
                        <Button type="button" variant="secondary" onClick={() => setShowAddPlan(false)}>Cancel</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Referrals */}
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Referrals</p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowAddReferral(true)} className="flex-1">+ Professional Referral</Button>
                  {teamMembers.length > 0 && (
                    <Button variant="secondary" onClick={() => setShowTeamReferral(true)} className="flex-1">👥 Refer to Counselor</Button>
                  )}
                </div>
                {teamReferrals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team Referrals</p>
                    {teamReferrals.map(tr => (
                      <div key={tr.id} className="bg-violet-50 ring-1 ring-violet-100 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-violet-900">→ {tr.to_email}</p>
                            <p className="text-xs text-violet-700 mt-0.5">{tr.reason}</p>
                            {tr.notes && <p className="text-xs text-violet-600 italic mt-0.5">{tr.notes}</p>}
                            <p className="text-xs text-violet-400 mt-1">{format(parseISO(tr.created_at), 'dd MMM yyyy')}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${tr.status === 'accepted' ? 'bg-green-100 text-green-700' : tr.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {tr.status === 'accepted' ? 'Accepted' : tr.status === 'declined' ? 'Declined' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {referrals.length === 0 && teamReferrals.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">🏥</div>
                    <p className="text-sm">No referrals yet.</p>
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
                        <h1>Counseling Unit</h1>
                        <p>Professional Referral Memo</p>
                      </div>
                      <div style="text-align:center;margin-bottom:20px">
                        <strong style="font-size:13px;text-transform:uppercase;text-decoration:underline">MEMO FOR ADDITIONAL PROFESSIONAL ASSISTANCE</strong>
                      </div>
                      <div class="memo-block">
                        <div class="memo-row"><span class="memo-label">TO</span><span class="memo-value">: ${r.referred_to}</span></div>
                        <div class="memo-row"><span class="memo-label">FROM</span><span class="memo-value">: ${counselorName}, Counseling Unit</span></div>
                        <div class="memo-row"><span class="memo-label">DATE</span><span class="memo-value">: ${refDate}</span></div>
                        <div class="memo-row"><span class="memo-label">REFERRAL TYPE</span><span class="memo-value">: ${REFERRAL_LABELS[r.referral_type]||r.referral_type}</span></div>
                      </div>
                      <div class="subject-box">
                        <strong style="font-size:10px;text-transform:uppercase">Client Information</strong>
                        <div style="margin-top:6px">
                          <div class="subject-row"><span>Name</span><span>: ${client.name||'—'}</span></div>
                          <div class="subject-row"><span>IC / Passport No.</span><span>: ${client.ic_number||'—'}</span></div>
                          <div class="subject-row"><span>Matric / ID No.</span><span>: ${client.student_id||'—'}</span></div>
                          <div class="subject-row"><span>Programme / Year</span><span>: ${client.occupation||'—'} ${client.year_of_study?'/ '+client.year_of_study:''}</span></div>
                          <div class="subject-row"><span>Phone No.</span><span>: ${client.phone||'—'}</span></div>
                        </div>
                      </div>
                      <p class="body-text"><strong>1. Purpose of Referral</strong><br/>
                      This memo refers the above client to ${r.referred_to} for additional professional assistance.</p>
                      <p class="body-text"><strong>2. Reason for Referral</strong><br/>
                      ${r.reason||'Client requires additional professional assessment and support beyond the scope of counseling.'}</p>
                      <p class="body-text"><strong>3. Presenting Issue</strong><br/>
                      ${client.presenting_issue||'Refer to counseling records for further information.'}</p>
                      <p class="body-text" style="font-size:10px;color:#555">* Information in this memo is CONFIDENTIAL and for authorized use only.</p>
                      <div class="sig-block">
                        <div><div class="sig-line"><strong>${counselorName}</strong><br/>Registered Counselor<br/>Date: ${format(new Date(),'dd/MM/yyyy')}</div></div>
                        <div><div class="sig-line">___________________<br/>Recipient Acknowledgment<br/>Date: ___________</div></div>
                      </div>
                      <div class="footer">CONFIDENTIAL — Kaunselor Platform — kaunselor.app</div>
                      <script>window.onload=function(){window.print()}</script>
                    </body></html>`);
                    win.document.close();
                  };
                  return (
                    <div key={r.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{r.referred_to}</p>
                          <p className="text-xs text-gray-500">{REFERRAL_LABELS[r.referral_type] || r.referral_type}</p>
                          {r.reason && <p className="text-sm text-gray-600 mt-1">{r.reason}</p>}
                          <p className="text-xs text-gray-400 mt-1">{format(parseISO(r.created_at), 'dd MMM yyyy')}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button size="sm" variant="secondary" onClick={handlePrintMemo}>🖨 Memo</Button>
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
                            placeholder="e.g. Hospital, Psychiatry..."
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">Referral Type</label>
                          <select value={referralForm.referral_type} onChange={e => setReferralForm(p => ({ ...p, referral_type: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                            {[['psychiatry','Psychiatry'],['hospital','Hospital'],['social_welfare','Social Welfare'],['ngo','NGO / Charity'],['other','Others']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                          </select></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">Reason</label>
                          <textarea value={referralForm.reason} onChange={e => setReferralForm(p => ({ ...p, reason: e.target.value }))} rows={2}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" /></div>
                        <div className="flex gap-3 pt-2">
                          <Button type="submit" loading={savingReferral} className="flex-1">Save</Button>
                          <Button type="button" variant="secondary" onClick={() => setShowAddReferral(false)}>Cancel</Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* Clinical Documents */}
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Clinical Documents</p>
                <Button onClick={() => { setShowDocModal(true); setGeneratedDoc(''); setDocContext(''); }} className="w-full">
                  📄 Generate Support Letter / Report
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => {
                  const caseRef = `Client-${id.slice(0, 6).toUpperCase()}`;
                  const counselorName = user?.user_metadata?.full_name || 'Counselor';
                  const today = format(new Date(), 'dd MMMM yyyy');
                  const riskLabel = { none: 'None', mental_health: 'Mental Health Issue', self_harm: 'Self-Harm Tendency', suicidal: 'Suicidal Tendency' }[client.risk_level || 'none'] || 'None';
                  const problemList = (client.problem_types || []).join(', ') || '—';
                  const sessionCount = sessions.length;
                  const firstDate = sessions.length ? format(parseISO(sessions[sessions.length - 1].created_at), 'dd MMM yyyy') : '—';
                  const lastDate  = sessions.length ? format(parseISO(sessions[0].created_at), 'dd MMM yyyy') : '—';
                  const latestNote = progressNotes.find(n => n.note_type === 'soap' || n.note_type === 'dap' || n.note_type === 'free');
                  const latestPlan = actionPlans[0];
                  const win = window.open('', '_blank', 'width=794,height=1000');
                  win.document.write(`<!DOCTYPE html><html><head>
                    <title>Anonymous Case Summary — ${caseRef}</title>
                    <style>
                      body{font-family:Arial,sans-serif;font-size:11px;padding:36px;color:#111;line-height:1.6}
                      h1{font-size:13px;text-transform:uppercase;text-align:center;margin:0 0 2px;letter-spacing:0.5px}
                      h2{font-size:10px;text-align:center;color:#666;margin:0 0 18px}
                      .badge{display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;padding:2px 8px;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#374151;margin-bottom:14px}
                      .section{margin-bottom:14px}
                      .sec-title{font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:3px;margin-bottom:8px}
                      .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}
                      .field{margin-bottom:4px}
                      .label{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.3px}
                      .value{font-size:11px;font-weight:600;color:#111}
                      .note-body{font-size:11px;line-height:1.7;color:#374151;margin-top:4px;white-space:pre-wrap}
                      .footer{margin-top:24px;font-size:8px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:6px}
                      .warning{font-size:9px;background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:4px 8px;color:#92400e;margin-bottom:12px}
                      @media print{body{padding:20px}}
                    </style></head><body>
                    <h1>Anonymous Case Summary</h1>
                    <h2>For Clinical Supervision Use Only — STRICTLY CONFIDENTIAL</h2>
                    <div class="warning">⚠ All identifying information has been removed. Do not share this document beyond supervision context.</div>
                    <div style="text-align:center"><span class="badge">Case Reference: ${caseRef}</span></div>
                    <div class="section">
                      <div class="sec-title">Case Overview</div>
                      <div class="grid">
                        <div class="field"><div class="label">Case Reference</div><div class="value">${caseRef}</div></div>
                        <div class="field"><div class="label">Total Sessions</div><div class="value">${sessionCount}</div></div>
                        <div class="field"><div class="label">First Session</div><div class="value">${firstDate}</div></div>
                        <div class="field"><div class="label">Last Session</div><div class="value">${lastDate}</div></div>
                        <div class="field"><div class="label">Risk Level</div><div class="value">${riskLabel}</div></div>
                        <div class="field"><div class="label">Gender</div><div class="value">${client.gender || '—'}</div></div>
                        <div class="field"><div class="label">Marital Status</div><div class="value">${client.marital_status || '—'}</div></div>
                        <div class="field"><div class="label">Occupation</div><div class="value">${client.occupation || '—'}</div></div>
                      </div>
                    </div>
                    <div class="section">
                      <div class="sec-title">Presenting Issues</div>
                      <div class="field"><div class="label">Problem Types</div><div class="value">${problemList}</div></div>
                      <div class="field" style="margin-top:6px"><div class="label">Presenting Issue</div><div class="note-body">${client.presenting_issue || '—'}</div></div>
                    </div>
                    ${latestNote ? `<div class="section">
                      <div class="sec-title">Latest Session Note</div>
                      <div class="field"><div class="label">Note Type</div><div class="value">${(latestNote.note_type || 'free').toUpperCase()}</div></div>
                      <div class="note-body">${
                        latestNote.note_type === 'soap' && latestNote.note_data
                          ? `S: ${latestNote.note_data.s || ''}\nO: ${latestNote.note_data.o || ''}\nA: ${latestNote.note_data.a || ''}\nP: ${latestNote.note_data.p || ''}`
                          : latestNote.note_type === 'dap' && latestNote.note_data
                          ? `D: ${latestNote.note_data.d || ''}\nA: ${latestNote.note_data.a || ''}\nP: ${latestNote.note_data.p || ''}`
                          : (latestNote.content || '')
                      }</div>
                    </div>` : ''}
                    ${latestPlan ? `<div class="section">
                      <div class="sec-title">Current Action Plan</div>
                      ${latestPlan.goals?.length ? `<div class="field"><div class="label">Goals</div><div class="note-body">${latestPlan.goals.map(g => `• ${g.goal} [${g.status}]`).join('\n')}</div></div>` : ''}
                      ${latestPlan.interventions?.length ? `<div class="field" style="margin-top:6px"><div class="label">Interventions</div><div class="note-body">${latestPlan.interventions.map(i => `• ${i}`).join('\n')}</div></div>` : ''}
                      ${latestPlan.notes ? `<div class="field" style="margin-top:6px"><div class="label">Notes</div><div class="note-body">${latestPlan.notes}</div></div>` : ''}
                    </div>` : ''}
                    <div style="margin-top:32px;display:flex;gap:40px">
                      <div style="flex:1;border-top:1px solid #333;padding-top:4px;margin-top:40px;font-size:10px"><strong>${counselorName}</strong><br/>Counselor<br/><span style="font-size:9px">Date: ${today}</span></div>
                      <div style="flex:1;border-top:1px solid #333;padding-top:4px;margin-top:40px;font-size:10px">Supervisor<br/>Name: _______________<br/>Date: _______________</div>
                    </div>
                    <div class="footer">ANONYMOUS CASE SUMMARY · For Supervision Only · kaunselor.app</div>
                    <script>window.onload=function(){window.print()}</script>
                  </body></html>`);
                  win.document.close();
                }}>
                  🔒 Generate Anonymous Case Summary
                </Button>
              </div>
            </div>
          )}


          {/* ── PROGRESS NOTES TAB ── */}
          {tab === 'notes' && (
            <div className="space-y-4">
              {/* Add note form */}
              <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">New Note</p>
                  <div className="flex gap-1">
                    {[['free','Free'],['soap','SOAP'],['dap','DAP']].map(([t, label]) => (
                      <button key={t} onClick={() => setNoteType(t)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${noteType === t ? 'bg-violet-100 text-violet-700 border-violet-300' : 'text-gray-400 border-gray-200 hover:text-gray-600'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Date</label>
                  <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>

                {noteType === 'free' && (
                  <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={3}
                    placeholder="Write client progress, observations, or follow-up actions..."
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                )}

                {noteType === 'soap' && (
                  <div className="space-y-2">
                    {[
                      { k: 's', label: 'S — Subjective', ph: 'What the client reports: presenting issue, feelings, direct quotes...', cls: 'border-blue-200 bg-blue-50/40 focus:ring-blue-400', lblCls: 'text-blue-700' },
                      { k: 'o', label: 'O — Objective', ph: 'Counselor observations: behavior, affect, appearance, engagement, test scores...', cls: 'border-green-200 bg-green-50/40 focus:ring-green-400', lblCls: 'text-green-700' },
                      { k: 'a', label: 'A — Assessment', ph: 'Clinical impressions: diagnosis considerations, risk level, progress toward goals...', cls: 'border-violet-200 bg-violet-50/40 focus:ring-violet-400', lblCls: 'text-violet-700' },
                      { k: 'p', label: 'P — Plan', ph: 'Next steps: interventions, referrals, homework, next session focus...', cls: 'border-amber-200 bg-amber-50/40 focus:ring-amber-400', lblCls: 'text-amber-700' },
                    ].map(({ k, label, ph, cls, lblCls }) => (
                      <div key={k}>
                        <label className={`text-xs font-semibold mb-1 block ${lblCls}`}>{label}</label>
                        <textarea value={soapForm[k]} onChange={e => setSoapForm(f => ({ ...f, [k]: e.target.value }))} rows={2}
                          placeholder={ph} className={`w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 resize-none ${cls}`} />
                      </div>
                    ))}
                  </div>
                )}

                {noteType === 'dap' && (
                  <div className="space-y-2">
                    {[
                      { k: 'd', label: 'D — Data', ph: 'Session content: topics discussed, client statements and behaviors...', cls: 'border-blue-200 bg-blue-50/40 focus:ring-blue-400', lblCls: 'text-blue-700' },
                      { k: 'a', label: 'A — Assessment', ph: 'Clinical interpretation: patterns, themes, risk assessment, progress...', cls: 'border-violet-200 bg-violet-50/40 focus:ring-violet-400', lblCls: 'text-violet-700' },
                      { k: 'p', label: 'P — Plan', ph: 'Next steps: therapeutic approach, referrals, client tasks, next session goals...', cls: 'border-amber-200 bg-amber-50/40 focus:ring-amber-400', lblCls: 'text-amber-700' },
                    ].map(({ k, label, ph, cls, lblCls }) => (
                      <div key={k}>
                        <label className={`text-xs font-semibold mb-1 block ${lblCls}`}>{label}</label>
                        <textarea value={dapForm[k]} onChange={e => setDapForm(f => ({ ...f, [k]: e.target.value }))} rows={2}
                          placeholder={ph} className={`w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 resize-none ${cls}`} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button size="sm" loading={savingNote}
                    disabled={noteType === 'free' ? !noteContent.trim() : noteType === 'soap' ? !soapForm.s.trim() : !dapForm.d.trim()}
                    onClick={handleSaveNote}>Save Note</Button>
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
                    <div key={note.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4">
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
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <p className="text-xs text-gray-400">{format(parseISO(note.note_date), 'dd MMM yyyy')}</p>
                                {(note.note_type === 'soap' || note.note_type === 'dap') && (
                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-600">{note.note_type.toUpperCase()}</span>
                                )}
                              </div>
                              {note.note_type === 'soap' && note.note_data ? (
                                <div className="space-y-2 text-sm">
                                  {[['s','S — Subjective'],['o','O — Objective'],['a','A — Assessment'],['p','P — Plan']].map(([k, label]) =>
                                    note.note_data[k] ? (
                                      <div key={k}>
                                        <p className="text-xs font-semibold text-gray-500">{label}</p>
                                        <p className="text-gray-800 whitespace-pre-wrap">{note.note_data[k]}</p>
                                      </div>
                                    ) : null
                                  )}
                                </div>
                              ) : note.note_type === 'dap' && note.note_data ? (
                                <div className="space-y-2 text-sm">
                                  {[['d','D — Data'],['a','A — Assessment'],['p','P — Plan']].map(([k, label]) =>
                                    note.note_data[k] ? (
                                      <div key={k}>
                                        <p className="text-xs font-semibold text-gray-500">{label}</p>
                                        <p className="text-gray-800 whitespace-pre-wrap">{note.note_data[k]}</p>
                                      </div>
                                    ) : null
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {(note.note_type === 'soap' || note.note_type === 'dap') ? (
                                <button onClick={() => handlePrintNote(note)}
                                  className="text-xs text-violet-600 hover:text-violet-800 px-2 py-1 rounded hover:bg-violet-50 transition-colors">Print</button>
                              ) : (
                                <button onClick={() => { setEditingNote(note.id); setEditNoteContent(note.content); }}
                                  className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors">Edit</button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!window.confirm('Delete this note?')) return;
                                  try {
                                    const { error } = await supabase.from('progress_notes').delete().eq('id', note.id);
                                    if (error) throw error;
                                    setProgressNotes(prev => prev.filter(n => n.id !== note.id));
                                    logActivity('note_deleted');
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

          {/* ── ASSESSMENTS TAB ── */}
          {tab === 'assessments' && (
            <div className="space-y-4">
              <Button onClick={() => setShowAssignModal(true)} className="w-full bg-violet-600 hover:bg-violet-700">
                + Assign New Assessment
              </Button>

              {/* Outcome Trends */}
              {(() => {
                const done = clientAssessments.filter(a => a.status === 'completed');
                const phq9  = done.filter(a => a.test_type === 'phq9').sort((a,b) => new Date(a.completed_at)-new Date(b.completed_at));
                const gad7  = done.filter(a => a.test_type === 'gad7').sort((a,b) => new Date(a.completed_at)-new Date(b.completed_at));
                const d21   = done.filter(a => a.test_type === 'dass21').sort((a,b) => new Date(a.completed_at)-new Date(b.completed_at));
                if (phq9.length < 2 && gad7.length < 2 && d21.length < 2) return null;
                return (
                  <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-4">
                    <p className="text-sm font-semibold text-gray-800">Progress Trends</p>
                    {phq9.length >= 2 && (
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">PHQ-9 — Depression (0–27)</p>
                        <TrendChart
                          data={phq9.map(a => ({ date: a.completed_at, score: a.scores?.total ?? 0 }))}
                          maxScore={27}
                          color="#2563eb"
                          zones={[{min:20,max:27,fill:'#ef4444'},{min:15,max:20,fill:'#f97316'},{min:10,max:15,fill:'#f59e0b'},{min:5,max:10,fill:'#eab308'},{min:0,max:5,fill:'#22c55e'}]}
                        />
                      </div>
                    )}
                    {gad7.length >= 2 && (
                      <div>
                        <p className="text-xs font-medium text-purple-600 mb-1">GAD-7 — Anxiety (0–21)</p>
                        <TrendChart
                          data={gad7.map(a => ({ date: a.completed_at, score: a.scores?.total ?? 0 }))}
                          maxScore={21}
                          color="#7c3aed"
                          zones={[{min:15,max:21,fill:'#ef4444'},{min:10,max:15,fill:'#f97316'},{min:5,max:10,fill:'#f59e0b'},{min:0,max:5,fill:'#22c55e'}]}
                        />
                      </div>
                    )}
                    {d21.length >= 2 && (
                      <div>
                        <p className="text-xs font-medium text-indigo-600 mb-1">DASS-21 (0–42 per scale)</p>
                        <MultiTrendChart
                          data={d21.map(a => ({ date: a.completed_at, depression: a.scores?.depression??0, anxiety: a.scores?.anxiety??0, stress: a.scores?.stress??0 }))}
                          maxScore={42}
                          lines={[{key:'depression',color:'#1d4ed8'},{key:'anxiety',color:'#7c3aed'},{key:'stress',color:'#d97706'}]}
                        />
                        <div className="flex gap-3 mt-1">
                          {[['#1d4ed8','Depression'],['#7c3aed','Anxiety'],['#d97706','Stress']].map(([c,l])=>(
                            <div key={l} className="flex items-center gap-1">
                              <div className="w-4 h-0.5 rounded" style={{background:c}} />
                              <span className="text-xs text-gray-400">{l}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {clientAssessments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm">No assessments assigned yet.</p>
                  <p className="text-xs mt-1 text-gray-300">Assign a test to get a shareable link for the client.</p>
                </div>
              ) : clientAssessments.map(a => {
                const test = ASSESSMENTS[a.test_type];
                const isExpired = new Date(a.expires_at) < new Date();
                const statusColor = a.status === 'completed' ? 'bg-green-100 text-green-700' : isExpired ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700';
                const statusLabel = a.status === 'completed' ? 'Completed' : isExpired ? 'Expired' : 'Pending';
                const link = `${window.location.origin}/assess/${a.token}`;
                let interpretation = null;
                try { if (a.interpretation) interpretation = JSON.parse(a.interpretation); } catch {}

                return (
                  <div key={a.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${BADGE_COLORS[test?.badgeColor] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {test?.name || a.test_type}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{test?.fullName || a.test_type}</p>
                        <p className="text-xs text-gray-400">
                          Assigned {format(parseISO(a.assigned_at), 'dd MMM yyyy')}
                          {a.completed_at && ` · Completed ${format(parseISO(a.completed_at), 'dd MMM yyyy')}`}
                        </p>
                      </div>
                      {a.status === 'completed' && interpretation && (
                        <button
                          onClick={() => setViewingResult({ assignment: a, test, interpretation, scores: a.scores })}
                          className="text-xs text-violet-600 border border-violet-200 rounded-lg px-2.5 py-1 hover:bg-violet-50 transition-colors flex-shrink-0"
                        >
                          View Results
                        </button>
                      )}
                    </div>

                    {/* Score summary for completed */}
                    {a.status === 'completed' && a.scores && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
                        {a.test_type === 'phq9' && `PHQ-9 Score: ${a.scores.total}/27`}
                        {a.test_type === 'gad7' && `GAD-7 Score: ${a.scores.total}/21`}
                        {a.test_type === 'dass21' && `Depression: ${a.scores.depression} · Anxiety: ${a.scores.anxiety} · Stress: ${a.scores.stress}`}
                        {a.test_type === 'riasec' && interpretation && `Holland Code: ${interpretation.topCode}`}
                        {a.test_type === 'tipi' && 'Big Five profile — click View Results'}
                      </div>
                    )}

                    {/* Copy / share link for pending */}
                    {a.status === 'pending' && !isExpired && (
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={link}
                          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 font-mono truncate"
                        />
                        <button
                          onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copied!'); }}
                          className="text-xs text-violet-600 border border-violet-200 rounded-lg px-2.5 py-1.5 hover:bg-violet-50 transition-colors whitespace-nowrap flex-shrink-0"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Please complete your assessment here:\n${link}`)}`, '_blank')}
                          className="text-xs text-green-700 border border-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-50 transition-colors whitespace-nowrap flex-shrink-0"
                        >
                          WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── RESOURCES TAB ── */}
          {tab === 'resources' && (
            <div className="space-y-4">
              <button
                onClick={() => setShowAssignResource(true)}
                className="w-full py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-200 hover:-translate-y-0.5 hover:shadow-xl transition-all"
              >
                + Assign Resource from Library
              </button>

              {clientResources.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📚</div>
                  <p className="text-sm">No resources assigned yet.</p>
                  <p className="text-xs mt-1 text-gray-300">Add resources to your library at the Resources page, then assign them here.</p>
                </div>
              ) : clientResources.map(r => {
                const res = r.psychoed_resources;
                return (
                  <div key={r.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full font-medium">{res?.category || 'General'}</span>
                          {r.viewed_at && <span className="text-xs text-green-600 font-medium">✓ Viewed</span>}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{res?.title}</p>
                        {res?.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{res.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">Assigned {format(parseISO(r.assigned_at), 'dd MMM yyyy')}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Remove this resource assignment?')) return;
                          await supabase.from('client_resource_assignments').delete().eq('id', r.id);
                          setClientResources(prev => prev.filter(x => x.id !== r.id));
                        }}
                        className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 mt-1"
                      >Remove</button>
                    </div>
                    {res?.url && (
                      <a href={res.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open Resource
                      </a>
                    )}
                  </div>
                );
              })}

              {/* Assign Resource Modal */}
              {showAssignResource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                    <h3 className="text-base font-bold text-gray-900 mb-4">Assign Resource</h3>
                    {allResources.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">No resources in library yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Go to Resources in the sidebar to add some.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {allResources.filter(r => !clientResources.some(cr => cr.resource_id === r.id)).map(r => (
                          <button
                            key={r.id}
                            disabled={assigningResource}
                            onClick={async () => {
                              setAssigningResource(true);
                              try {
                                const { data, error } = await supabase.from('client_resource_assignments').insert({
                                  resource_id: r.id,
                                  subject_id: id,
                                  user_id: user.id,
                                }).select('*, psychoed_resources(*)').single();
                                if (error) throw error;
                                setClientResources(prev => [data, ...prev]);
                                setShowAssignResource(false);
                                toast.success('Resource assigned!');
                              } catch { toast.error('Failed to assign resource.'); }
                              finally { setAssigningResource(false); }
                            }}
                            className="w-full text-left px-4 py-3 rounded-xl border hover:border-violet-400 hover:bg-violet-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.category}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{r.title}</p>
                            {r.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.description}</p>}
                          </button>
                        ))}
                        {allResources.filter(r => !clientResources.some(cr => cr.resource_id === r.id)).length === 0 && (
                          <p className="text-sm text-center text-gray-400 py-4">All resources already assigned.</p>
                        )}
                      </div>
                    )}
                    <button onClick={() => setShowAssignResource(false)} className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BILLING TAB ── */}
          {tab === 'billing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Invoices</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Invoices sent to {client.name}</p>
                </div>
                <button
                  onClick={() => navigate(`/kaunselor/billing?client=${id}`)}
                  className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-violet-200 hover:-translate-y-0.5 hover:shadow-xl transition-all">
                  + New Invoice
                </button>
              </div>

              {clientInvoices.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm">
                  <div className="text-4xl mb-3">🧾</div>
                  <p className="text-sm font-medium text-gray-600 mb-1">No invoices yet</p>
                  <p className="text-xs mb-4">Create an invoice to send to {client.name}</p>
                  <button
                    onClick={() => navigate(`/kaunselor/billing?client=${id}`)}
                    className="text-sm font-semibold text-violet-600 hover:underline">
                    Create First Invoice →
                  </button>
                </div>
              ) : clientInvoices.map(inv => {
                const subtotal = (inv.line_items || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);
                const tax = subtotal * ((Number(inv.tax_rate) || 0) / 100);
                const total = subtotal + tax;
                const statusStyle = {
                  draft:     'bg-gray-100 text-gray-600',
                  sent:      'bg-blue-100 text-blue-700',
                  paid:      'bg-green-100 text-green-700',
                  cancelled: 'bg-red-100 text-red-600',
                }[inv.status] || 'bg-gray-100 text-gray-600';
                return (
                  <div key={inv.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-400">{inv.invoice_date ? format(parseISO(inv.invoice_date), 'dd MMM yyyy') : '—'}</p>
                        {(inv.line_items || []).map((l, i) => (
                          <p key={i} className="text-xs text-gray-500 mt-0.5">{l.description} × {l.qty}</p>
                        ))}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-gray-900">RM {total.toFixed(2)}</p>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle}`}>{inv.status}</span>
                      </div>
                    </div>
                    {inv.notes && <p className="text-xs text-gray-500 mt-2 pt-2 border-t">{inv.notes}</p>}
                  </div>
                );
              })}

              {clientInvoices.length > 0 && (
                <button
                  onClick={() => navigate(`/kaunselor/billing?client=${id}`)}
                  className="w-full text-sm text-violet-600 font-medium hover:underline py-2">
                  View all in Billing page →
                </button>
              )}
            </div>
          )}

          {/* ── RECORDINGS TAB ── */}
          {tab === 'recordings' && (
            <div className="space-y-4">
              {/* Upload area */}
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                  recDragging ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 bg-white'
                }`}
                onClick={() => !uploadingRec && recFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setRecDragging(true); }}
                onDragLeave={() => setRecDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setRecDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleUploadRecording(f);
                }}
              >
                <input
                  ref={recFileRef}
                  type="file"
                  accept=".mp3,.m4a,.mp4,.wav,.ogg,.webm,.flac,.aac,.mov,.wma,.mkv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadRecording(f); }}
                />
                {uploadingRec ? (
                  <div>
                    <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-violet-700 font-medium">Uploading...</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-3">🎙️</div>
                    <p className="font-semibold text-gray-700">Drop recording here or click to browse</p>
                    <p className="text-sm text-gray-400 mt-1">Audio or video — MP3, M4A, WAV, MP4, MOV, WebM, etc. — max 500MB</p>
                  </div>
                )}
              </div>

              {clientRecordings.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No recordings uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientRecordings.map(rec => {
                    const isBeingTranscribed = transcribingRec?.id === rec.id;
                    return (
                    <div key={rec.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{rec.file_name}</p>
                          {rec.created_at && (
                            <p className="text-xs text-gray-400">{format(parseISO(rec.created_at), 'dd MMM yyyy, HH:mm')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openTranscribeModal(rec)}
                            disabled={!!transcribingRec}
                            className="text-xs text-violet-600 hover:text-violet-800 border border-violet-200 hover:bg-violet-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isBeingTranscribed ? '⟳ Transcribing...' : '✦ Transcribe'}
                          </button>
                          <button
                            onClick={() => handleDeleteRecording(rec)}
                            disabled={!!transcribingRec}
                            className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >Delete</button>
                        </div>
                      </div>

                      {/* Transcription progress for this recording */}
                      {isBeingTranscribed && (
                        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-2.5">
                          {[
                            { key: 'creating',     label: 'Creating session record' },
                            { key: 'transcribing', label: 'Transcribing with AI speaker diarization' },
                            { key: 'generating',   label: 'Generating counseling session report' },
                            { key: 'done',         label: 'Complete — redirecting to report' },
                          ].map(({ key, label }) => {
                            const order = ['creating', 'transcribing', 'generating', 'done'];
                            const cur = order.indexOf(transcribeStep);
                            const tgt = order.indexOf(key);
                            const status = cur > tgt ? 'done' : cur === tgt ? 'active' : 'pending';
                            return (
                              <div key={key} className="flex items-center gap-2.5">
                                {status === 'done' && <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                                {status === 'active' && <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin flex-shrink-0" />}
                                {status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />}
                                <span className={`text-xs ${status === 'active' ? 'text-violet-700 font-semibold' : status === 'done' ? 'text-green-700' : 'text-gray-400'}`}>{label}</span>
                              </div>
                            );
                          })}
                          {transcribeDetail && <p className="text-xs text-gray-400 pt-1">{transcribeDetail}</p>}
                        </div>
                      )}

                      {rec.url && !isBeingTranscribed && (
                        rec.mime_type?.startsWith('video/') ? (
                          <video controls className="w-full rounded-lg" style={{ maxHeight: '220px' }}>
                            <source src={rec.url} type={rec.mime_type} />
                          </video>
                        ) : (
                          <audio controls className="w-full" style={{ height: '36px' }}>
                            <source src={rec.url} />
                          </audio>
                        )
                      )}
                    </div>
                  );})}
                </div>
              )}

              {/* Transcribe confirm modal */}
              {pendingTranscribeRec && (
                <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">Transcribe Recording</h3>
                      <p className="text-xs text-gray-500 mt-1 truncate">{pendingTranscribeRec.file_name}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-amber-700">This will use <strong>1 session credit</strong> and create a new counseling session report.</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Your Name (Counselor)</label>
                      <input
                        type="text"
                        value={transcribeCounselorName}
                        onChange={e => setTranscribeCounselorName(e.target.value)}
                        placeholder="e.g. Pn. Siti Aminah"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Client:</span> {client?.name}
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Button onClick={handleTranscribeRecording} className="flex-1 bg-violet-600 hover:bg-violet-700">
                        ✦ Start Transcription
                      </Button>
                      <Button variant="secondary" onClick={() => setPendingTranscribeRec(null)}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MESSAGES TAB ── */}
          {tab === 'messages' && (
            <div className="space-y-4">
              {/* Message thread */}
              <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-3 min-h-48 max-h-96 overflow-y-auto flex flex-col">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-8">
                    <div className="text-4xl mb-2">💬</div>
                    <p className="text-sm">No messages yet. Start the conversation.</p>
                  </div>
                ) : messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === 'counselor' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.sender_role === 'counselor' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p className="text-xs font-semibold opacity-60 mb-0.5">{m.sender_role === 'counselor' ? 'You' : client.name}</p>
                      <p className="text-sm leading-relaxed">{m.message}</p>
                      <p className={`text-[10px] mt-1 opacity-50 text-right`}>{format(new Date(m.created_at), 'dd MMM, HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Input */}
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  rows={2}
                  placeholder="Type a message to client..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-40 self-end"
                >
                  {sendingMessage ? '...' : 'Send'}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">Client sees messages in their portal. Press Enter to send.</p>
            </div>
          )}

          {/* ── APPOINTMENTS TAB (includes consent forms) ── */}
          {tab === 'appointments' && (
            <div className="space-y-3">
              {/* Reschedule requests */}
              {rescheduleRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Reschedule Requests</p>
                  {rescheduleRequests.map(req => (
                    <div key={req.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-amber-900">{client.name} requested a reschedule</p>
                          {req.preferred_date && <p className="text-xs text-amber-800 mt-0.5">Preferred: {format(new Date(req.preferred_date), 'dd MMM yyyy')}{req.preferred_time ? ` at ${String(req.preferred_time).slice(0,5)}` : ''}</p>}
                          {req.reason && <p className="text-xs text-amber-700 mt-1 italic">"{req.reason}"</p>}
                          <p className="text-xs text-amber-500 mt-1">{format(new Date(req.created_at), 'dd MMM, HH:mm')}</p>
                        </div>
                        <button onClick={() => handleHandleReschedule(req.id)}
                          className="text-xs text-amber-700 border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-100 transition-colors flex-shrink-0">
                          Mark Handled
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  <div key={a.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{format(parseISO(displayDate), 'dd MMM yyyy')} · {displayTime?.slice(0, 5)}</p>
                        {a.presenting_issue && <p className="text-sm text-gray-500 italic mt-0.5">"{a.presenting_issue}"</p>}
                        {a.counselor_notes && <p className="text-xs text-gray-400 mt-1">Notes: {a.counselor_notes}</p>}
                      </div>
                      <Badge color={badgeColor}>{badgeLabel}</Badge>
                    </div>
                    {(a.status === 'confirmed' || a.status === 'pending') && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleSendReminder(a)}
                          className="text-xs text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          📲 Send Reminder
                        </button>
                        <button
                          onClick={() => handleSendConsentForm(a)}
                          disabled={sendingConsentId === a.id}
                          className="text-xs text-violet-600 border border-violet-200 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
                        >
                          {sendingConsentId === a.id ? 'Creating...' : '📋 Send Consent Form'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Consent forms section */}
              {appointments.filter(a => a.consent_signed).length > 0 && (
                <div className="pt-4 border-t space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Signed Consent Forms</p>
                  {appointments.filter(a => a.consent_signed).map(a => {
                    const sessionDate = a.confirmed_date || a.requested_date;
                    const sessionTime = a.confirmed_time || a.requested_time;
                    const counselorName = user?.user_metadata?.full_name || '—';
                    const handlePrintConsent = () => {
                      const win = window.open('', '_blank', 'width=794,height=1123');
                      win.document.write(`<!DOCTYPE html><html><head><title>Consent — ${a.client_name}</title>
                        <style>body{font-family:Arial,sans-serif;font-size:12px;padding:40px;color:#111;line-height:1.6}h1{font-size:14px;text-align:center;text-transform:uppercase;margin-bottom:4px}h2{font-size:12px;text-align:center;color:#444;margin:0 0 24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.label{font-size:10px;color:#666;text-transform:uppercase}.value{font-weight:bold;border-bottom:1px solid #ccc;min-height:20px;padding-bottom:2px}.body-text{font-size:11px;line-height:1.7;margin-bottom:12px}.sig-block{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.sig-line{border-top:1px solid #333;padding-top:4px;margin-top:40px;font-size:11px}.footer{margin-top:30px;font-size:9px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:8px}@media print{body{padding:20px}}</style>
                      </head><body>
                        <h1>BORANG PERSETUJUAN MAKLUMAN</h1><h2>(Informed Consent Form)</h2>
                        <div class="grid">
                          <div><div class="label">Client Name</div><div class="value">${a.client_name||'—'}</div></div>
                          <div><div class="label">IC / Passport No.</div><div class="value">${a.client_ic||'—'}</div></div>
                          <div><div class="label">Matric / Staff No.</div><div class="value">${a.client_student_id||'—'}</div></div>
                          <div><div class="label">Gender</div><div class="value">${a.client_gender||'—'}</div></div>
                          <div><div class="label">Session Date</div><div class="value">${sessionDate ? format(parseISO(sessionDate), 'dd MMMM yyyy') : '—'}</div></div>
                          <div><div class="label">Session Time</div><div class="value">${sessionTime?.slice(0,5)||'—'}</div></div>
                        </div>
                        <p class="body-text"><strong>Confidentiality:</strong> All session information is kept strictly confidential under the Counselors Act 1998 and PDPA 2010, except where required by law.</p>
                        <p class="body-text"><strong>Recording & Documentation:</strong> Sessions may be recorded for clinical documentation purposes using secure AI technology. Data is stored per PDPA 2010.</p>
                        <p class="body-text"><strong>Client Rights:</strong> Client may ask questions, request referrals, stop the session at any time, or obtain copies of records.</p>
                        <div class="sig-block">
                          <div><div class="sig-line"><strong>${a.client_name||'___________________'}</strong><br/>Client — Digital Consent<br/>Date: ${a.consent_at ? format(new Date(a.consent_at), 'dd/MM/yyyy HH:mm') : '___________'}</div></div>
                          <div><div class="sig-line"><strong>${counselorName}</strong><br/>Counselor<br/>Date: ${format(new Date(), 'dd/MM/yyyy')}</div></div>
                        </div>
                        <div class="footer">STRICTLY CONFIDENTIAL — Kaunselor Platform — kaunselor.app</div>
                        <script>window.onload=function(){window.print()}</script>
                      </body></html>`);
                      win.document.close();
                    };
                    return (
                      <div key={`consent-${a.id}`} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{a.client_name}</p>
                            <p className="text-xs text-gray-400">{a.consent_at ? format(new Date(a.consent_at), 'dd MMM yyyy, HH:mm') : 'Date not recorded'}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Signed</span>
                            <Button size="sm" variant="secondary" onClick={handlePrintConsent}>🖨 Print</Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── INSIGHTS TAB ── */}
          {tab === 'insights' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Narrative Consistency</h3>
                <p className="text-xs text-gray-400 mb-4">Analyse the last 5 sessions for factual contradictions in what the client has stated across different sessions.</p>
                <button
                  onClick={handleAnalyseContradictions}
                  disabled={analysingInsights || (sessions.filter(s => s.report).length < 2 && progressNotes.length < 2)}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-200 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {analysingInsights ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analysing...
                    </>
                  ) : '🔍 Analyse Across Sessions'}
                </button>
                {sessions.filter(s => s.report).length < 2 && progressNotes.length < 2 && (
                  <p className="text-xs text-gray-400 text-center mt-2">Need at least 2 completed sessions or progress notes to analyse.</p>
                )}
              </div>

              {insightsAnalysedAt && (
                <p className="text-xs text-gray-400 text-center">Last analysed: {format(parseISO(insightsAnalysedAt), 'dd MMM yyyy, HH:mm')}</p>
              )}

              {insightsResult && (
                <div className="space-y-3">
                  {insightsResult.contradictions?.length === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-green-800">No significant contradictions detected</p>
                        <p className="text-xs text-green-700 mt-0.5">The client's statements across the analysed sessions appear consistent.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">{insightsResult.contradictions.length} contradiction{insightsResult.contradictions.length !== 1 ? 's' : ''} found</p>
                      {insightsResult.contradictions.map((c, i) => (
                        <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                          <p className="text-sm font-semibold text-amber-900">{c.topic}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white rounded-lg border border-amber-100 p-3">
                              <p className="text-xs font-semibold text-gray-400 mb-1">{c.session_a?.date}</p>
                              <p className="text-sm text-gray-700 italic">"{c.session_a?.quote}"</p>
                            </div>
                            <div className="bg-white rounded-lg border border-amber-100 p-3">
                              <p className="text-xs font-semibold text-gray-400 mb-1">{c.session_b?.date}</p>
                              <p className="text-sm text-gray-700 italic">"{c.session_b?.quote}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  <button
                    onClick={handleAnalyseContradictions}
                    disabled={analysingInsights}
                    className="w-full py-2 text-sm text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors disabled:opacity-40"
                  >
                    Re-analyse
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── HOMEWORK TAB ── */}
          {tab === 'homework' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Assigned Homework</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tasks for the client to work on between sessions</p>
                </div>
                <Button size="sm" onClick={() => { setHomeworkForm({ title: '', description: '', due_date: '' }); setShowAddHomework(true); }}>+ Add Task</Button>
              </div>

              {homework.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-sm">No homework assigned yet.</p>
                  <p className="text-xs mt-1">Assign tasks for the client to work on between sessions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {homework.map(hw => (
                    <div key={hw.id} className={`bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 ${hw.status === 'completed' ? 'opacity-70' : ''}`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={async () => {
                            const newStatus = hw.status === 'completed' ? 'pending' : 'completed';
                            await supabase.from('client_homework').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', hw.id);
                            setHomework(prev => prev.map(h => h.id === hw.id ? { ...h, status: newStatus } : h));
                          }}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            hw.status === 'completed' ? 'bg-violet-500 border-violet-500' : 'border-gray-300 hover:border-violet-400'
                          }`}
                        >
                          {hw.status === 'completed' && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${hw.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{hw.title}</p>
                          {hw.description && <p className="text-xs text-gray-500 mt-0.5">{hw.description}</p>}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {hw.due_date && (
                              <span className="text-xs text-gray-400">Due: {format(new Date(hw.due_date + 'T00:00:00'), 'dd MMM yyyy')}</span>
                            )}
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              hw.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {hw.status === 'completed' ? '✓ Completed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            await supabase.from('client_homework').delete().eq('id', hw.id);
                            setHomework(prev => prev.filter(h => h.id !== hw.id));
                            toast.success('Task removed.');
                          }}
                          className="text-xs text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 px-1 py-0.5"
                        >Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── INTAKE TAB ── */}
          {tab === 'intake' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Digital Intake Form</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Send a secure link for the client to fill digitally</p>
                </div>
                <Button size="sm" onClick={async () => {
                  try {
                    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
                    const { data, error } = await supabase.from('client_intake_forms').insert({
                      user_id: user.id,
                      subject_id: id,
                      subject_name: client.name,
                      expires_at: expiresAt,
                    }).select().single();
                    if (error) throw error;
                    setClientIntakeForms(prev => [data, ...prev]);
                    toast.success('Intake form link created! Copy and send to client.');
                  } catch { toast.error('Failed to create intake form.'); }
                }}>+ New Intake Link</Button>
              </div>

              {clientIntakeForms.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm">No intake forms sent yet.</p>
                  <p className="text-xs mt-1">Create a link and share with the client before their first session.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientIntakeForms.map(intake => {
                    const link = `${window.location.origin}/intake/${intake.token}`;
                    const isExpired = new Date(intake.expires_at) < new Date();
                    return (
                      <div key={intake.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                intake.status === 'completed' ? 'bg-green-100 text-green-700' :
                                isExpired ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {intake.status === 'completed' ? '✓ Completed' : isExpired ? 'Expired' : 'Pending'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {format(parseISO(intake.assigned_at), 'dd MMM yyyy')}
                              </span>
                            </div>
                            {intake.completed_at && (
                              <p className="text-xs text-gray-400 mt-1">Completed {format(parseISO(intake.completed_at), 'dd MMM yyyy, HH:mm')}</p>
                            )}
                            {!isExpired && intake.status !== 'completed' && (
                              <p className="text-xs text-gray-400 mt-1">Expires {format(parseISO(intake.expires_at), 'dd MMM yyyy')}</p>
                            )}
                          </div>
                        </div>

                        {intake.status !== 'completed' && !isExpired && (
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-500 flex-1 truncate font-mono">{link}</p>
                            <button
                              onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copied!'); }}
                              className="text-xs text-violet-600 hover:text-violet-800 font-medium flex-shrink-0 px-2 py-1 rounded hover:bg-violet-50 transition-colors"
                            >Copy</button>
                            <button
                              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Please fill in your intake form before our session:\n${link}`)}`, '_blank')}
                              className="text-xs text-green-700 hover:text-green-900 font-medium flex-shrink-0 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                            >WhatsApp</button>
                          </div>
                        )}

                        {intake.status === 'completed' && intake.form_answers && (
                          <IntakeResponseView
                            answers={intake.form_answers}
                            onApply={async (fields) => {
                              try {
                                const { error } = await supabase.from('subjects').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
                                if (error) throw error;
                                setClient(c => ({ ...c, ...fields }));
                                setEditForm(f => ({ ...f, ...fields }));
                                toast.success('Client profile updated from intake responses.');
                              } catch { toast.error('Failed to update profile.'); }
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          </div>
        </div>
      </div>

      {/* ── Add Homework Modal ── */}
      {showAddHomework && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Homework Task</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Task Title *</label>
              <input
                type="text"
                value={homeworkForm.title}
                onChange={e => setHomeworkForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Daily mood journaling, Breathing exercise..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Instructions / Details</label>
              <textarea
                value={homeworkForm.description}
                onChange={e => setHomeworkForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Describe what the client should do, how often, etc."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Due Date (optional)</label>
              <input
                type="date"
                value={homeworkForm.due_date}
                onChange={e => setHomeworkForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAddHomework(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700"
                loading={savingHomework}
                disabled={!homeworkForm.title.trim()}
                onClick={async () => {
                  if (!homeworkForm.title.trim()) return;
                  setSavingHomework(true);
                  try {
                    const { data, error } = await supabase.from('client_homework').insert({
                      subject_id: id,
                      user_id: user.id,
                      title: homeworkForm.title.trim(),
                      description: homeworkForm.description.trim() || null,
                      due_date: homeworkForm.due_date || null,
                    }).select().single();
                    if (error) throw error;
                    setHomework(prev => [data, ...prev]);
                    setShowAddHomework(false);
                    toast.success('Homework task added.');
                  } catch { toast.error('Failed to add task.'); }
                  finally { setSavingHomework(false); }
                }}
              >Add Task</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Assessment Modal ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <h3 className="text-lg font-semibold text-gray-900">Assign Assessment</h3>
            <div className="space-y-2">
              {ASSESSMENT_LIST.map(t => (
                <button
                  key={t.id}
                  onClick={() => setAssignTestType(t.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    assignTestType === t.id ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${BADGE_COLORS[t.badgeColor]}`}>
                        {t.name}
                      </span>
                      <span className="text-xs text-gray-400">~{t.minutes} min</span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{t.fullName}</p>
                    <p className="text-xs text-gray-400">{t.description}</p>
                  </div>
                  {assignTestType === t.id && (
                    <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              A secure link will be generated. The client can take the test on their phone or computer without logging in. Link expires in 14 days.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700"
                loading={assigning}
                onClick={async () => {
                  setAssigning(true);
                  try {
                    const { data, error } = await supabase.from('client_assessments').insert({
                      user_id: user.id,
                      subject_id: id,
                      subject_name: client.name,
                      test_type: assignTestType,
                    }).select().single();
                    if (error) throw error;
                    setClientAssessments(prev => [data, ...prev]);
                    setShowAssignModal(false);
                    toast.success('Assessment assigned! Copy the link to send to client.');
                    setTab('assessments');
                  } catch { toast.error('Failed to assign assessment.'); }
                  finally { setAssigning(false); }
                }}
              >
                Assign & Get Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Assessment Result Modal ── */}
      {viewingResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{viewingResult.test?.name} Results</h3>
                <p className="text-xs text-gray-400">{client?.name} · {format(parseISO(viewingResult.assignment.completed_at), 'dd MMM yyyy')}</p>
              </div>
              <button onClick={() => setViewingResult(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <AssessmentResultDetail
                test={viewingResult.test}
                scores={viewingResult.scores}
                interpretation={viewingResult.interpretation}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Generation Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Generate Clinical Document</h3>
              <button onClick={() => setShowDocModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Document Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['employment','💼 Employment Support Letter'],
                    ['court','⚖️ Court Support Letter'],
                    ['school','🎓 Academic Support Letter'],
                    ['insurance','📊 Insurance Progress Report'],
                  ].map(([t, label]) => (
                    <button key={t} onClick={() => setDocType(t)}
                      className={`p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${docType === t ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 hover:border-violet-200 text-gray-700'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Additional Context <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <textarea value={docContext} onChange={e => setDocContext(e.target.value)} rows={3}
                  placeholder="e.g. Client needs letter for employer regarding anxiety leave; return to work planned next month..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>
              {!generatedDoc && (
                <Button loading={generatingDoc} onClick={async () => {
                  setGeneratingDoc(true);
                  try {
                    const counselorName = user?.user_metadata?.full_name || 'Registered Counselor';
                    const lastSess = sessions[0];
                    const firstSess = sessions[sessions.length - 1];
                    const result = await generateDocument({
                      letter_type: docType,
                      client_name: client.name,
                      client_ic: client.ic_number || '',
                      presenting_issue: client.presenting_issue || '',
                      counselor_name: counselorName,
                      context: docContext,
                      session_count: sessions.length,
                      date_first: firstSess ? format(parseISO(firstSess.created_at), 'dd MMMM yyyy') : '',
                      date_last: lastSess ? format(parseISO(lastSess.created_at), 'dd MMMM yyyy') : '',
                    });
                    setGeneratedDoc(result.letter || '');
                  } catch (err) {
                    toast.error(err.message || 'Failed to generate document.');
                  } finally { setGeneratingDoc(false); }
                }} className="w-full bg-violet-600 hover:bg-violet-700">
                  ✦ Generate with AI
                </Button>
              )}
              {generatedDoc && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Generated Document</label>
                    <button onClick={() => setGeneratedDoc('')} className="text-xs text-gray-400 hover:text-gray-600">↺ Regenerate</button>
                  </div>
                  <textarea value={generatedDoc} onChange={e => setGeneratedDoc(e.target.value)} rows={12}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono" />
                  <Button className="w-full" onClick={() => {
                    const docLabels = { employment: 'Employment Support Letter', court: 'Court Support Letter', school: 'Academic Support Letter', insurance: 'Insurance Progress Report' };
                    const win = window.open('', '_blank', 'width=794,height=1123');
                    win.document.write(`<!DOCTYPE html><html><head>
                      <title>${docLabels[docType]||'Clinical Document'} — ${client.name}</title>
                      <style>
                        body{font-family:Arial,sans-serif;font-size:11.5px;padding:50px;color:#111;line-height:1.8;max-width:720px;margin:0 auto}
                        .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:24px}
                        .header h1{font-size:14px;text-transform:uppercase;margin:0 0 2px;letter-spacing:0.5px}
                        .header p{font-size:10px;color:#555;margin:0}
                        pre{font-family:Arial,sans-serif;white-space:pre-wrap;font-size:11.5px;line-height:1.8;margin:0}
                        .footer{margin-top:30px;font-size:8px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:8px}
                        @media print{body{padding:25px}}
                      </style></head><body>
                      <div class="header">
                        <h1>Counseling Unit — ${docLabels[docType]||'Clinical Document'}</h1>
                        <p>kaunselor.app · STRICTLY CONFIDENTIAL</p>
                      </div>
                      <pre>${generatedDoc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
                      <div class="footer">STRICTLY CONFIDENTIAL — Kaunselor Platform — kaunselor.app — ${format(new Date(),'dd/MM/yyyy HH:mm')}</div>
                      <script>window.onload=function(){window.print()}</script>
                    </body></html>`);
                    win.document.close();
                  }}>🖨 Print / Save as PDF</Button>
                  <Button variant="secondary" className="w-full" onClick={() => {
                    const docLabels = { employment: 'Employment Support Letter', court: 'Court Support Letter', school: 'Academic Support Letter', insurance: 'Insurance Progress Report' };
                    downloadLetterPdf({ body: generatedDoc, title: docLabels[docType] || 'Clinical Document', clientName: client.name, profile: letterhead })
                      .catch(err => toast.error(err.message || 'PDF failed.'));
                  }}>📄 Download PDF (Letterhead)</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes (optional)</label>
                <textarea
                  value={teamReferralForm.notes}
                  onChange={e => setTeamReferralForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
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

      {showConsentModal && consentRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowConsentModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-violet-200 font-semibold">Informed Consent</p>
                <h3 className="text-lg font-bold mt-0.5">{client?.name}</h3>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${consentRecord.status === 'active' ? 'bg-white/20' : 'bg-red-500/30'}`}>{consentRecord.status}</span>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="space-y-1 text-gray-600">
                <p><span className="text-gray-400">Signed by:</span> <span className="font-medium text-gray-900">{consentRecord.full_name}</span>{consentRecord.is_guardian ? ` (guardian — ${consentRecord.guardian_name || ''})` : ''}</p>
                {consentRecord.ic_number && <p><span className="text-gray-400">IC/Passport:</span> {consentRecord.ic_number}</p>}
                <p><span className="text-gray-400">Date:</span> {format(parseISO(consentRecord.signed_at), 'd MMM yyyy, h:mm a')}</p>
                <p><span className="text-gray-400">Version / language:</span> v{consentRecord.version} · {consentRecord.language?.toUpperCase()}</p>
                {consentRecord.reaffirmation_count > 0 && <p><span className="text-gray-400">Re-affirmations:</span> {consentRecord.reaffirmation_count}</p>}
                {consentRecord.status === 'withdrawn' && consentRecord.withdrawn_at && (
                  <p className="text-red-600">Withdrawn on {format(parseISO(consentRecord.withdrawn_at), 'd MMM yyyy, h:mm a')}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Signature</p>
                {consentRecord.signature_data
                  ? <img src={consentRecord.signature_data} alt="signature" className="h-24 bg-white rounded-xl ring-1 ring-gray-100" />
                  : <p className="text-gray-400 text-xs">No signature image.</p>}
              </div>
              <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-3">
                <p className="text-[10px] font-semibold text-gray-500 mb-1">INTEGRITY SEAL (SHA-256)</p>
                <p className="text-[10px] text-gray-500 font-mono break-all">{consentRecord.hash}</p>
              </div>
              <p className="text-xs text-gray-400">Full consent clauses are included in the downloadable PDF receipt.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={handleDownloadConsent} disabled={pdfBusy}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50">
                  {pdfBusy ? 'Preparing…' : 'Download PDF'}
                </button>
                {consentRecord.status === 'active' && (
                  <button onClick={handleWithdrawConsent} disabled={withdrawing}
                    className="px-4 py-2.5 text-sm font-semibold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50">
                    {withdrawing ? '…' : 'Withdraw'}
                  </button>
                )}
                <button onClick={() => setShowConsentModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentResultDetail({ test, scores, interpretation }) {
  if (!test || !scores || !interpretation) return null;

  const levelColor = {
    green:  'text-green-700 bg-green-50',
    yellow: 'text-yellow-700 bg-yellow-50',
    orange: 'text-orange-700 bg-orange-50',
    red:    'text-red-700 bg-red-50',
  };

  if (test.id === 'phq9') return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Total Score</span>
        <span className="text-2xl font-black text-gray-900">{scores.total}<span className="text-sm font-normal text-gray-400">/27</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div className="bg-violet-500 h-3 rounded-full" style={{ width: `${(scores.total / 27) * 100}%` }} />
      </div>
      <div className={`rounded-xl px-4 py-3 ${levelColor[interpretation.color] || 'bg-gray-50 text-gray-700'}`}>
        <p className="font-semibold">{interpretation.level}</p>
        <p className="text-xs mt-0.5">{interpretation.note}</p>
      </div>
    </div>
  );

  if (test.id === 'gad7') return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Total Score</span>
        <span className="text-2xl font-black text-gray-900">{scores.total}<span className="text-sm font-normal text-gray-400">/21</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div className="bg-violet-500 h-3 rounded-full" style={{ width: `${(scores.total / 21) * 100}%` }} />
      </div>
      <div className={`rounded-xl px-4 py-3 ${levelColor[interpretation.color] || 'bg-gray-50 text-gray-700'}`}>
        <p className="font-semibold">{interpretation.level}</p>
        <p className="text-xs mt-0.5">{interpretation.note}</p>
      </div>
    </div>
  );

  if (test.id === 'dass21') return (
    <div className="space-y-3">
      {[['depression','Depression',42],['anxiety','Anxiety',42],['stress','Stress',42]].map(([k, label, max]) => (
        <div key={k} className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">{label}</span>
            <span className="text-lg font-bold text-gray-900">{interpretation[k]?.score}<span className="text-xs font-normal text-gray-400">/{max}</span></span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${((interpretation[k]?.score || 0) / max) * 100}%` }} />
          </div>
          <span className="text-xs font-medium text-gray-500">{interpretation[k]?.level}</span>
        </div>
      ))}
    </div>
  );

  if (test.id === 'riasec') return (
    <div className="space-y-4">
      <div className="text-center bg-violet-50 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">Holland Code</p>
        <p className="text-4xl font-black text-violet-600 tracking-widest">{interpretation.topCode}</p>
      </div>
      <div className="space-y-2">
        {interpretation.sorted.map(([k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-4 text-xs font-bold text-violet-600">{k}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${(v / 30) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 w-6 text-right">{v}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1 text-xs text-gray-600">
        {interpretation.sorted.slice(0, 3).map(([k]) => (
          <p key={k}><strong className="text-violet-700">{k}:</strong> {interpretation.desc?.[k]}</p>
        ))}
      </div>
    </div>
  );

  if (test.id === 'tipi') {
    const labels = { extraversion: 'Extraversion', agreeableness: 'Agreeableness', conscientiousness: 'Conscientiousness', emotionalStability: 'Emotional Stability', openness: 'Openness' };
    return (
      <div className="space-y-3">
        {Object.entries(interpretation).map(([key, val]) => (
          <div key={key} className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">{labels[key]}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${val.level === 'High' ? 'bg-violet-100 text-violet-700' : val.level === 'Moderate' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                {val.level} ({val.score})
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
              <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${((val.score - 1) / 6) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-500">{val.desc}</p>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function IntakeResponseView({ answers, onApply }) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);

  const rows = [
    ['Full Name', answers.full_name],
    ['IC / Passport', answers.ic_passport],
    ['Phone', answers.phone],
    ['Email', answers.email],
    ['Date of Birth', answers.date_of_birth],
    ['Gender', answers.gender],
    ['Marital Status', answers.marital_status],
    ['Race', answers.race],
    ['Religion', answers.religion],
    ['Occupation', answers.occupation],
    ['Address', answers.address],
    ['Emergency Contact', answers.emergency_name ? `${answers.emergency_name}${answers.emergency_relationship ? ` (${answers.emergency_relationship})` : ''} — ${answers.emergency_phone || ''}` : ''],
  ].filter(([, v]) => v);

  const clinical = [
    ['Presenting Concern', answers.presenting_concern],
    ['Concern Duration', answers.concern_duration],
    ['Counseling Goals', answers.counseling_goals],
    ['Previous Counseling', answers.previous_counseling === 'yes' ? `Yes — ${answers.previous_counseling_details || ''}` : answers.previous_counseling === 'no' ? 'No' : ''],
    ['Current Medications', answers.current_medications === 'yes' ? `Yes — ${answers.current_medications_details || ''}` : answers.current_medications === 'no' ? 'No' : ''],
    ['Medical Conditions', answers.medical_conditions],
    ['Self-Harm Thoughts', answers.self_harm_thoughts === 'no' ? 'No' : answers.self_harm_thoughts === 'yes_passive' ? 'Yes (passive)' : answers.self_harm_thoughts === 'yes_active' ? '⚠️ Yes (active — with plan)' : ''],
    ['Suicidal Thoughts', answers.suicidal_thoughts === 'no' ? 'No' : answers.suicidal_thoughts === 'yes_passive' ? 'Yes (passive)' : answers.suicidal_thoughts === 'yes_active' ? '⚠️ Yes (active — with plan)' : ''],
    ['Substance Use', answers.substance_use === 'no' ? 'No' : answers.substance_use === 'occasionally' ? 'Occasionally' : answers.substance_use === 'regularly' ? 'Regularly' : ''],
  ].filter(([, v]) => v);

  const handleApply = async () => {
    setApplying(true);
    const fields = {};
    if (answers.full_name) fields.name = answers.full_name;
    if (answers.ic_passport) fields.ic_number = answers.ic_passport;
    if (answers.phone) fields.phone = answers.phone;
    if (answers.email) fields.email = answers.email;
    if (answers.date_of_birth) fields.date_of_birth = answers.date_of_birth;
    if (answers.gender) fields.gender = answers.gender;
    if (answers.marital_status) fields.marital_status = answers.marital_status.toLowerCase();
    if (answers.race) fields.race = answers.race;
    if (answers.religion) fields.religion = answers.religion;
    if (answers.occupation) fields.occupation = answers.occupation;
    if (answers.address) fields.address = answers.address;
    if (answers.emergency_name) fields.emergency_contact_name = answers.emergency_name;
    if (answers.emergency_phone) fields.emergency_contact_phone = answers.emergency_phone;
    if (answers.presenting_concern) fields.presenting_issue = answers.presenting_concern;
    try {
      await onApply(fields);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          {expanded ? '▲ Hide Responses' : '▼ View Responses'}
        </button>
        <Button size="sm" loading={applying} onClick={handleApply} className="bg-violet-600 hover:bg-violet-700 text-xs">
          Apply to Profile
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3">
          {rows.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Personal Information</p>
              {rows.map(([label, value]) => (
                <div key={label} className="flex gap-2 text-xs">
                  <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
                  <span className="text-gray-800 font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
          {clinical.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Clinical & Presenting</p>
              {clinical.map(([label, value]) => (
                <div key={label} className="text-xs space-y-0.5">
                  <span className="text-gray-400 block">{label}</span>
                  <span className="text-gray-800 font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fasa 6A: Trend chart components ──────────────────────────────────────────

function TrendChart({ data, maxScore, color, zones }) {
  if (!data || data.length < 2) return null;
  const W = 260, H = 90, PL = 28, PR = 8, PT = 16, PB = 22;
  const cW = W - PL - PR, cH = H - PT - PB;
  const x = i => PL + (i / (data.length - 1)) * cW;
  const y = s => PT + (1 - Math.min(s, maxScore) / maxScore) * cH;
  const pts = data.map((d, i) => ({ x: x(i), y: y(d.score), ...d }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {zones?.map((z, i) => (
        <rect key={i} x={PL} y={y(z.max ?? maxScore)} width={cW}
          height={Math.max(0, y(z.min ?? 0) - y(z.max ?? maxScore))} fill={z.fill} opacity={0.13} />
      ))}
      <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="#e5e7eb" strokeWidth={1} />
      <text x={PL - 3} y={PT + 4} textAnchor="end" fontSize={8} fill="#9ca3af">{maxScore}</text>
      <text x={PL - 3} y={PT + cH + 1} textAnchor="end" fontSize={8} fill="#9ca3af">0</text>
      <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={color} />
          <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize={9} fill="#111827" fontWeight="600">{p.score}</text>
          <text x={p.x} y={H - 3} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {new Date(p.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
          </text>
        </g>
      ))}
    </svg>
  );
}

function MultiTrendChart({ data, maxScore, lines }) {
  if (!data || data.length < 2) return null;
  const W = 260, H = 90, PL = 28, PR = 8, PT = 16, PB = 22;
  const cW = W - PL - PR, cH = H - PT - PB;
  const x = i => PL + (i / (data.length - 1)) * cW;
  const y = s => PT + (1 - Math.min(s, maxScore) / maxScore) * cH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="#e5e7eb" strokeWidth={1} />
      <text x={PL - 3} y={PT + 4} textAnchor="end" fontSize={8} fill="#9ca3af">{maxScore}</text>
      <text x={PL - 3} y={PT + cH + 1} textAnchor="end" fontSize={8} fill="#9ca3af">0</text>
      {lines.map(line => {
        const pts = data.map((d, i) => ({ x: x(i), y: y(d[line.key] ?? 0) }));
        return (
          <g key={line.key}>
            <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={line.color} strokeWidth={1.8} strokeLinejoin="round" />
            {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={line.color} />)}
          </g>
        );
      })}
      {data.map((d, i) => (
        <text key={i} x={x(i)} y={H - 3} textAnchor="middle" fontSize={8} fill="#9ca3af">
          {new Date(d.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
        </text>
      ))}
    </svg>
  );
}
