import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { getProfFromPath } from '../../lib/profConfig.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import toast from 'react-hot-toast';

const RISK_CONFIG = {
  none:          { label: 'Tiada',       color: 'gray' },
  mental_health: { label: 'Sederhana',   color: 'yellow' },
  self_harm:     { label: 'Tinggi',      color: 'orange' },
  suicidal:      { label: 'Kritikal',    color: 'red' },
};

export default function ProfClientsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const prof = getProfFromPath(pathname);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [sortBy, setSortBy] = useState('terbaru');

  useEffect(() => {
    if (!user) return;
    supabase.from('subjects').select('*, sessions(count)').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setClients(data || []))
      .catch(() => toast.error(`Gagal memuatkan senarai ${prof.clientsLabel.toLowerCase()}.`))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = clients
    .filter(c => {
      const q = search.toLowerCase();
      return (!q || c.name?.toLowerCase().includes(q) || c.ic_number?.toLowerCase().includes(q) || c.presenting_issue?.toLowerCase().includes(q))
        && (filterRisk === 'all' || c.risk_level === filterRisk);
    })
    .sort((a, b) => {
      if (sortBy === 'nama')   return a.name?.localeCompare(b.name);
      if (sortBy === 'risiko') return ['suicidal','self_harm','mental_health','none'].indexOf(a.risk_level) - ['suicidal','self_harm','mental_health','none'].indexOf(b.risk_level);
      if (sortBy === 'sesi')   return (b.sessions?.[0]?.count ?? 0) - (a.sessions?.[0]?.count ?? 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={prof.clientsLabel} action={
        <Button size="sm" onClick={() => navigate(`/session/setup/${prof.profession}`)}>+ Sesi Baru</Button>
      } />
      <div className="flex-1 overflow-auto p-4 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Search & filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Cari ${prof.clientLabel} — nama, IC, isu...`}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">Semua Risiko</option>
              {Object.entries(RISK_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="terbaru">Terbaru</option>
              <option value="risiko">Risiko</option>
              <option value="nama">Nama</option>
              <option value="sesi">Sesi Terbanyak</option>
            </select>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">👤</div>
              <p className="font-medium">{clients.length === 0 ? `Belum ada ${prof.clientsLabel.toLowerCase()}.` : `Tiada ${prof.clientLabel.toLowerCase()} yang sepadan.`}</p>
              {clients.length === 0 && <p className="text-sm mt-1">{prof.clientLabel} akan muncul selepas sesi pertama direkodkan.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">{filtered.length} {prof.clientsLabel.toLowerCase()}</p>
              {filtered.map(c => {
                const risk = RISK_CONFIG[c.risk_level || 'none'];
                const sessionCount = c.sessions?.[0]?.count ?? 0;
                return (
                  <button key={c.id} onClick={() => navigate(`${prof.routePrefix}/clients/${c.id}`)}
                    className="w-full bg-white rounded-xl border p-4 text-left hover:shadow-md hover:border-blue-300 transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-semibold text-sm group-hover:bg-blue-100 transition-colors">
                        {c.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-gray-900 truncate">{c.name}</p>
                          {c.risk_level && c.risk_level !== 'none' && <Badge color={risk.color} className="text-xs">{risk.label}</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{c.presenting_issue || 'Tiada isu dinyatakan'}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{sessionCount} sesi</span>
                          {c.ic_number && <span>IC: {c.ic_number}</span>}
                          {c.created_at && <span>Daftar: {format(new Date(c.created_at), 'dd MMM yyyy')}</span>}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
