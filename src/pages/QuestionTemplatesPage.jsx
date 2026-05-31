import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { supabase } from '../lib/supabase.js';
import { PROFESSIONS } from '../data/professions.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import toast from 'react-hot-toast';

async function fetchTemplates(userId) {
  const { data, error } = await supabase
    .from('question_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

async function saveTemplate(userId, { id, profession, name, questions }) {
  if (id) {
    const { data, error } = await supabase
      .from('question_templates')
      .update({ profession, name, questions })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('question_templates')
    .insert({ user_id: userId, profession, name, questions })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteTemplate(id) {
  const { error } = await supabase.from('question_templates').delete().eq('id', id);
  if (error) throw error;
}

const BLANK_FORM = { id: null, profession: 'counselor', name: '', questionsText: '' };
const BLANK_ASSESSMENT = { id: null, name: '', description: '', questions: [{ id: '', text: '', options: ['Ya', 'Tidak'] }] };

export default function QuestionTemplatesPage() {
  const { user } = useAuthStore();
  const isCounselor = localStorage.getItem('preferred_profession') === 'counselor';
  const [pageTab, setPageTab] = useState('soalan');
  const [templates, setTemplates] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProfession, setFilterProfession] = useState(isCounselor ? 'counselor' : '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [assessModal, setAssessModal] = useState(false);
  const [assessForm, setAssessForm] = useState(BLANK_ASSESSMENT);
  const [savingAssess, setSavingAssess] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchTemplates(user.id),
      supabase.from('assessment_sets').select('*').or(`user_id.eq.${user.id},is_default.eq.true`).order('is_default', { ascending: false }).order('created_at'),
    ]).then(([tmpl, { data: assess }]) => {
      setTemplates(tmpl);
      setAssessments(assess || []);
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
    setForm({
      id: t.id,
      profession: t.profession,
      name: t.name,
      questionsText: (t.questions || []).join('\n'),
    });
    setModal(true);
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
      const saved = await saveTemplate(user.id, { ...form, questions });
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

  const filtered = filterProfession
    ? templates.filter(t => t.profession === filterProfession)
    : templates;

  const grouped = PROFESSIONS.reduce((acc, p) => {
    const items = filtered.filter(t => t.profession === p.id);
    if (items.length) acc[p.id] = { label: p.label, items };
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title="Templat Soalan"
        actions={
          pageTab === 'soalan'
            ? <Button onClick={openNew}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg><span className="hidden sm:inline">Templat Baru</span></Button>
            : <Button onClick={() => { setAssessForm(BLANK_ASSESSMENT); setAssessModal(true); }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg><span className="hidden sm:inline">Assessment Baru</span></Button>
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
          {/* Filter — hidden for counselors, they only see their own profession */}
          {!isCounselor && (
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={filterProfession}
                onChange={e => setFilterProfession(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Profesion</option>
                {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              {filtered.length > 0 && (
                <span className="text-sm text-gray-500">{filtered.length} templat</span>
              )}
            </div>
          )}
          {isCounselor && filtered.length > 0 && (
            <span className="text-sm text-gray-500">{filtered.length} templat</span>
          )}

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
                          <p className="font-medium text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{(t.questions || []).length} soalan</p>
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
          {!isCounselor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profesion</label>
              <select
                value={form.profession}
                onChange={e => setForm(p => ({ ...p, profession: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
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
