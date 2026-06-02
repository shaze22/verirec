import { useEffect, useState, useMemo, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

import { TopBar } from '../components/layout/TopBar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import toast from 'react-hot-toast';

const PLAN_LABELS  = { free: 'Percuma', starter: 'Starter', pro: 'Pro', biz: 'Perniagaan' };
const PLAN_COLORS  = { free: 'gray', starter: 'blue', pro: 'purple', biz: 'green' };
const PLAN_PRICES  = { starter: 100, pro: 999, biz: 2499 };
const PLAN_OPTIONS = [
  { value: 'free',      label: 'Percuma  (2 sesi)' },
  { value: 'starter',   label: 'Profesional  (10 sesi)' },
  { value: 'counselor', label: 'Kaunselor  (10 sesi)' },
  { value: 'pro',       label: 'Pro  (100 sesi)' },
  { value: 'biz',       label: 'Perniagaan  (200 sesi)' },
];

function StatCard({ label, value, sub, color = 'blue' }) {
  const txt = { blue: 'text-blue-600', green: 'text-green-600', purple: 'text-purple-600', amber: 'text-amber-600', red: 'text-red-600' };
  return (
    <div className="bg-white rounded-xl border p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${txt[color] || txt.blue}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Spinner({ className = 'w-3 h-3 border-current' }) {
  return <span className={`${className} border-2 border-t-transparent rounded-full animate-spin inline-block`} />;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');
  const [search, setSearch]   = useState('');

  // action loading: "userId_action"
  const [actionLoading, setActionLoading] = useState(null);

  // dropdowns
  const [planDropdown, setPlanDropdown] = useState(null);
  const [kebabMenu, setKebabMenu]       = useState(null);
  const planRef  = useRef(null);
  const kebabRef = useRef(null);

  // email modal
  const [emailModal, setEmailModal]     = useState(null); // { userId, email }
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // consent modal
  const [consentModal, setConsentModal]   = useState(null); // { userId, email }
  const [consentLogs, setConsentLogs]     = useState([]);
  const [consentLoading, setConsentLoading] = useState(false);

  // close dropdowns on outside click
  useEffect(() => {
    const h = (e) => {
      if (planRef.current  && !planRef.current.contains(e.target))  setPlanDropdown(null);
      if (kebabRef.current && !kebabRef.current.contains(e.target)) setKebabMenu(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/auth'); return; }
        const res = await fetch('/api/admin', { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.status === 403) { toast.error('Akses declined.'); navigate('/dashboard'); return; }
        if (!res.ok) throw new Error('Gagal memuatkan data admin');
        setData(await res.json());
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const adminPost = async (body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Ralat'); }
    return res.json();
  };

  // ── handlers ──────────────────────────────────────────────
  const handleChangePlan = async (userId, plan) => {
    setPlanDropdown(null);
    setActionLoading(userId + '_plan');
    try {
      const { subscription } = await adminPost({ action: 'update-plan', userId, plan });
      setData(p => ({ ...p, users: p.users.map(u => u.id === userId ? { ...u, subscription } : u) }));
      toast.success(`Plan ditukar ke ${PLAN_LABELS[plan]}`);
    } catch (err) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  const handleResetSessions = async (userId, email) => {
    if (!window.confirm(`Reset sesi untuk ${email}? Kiraan akan kembali ke 0.`)) return;
    setActionLoading(userId + '_reset');
    try {
      const { subscription } = await adminPost({ action: 'reset-sessions', userId });
      setData(p => ({ ...p, users: p.users.map(u => u.id === userId ? { ...u, subscription } : u) }));
      toast.success('Sessions berjaya direset.');
    } catch (err) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) return;
    setEmailSending(true);
    try {
      await adminPost({ action: 'send-email', userId: emailModal.userId, subject: emailSubject, message: emailMessage });
      toast.success('E-mel berjaya sent.');
      setEmailModal(null); setEmailSubject(''); setEmailMessage('');
    } catch (err) { toast.error(err.message); }
    finally { setEmailSending(false); }
  };

  const handleOpenConsent = async (userId, email) => {
    setKebabMenu(null);
    setConsentModal({ userId, email });
    setConsentLogs([]);
    setConsentLoading(true);
    try {
      const { logs } = await adminPost({ action: 'get-consent-logs', userId });
      setConsentLogs(logs);
    } catch (err) { toast.error(err.message); setConsentModal(null); }
    finally { setConsentLoading(false); }
  };

  const handleExportUser = async (userId, email) => {
    setKebabMenu(null);
    setActionLoading(userId + '_export');
    try {
      const exportData = await adminPost({ action: 'export-user', userId });
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `verirec-pdpa-${email}-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Data exported.');
    } catch (err) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  const handleSuspend = async (userId, email) => {
    setKebabMenu(null);
    if (!window.confirm(`Suspend akaun ${email}? Users tidak akan dapat log masuk.`)) return;
    setActionLoading(userId + '_suspend');
    try {
      const { banned_until } = await adminPost({ action: 'suspend-user', userId });
      setData(p => ({ ...p, users: p.users.map(u => u.id === userId ? { ...u, banned_until } : u) }));
      toast.success('Akaun pengguna digantung.');
    } catch (err) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  const handleUnsuspend = async (userId, email) => {
    setKebabMenu(null);
    if (!window.confirm(`Activekan semula akaun ${email}?`)) return;
    setActionLoading(userId + '_suspend');
    try {
      await adminPost({ action: 'unsuspend-user', userId });
      setData(p => ({ ...p, users: p.users.map(u => u.id === userId ? { ...u, banned_until: null } : u) }));
      toast.success('Akaun pengguna diaktifkan semula.');
    } catch (err) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  // ── derived metrics ───────────────────────────────────────
  const mrr = useMemo(() => {
    if (!data?.users) return 0;
    return data.users.reduce((t, u) => t + (PLAN_PRICES[u.subscription?.plan] || 0), 0);
  }, [data]);

  const inactiveCount = useMemo(() => {
    if (!data?.users) return 0;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    return data.users.filter(u => !u.last_sign_in_at || new Date(u.last_sign_in_at) < cutoff).length;
  }, [data]);

  const growthData = useMemo(() => {
    if (!data?.users) return [];
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const wStart = new Date(now); wStart.setDate(now.getDate() - (7 - i) * 7); wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
      return {
        label: `${wStart.getDate()}/${wStart.getMonth() + 1}`,
        count: data.users.filter(u => { const d = new Date(u.created_at); return d >= wStart && d < wEnd; }).length,
      };
    });
  }, [data]);

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    const q = search.toLowerCase();
    if (!q) return data.users;
    return data.users.filter(u => u.email?.toLowerCase().includes(q) || u.subscription?.plan?.includes(q));
  }, [data, search]);

  const { stats } = data || {};
  const maxGrowth = Math.max(...(growthData.map(w => w.count)), 1);

  // ── render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Admin Panel" actions={
        <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full">Admin</span>
      } />

      <div className="flex-1 overflow-auto p-6">
        {/* tabs */}
        <div className="flex gap-1 mb-6 border-b">
          {[
            { key: 'overview', label: 'Ringkasan' },
            { key: 'users',    label: `Users${data ? ` (${data.users.length})` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>

        ) : tab === 'overview' ? (
          <div className="space-y-6">
            {/* stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total Users"       value={stats.totalUsers}        sub="semua masa"                                color="blue" />
              <StatCard label="Pendaftaran Bulan Ini" value={stats.newThisMonth}      sub={format(new Date(), 'MMMM yyyy')}          color="green" />
              <StatCard label="MRR"                   value={`RM ${mrr.toLocaleString()}`} sub={`${stats.paidUsers} langganan berbayar`} color="purple" />
              <StatCard label="Sessions Bulan Ini"        value={stats.sessionsThisMonth} sub={`${stats.totalSessions} keseluruhan`}     color="amber" />
              <StatCard label="Subscriptions Berbayar"    value={stats.paidUsers}         sub={`daripada ${stats.totalUsers} pengguna`}  color="green" />
              <StatCard label="Tidak Active (30 hari)" value={inactiveCount}           sub="log masuk terakhir > 30 hari"             color="red" />
            </div>

            {/* growth chart */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Pertumbuhan Users (8 Minggu)</h3>
              <div className="flex items-end gap-2 h-24">
                {growthData.map((week, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    {week.count > 0 && <span className="text-xs font-medium text-blue-600">{week.count}</span>}
                    <div className="w-full bg-gray-100 rounded-t flex items-end" style={{ height: '60px' }}>
                      <div className="w-full bg-blue-500 rounded-t transition-all"
                        style={{ height: `${Math.max(2, (week.count / maxGrowth) * 60)}px` }} />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{week.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* plan distribution */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Pecahan Pelan</h3>
              <div className="space-y-3">
                {Object.entries(stats.planCounts).map(([plan, count]) => {
                  const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                  const bars = { free: 'bg-gray-400', starter: 'bg-blue-500', pro: 'bg-purple-500', biz: 'bg-green-500' };
                  return (
                    <div key={plan}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge color={PLAN_COLORS[plan] || 'gray'} className="text-xs">{PLAN_LABELS[plan] || plan}</Badge>
                          <span className="text-sm text-gray-700">{count} pengguna</span>
                          {plan !== 'free' && <span className="text-xs text-gray-400">· RM {((PLAN_PRICES[plan] || 0) * count).toLocaleString()}/bln</span>}
                        </div>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bars[plan] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* recent signups */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Pendaftaran Terbaru</h3>
              <div className="space-y-2">
                {[...data.users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8).map(u => (
                  <div key={u.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-500">
                        {u.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.email}</p>
                        <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <Badge color={PLAN_COLORS[u.subscription?.plan] || 'gray'} className="text-xs">
                      {PLAN_LABELS[u.subscription?.plan] || 'Percuma'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

        ) : (
          <div>
            <div className="relative mb-4 max-w-sm">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari e-mel atau pelan..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {['Users', 'Pelan', 'Sessions', 'Daftar', 'Active Terakhir', 'Tindakan'].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Tindakan' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => {
                    const sub = u.subscription;
                    const plan = sub?.plan || 'free';
                    const isSuspended = u.banned_until && new Date(u.banned_until) > new Date();
                    return (
                      <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isSuspended ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 flex-shrink-0">
                              {u.email?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <span className="text-gray-800 truncate max-w-[200px] block">{u.email}</span>
                              {isSuspended && <span className="text-xs text-red-500 font-medium">Digantung</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={PLAN_COLORS[plan] || 'gray'} className="text-xs">{PLAN_LABELS[plan] || plan}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {sub ? (sub.sessions_limit === -1 ? `${sub.sessions_used} / ∞` : `${sub.sessions_used} / ${sub.sessions_limit}`) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {format(new Date(u.created_at), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {u.last_sign_in_at ? formatDistanceToNow(new Date(u.last_sign_in_at), { addSuffix: true }) : <span className="text-gray-300">Never</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tukar Plan */}
                            <div className="relative" ref={planDropdown === u.id ? planRef : null}>
                              <button onClick={() => setPlanDropdown(planDropdown === u.id ? null : u.id)}
                                disabled={actionLoading === u.id + '_plan'}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50">
                                {actionLoading === u.id + '_plan' ? <Spinner /> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>}
                                Plan
                              </button>
                              {planDropdown === u.id && (
                                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                                  {PLAN_OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => handleChangePlan(u.id, opt.value)}
                                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between ${plan === opt.value ? 'font-semibold text-blue-600' : 'text-gray-700'}`}>
                                      {opt.label}
                                      {plan === opt.value && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Reset Sessions */}
                            <button onClick={() => handleResetSessions(u.id, u.email)}
                              disabled={actionLoading === u.id + '_reset' || !sub || sub.sessions_used === 0}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Reset kiraan sesi ke 0">
                              {actionLoading === u.id + '_reset' ? <Spinner /> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                              Reset
                            </button>

                            {/* kebab ⋮ */}
                            <div className="relative" ref={kebabMenu === u.id ? kebabRef : null}>
                              <button onClick={() => setKebabMenu(kebabMenu === u.id ? null : u.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              {kebabMenu === u.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                                  <button onClick={() => { setKebabMenu(null); setEmailModal({ userId: u.id, email: u.email }); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    Hantar E-mel
                                  </button>
                                  <button onClick={() => handleOpenConsent(u.id, u.email)}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    Log Consent PDPA
                                  </button>
                                  <button onClick={() => handleExportUser(u.id, u.email)}
                                    disabled={actionLoading === u.id + '_export'}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50">
                                    {actionLoading === u.id + '_export' ? <Spinner className="w-3.5 h-3.5 border-gray-400" /> : <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                    Export Data (PDPA)
                                  </button>
                                  <div className="my-1 border-t border-gray-100" />
                                  {isSuspended ? (
                                    <button onClick={() => handleUnsuspend(u.id, u.email)}
                                      disabled={actionLoading === u.id + '_suspend'}
                                      className="w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50">
                                      {actionLoading === u.id + '_suspend' ? <Spinner className="w-3.5 h-3.5 border-green-600" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                      Activekan Semula
                                    </button>
                                  ) : (
                                    <button onClick={() => handleSuspend(u.id, u.email)}
                                      disabled={actionLoading === u.id + '_suspend'}
                                      className="w-full text-left px-3 py-2 text-xs text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50">
                                      {actionLoading === u.id + '_suspend' ? <Spinner className="w-3.5 h-3.5 border-red-600" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
                                      Suspend Akaun
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">Tiada pengguna sepadan dengan carian.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Email modal ── */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setEmailModal(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Hantar E-mel</h3>
              <button onClick={() => setEmailModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kepada</label>
                <input value={emailModal.email} readOnly className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subjek *</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Tajuk e-mel"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mesej *</label>
                <textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)}
                  rows={5} placeholder="Tulis mesej di sini..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEmailModal(null)} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                <button onClick={handleSendEmail} disabled={emailSending || !emailSubject.trim() || !emailMessage.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {emailSending && <Spinner />}
                  Hantar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Consent modal ── */}
      {consentModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setConsentModal(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Log Consent PDPA</h3>
                <p className="text-xs text-gray-500 mt-0.5">{consentModal.email}</p>
              </div>
              <button onClick={() => setConsentModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {consentLoading ? (
              <div className="flex justify-center py-8"><Spinner className="w-6 h-6 border-blue-600" /></div>
            ) : consentLogs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No records consent untuk pengguna ini.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {consentLogs.map(log => (
                  <div key={log.id} className={`flex items-start justify-between p-3 rounded-lg border ${log.decision === 'accepted' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${log.decision === 'accepted' ? 'text-green-700' : 'text-red-700'}`}>
                          {log.decision === 'accepted' ? '✓ Terima' : '✗ Tolak'}
                        </span>
                        <span className="text-xs text-gray-400">{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}</span>
                      </div>
                      {log.user_agent && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[340px]">{log.user_agent}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setConsentModal(null)} className="mt-4 w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
