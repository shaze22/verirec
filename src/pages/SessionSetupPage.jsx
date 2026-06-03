import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { PROFESSIONS, getProfession } from '../data/professions.js';
import { getMyTeam, getTeamMembers } from '../api/teams.js';
import { supabase } from '../lib/supabase.js';
import { isCounselorSubdomain } from '../lib/subdomain.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { SubjectPicker } from '../components/session/SubjectPicker.jsx';

const hasData = (form) =>
  form.title || form.subject_name || form.subject_role || form.context_notes || form.case_number || form.witness_officer || form.other_officers || form.subject_id;

function Tooltip({ text }) {
  return (
    <span className="ml-1 inline-flex items-center cursor-help group relative">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="absolute left-5 -top-1 z-10 hidden group-hover:block w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none">
        {text}
      </span>
    </span>
  );
}

function LabelWithTooltip({ label, tooltip, required }) {
  return (
    <span className="flex items-center text-sm font-medium text-gray-700 mb-1">
      {label}{required && ' *'}
      {tooltip && <Tooltip text={tooltip} />}
    </span>
  );
}

const CASE_FIELDS = {
  police:    { caseLabel: 'Police Report Number',       casePlaceholder: 'e.g. P/TLNG/000123/2026',   witnessLabel: 'Investigating Officer / Witness' },
  sprm:      { caseLabel: 'MACC Case Number',            casePlaceholder: 'e.g. MACC/2026/000123',     witnessLabel: 'Prosecuting Officer' },
  sispa:     { caseLabel: 'Investigation Case Number',   casePlaceholder: 'e.g. SISPA/2026/001234',    witnessLabel: 'Supervising Officer' },
  skmm:      { caseLabel: 'Investigation Case Number',   casePlaceholder: 'e.g. SKMM/2026/001234',    witnessLabel: 'Investigating Officer' },
  hr:        { caseLabel: 'Disciplinary Case Number',    casePlaceholder: 'e.g. HR/ID/2026/001',       witnessLabel: 'HR Officer / Examining Witness' },
  jtk:       { caseLabel: 'Case Reference Number',       casePlaceholder: 'e.g. JTK/2026/001234',     witnessLabel: 'Compliance Officer' },
  iso:       { caseLabel: 'Audit Number',                casePlaceholder: 'e.g. AUDIT/ISO/2026-Q2',   witnessLabel: 'Auditee Representative' },
  doctor:    { caseLabel: 'Patient Registration Number', casePlaceholder: 'e.g. P-2026-001234',        witnessLabel: 'Nurse / On-duty Staff' },
  counselor: { caseLabel: 'Counseling Case Number',      casePlaceholder: 'e.g. KSL/2026/001',        witnessLabel: 'Supervisor / Referring Counselor' },
  court:     { caseLabel: 'Court Case Number',           casePlaceholder: 'e.g. MA-22NCC-XXX-2026',   witnessLabel: 'Opposing Counsel / Judge' },
  peguam:    { caseLabel: 'Case File Number',            casePlaceholder: 'e.g. PG/2026/001234',       witnessLabel: 'Partner / Case Supervisor' },
  jkm:       { caseLabel: 'Welfare Case Number',         casePlaceholder: 'e.g. JKM/2026/KK/001234',  witnessLabel: 'Supervising Officer / Unit Head' },
};

function getInitialProfession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('session_setup') || '{}');
    if (saved.profession && getProfession(saved.profession)) return saved.profession;
  } catch {}
  try {
    const prefill = JSON.parse(sessionStorage.getItem('case_prefill') || '{}');
    if (prefill.profession && getProfession(prefill.profession)) return prefill.profession;
  } catch {}
  const last = localStorage.getItem('preferred_profession');
  if (last && last !== 'counselor' && getProfession(last)) return last;
  return 'police';
}

export default function SessionSetupPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isCounselor = isCounselorSubdomain();

  const availableProfessions = isCounselor
    ? PROFESSIONS
    : PROFESSIONS.filter(p => p.id !== 'counselor');

  const [professionId, setProfessionId] = useState(getInitialProfession);
  const profession   = getProfession(professionId) || availableProfessions[0];
  const caseFields   = CASE_FIELDS[professionId] || {};

  const [teamMembers, setTeamMembers]   = useState([]);
  const [activeCases, setActiveCases]   = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [casePrefill, setCasePrefill]   = useState(null);
  const showCasePicker = !isCounselor;

  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('session_setup') || '{}');
      if (saved.subject_name || saved.title) {
        return {
          title:          saved.title || '',
          interviewer:    saved.interviewer || user?.user_metadata?.full_name || '',
          subject_name:   saved.subject_name || '',
          subject_id:     saved.subject_id || null,
          subject_role:   saved.subject_role || '',
          case_number:    saved.case_number || '',
          witness_officer: saved.witness_officer || '',
          other_officers: saved.other_officers || '',
          context_notes:  saved.context_notes || '',
          assignee_id:    saved.assignee_id || '',
          custom_fields:  saved.custom_fields || {},
          case_id:        saved.case_id || null,
        };
      }
    } catch {}
    return {
      title: '', interviewer: user?.user_metadata?.full_name || '',
      subject_name: '', subject_id: null, subject_role: '',
      case_number: '', witness_officer: '', other_officers: '',
      context_notes: '', assignee_id: '', custom_fields: {}, case_id: null,
    };
  });

  useEffect(() => {
    if (!user) return;
    getMyTeam(user.id)
      .then(team => team && getTeamMembers(team.id))
      .then(members => setTeamMembers((members || []).filter(m => m.status === 'accepted' && m.user_id !== user.id)))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || !showCasePicker) return;
    supabase
      .from('cases')
      .select('id, title, case_number, profession')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setActiveCases(data || []);
        if (casePrefill?.case_id && data?.length) {
          const found = data.find(c => c.id === casePrefill.case_id);
          if (found) setSelectedCaseId(found.id);
        }
      })
      .catch(() => {});
  }, [user, showCasePicker, casePrefill]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('case_prefill');
      if (!raw) return;
      const prefill = JSON.parse(raw);
      sessionStorage.removeItem('case_prefill');
      setCasePrefill(prefill);
      if (prefill.profession && getProfession(prefill.profession)) {
        setProfessionId(prefill.profession);
      }
      setForm(prev => ({
        ...prev,
        ...(prefill.case_number ? { case_number: prefill.case_number } : {}),
        ...(prefill.case_id     ? { case_id: prefill.case_id }         : {}),
      }));
    } catch {}
  }, []);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const customFieldLabels = [1, 2, 3]
    .map(i => localStorage.getItem(`custom_field_${i}_label`))
    .filter(Boolean);

  const setCustomField = (label, value) =>
    setForm(prev => ({ ...prev, custom_fields: { ...(prev.custom_fields || {}), [label]: value } }));

  const handleBack = () => {
    if (hasData(form) && !window.confirm('The data you entered will be lost. Continue?')) return;
    navigate(-1);
  };

  const handleCaseChange = (caseId) => {
    setSelectedCaseId(caseId);
    if (caseId) {
      const chosen = activeCases.find(c => c.id === caseId);
      setForm(prev => ({
        ...prev,
        case_id: caseId,
        ...(chosen?.case_number && !prev.case_number ? { case_number: chosen.case_number } : {}),
      }));
    } else {
      setForm(prev => ({ ...prev, case_id: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sessionStorage.setItem('session_setup', JSON.stringify({ ...form, profession: professionId }));
    localStorage.setItem('preferred_profession', professionId);
    navigate('/session/consent');
  };

  if (!profession) return null;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="New Session" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border p-6">

          {/* ── Profession selector ── */}
          <div className="mb-6 pb-5 border-b">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Select Profession</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableProfessions.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfessionId(p.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left ${
                    professionId === p.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl leading-none flex-shrink-0">{p.icon}</span>
                  <span className="truncate leading-tight text-xs">{p.label}</span>
                </button>
              ))}
            </div>
            {/* Selected profession info */}
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{profession.label}</span>
              <span>·</span>
              <span>{profession.frameworks?.slice(0, 2).join(', ')}</span>
            </div>
          </div>

          {/* ── Banners ── */}
          {casePrefill && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-blue-600 text-lg">📁</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">Continued from Case File</p>
                <p className="text-xs text-blue-600">
                  {casePrefill.case_title}{casePrefill.case_number ? ` · ${casePrefill.case_number}` : ''} — Case file pre-selected.
                </p>
              </div>
              <button type="button" onClick={() => navigate(-1)} className="text-xs text-blue-600 hover:text-blue-800 font-medium underline">Back</button>
            </div>
          )}

          {form.subject_id && professionId === 'counselor' && (
            <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-violet-600 text-lg">👤</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-violet-800">Continued from Client File</p>
                <p className="text-xs text-violet-600">Client information has been pre-filled.</p>
              </div>
              <button type="button" onClick={() => navigate(-1)} className="text-xs text-violet-600 hover:text-violet-800 font-medium underline">Back</button>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <LabelWithTooltip label="Session Title" required tooltip="Name that will appear in the session list." />
              <Input value={form.title} onChange={set('title')} placeholder="e.g. Investigation Session #001" required />
            </div>

            <div>
              <LabelWithTooltip label={profession.interviewerLabel || 'Session Handler Name'} required tooltip="Name of the professional conducting this session — will appear in the official report." />
              <Input value={form.interviewer} onChange={set('interviewer')} placeholder="Your name" required />
            </div>

            {caseFields.caseLabel && (
              <div>
                <LabelWithTooltip label={caseFields.caseLabel} tooltip="Official reference number for this case in your organisation's system." />
                <Input value={form.case_number} onChange={set('case_number')} placeholder={caseFields.casePlaceholder} />
              </div>
            )}

            {form.subject_id && professionId === 'counselor' ? (
              <div>
                <span className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  {profession.subjectLabel || 'Client Name'}
                </span>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">
                    {form.subject_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{form.subject_name}</span>
                  <span className="ml-auto text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">Client File</span>
                </div>
              </div>
            ) : (
              <SubjectPicker
                label={profession.subjectLabel || 'Subject Name'}
                required
                value={form.subject_name}
                userId={user?.id}
                onChangeName={(name) => setForm(prev => ({ ...prev, subject_name: name }))}
                onChangeId={(id) => setForm(prev => ({ ...prev, subject_id: id }))}
              />
            )}

            <div>
              <LabelWithTooltip label="Subject Role / Position" tooltip="The subject's role in the context of this session. Helps AI analyse the transcript more accurately." />
              <Input value={form.subject_role} onChange={set('subject_role')} placeholder="e.g. Witness, Accused, Patient, Auditee" />
            </div>

            {caseFields.witnessLabel && (
              <div>
                <LabelWithTooltip label={caseFields.witnessLabel} tooltip="Officer or individual present as witness or observer in this session." />
                <Input value={form.witness_officer} onChange={set('witness_officer')} placeholder="Name of witness officer (if any)" />
              </div>
            )}

            {!isCounselor && (
              <div>
                <LabelWithTooltip label="Other Officers Present" tooltip="Other officers also present besides the main witness. Separate names with commas." />
                <Textarea
                  value={form.other_officers}
                  onChange={set('other_officers')}
                  rows={2}
                  placeholder="e.g. Insp. Ahmad, Sgt. Razak (separate with commas)"
                />
              </div>
            )}

            <div>
              <LabelWithTooltip label="Context Notes" tooltip="Background information to help AI generate more accurate question suggestions and report. Not shared with the subject." />
              <Textarea value={form.context_notes} onChange={set('context_notes')} rows={3} placeholder="Case background, session purpose, other relevant information..." />
            </div>

            {customFieldLabels.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Additional Organisation Information</p>
                <div className="space-y-2">
                  {customFieldLabels.map(label => (
                    <div key={label}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input
                        type="text"
                        value={(form.custom_fields || {})[label] || ''}
                        onChange={e => setCustomField(label, e.target.value)}
                        placeholder={`Enter ${label}...`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showCasePicker && (
              <div>
                <LabelWithTooltip label="Link to Case File (optional)" tooltip="Select a related case file to organise this session automatically." />
                {activeCases.length > 0 ? (
                  <select
                    value={selectedCaseId}
                    onChange={e => handleCaseChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No case (standalone)</option>
                    {activeCases
                      .filter(c => !c.profession || c.profession === professionId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title}{c.case_number ? ` — ${c.case_number}` : ''}
                        </option>
                      ))}
                    {activeCases
                      .filter(c => c.profession && c.profession !== professionId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title}{c.case_number ? ` — ${c.case_number}` : ''} (other profession)
                        </option>
                      ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-400 py-1">
                    No case files yet.{' '}
                    <button type="button" className="text-blue-600 hover:underline font-medium" onClick={() => navigate('/cases')}>
                      Create a case file first →
                    </button>
                  </p>
                )}
              </div>
            )}

            {teamMembers.length > 0 && (
              <div>
                <LabelWithTooltip label="Assign To" tooltip="Assign this session to a team member. They will see it in their dashboard." />
                <select
                  value={form.assignee_id}
                  onChange={e => setForm(prev => ({ ...prev, assignee_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Myself (no assignment)</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.user_id}>{m.email} ({m.role})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={handleBack}>Back</Button>
              <Button type="submit" className="flex-1">Continue to Consent →</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
