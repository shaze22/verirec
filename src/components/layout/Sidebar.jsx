import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore.js';
import { useBillingStore } from '../../store/billingStore.js';
import { usePwaInstall } from '../../hooks/usePwaInstall.js';
import { isCounselorSubdomain } from '../../lib/subdomain.js';
import { supabase } from '../../lib/supabase.js';

const planLabels = { free: 'Percuma', counselor: 'Kaunselor', starter: 'Starter', pro: 'Pro', biz: 'Perniagaan' };
const ADMIN_EMAILS = ['syedshazni@todak.com', 'syedshazni@gmail.com'];

const ICONS = {
  dashboard: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  mic: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
  chart: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  users: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  folder: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>,
  calendar: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  doc: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  team: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
  settings: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

// Counselor-specific tabs
const COUNSELOR_ITEMS = [
  { to: '/analytics',                label: 'Dashboard',  icon: ICONS.chart },
  { to: '/kaunselor/clients',        label: 'Klien',      icon: ICONS.users },
  { to: '/kaunselor/appointments',   label: 'Temujanji',  icon: ICONS.calendar },
  { to: '/kaunselor/calendar',       label: 'Kalendar',   icon: ICONS.calendar },
  { to: '/team',                     label: 'Pasukan',    icon: ICONS.team },
  { to: '/templat',                  label: 'Templat',    icon: ICONS.doc },
  { to: '/audit',                    label: 'Log Audit',  icon: ICONS.folder },
  { to: '/settings',                 label: 'Tetapan',    icon: ICONS.settings },
];

// Other professions tabs — Sesi Terkini & Subjek removed from primary nav.
// Sessions are accessed through Fail Kes. Subjects via Carian Subjek (secondary link) or global search.
const OTHER_ITEMS = [
  { to: '/session/new', label: 'Sesi Baru',        icon: ICONS.mic,      cta: true },
  { to: '/cases',       label: 'Fail Kes',         icon: ICONS.folder },
  { to: '/jadual',      label: 'Jadual Sesi',      icon: ICONS.calendar },
  { to: '/templat',     label: 'Templat Soalan',   icon: ICONS.doc },
  { to: '/audit',       label: 'Log Audit',        icon: ICONS.doc },
  { to: '/team',        label: 'Pasukan',          icon: ICONS.team },
  { to: '/settings',    label: 'Tetapan',          icon: ICONS.settings },
];

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0">
    <rect width="32" height="32" rx="8" fill="#2563eb"/>
    <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

export function Sidebar() {
  const { user, signOut } = useAuthStore();
  const { subscription } = useBillingStore();
  const navigate = useNavigate();
  const { canInstall, install } = usePwaInstall();
  const isCounselor = isCounselorSubdomain();
  const navItems = isCounselor ? COUNSELOR_ITEMS
    : [
      { to: '/analytics', label: 'Papan Pemuka', icon: ICONS.dashboard },
      ...OTHER_ITEMS,
    ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/logout');
  };

  // Global search — www only
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = useCallback(async (q) => {
    if (!q.trim() || !user) { setSearchResults(null); return; }
    const pattern = `%${q}%`;
    try {
      const [{ data: sessions }, { data: cases }, { data: subjects }] = await Promise.all([
        supabase.from('sessions').select('id, title, subject_name, case_number').eq('user_id', user.id).or(`title.ilike.${pattern},subject_name.ilike.${pattern},case_number.ilike.${pattern}`).neq('profession', 'counselor').limit(5),
        supabase.from('cases').select('id, title, case_number').eq('user_id', user.id).or(`title.ilike.${pattern},case_number.ilike.${pattern}`).limit(5),
        supabase.from('subjects').select('id, name').eq('user_id', user.id).ilike('name', pattern).limit(5),
      ]);
      setSearchResults({ sessions: sessions || [], cases: cases || [], subjects: subjects || [] });
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    searchTimer.current = setTimeout(() => runSearch(searchQuery), 280);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, runSearch]);

  const allResults = searchResults ? [
    ...(searchResults.sessions || []).map(s => ({ type: 'session', id: s.id, label: s.title, sub: s.subject_name || s.case_number, path: `/session/${s.id}` })),
    ...(searchResults.cases || []).map(c => ({ type: 'case', id: c.id, label: c.title, sub: c.case_number, path: `/cases/${c.id}` })),
    ...(searchResults.subjects || []).map(s => ({ type: 'subject', id: s.id, label: s.name, path: `/subjects?id=${s.id}` })),
  ] : [];

  const typeLabel = { session: 'Sesi', case: 'Kes', subject: 'Subjek' };
  const typeColor = { session: 'text-blue-400', case: 'text-purple-400', subject: 'text-emerald-400' };

  const handleSearchKey = (e) => {
    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
    if (e.key === 'Enter' && allResults.length > 0) {
      navigate(allResults[0].path);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const usagePct = subscription && subscription.sessions_limit !== -1
    ? Math.min(100, Math.round((subscription.sessions_used / subscription.sessions_limit) * 100))
    : null;

  return (
    <aside className="hidden md:flex w-64 min-h-screen bg-gray-900 text-white flex-col">
      <div className="p-6 border-b border-gray-700/60">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div>
            <h1 className="text-base font-bold text-white leading-none">VeriRec</h1>
            <p className="text-xs text-gray-400 mt-0.5">Platform Profesional</p>
          </div>
        </div>
      </div>

      {/* Global Search — www only */}
      {!isCounselor && (
        <div ref={searchRef} className="px-4 pt-3 pb-1 relative">
          <div className="relative">
            <svg className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKey}
              placeholder="Cari sesi, kes, subjek..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults(null); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchOpen && searchQuery.trim() && searchResults && (
            <div className="absolute left-4 right-4 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
              {allResults.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">Tiada hasil dijumpai</p>
              ) : (
                ['session', 'case', 'subject'].map(type => {
                  const items = allResults.filter(r => r.type === type);
                  if (!items.length) return null;
                  return (
                    <div key={type}>
                      <p className={`text-xs font-semibold ${typeColor[type]} px-3 py-1.5 bg-gray-900/60`}>{typeLabel[type]}</p>
                      {items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => { navigate(item.path); setSearchOpen(false); setSearchQuery(''); }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors border-b border-gray-700/40 last:border-0"
                        >
                          <p className="text-xs text-white truncate">{item.label}</p>
                          {item.sub && <p className="text-xs text-gray-400 truncate">{item.sub}</p>}
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              item.cta
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25 hover:bg-blue-600 hover:text-white hover:border-transparent font-medium'
                : isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        {/* Carian Subjek — secondary access for cross-case subject history lookup */}
        {!isCounselor && (
          <div className="pt-2 mt-1 border-t border-gray-700/40">
            <NavLink
              to="/subjects"
              className={({ isActive }) => clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                isActive ? 'text-blue-400 bg-gray-800' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-800/50'
              )}
            >
              {ICONS.users}
              Carian Subjek
            </NavLink>
          </div>
        )}

        {user && ADMIN_EMAILS.includes(user.email) && (
          <NavLink
            to="/admin"
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mt-2',
              isActive ? 'bg-red-600 text-white' : 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Panel Admin
          </NavLink>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700/60">
        {subscription && (
          <div className="mb-3 px-3 py-3 bg-gray-800 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-white capitalize">
                  {planLabels[subscription.plan] || subscription.plan}
                </p>
                {subscription.status === 'trialing' && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full">Trial</span>
                )}
              </div>
              {subscription.sessions_limit !== -1 && (
                <p className="text-xs text-gray-400">
                  {subscription.sessions_used}/{subscription.sessions_limit}
                </p>
              )}
            </div>
            {usagePct !== null && (
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all', usagePct >= 90 ? 'bg-red-500' : 'bg-blue-500')}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
            {subscription.plan === 'free' && (
              <button
                onClick={() => navigate('/pricing')}
                className="mt-2 w-full text-xs text-blue-400 hover:text-blue-300 text-center transition-colors"
              >
                Naik taraf →
              </button>
            )}
          </div>
        )}
        {canInstall && (
          <button
            onClick={install}
            className="mb-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Pasang Aplikasi
          </button>
        )}
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-gray-400 truncate max-w-[140px]">{user?.email}</p>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 ml-2"
            title="Log Keluar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
