import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { supabase } from '../lib/supabase.js';
import { PROFESSIONS } from '../data/professions.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { isCounselorSubdomain } from '../lib/subdomain.js';
import toast from 'react-hot-toast';

async function fetchTemplates(userId) {
  // Fetch own templates + team templates shared with user
  const { data: own, error: e1 } = await supabase.from('question_templates').select('*').eq('user_id', userId).order('created_at');
  if (e1) throw e1;

  // Get team_id where user is member or owner
  const { data: memberships } = await supabase.from('team_members').select('team_id').eq('user_id', userId).eq('status', 'active');
  const { data: ownedTeams }  = await supabase.from('teams').select('id').eq('owner_id', userId);
  const teamIds = [...new Set([...(memberships || []).map(m => m.team_id), ...(ownedTeams || []).map(t => t.id)])];

  let teamTemplates = [];
  if (teamIds.length) {
    const { data: team } = await supabase.from('question_templates').select('*').in('team_id', teamIds).eq('is_team_template', true).order('created_at');
    teamTemplates = (team || []).filter(t => t.user_id !== userId); // avoid duplicates
  }

  return [...(own || []), ...teamTemplates];
}

async function saveTemplate(userId, { id, profession, name, questions, use_case, is_team_template, team_id }) {
  const payload = { profession, name, questions, use_case: use_case || 'kaunseling', is_team_template: !!is_team_template, team_id: is_team_template ? team_id : null };
  if (id) {
    const { data, error } = await supabase.from('question_templates').update(payload).eq('id', id).eq('user_id', userId).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('question_templates').insert({ user_id: userId, ...payload }).select().single();
  if (error) throw error;
  return data;
}

async function deleteTemplate(id) {
  const { error } = await supabase.from('question_templates').delete().eq('id', id);
  if (error) throw error;
}

const ALL_USE_CASE_OPTIONS = [
  { value: 'kaunseling',   label: '💬 Kaunseling',        color: 'bg-emerald-100 text-emerald-700' },
  { value: 'soal-siasat', label: '🔍 Soal-siasat',        color: 'bg-blue-100 text-blue-700' },
  { value: 'audit',        label: '📋 Audit & Pematuhan',  color: 'bg-amber-100 text-amber-700' },
];
const USE_CASE_OPTIONS = isCounselorSubdomain()
  ? ALL_USE_CASE_OPTIONS
  : ALL_USE_CASE_OPTIONS.filter(o => o.value !== 'kaunseling');

const defaultUseCase = () => isCounselorSubdomain() ? 'kaunseling' : 'soal-siasat';
const defaultProfession = () => isCounselorSubdomain() ? 'counselor' : 'police';
const BLANK_FORM = { id: null, profession: defaultProfession(), name: '', questionsText: '', use_case: defaultUseCase(), is_team_template: false, team_id: null };
const BLANK_ASSESSMENT = { id: null, name: '', description: '', questions: [{ id: '', text: '', options: ['Ya', 'Tidak'] }] };

export default function QuestionTemplatesPage() {
  const { user } = useAuthStore();
  const isCounselor = isCounselorSubdomain();
  const [pageTab, setPageTab] = useState('soalan');
  const [templates, setTemplates] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProfession, setFilterProfession] = useState(isCounselor ? 'counselor' : '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterUseCase, setFilterUseCase] = useState('');
  const [myTeam, setMyTeam] = useState(null);
  const [assessModal, setAssessModal] = useState(false);
  const [assessForm, setAssessForm] = useState(BLANK_ASSESSMENT);
  const [savingAssess, setSavingAssess] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchTemplates(user.id),
      supabase.from('assessment_sets').select('*').or(`user_id.eq.${user.id},is_default.eq.true`).order('is_default', { ascending: false }).order('created_at'),
      supabase.from('teams').select('id, name').eq('owner_id', user.id).maybeSingle(),
    ]).then(([tmpl, { data: assess }, { data: team }]) => {
      setTemplates(tmpl);
      setAssessments(assess || []);
      setMyTeam(team);
    }).catch(() => toast.error('Gagal memuatkan templat')).finally(() => setLoading(false));
  }, [user]);

  const handleSaveAssessment = async () => {
    if (!assessForm.name.trim()) { toast.error('Nama assessment diperlukan.'); return; }
    const qs = assessForm.questions.filter(q => q.text.trim()).map((q, i) => ({
      id: `q${i+1}`, text: q.text.trim(),
      options: q.options.filter(o => o.trim()).map((o, j) => ({ value: `opt${j}`, label: o.trim() })),
    }));
    if (!qs.length) { toast.error('Masukkan sekurang-kurangnya satu soalan.'); return; }
    setSavingAssess(true);
    try {
      const payload = { user_id: user.id, name: assessForm.name, type: 'custom', description: assessForm.description, is_default: false, questions: qs };
      let saved;
      if (assessForm.id) {
        const { data, error } = await supabase.from('assessment_sets').update(payload).eq('id', assessForm.id).select().single();
        if (error) throw error; saved = data;
        setAssessments(prev => prev.map(a => a.id === saved.id ? saved : a));
      } else {
        const { data, error } = await supabase.from('assessment_sets').insert(payload).select().single();
        if (error) throw error; saved = data;
        setAssessments(prev => [...prev, saved]);
      }
      setAssessModal(false);
      toast.success('Assessment disimpan.');
    } catch { toast.error('Gagal menyimpan assessment.'); }
    finally { setSavingAssess(false); }
  };

  const handleDeleteAssessment = async (id) => {
    if (!window.confirm('Padam assessment ini?')) return;
    await supabase.from('assessment_sets').delete().eq('id', id).eq('user_id', user.id);
    setAssessments(prev => prev.filter(a => a.id !== id));
    toast.success('Assessment dipadam.');
  };

  const addQuestion = () => setAssessForm(f => ({ ...f, questions: [...f.questions, { id: '', text: '', options: ['Ya', 'Tidak'] }] }));
  const removeQuestion = (i) => setAssessForm(f => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));
  const updateQuestion = (i, field, val) => setAssessForm(f => { const qs = [...f.questions]; qs[i] = { ...qs[i], [field]: val }; return { ...f, questions: qs }; });

  const openNew = () => {
    setForm(BLANK_FORM);
    setModal(true);
  };

  const openEdit = (t) => {
    setForm({ id: t.id, profession: t.profession, name: t.name, questionsText: (t.questions || []).join('\n'), use_case: t.use_case || 'kaunseling' });
    setModal(true);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        let name = file.name.replace(/\.(csv|json)$/i, '');
        let questions = [];
        let use_case = defaultUseCase();

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            questions = parsed.filter(q => typeof q === 'string' && q.trim());
          } else if (parsed.questions) {
            questions = parsed.questions.filter(q => typeof q === 'string' && q.trim());
            if (parsed.name) name = parsed.name;
            if (parsed.use_case) use_case = parsed.use_case;
          }
        } else {
          // CSV — one question per line, skip empty lines and possible header
          questions = text.split('\n').map(l => l.replace(/^"(.+)"$/, '$1').trim()).filter(Boolean);
        }

        if (!questions.length) return toast.error('Tiada soalan dijumpai dalam fail.');
        setForm({ id: null, profession: isCounselor ? 'counselor' : 'police', name, questionsText: questions.join('\n'), use_case });
        setModal(true);
        toast.success(`${questions.length} soalan diimport dari fail.`);
      } catch { toast.error('Format fail tidak sah. Guna CSV atau JSON.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama templat diperlukan.'); return; }
    const questions = form.questionsText
      .split('\n')
      .map(q => q.trim())
      .filter(Boolean);
    if (!questions.length) { toast.error('Masukkan sekurang-kurangnya satu soalan.'); return; }

    setSaving(true);
    try {
      const saved = await saveTemplate(user.id, { ...form, questions, use_case: form.use_case, is_team_template: form.is_team_template, team_id: form.team_id });
      setTemplates(prev =>
        form.id
          ? prev.map(t => t.id === form.id ? saved : t)
          : [...prev, saved]
      );
      setModal(false);
      toast.success(form.id ? 'Templat dikemas kini.' : 'Templat baharu ditambah.');
    } catch {
      toast.error('Gagal menyimpan templat.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Padam templat ini?')) return;
    try {
      await deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Templat dipadam.');
    } catch {
      toast.error('Gagal memadam templat.');
    }
  };

  const copyQuestions = (questions) => {
    navigator.clipboard.writeText(questions.join('\n'))
      .then(() => toast.success('Soalan disalin ke papan klip.'))
      .catch(() => toast.error('Gagal menyalin.'));
  };

  const filtered = templates.filter(t =>
    (!filterProfession || t.profession === filterProfession) &&
    (!filterUseCase || t.use_case === filterUseCase)
  );

  const grouped = PROFESSIONS.reduce((acc, p) => {
    const items = filtered.filter(t => t.profession === p.id);
    if (items.length) acc[p.id] = { label: p.label, items };
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title="Templat Soalan"
        action={
          pageTab === 'soalan' ? (
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input type="file" accept=".csv,.json" className="hidden" onChange={handleImport} />
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  📥 <span className="hidden sm:inline">Import</span>
                </span>
              </label>
              <Button onClick={openNew} size="sm">+ Templat Baru</Button>
            </div>
          ) : (
            <Button onClick={() => { setAssessForm(BLANK_ASSESSMENT); setAssessModal(true); }} size="sm">+ Assessment Baru</Button>
          )
        }
      />

      {/* Page tabs */}
      <div className="flex border-b bg-white px-6 gap-1">
        {[
          { id:'soalan', label:'Templat Soalan' },
          ...(isCounselor ? [{ id:'assessment', label:'Custom Assessment' }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setPageTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${pageTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto space-y-6">

        {/* ── ASSESSMENT TAB ── */}
        {pageTab === 'assessment' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <strong>Custom Assessment</strong> — Buat ujian saringan atau soal selidik sendiri. Assessment ini boleh digunakan semasa sesi dalam panel Assessment.
            </div>

            {assessments.map(a => (
              <div key={a.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{a.name}</h3>
                      {a.is_default && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>}
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{a.type}</span>
                    </div>
                    {a.description && <p className="text-sm text-gray-500">{a.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{a.questions?.length || 0} soalan</p>
                  </div>
                  {!a.is_default && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => {
                        setAssessForm({
                          id: a.id, name: a.name, description: a.description || '',
                          questions: (a.questions || []).map(q => ({ id: q.id, text: q.text, options: (q.options || []).map(o => o.label) })),
                        });
                        setAssessModal(true);
                      }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteAssessment(a.id)}>Padam</Button>
                    </div>
                  )}
                </div>
                {/* Preview questions */}
                <div className="mt-3 space-y-1">
                  {(a.questions || []).slice(0, 3).map((q, i) => (
                    <p key={i} className="text-xs text-gray-500">• {q.text}</p>
                  ))}
                  {(a.questions || []).length > 3 && <p className="text-xs text-gray-400">+{a.questions.length - 3} soalan lagi...</p>}
                </div>
              </div>
            ))}

            {assessments.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p>Belum ada custom assessment.</p>
              </div>
            )}
          </div>
        )}

        {/* ── SOALAN TAB ── */}
        {pageTab === 'soalan' && <>
          {/* Filter bar — use-case tabs untuk non-kaunselor sahaja */}
          {!isCounselor && (
            <div className="flex items-center gap-2 flex-wrap">
              {[{ value: '', label: 'Semua' }, ...USE_CASE_OPTIONS].map(uc => {
                const count = uc.value === '' ? templates.length : templates.filter(t => t.use_case === uc.value).length;
                const active = filterUseCase === uc.value;
                return (
                  <button key={uc.value} onClick={() => setFilterUseCase(uc.value)}
                    className={`inline-flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full font-medium transition-all border ${
                      active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    {uc.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
              <select value={filterProfession} onChange={e => setFilterProfession(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600">
                <option value="">Semua Profesion</option>
                {PROFESSIONS.filter(p => isCounselor || p.id !== 'counselor').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          )}

          {/* Import hint — subtle, compact */}
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Sokong import <strong>.csv</strong> (satu soalan per baris) dan <strong>.json</strong> — guna butang Import di atas kanan.</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tiada Templat</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                Cipta bank soalan untuk setiap profesion supaya anda tidak perlu taip semula.
              </p>
              <Button onClick={openNew}>Cipta Templat Pertama</Button>
            </div>
          ) : (
            Object.entries(grouped).map(([profId, { label, items }]) => (
              <div key={profId}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</h3>
                <div className="space-y-3">
                  {items.map(t => (
                    <div key={t.id} className="bg-white rounded-xl border overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="font-medium text-gray-900">{t.name}</p>
                            {t.use_case && (() => {
                              const uc = USE_CASE_OPTIONS.find(u => u.value === t.use_case);
                              return uc ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${uc.color}`}>{uc.label}</span> : null;
                            })()}
                            {t.is_team_template && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">👥 Pasukan</span>}
                            {t.user_id !== user?.id && <span className="text-xs text-gray-400 italic">Dikongsi</span>}
                          </div>
                          <p className="text-xs text-gray-500">{(t.questions || []).length} soalan</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); copyQuestions(t.questions || []); }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Salin soalan"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(t); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit templat"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(t.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Padam templat"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === t.id ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {expandedId === t.id && (
                        <div className="border-t bg-gray-50 px-4 py-4">
                          <ol className="space-y-2">
                            {(t.questions || []).map((q, i) => (
                              <li key={i} className="flex gap-3 text-sm text-gray-700">
                                <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                {q}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>}
        </div>
      </div>

      {/* Assessment Modal */}
      {assessModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4 p-6 space-y-4">
            <h3 className="font-semibold text-lg">{assessForm.id ? 'Edit Assessment' : 'Assessment Baru'}</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Nama Assessment *</label>
                <input type="text" value={assessForm.name} onChange={e => setAssessForm(f => ({ ...f, name: e.target.value }))} required
                  placeholder="cth. Saringan Kemurungan (PHQ-9), Ujian Kebimbangan..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Penerangan</label>
                <input type="text" value={assessForm.description} onChange={e => setAssessForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ringkasan ujian ini..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Soalan-soalan</label>
                  <button type="button" onClick={addQuestion} className="text-xs text-blue-600 font-medium">+ Tambah Soalan</button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {assessForm.questions.map((q, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5">{i+1}.</span>
                        <input type="text" value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)}
                          placeholder="Teks soalan..."
                          className="flex-1 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button type="button" onClick={() => removeQuestion(i)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                      </div>
                      <div className="flex items-center gap-2 ml-5">
                        <span className="text-xs text-gray-400">Pilihan:</span>
                        {q.options.map((opt, j) => (
                          <input key={j} type="text" value={opt}
                            onChange={e => { const opts = [...q.options]; opts[j] = e.target.value; updateQuestion(i, 'options', opts); }}
                            className="w-20 px-2 py-1 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        ))}
                        {q.options.length < 5 && (
                          <button type="button" onClick={() => updateQuestion(i, 'options', [...q.options, ''])} className="text-xs text-blue-500">+</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveAssessment} loading={savingAssess} className="flex-1">Simpan Assessment</Button>
              <Button variant="secondary" onClick={() => setAssessModal(false)}>Batal</Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form.id ? 'Edit Templat' : 'Templat Soalan Baharu'}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button onClick={handleSave} loading={saving}>Simpan Templat</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Penggunaan</label>
            <div className="flex gap-2">
              {USE_CASE_OPTIONS.map(uc => (
                <button key={uc.value} type="button" onClick={() => setForm(p => ({ ...p, use_case: uc.value }))}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border-2 transition-all ${form.use_case === uc.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {uc.label}
                </button>
              ))}
            </div>
          </div>
          {!isCounselor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profesion</label>
              <select
                value={form.profession}
                onChange={e => setForm(p => ({ ...p, profession: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROFESSIONS.filter(p => isCounselor || p.id !== 'counselor').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          )}

          {myTeam && (
            <div className="flex items-center justify-between py-2 border border-gray-100 rounded-xl px-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Kongsi dengan Pasukan</p>
                <p className="text-xs text-gray-400">Semua ahli pasukan "{myTeam.name}" boleh guna templat ini</p>
              </div>
              <button type="button"
                onClick={() => setForm(p => ({ ...p, is_team_template: !p.is_team_template, team_id: myTeam.id }))}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.is_team_template ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_team_template ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Templat *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="cth. Soalan Kaunseling Asas, Siasatan Awal Polis"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Soalan (satu per baris) *</label>
            <textarea
              value={form.questionsText}
              onChange={e => setForm(p => ({ ...p, questionsText: e.target.value }))}
              rows={8}
              placeholder={`Apakah masalah utama anda hari ini?\nBilakah masalah ini mula berlaku?\nBagaimana ia mempengaruhi kehidupan harian anda?`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.questionsText.split('\n').filter(Boolean).length} soalan
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
