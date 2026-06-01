import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../api/subjects.js';
import { supabase } from '../lib/supabase.js';
import { isCounselorSubdomain } from '../lib/subdomain.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import toast from 'react-hot-toast';

const riskColors = { low: 'green', medium: 'yellow', high: 'red' };
const riskLabels = { low: 'Low', medium: 'Moderate', high: 'High' };
const riskOrder  = { low: 0, medium: 1, high: 2 };

function RiskTrend({ sessions }) {
  if (sessions.length < 2) return null;
  const withRisk = sessions.filter(s => s.report?.riskLevel);
  if (withRisk.length < 2) return null;
  const first = riskOrder[withRisk[0].report.riskLevel] ?? 0;
  const last  = riskOrder[withRisk[withRisk.length - 1].report.riskLevel] ?? 0;
  if (last > first) return <span className="text-red-500 font-bold text-base" title="Risiko meningkat">↑</span>;
  if (last < first) return <span className="text-green-500 font-bold text-base" title="Risiko menurun">↓</span>;
  return <span className="text-amber-400 font-bold text-base" title="Risiko stabil">→</span>;
}

function SubjectHistoryModal({ subject, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!subject) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('sessions')
          .select('id, title, created_at, duration, report, status, profession')
          .or(`subject_id.eq.${subject.id},subject_name.ilike.${subject.name}`)
          .neq('profession', 'counselor')
          .order('created_at', { ascending: true });
        setSessions(data || []);
      } catch {
        toast.error('Gagal memuatkan sejarah sesi.');
      } finally {
        setLoading(false);
      }
    })();
  }, [subject]);

  return (
    <Modal open={!!subject} onClose={onClose} title={`History Sesi — ${subject?.name}`}>
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Tiada sesi rekod untuk subjek ini.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">{sessions.length} sesi dijumpai</p>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-xs text-gray-500">Trend risiko:</span>
              <RiskTrend sessions={sessions} />
            </div>
          </div>
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => { navigate(`/session/${s.id}`); onClose(); }}
              className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(s.created_at), 'dd MMM yyyy')} · {Math.round((s.duration || 0) / 60)} min
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {s.report?.riskLevel ? (
                    <Badge color={riskColors[s.report.riskLevel]}>{riskLabels[s.report.riskLevel]}</Badge>
                  ) : (
                    <Badge color="gray">Tiada laporan</Badge>
                  )}
                  {s.status === 'closed' && <Badge color="gray">Ditutup</Badge>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

const emptyForm = { name: '', ic_number: '', phone: '', email: '', address: '', notes: '' };

function SubjectForm({ value, onChange }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <div className="space-y-4">
      <Input label="Full Name *" value={value.name} onChange={set('name')} placeholder="Nama penuh subjek" required />
      <Input label="Nombor IC / Pasport" value={value.ic_number} onChange={set('ic_number')} placeholder="cth. 901231-07-5123" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Telefon" value={value.phone} onChange={set('phone')} placeholder="cth. 012-3456789" />
        <Input label="E-mel" type="email" value={value.email} onChange={set('email')} placeholder="emel@contoh.com" />
      </div>
      <Input label="Alamat" value={value.address} onChange={set('address')} placeholder="Alamat (jika perlu)" />
      <Textarea label="Nota" value={value.notes} onChange={set('notes')} rows={3} placeholder="Maklumat tambahan tentang subjek..." />
    </div>
  );
}

export default function SubjectsPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [historySubject, setHistorySubject] = useState(null);
  const showHistory = !isCounselorSubdomain();

  const load = useCallback(async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch {
      toast.error('Gagal memuatkan profil subjek.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-open SubjectHistoryModal bila navigate dari global search (?id=xxx)
  useEffect(() => {
    const targetId = searchParams.get('id');
    if (!targetId || loading || subjects.length === 0) return;
    const found = subjects.find(s => s.id === targetId);
    if (found) {
      setHistorySubject(found);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, subjects, loading, setSearchParams]);

  const openCreate = () => { setForm(emptyForm); setModal({ mode: 'create' }); };

  const openEdit = (subject) => {
    setForm({
      name: subject.name || '',
      ic_number: subject.ic_number || '',
      phone: subject.phone || '',
      email: subject.email || '',
      address: subject.address || '',
      notes: subject.notes || '',
    });
    setModal({ mode: 'edit', subject });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createSubject(user.id, form);
        toast.success('Profil subjek berjaya dicipta.');
      } else {
        await updateSubject(modal.subject.id, form);
        toast.success('Profil berjaya dikemas kini.');
      }
      setModal(null);
      load();
    } catch {
      toast.error('Gagal menyimpan. Cuba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete profil ini? Sesi yang dikaitkan tidak akan terpadam.')) return;
    setDeleting(id);
    try {
      await deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
      toast.success('Profil dipadamkan.');
    } catch {
      toast.error('Gagal memadam. Cuba lagi.');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.ic_number || '').includes(search) ||
    (s.phone || '').includes(search)
  );

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Profil Subjek" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Profil Subjek</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading ? 'Memuatkan...' : `${subjects.length} profil disimpan`}
              </p>
            </div>
            <Button onClick={openCreate}>+ Tambah Profil</Button>
          </div>

          <div className="mb-4">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, nombor IC atau telefon..."
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-medium">
                {search ? 'Tiada profil dijumpai.' : 'Tiada profil subjek lagi.'}
              </p>
              {!search && (
                <button onClick={openCreate} className="mt-2 text-sm text-blue-600 hover:underline">
                  Tambah profil pertama →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(s => (
                <div key={s.id} className="bg-white border rounded-xl p-4 flex items-start justify-between gap-4 hover:border-blue-200 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-semibold text-sm">{s.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {s.ic_number && <span className="text-xs text-gray-500">IC: {s.ic_number}</span>}
                        {s.phone && <span className="text-xs text-gray-500">{s.phone}</span>}
                        {s.email && <span className="text-xs text-gray-500">{s.email}</span>}
                      </div>
                      {s.notes && (
                        <p className="text-xs text-gray-400 mt-1 truncate max-w-xs">{s.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {showHistory && (
                      <button
                        onClick={() => setHistorySubject(s)}
                        className="text-xs text-gray-500 hover:text-blue-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-blue-50"
                      >
                        History
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs text-gray-500 hover:text-blue-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                      className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting === s.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showHistory && (
        <SubjectHistoryModal
          subject={historySubject}
          onClose={() => setHistorySubject(null)}
        />
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Tambah Profil Subjek' : 'Edit Profil Subjek'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <SubjectForm value={form} onChange={setForm} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {modal?.mode === 'create' ? 'Save Profil' : 'Kemas Kini'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
