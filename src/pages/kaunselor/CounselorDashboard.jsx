import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { useBillingStore } from '../../store/billingStore.js';
import { supabase } from '../../lib/supabase.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import Reveal from '../../components/ui/Reveal.jsx';
import toast from 'react-hot-toast';

const RISK_CONFIG = {
  none:          { label: 'Low',      color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50' },
  mental_health: { label: 'Moderate', color: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50' },
  self_harm:     { label: 'High',     color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
  suicidal:      { label: 'Critical', color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50' },
};

function StatCard({ label, value, sub, color = 'text-gray-900', bg = 'bg-white', onClick }) {
  return (
    <div className={`${bg} rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const ONBOARDING_STEPS = [
  { key: 'profile',  label: 'Complete your profile',     desc: 'Add your name, clinic, and specializations.',      action: '/kaunselor/setup' },
  { key: 'booking',  label: 'Share your booking link',   desc: 'Send your QR link to clients so they can book.',   action: '/kaunselor/appointments?tab=qr' },
  { key: 'client',   label: 'Add your first client',     desc: 'Create a client file to get started.',             action: '/kaunselor/clients' },
  { key: 'session',  label: 'Run your first session',    desc: 'Upload a recording or start a live session.',      action: null },
];

export default function CounselorDashboard() {
  const { user } = useAuthStore();
  const { subscription } = useBillingStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [profile, setProfile] = useState(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem('onb_dismissed') === '1');

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
          new Notification('Kaunselor — New Appointment', {
            body: `${appt.client_name} requested an appointment on ${appt.requested_date} at ${appt.requested_time || ''}`,
            icon: '/favicon-kaunselor.svg',
          });
        }
        toast('📅 New appointment from ' + appt.client_name, { duration: 5000 });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('subjects').select('id, name, risk_level, presenting_issue, created_at').eq('user_id', user.id),
      supabase.from('sessions').select('id, created_at, duration, subject_name, subject_id, problem_types, risk_level').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('appointments').select('id, client_name, confirmed_date, confirmed_time, requested_date, status, subject_id').eq('counselor_id', user.id).in('status', ['confirmed', 'pending', 'rescheduled']).order('confirmed_date'),
      supabase.from('counselor_profiles').select('display_name, phone').eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: c }, { data: s }, { data: a }, { data: p }]) => {
      setClients(c || []);
      setSessions(s || []);
      setAppointments(a || []);
      setProfile(p);
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

  const exportMonthlyReport = async () => {
    setExporting(true);
    try {
      const [yr, mo] = reportMonth.split('-').map(Number);
      const monthStart = new Date(yr, mo - 1, 1);
      const monthEnd   = new Date(yr, mo, 0);
      const monthLabel = format(monthStart, 'MMMM yyyy');

      // Fetch counselor profile for header
      const { data: profile } = await supabase.from('counselor_profiles').select('display_name, klinik_name, registration_number').eq('user_id', user.id).maybeSingle();

      // Filter data for selected month
      const monthSessions = sessions.filter(s => {
        const d = new Date(s.created_at);
        return d >= monthStart && d <= monthEnd;
      });
      const monthClients = clients.filter(c => {
        const d = new Date(c.created_at);
        return d >= monthStart && d <= monthEnd;
      });

      // Fetch appointments for selected month
      const { data: monthAppts } = await supabase.from('appointments')
        .select('id, client_name, confirmed_date, status')
        .eq('counselor_id', user.id)
        .gte('confirmed_date', monthStart.toISOString().slice(0, 10))
        .lte('confirmed_date', monthEnd.toISOString().slice(0, 10));

      // Risk distribution for month's sessions
      const riskCounts = { none: 0, mental_health: 0, self_harm: 0, suicidal: 0 };
      monthSessions.forEach(s => { if (riskCounts[s.risk_level ?? 'none'] !== undefined) riskCounts[s.risk_level ?? 'none']++; });

      // Problem types
      const problemCounts = {};
      monthSessions.forEach(s => {
        (s.problem_types || []).forEach(pt => { problemCounts[pt] = (problemCounts[pt] || 0) + 1; });
      });
      const topProblems = Object.entries(problemCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210, MARGIN = 18;
      let y = MARGIN;

      const line = (text, fontSize = 10, bold = false, color = [30, 30, 30]) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        doc.text(text, MARGIN, y);
        y += fontSize * 0.5;
      };

      const rule = (thick = false) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(thick ? 0.5 : 0.2);
        doc.line(MARGIN, y, W - MARGIN, y);
        y += 4;
      };

      const section = (title) => {
        y += 3;
        doc.setFillColor(139, 92, 246);
        doc.rect(MARGIN, y, W - MARGIN * 2, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), MARGIN + 3, y + 5);
        y += 11;
        doc.setTextColor(30, 30, 30);
      };

      const row = (label, value, indent = false) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(label, indent ? MARGIN + 5 : MARGIN, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(String(value), W - MARGIN, y, { align: 'right' });
        y += 5.5;
      };

      // Header
      doc.setFillColor(139, 92, 246);
      doc.rect(0, 0, W, 28, 'F');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('MONTHLY COUNSELING REPORT', MARGIN, 13);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(monthLabel.toUpperCase(), MARGIN, 21);
      doc.setFontSize(9);
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - MARGIN, 21, { align: 'right' });
      y = 36;

      // Unit info
      if (profile) {
        line(profile.klinik_name || 'Unit Kaunseling', 11, true);
        y += 1;
        if (profile.display_name) { doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); doc.text(`Counselor: ${profile.display_name}${profile.registration_number ? ` (${profile.registration_number})` : ''}`, MARGIN, y); y += 5; }
      }
      rule(true);

      // Summary stats
      section('Monthly Summary');
      row('Total Sessions Conducted', monthSessions.length);
      row('New Clients Registered', monthClients.length);
      row('Appointments Completed', (monthAppts || []).filter(a => a.status === 'completed').length);
      row('Appointments Confirmed', (monthAppts || []).filter(a => a.status === 'confirmed').length);
      row('Total Active Clients (Overall)', clients.length);

      // Risk distribution
      section('Risk Distribution (This Month\'s Sessions)');
      if (monthSessions.length === 0) {
        doc.setFontSize(9); doc.setTextColor(150, 150, 150); doc.text('No sessions this month.', MARGIN, y); y += 6;
      } else {
        const riskLabels = { none: 'Low / No Risk', mental_health: 'Moderate (Mental Health)', self_harm: 'High (Self-Harm)', suicidal: 'Critical (Suicidal)' };
        Object.entries(riskCounts).forEach(([k, v]) => row(riskLabels[k], v));
      }

      // Problem types
      if (topProblems.length > 0) {
        section('Top Client Issues');
        topProblems.forEach(([issue, count]) => row(issue, count, true));
      }

      // Session trend (last 6 months table)
      section('Session Trend (Last 6 Months)');
      stats.monthlyData.forEach(d => row(d.label, d.count));

      // Appointments
      if ((monthAppts || []).length > 0) {
        section('Appointments List');
        const apptStatusLabel = { confirmed: 'Confirmed', completed: 'Completed', pending: 'Pending', cancelled: 'Cancelled', rescheduled: 'Rescheduled' };
        monthAppts.slice(0, 20).forEach(a => {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          doc.text(`${a.confirmed_date || '-'}  ${a.client_name}`, MARGIN, y);
          doc.text(apptStatusLabel[a.status] || a.status, W - MARGIN, y, { align: 'right' });
          y += 5;
          if (y > 270) { doc.addPage(); y = MARGIN; }
        });
      }

      // Footer
      y = Math.max(y + 10, 265);
      rule();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('This document was automatically generated by Kaunselor — Digital Counselling Platform', MARGIN, y);
      doc.text('Confidential & Restricted — For Internal Use Only', W - MARGIN, y, { align: 'right' });

      doc.save(`Counseling-Report-${reportMonth}.pdf`);
      toast.success(`Report for ${monthLabel} generated successfully.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Dashboard" action={
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={reportMonth}
            onChange={e => setReportMonth(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 hidden sm:block"
          />
          <Button size="sm" variant="secondary" loading={exporting} onClick={exportMonthlyReport}>
            📊 Report
          </Button>
          <Button size="sm" onClick={() => navigate('/session/consent')}>
            + New Session
          </Button>
        </div>
      } />
      <div className="flex-1 overflow-auto p-4 pb-20 md:pb-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Usage bar */}
          {subscription && (
            <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  {subscription.sessions_limit === -1 ? (
                    <p className="text-sm font-semibold text-violet-800">{subscription.sessions_used} sessions this month · Unlimited plan</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-violet-800">
                        {subscription.sessions_used} / {subscription.sessions_limit} sessions this month
                      </p>
                      <div className="w-48 h-1.5 bg-violet-200 rounded-full mt-1">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, (subscription.sessions_used / subscription.sessions_limit) * 100)}%` }} />
                      </div>
                    </>
                  )}
                </div>
              </div>
              {subscription.sessions_limit !== -1 && (
                <button onClick={() => navigate('/pricing?tab=kaunselor')} className="text-xs font-semibold text-violet-700 bg-white ring-1 ring-violet-200 px-3 py-1.5 rounded-xl hover:bg-violet-50 flex-shrink-0">
                  Upgrade
                </button>
              )}
            </div>
          )}

          {/* Onboarding checklist — shown until dismissed or all steps done */}
          {!onboardingDismissed && (() => {
            const bookingShared = localStorage.getItem('onb_booking') === '1';
            const done = {
              profile: !!(profile?.display_name && profile?.phone),
              booking: bookingShared,
              client: clients.length > 0,
              session: sessions.length > 0,
            };
            const allDone = Object.values(done).every(Boolean);
            if (allDone) return null;
            const completedCount = Object.values(done).filter(Boolean).length;
            return (
              <div className="bg-white rounded-2xl ring-1 ring-violet-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Get started with Kaunselor</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{completedCount} of {ONBOARDING_STEPS.length} steps complete</p>
                  </div>
                  <button onClick={() => { localStorage.setItem('onb_dismissed', '1'); setOnboardingDismissed(true); }}
                    className="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0">✕</button>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(completedCount / ONBOARDING_STEPS.length) * 100}%` }} />
                </div>
                <div className="space-y-3">
                  {ONBOARDING_STEPS.map(step => (
                    <div key={step.key} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${done[step.key] ? 'opacity-50' : 'hover:bg-violet-50 cursor-pointer'}`}
                      onClick={() => {
                        if (done[step.key]) return;
                        if (step.key === 'booking') localStorage.setItem('onb_booking', '1');
                        if (step.action) navigate(step.action);
                      }}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${done[step.key] ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                        {done[step.key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${done[step.key] ? 'line-through text-gray-400' : 'text-gray-800'}`}>{step.label}</p>
                        {!done[step.key] && <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>}
                      </div>
                      {!done[step.key] && step.action && (
                        <svg className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Stat cards */}
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Clients" value={clients.length} sub="registered clients" onClick={() => navigate('/kaunselor/clients')} />
              <StatCard label="Sessions This Month" value={stats.sessionsThisMonth} sub={format(new Date(), 'MMMM yyyy')} />
              <StatCard label="New Appointments" value={stats.pendingAppts} sub="pending confirmation"
                color={stats.pendingAppts > 0 ? 'text-amber-600' : 'text-gray-900'}
                bg={stats.pendingAppts > 0 ? 'bg-amber-50' : 'bg-white'}
                onClick={() => navigate('/kaunselor/appointments')} />
              <StatCard label="High Risk" value={stats.highRisk} sub="clients needing attention"
                color={stats.highRisk > 0 ? 'text-red-600' : 'text-gray-900'}
                bg={stats.highRisk > 0 ? 'bg-red-50' : 'bg-white'}
                onClick={() => navigate('/kaunselor/clients')} />
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Sessions trend */}
            <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Session Trend (6 Months)</h3>
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No sessions yet</p>
              ) : (
                <div className="flex items-end gap-2 h-28">
                  {stats.monthlyData.map(({ label, count }) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{count > 0 ? count : ''}</span>
                      <div className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-fuchsia-500 transition-all" style={{ height: `${Math.max(4, (count / maxMonthly) * 80)}px` }} />
                      <span className="text-[10px] text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Risk distribution */}
            <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Client Risk Distribution</h3>
              {clients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No clients yet</p>
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
            <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming Appointments</h3>
                <button onClick={() => navigate('/kaunselor/appointments')} className="text-xs text-violet-600 hover:text-violet-800 font-medium">View all →</button>
              </div>
              {stats.upcomingAppts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2">📅</div>
                  <p className="text-sm text-gray-400">No upcoming appointments</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.upcomingAppts.map(a => (
                    <button key={a.id} onClick={() => a.subject_id && navigate(`/kaunselor/clients/${a.subject_id}`)}
                      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-violet-50 transition-colors text-left">
                      <div className="w-9 h-9 bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 rounded-xl flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">
                        {a.client_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.client_name}</p>
                        <p className="text-xs text-gray-400">{a.confirmed_date || a.requested_date} · {a.confirmed_time || '—'}</p>
                      </div>
                      <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent sessions */}
            <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recent Sessions</h3>
                <button onClick={() => navigate('/kaunselor/clients')} className="text-xs text-violet-600 hover:text-violet-800 font-medium">All clients →</button>
              </div>
              {stats.recentSessions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2">🎙️</div>
                  <p className="text-sm text-gray-400">No sessions yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {stats.recentSessions.map(s => (
                    <div key={s.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-bold text-sm flex-shrink-0">
                        {s.subject_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.subject_name || '—'}</p>
                        <p className="text-xs text-gray-400">{format(new Date(s.created_at), 'dd MMM yyyy')} · {Math.round((s.duration || 0) / 60)} min</p>
                      </div>
                      {s.risk_level && s.risk_level !== 'none' && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          ['self_harm', 'suicidal'].includes(s.risk_level) ? 'bg-red-100 text-red-700' :
                          s.risk_level === 'mental_health' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {['self_harm', 'suicidal'].includes(s.risk_level) ? 'High' : s.risk_level === 'mental_health' ? 'Moderate' : 'Low'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top presenting issues */}
          {stats.topIssues.length > 0 && (
            <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Top Client Issues</h3>
              <div className="space-y-2">
                {stats.topIssues.map(([issue, count], i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 flex-1 truncate">{issue}</span>
                    <div className="w-24 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-400 rounded-full" style={{ width: `${(count / stats.topIssues[0][1]) * 100}%` }} />
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
