import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { format, parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const CATEGORIES = ['General', 'Anxiety', 'Depression', 'Grief', 'Relationships', 'Trauma', 'Career', 'Parenting', 'Self-Care', 'Crisis Support'];

const EMPTY_FORM = { title: '', category: 'General', url: '', description: '' };

export default function KaunslorResourcesPage() {
  const { user } = useAuthStore();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('All');

  useEffect(() => {
    if (!user) return;
    supabase.from('psychoed_resources').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setResources(data || []))
      .finally(() => setLoading(false));
  }, [user]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setShowAdd(true); };
  const openEdit = (r) => { setForm({ title: r.title, category: r.category, url: r.url || '', description: r.description || '' }); setEditing(r); setShowAdd(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase.from('psychoed_resources')
          .update({ ...form, title: form.title.trim() }).eq('id', editing.id)
          .select().single();
        if (error) throw error;
        setResources(prev => prev.map(r => r.id === editing.id ? data : r));
        toast.success('Resource updated!');
      } else {
        const { data, error } = await supabase.from('psychoed_resources')
          .insert({ ...form, title: form.title.trim(), user_id: user.id })
          .select().single();
        if (error) throw error;
        setResources(prev => [data, ...prev]);
        toast.success('Resource added!');
      }
      setShowAdd(false);
    } catch { toast.error('Failed to save resource.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    const { error } = await supabase.from('psychoed_resources').delete().eq('id', r.id);
    if (error) { toast.error('Failed to delete.'); return; }
    setResources(prev => prev.filter(x => x.id !== r.id));
    toast.success('Deleted.');
  };

  const cats = ['All', ...new Set(resources.map(r => r.category).filter(Boolean))];
  const filtered = filterCat === 'All' ? resources : resources.filter(r => r.category === filterCat);

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Psychoeducation Library</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage resources to assign to clients</p>
          </div>
          <Button onClick={openAdd} className="bg-violet-600 hover:bg-violet-700">+ Add Resource</Button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {cats.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterCat === c ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 border hover:border-violet-400'
              }`}>
              {c}
            </button>
          ))}
        </div>

        {/* Resource list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-sm">No resources yet.</p>
            <p className="text-xs mt-1 text-gray-300">Add articles, videos, worksheets, or links to share with clients.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(r => (
              <div key={r.id} className="bg-white rounded-xl border p-4 flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full font-medium">{r.category}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                  {r.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 mt-1.5 font-medium">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open Link
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Added {format(parseISO(r.created_at), 'dd MMM yyyy')}</p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(r)} className="text-xs text-gray-500 hover:text-violet-600 border rounded-lg px-2.5 py-1.5 hover:border-violet-400 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(r)} className="text-xs text-red-400 hover:text-red-600 border rounded-lg px-2.5 py-1.5 hover:border-red-400 transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">{editing ? 'Edit Resource' : 'Add Resource'}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Breathing Exercises for Anxiety"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">URL (optional)</label>
              <input value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} placeholder="https://..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3}
                placeholder="Brief description of this resource..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</Button>
              <Button onClick={handleSave} loading={saving} className="flex-1 bg-violet-600 hover:bg-violet-700">{editing ? 'Save' : 'Add'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
