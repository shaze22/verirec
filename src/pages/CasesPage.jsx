import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore.js';
import { getCases, createCase, updateCase, deleteCase } from '../api/cases.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { professionLabel } from '../data/professions.js';
import toast from 'react-hot-toast';

const professions = [
  { id: 'counselor', label: 'Kaunselor' },
  { id: 'police',    label: 'Polis' },
  { id: 'sprm',      label: 'SPRM' },
  { id: 'hr',        label: 'HR / Disiplin' },
  { id: 'doctor',    label: 'Doktor / Psikiatri' },
  { id: 'iso',       label: 'ISO Auditor' },
];

const statusConfig = {
  active:  { label: 'Active',        color: 'green' },
  pending: { label: 'Pending', color: 'yellow' },
  closed:  { label: 'Closed',      color: 'gray' },
};

const emptyForm = { title: '', case_number: '', profession: '', status: 'active', description: '' };

function CaseForm({ value, onChange }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <div className="space-y-4">
      <Input label="Tajuk Case Files *" value={value.title} onChange={set('title')} placeholder="cth. Kes Kaunseling Ahmad 2026" required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Case Number" value={value.case_number} onChange={set('case_number')} placeholder="cth. KS/2026/001" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
          <select
            value={value.profession}
            onChange={set('profession')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Professions</option>
            {professions.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          value={value.status}
          onChange={set('status')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <Textarea label="Description" value={value.description} onChange={set('description')} rows={3} placeholder="Brief description of this case..." />
    </div>
  );
}

export default function CasesPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getCases();
      setCases(data);
    } catch {
      toast.error('Failed to load case files.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setModal({ mode: 'create' }); };

  const openEdit = (c, e) => {
    e.stopPropagation();
    setForm({
      title: c.title || '',
      case_number: c.case_number || '',
      profession: c.profession || '',
      status: c.status || 'active',
      description: c.description || '',
    });
    setModal({ mode: 'edit', case: c });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        const created = await createCase(user.id, form);
        toast.success('Case file created successfully.');
        setModal(null);
        navigate(`/cases/${created.id}`);
      } else {
        await updateCase(modal.case.id, form);
        toast.success('Case file updated successfully.');
        setModal(null);
        load();
      }
    } catch {
      toast.error('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this case file? Associated sessions will not be deleted.')) return;
    setDeleting(id);
    try {
      await deleteCase(id);
      setCases(prev => prev.filter(c => c.id !== id));
      toast.success('Case file deleted.');
    } catch {
      toast.error('Failed to delete. Try again.');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = cases.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.case_number || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Case Files" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Case Files</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading ? 'Loading...' : `${cases.length} case files`}
              </p>
            </div>
            <Button onClick={openCreate}>+ Open Case File</Button>
          </div>

          {cases.length > 2 && (
            <div className="mb-4">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or case number..." />
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">{search ? 'No case files found.' : 'No case files yet.'}</p>
              {!search && (
                <button onClick={openCreate} className="mt-2 text-sm text-blue-600 hover:underline">
                  Open first case file →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(c => {
                const sc = statusConfig[c.status] || statusConfig.active;
                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    className="bg-white border rounded-xl p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-gray-900">{c.title}</h3>
                            <Badge color={sc.color} className="text-xs">{sc.label}</Badge>
                            {c.profession && (
                              <Badge color="blue" className="text-xs">{professionLabel(c.profession)}</Badge>
                            )}
                          </div>
                          {c.case_number && (
                            <p className="text-xs text-gray-500 mt-0.5">No. Kes: {c.case_number}</p>
                          )}
                          {c.description && (
                            <p className="text-xs text-gray-400 mt-1 truncate max-w-sm">{c.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <p className="text-xs text-gray-400 mr-2">{format(new Date(c.created_at), 'dd MMM yyyy')}</p>
                        <button
                          onClick={e => openEdit(c, e)}
                          className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={e => handleDelete(c.id, e)}
                          disabled={deleting === c.id}
                          className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deleting === c.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Open New Case File' : 'Edit Case File'}>
        <form onSubmit={handleSave} className="space-y-4">
          <CaseForm value={form} onChange={setForm} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {modal?.mode === 'create' ? 'Open Case File' : 'Update'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
