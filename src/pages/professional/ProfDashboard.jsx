import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { useBillingStore } from '../../store/billingStore.js';
import { supabase } from '../../lib/supabase.js';
import { getProfFromPath } from '../../lib/profConfig.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const RISK_CONFIG = {
  none:          { label: 'Rendah',    color: 'bg-green-500' },
  mental_health: { label: 'Sederhana', color: 'bg-amber-400' },
  self_harm:     { label: 'Tinggi',    color: 'bg-orange-500' },
  suicidal:      { label: 'Kritikal',  color: 'bg-red-500' },
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

export default function ProfDashboard() {
  const { user } = useAuthStore();
  const { subscription } = useBillingStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const prof = getProfFromPath(pathname);

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('subjects').select('id, name, risk_level, presenting_issue, created_at').eq('user_id', user.id),
      supabase.from('sessions').select('id, created_at, duration, report, subject_name, subject_id, risk_level').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
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
    const riskCounts = { none: 0, mental_health: 0, self_harm: 0, suicidal: 0 };
    clients.forEach(c => { if (riskCounts[c.risk_level ?? 'none'] !== undefined) riskCounts[c.risk_level ?? 'none']++; });
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i);
      return { label: format(m, 'MMM'), count: sessions.filter(s => isSameMonth(new Date(s.created_at), m)).length };
    });
    return { sessionsThisMonth, pendingAppts, upcomingAppts, highRisk, riskCounts, monthlyData, recentSessions: sessions.slice(0, 5) };
  }, [clients, sessions, appointments]);

  const maxMonthly = Math.max(...stats.monthlyData.map(d => d.count), 1);

  const exportMonthlyReport = async () => {
    setExporting(true);
    try {
      const [yr, mo] = reportMonth.split('-').map(Number);
      const monthStart = new Date(yr, mo - 1, 1);
      const monthEnd   = new Date(yr, mo, 0);
      const monthLabel = format(monthStart, 'MMMM yyyy');
      const { data: profile } = await supabase.from('counselor_profiles').select('display_name, klinik_name, registration_number').eq('user_id', user.id).maybeSingle();
      const monthSessions = sessions.filter(s => { const d = new Date(s.created_at); return d >= monthStart && d <= monthEnd; });
      const monthClients  = clients.filter(c => { const d = new Date(c.created_at); return d >= monthStart && d <= monthEnd; });
      const { data: monthAppts } = await supabase.from('appointments').select('id, client_name, confirmed_date, status').eq('counselor_id', user.id).gte('confirmed_date', monthStart.toISOString().slice(0, 10)).lte('confirmed_date', monthEnd.toISOString().slice(0, 10));
      const riskCounts = { none: 0, mental_health: 0, self_harm: 0, suicidal: 0 };
      monthSessions.forEach(s => { if (riskCounts[s.risk_level ?? 'none'] !== undefined) riskCounts[s.risk_level ?? 'none']++; });

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210, MARGIN = 18; let y = MARGIN;
      const line = (text, fs = 10, bold = false) => { doc.setFontSize(fs); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(30, 30, 30); doc.text(text, MARGIN, y); y += fs * 0.5; };
      const rule = () => { doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(MARGIN, y, W - MARGIN, y); y += 4; };
      const section = (title) => { y += 3; doc.setFillColor(...(prof.colorHex === '#10b981' ? [16, 185, 129] : prof.colorHex === '#0d9488' ? [13, 148, 136] : [37, 99, 235])); doc.rect(MARGIN, y, W - MARGIN * 2, 7, 'F'); doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); doc.text(title.toUpperCase(), MARGIN + 3, y + 5); y += 11; doc.setTextColor(30, 30, 30); };
      const row = (label, value) => { doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); doc.text(label, MARGIN, y); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30); doc.text(String(value), W - MARGIN, y, { align: 'right' }); y += 5.5; };

      const [r, g, b] = prof.colorHex === '#10b981' ? [16, 185, 129] : prof.colorHex === '#0d9488' ? [13, 148, 136] : [37, 99, 235];
      doc.setFillColor(r, g, b); doc.rect(0, 0, W, 28, 'F');
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(`LAPORAN BULANAN ${prof.label.toUpperCase()}`, MARGIN, 13);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(monthLabel.toUpperCase(), MARGIN, 21);
      doc.setFontSize(9); doc.text(`Dijana: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - MARGIN, 21, { align: 'right' });
      y = 36;
      if (profile) { line(profile.klinik_name || prof.unitLabel, 11, true); y += 1; if (profile.display_name) { doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); doc.text(`${prof.label}: ${profile.display_name}`, MARGIN, y); y += 5; } }
      rule();
      section(`Ringkasan ${monthLabel}`);
      row(`Jumlah Sesi ${prof.label}`, monthSessions.length);
      row(`${prof.clientLabel} Baharu`, monthClients.length);
      row(`${prof.appointmentLabel} Selesai`, (monthAppts || []).filter(a => a.status === 'completed').length);
      row(`Jumlah ${prof.clientsLabel} Aktif`, clients.length);
      section('Taburan Risiko');
      const riskLabels = { none: 'Rendah / Tiada Risiko', mental_health: 'Sederhana', self_harm: 'Tinggi', suicidal: 'Kritikal' };
      Object.entries(riskCounts).forEach(([k, v]) => row(riskLabels[k], v));
      section('Trend Sesi (6 Bulan)');
      stats.monthlyData.forEach(d => row(d.label, d.count));
      y = Math.max(y + 10, 265); rule();
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
      doc.text('Dijana oleh VeriRec — Platform Profesional Digital', MARGIN, y);
      doc.text('Sulit & Terhad', W - MARGIN, y, { align: 'right' });
      doc.save(`Laporan-${prof.label}-${reportMonth}.pdf`);
      toast.success(`Laporan ${monthLabel} berjaya dijana.`);
    } catch { toast.error('Gagal menjana laporan.'); }
    finally { setExporting(false); }
  };

  if (loading) return <div className="flex flex-col h-screen"><TopBar title="Dashboard" /><div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></div>;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={`Dashboard ${prof.label}`} action={
        <div className="flex items-center gap-2">
          <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 hidden sm:block" />
          <Button size="sm" variant="secondary" loading={exporting} onClick={exportMonthlyReport}>📊 Laporan</Button>
          <Button size="sm" onClick={() => navigate(`/session/setup/${prof.profession}`)}>+ Sesi Baru</Button>
        </div>
      } />
      <div className="flex-1 overflow-auto p-4 pb-20 md:pb-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {subscription && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">{subscription.sessions_used} / {subscription.sessions_limit} sesi bulan ini</p>
                <div className="w-48 h-1.5 bg-blue-200 rounded-full mt-1"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (subscription.sessions_used / subscription.sessions_limit) * 100)}%` }} /></div>
              </div>
              <button onClick={() => navigate('/pricing')} className="text-xs font-semibold text-blue-700 bg-white border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50">Naik Taraf</button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label={`Jumlah ${prof.clientsLabel}`} value={clients.length} sub={`${prof.clientLabel} berdaftar`} onClick={() => navigate(`${prof.routePrefix}/clients`)} />
            <StatCard label="Sesi Bulan Ini" value={stats.sessionsThisMonth} sub={format(new Date(), 'MMMM yyyy')} />
            <StatCard label={`${prof.appointmentLabel} Baru`} value={stats.pendingAppts} sub="menunggu pengesahan" color={stats.pendingAppts > 0 ? 'text-amber-600' : 'text-gray-900'} bg={stats.pendingAppts > 0 ? 'bg-amber-50' : 'bg-white'} onClick={() => navigate(`${prof.routePrefix}/appointments`)} />
            <StatCard label="Risiko Tinggi" value={stats.highRisk} sub="perlu perhatian" color={stats.highRisk > 0 ? 'text-red-600' : 'text-gray-900'} bg={stats.highRisk > 0 ? 'bg-red-50' : 'bg-white'} onClick={() => navigate(`${prof.routePrefix}/clients`)} />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Trend Sesi (6 Bulan)</h3>
              {sessions.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Belum ada sesi</p> : (
                <div className="flex items-end gap-2 h-28">
                  {stats.monthlyData.map(d => (
                    <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{d.count}</span>
                      <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(d.count / maxMonthly) * 80}px`, minHeight: d.count > 0 ? '4px' : '0' }} />
                      <span className="text-xs text-gray-400">{d.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Taburan Risiko</h3>
              {clients.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Belum ada {prof.clientsLabel.toLowerCase()}</p> : (
                <div className="space-y-2">
                  {Object.entries(stats.riskCounts).map(([k, v]) => {
                    const cfg = RISK_CONFIG[k];
                    return (
                      <div key={k} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24">{cfg.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2"><div className={`${cfg.color} h-2 rounded-full`} style={{ width: `${clients.length ? (v / clients.length) * 100 : 0}%` }} /></div>
                        <span className="text-xs font-semibold text-gray-700 w-6 text-right">{v}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {stats.upcomingAppts.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{prof.appointmentsLabel} Akan Datang</h3>
              <div className="space-y-2">
                {stats.upcomingAppts.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.client_name}</p>
                      <p className="text-xs text-gray-400">{a.confirmed_date || a.requested_date} · {(a.confirmed_time || '')?.slice(0, 5)}</p>
                    </div>
                    {a.subject_id && <button onClick={() => navigate(`${prof.routePrefix}/clients/${a.subject_id}`)} className="text-xs text-blue-600 hover:underline">Profil</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.recentSessions.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Sesi Terkini</h3>
              <div className="space-y-2">
                {stats.recentSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.subject_name || 'Tanpa nama'}</p>
                      <p className="text-xs text-gray-400">{format(new Date(s.created_at), 'dd MMM yyyy')}</p>
                    </div>
                    <button onClick={() => navigate(`/session/${s.id}`)} className="text-xs text-blue-600 hover:underline">Laporan</button>
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
