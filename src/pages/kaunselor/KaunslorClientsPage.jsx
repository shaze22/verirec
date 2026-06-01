import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import toast from 'react-hot-toast';

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

async function exportClientsCSV(userId) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*, sessions(count), action_plans(id), clinical_referrals(id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const headers = [
    'Name', 'IC No.', 'Matric/Staff No.', 'Date of Birth', 'Gender',
    'Phone', 'Email', 'Address', 'Risk Level', 'Presenting Issue',
    'Total Sessions', 'Total Action Plans', 'Total Referrals',
    'Date Registered',
  ];

  const rows = (data || []).map(c => [
    c.name,
    c.ic_number,
    c.student_id,
    c.date_of_birth ? format(new Date(c.date_of_birth), 'dd/MM/yyyy') : '',
    c.gender,
    c.phone,
    c.email,
    c.address,
    c.risk_level || 'none',
    c.presenting_issue,
    c.sessions?.[0]?.count ?? 0,
    c.action_plans?.length ?? 0,
    c.clinical_referrals?.length ?? 0,
    c.created_at ? format(new Date(c.created_at), 'dd/MM/yyyy') : '',
  ].map(csvEscape));

  const csv = [headers.map(csvEscape), ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `verirec-clients-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function KaunslorClientsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', ic_number: '', address: '', notes: '' });
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('subjects')
      .select('*, sessions(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setClients(data || []))
      .finally(() => setLoading(false));
  }, [user]);

  const RISK_ORDER = { suicidal: 0, self_harm: 1, mental_health: 2, none: 3, null: 4 };
  const filtered = clients
    .filter(c => {
      const matchSearch = !search.trim() || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.ic_number?.includes(search);
      const matchRisk = !filterRisk || (c.risk_level || 'none') === filterRisk;
      return matchSearch && matchRisk;
    })
    .sort((a, b) => {
      if (sortBy === 'risk') return (RISK_ORDER[a.risk_level] ?? 4) - (RISK_ORDER[b.risk_level] ?? 4);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'sessions') return (b.sessions?.[0]?.count || 0) - (a.sessions?.[0]?.count || 0);
      return new Date(b.created_at) - new Date(a.created_at); // newest
    });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.from('subjects')
        .insert({ ...addForm, user_id: user.id }).select().single();
      if (error) throw error;
      setClients(prev => [{ ...data, sessions: [{ count: 0 }] }, ...prev]);
      setShowAdd(false);
      setAddForm({ name: '', phone: '', email: '', ic_number: '', address: '', notes: '' });
      toast.success('New client added.');
    } catch { toast.error('Failed to add client.'); }
    finally { setAdding(false); }
  };

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Clients" action={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" loading={exporting} onClick={async () => {
            setExporting(true);
            try { await exportClientsCSV(user.id); toast.success('Client data exported.'); }
            catch { toast.error('Failed to export data.'); }
            finally { setExporting(false); }
          }}>
            📤 Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>+ New Client</Button>
        </div>
      } />
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <input type="text" placeholder="Search name, phone, or IC..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2">
            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Risk Levels</option>
              <option value="suicidal">🔴 Critical</option>
              <option value="self_harm">🟠 High</option>
              <option value="mental_health">🟡 Moderate</option>
              <option value="none">🟢 Low</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="newest">Newest</option>
              <option value="risk">Highest Risk</option>
              <option value="name">Name A–Z</option>
              <option value="sessions">Most Sessions</option>
            </select>
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 animate-pulse h-16" />
            ))}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">👥</div>
              <p className="font-medium">{search ? 'No results' : 'No clients yet'}</p>
              {!search && <p className="text-sm mt-1">Add a client or share your QR code for bookings.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => (
                <button key={c.id} onClick={() => navigate(`/kaunselor/clients/${c.id}`)}
                  className="w-full bg-white rounded-xl border p-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-sm transition-all text-left">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone || c.email || 'No contact'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-600">{c.sessions?.[0]?.count || 0} sessions</p>
                    <p className="text-xs text-gray-400">→</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">Add New Client</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              {[
                { k: 'name', label: 'Full Name *', placeholder: 'Client name', required: true },
                { k: 'phone', label: 'Phone No.', placeholder: '01X-XXXXXXX' },
                { k: 'email', label: 'Email', placeholder: 'email@example.com' },
                { k: 'ic_number', label: 'IC No.', placeholder: '000101-10-0000' },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                  <input type="text" value={addForm[f.k]} onChange={e => setAddForm(p => ({ ...p, [f.k]: e.target.value }))}
                    placeholder={f.placeholder} required={f.required}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={adding} className="flex-1">Add</Button>
                <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
