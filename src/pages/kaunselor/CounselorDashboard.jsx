import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { useBillingStore } from '../../store/billingStore.js';
import { supabase } from '../../lib/supabase.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const RISK_CONFIG = {
  none:          { label: 'Rendah',    color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50' },
  mental_health: { label: 'Sederhana', color: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50' },
  self_harm:     { label: 'Tinggi',    color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
  suicidal:      { label: 'Kritikal',  color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50' },
};

function StatCard({ label, value, sub, color = 'text-gray-900', bg = 'bg-white', onClick }) {
  return (
    <div className={`${bg} rounded-xl border p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function CounselorDashboard() {
  const { user } = useAuthStore();
  const { subscription } = useBillingStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // Request notification permission + real-time appointment alerts
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem('notif_new_appointment') === 'false') return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // Real-time: new appointment → browser notification
    const channel = supabase.channel(`appointments:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'appointments',
        filter: `counselor_id=eq.${user.id}`,
      }, (payload) => {
        const appt = payload.new;
        setAppointments(prev => [appt, ...prev]);
        if (Notification.permission === 'granted') {
          new Notification('VeriRec — Temujanji Baru', {
            body: `${appt.client_name} minta temujanji pada ${appt.requested_date} jam ${appt.requested_time || ''}`,
            icon: '/favicon.svg',
          });
        }
        toast('📅 Temujanji baru dari ' + appt.client_name, { duration: 5000 });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('subjects').select('id, name, risk_level, presenting_issue, created_at').eq('user_id', user.id),
      supabase.from('sessions').select('id, created_at, duration, report, subject_name, subject_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('appointments').select('id, client_name, confirmed_date, confirmed_time, requested_date, status, subject_id').eq('counselor_id', user.id).in('status', ['confirmed', 'pending', 'rescheduled']).order('confirmed_date'),
    ]).then(([{ data: c }, { data: s }, { data: a }]) => {
      setClients(c || []);
      setSessions(s || []);
      setAppointments(a || []);
    }).finally(() => setLoading(false));
  }, [user]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);

    const sessionsThisMonth = sessions.filter(s => new Date(s.created_at) >= monthStart).length;
    const pendingAppts = appointments.filter(a => a.status === 'pending').length;
    const upcomingAppts = appointments
      .filter(a => ['confirmed', 'rescheduled'].includes(a.status) && (a.confirmed_date || a.requested_date) >= now.toISOString().slice(0, 10))
      .slice(0, 5);
    const highRisk = clients.filter(c => ['self_harm', 'suicidal'].includes(c.risk_level)).length;

    // Risk distribution
    const riskCounts = { none: 0, mental_health: 0, self_harm: 0, suicidal: 0 };
    clients.forEach(c => { if (riskCounts[c.risk_level ?? 'none'] !== undefined) riskCounts[c.risk_level ?? 'none']++; });

    // Sessions per month (last 6 months)
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i);
      return {
        label: format(m, 'MMM'),
        count: sessions.filter(s => isSameMonth(new Date(s.created_at), m)).length,
      };
    });

    // Top presenting issues
    const issueCounts = {};
    clients.forEach(c => {
      if (c.presenting_issue) {
        const key = c.presenting_issue.slice(0, 40);
        issueCounts[key] = (issueCounts[key] || 0) + 1;
      }
    });
    const topIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Recent sessions
    const recentSessions = sessions.slice(0, 5);

    return { sessionsThisMonth, pendingAppts, upcomingAppts, highRisk, riskCounts, monthlyData, topIssues, recentSessions };
  }, [clients, sessions, appointments]);

  const maxMonthly = Math.max(...stats.monthlyData.map(d => d.count), 1);
  const maxRisk = Math.max(...Object.values(stats.riskCounts), 1);

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Dashboard" action={
        <Button size="sm" onClick={() => navigate('/session/setup/counselor')}>
          + Sesi Baru
        </Button>
      } />
      <div className="flex-1 overflow-auto p-4 pb-20 md:pb-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Usage bar for counselor */}
          {subscription && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    {subscription.sessions_used} / {subscription.sessions_limit} sesi bulan ini
                    {subscription.extra_sessions > 0 && <span className="text-emerald-600"> + {subscription.extra_sessions} topup</span>}
                  </p>
                  <div className="w-48 h-1.5 bg-emerald-200 rounded-full mt-1">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (subscription.sessions_used / subscription.sessions_limit) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <button onClick={() => navigate('/pricing?tab=kaunselor')} className="text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50 flex-shrink-0">
                Topup
              </button>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Jumlah Klien" value={clients.length} sub="klien berdaftar" onClick={() => navigate('/kaunselor/clients')} />
            <StatCard label="Sesi Bulan Ini" value={stats.sessionsThisMonth} sub={format(new Date(), 'MMMM yyyy')} />
            <StatCard label="Temujanji Baru" value={stats.pendingAppts} sub="menunggu pengesahan"
              color={stats.pendingAppts > 0 ? 'text-amber-600' : 'text-gray-900'}
              bg={stats.pendingAppts > 0 ? 'bg-amber-50' : 'bg-white'}
              onClick={() => navigate('/kaunselor/appointments')} />
            <StatCard label="Risiko Tinggi" value={stats.highRisk} sub="klien perlu perhatian"
              color={stats.highRisk > 0 ? 'text-red-600' : 'text-gray-900'}
              bg={stats.highRisk > 0 ? 'bg-red-50' : 'bg-white'}
              onClick={() => navigate('/kaunselor/clients')} />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Sessions trend */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Trend Sesi (6 Bulan)</h3>
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Belum ada sesi</p>
              ) : (
                <div className="flex items-end gap-2 h-28">
                  {stats.monthlyData.map(({ label, count }) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{count > 0 ? count : ''}</span>
                      <div className="w-full rounded-t-md bg-emerald-500 transition-all" style={{ height: `${Math.max(4, (count / maxMonthly) * 80)}px` }} />
                      <span className="text-[10px] text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Risk distribution */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Taburan Risiko Klien</h3>
              {clients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Belum ada klien</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(RISK_CONFIG).map(([key, cfg]) => {
                    const count = stats.riskCounts[key] || 0;
                    const pct = Math.round((count / maxRisk) * 100);
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-20 flex-shrink-0">{cfg.label}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-5 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Upcoming appointments */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Temujanji Akan Datang</h3>
                <button onClick={() => navigate('/kaunselor/appointments')} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">Lihat semua →</button>
              </div>
              {stats.upcomingAppts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Tiada temujanji akan datang</p>
              ) : (
                <div className="space-y-2">
                  {stats.upcomingAppts.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.client_name}</p>
                        <p className="text-xs text-gray-400">{a.confirmed_date || a.requested_date} • {a.confirmed_time || '—'}</p>
                      </div>
                      <button onClick={() => a.subject_id && navigate(`/kaunselor/clients/${a.subject_id}`)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">Profil →</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent sessions */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Sesi Terkini</h3>
                <button onClick={() => navigate('/kaunselor/clients')} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">Semua klien →</button>
              </div>
              {stats.recentSessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Belum ada sesi</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentSessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.subject_name || '—'}</p>
                        <p className="text-xs text-gray-400">{format(new Date(s.created_at), 'dd MMM yyyy')} • {Math.round((s.duration || 0) / 60)} min</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.report?.riskLevel && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            s.report.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                            s.report.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {s.report.riskLevel === 'high' ? 'Tinggi' : s.report.riskLevel === 'medium' ? 'Sederhana' : 'Rendah'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top presenting issues */}
          {stats.topIssues.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Isu Utama Klien</h3>
              <div className="space-y-2">
                {stats.topIssues.map(([issue, count], i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 flex-1 truncate">{issue}</span>
                    <div className="w-24 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(count / stats.topIssues[0][1]) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-5 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
