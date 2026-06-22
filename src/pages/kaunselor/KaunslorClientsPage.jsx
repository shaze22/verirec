import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import Reveal from '../../components/ui/Reveal.jsx';
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
            className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <div className="flex gap-2">
            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
              className="flex-1 rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              <option value="">All Risk Levels</option>
              <option value="suicidal">🔴 Critical</option>
              <option value="self_harm">🟠 High</option>
              <option value="mental_health">🟡 Moderate</option>
              <option value="none">🟢 Low</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="flex-1 rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              <option value="newest">Newest</option>
              <option value="risk">Highest Risk</option>
              <option value="name">Name A–Z</option>
              <option value="sessions">Most Sessions</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl ring-1 ring-gray-100 bg-white shadow-sm p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100">
                <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-700">{search ? 'No results found' : 'No clients yet'}</p>
              {!search && <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">Add a client manually or share your QR booking link.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((c, i) => {
                const riskColor = {
                  suicidal:     { avatar: 'bg-red-100 text-red-700',    badge: 'bg-red-100 text-red-700',    label: 'Critical' },
                  self_harm:    { avatar: 'bg-orange-100 text-orange-700', badge: 'bg-orange-100 text-orange-700', label: 'High' },
                  mental_health:{ avatar: 'bg-amber-100 text-amber-700', badge: 'bg-amber-100 text-amber-700', label: 'Moderate' },
                  none:         { avatar: 'bg-violet-100 text-violet-700', badge: 'bg-green-100 text-green-700', label: 'Low' },
                }[c.risk_level || 'none'];
                return (
                  <Reveal key={c.id} delay={(i % 6) * 70}>
                  <button onClick={() => navigate(`/kaunselor/clients/${c.id}`)}
                    className="w-full h-full rounded-2xl ring-1 ring-gray-100 bg-white shadow-sm p-5 hover:shadow-md transition-shadow text-left group">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 ${riskColor.avatar}`}>
                        {c.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">{c.phone || c.email || 'No contact'}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold flex-shrink-0 ${riskColor.badge}`}>{riskColor.label}</span>
                    </div>
                    {c.presenting_issue && (
                      <p className="text-xs text-gray-500 truncate mb-3 italic">"{c.presenting_issue}"</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{c.sessions?.[0]?.count || 0} sessions</span>
                      <span className="text-xs text-violet-600 font-medium group-hover:text-violet-800">View File →</span>
                    </div>
                  </button>
                  </Reveal>
                );
              })}
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
                    className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
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
