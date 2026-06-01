import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { getSessions } from '../api/sessions.js';
import { professionLabel } from '../data/professions.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { isCounselorSubdomain } from '../lib/subdomain.js';
import toast from 'react-hot-toast';

async function printMonthlyReport(user, sessions, reportMonth) {
  const { default: jsPDF } = await import('jspdf');
  const [yr, mo] = reportMonth.split('-').map(Number);
  const monthStart = new Date(yr, mo - 1, 1);
  const monthEnd   = new Date(yr, mo, 0, 23, 59, 59);
  const monthLabel = format(monthStart, 'MMMM yyyy');

  const monthSessions = sessions.filter(s => {
    const d = new Date(s.created_at);
    return d >= monthStart && d <= monthEnd;
  });

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 18;
  let y = M;

  const addLine = (text, size = 10, bold = false, color = [30, 30, 30]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.splitTextToSize(String(text || ''), W - M * 2).forEach(l => {
      if (y > 270) { doc.addPage(); y = M; }
      doc.text(l, M, y);
      y += size * 0.52;
    });
  };

  const rule = () => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y);
    y += 4;
  };

  const section = (title) => {
    y += 3;
    doc.setFillColor(37, 99, 235);
    doc.rect(M, y, W - M * 2, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), M + 3, y + 5);
    y += 11;
    doc.setTextColor(30, 30, 30);
  };

  const row = (label, value) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(label, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), W - M, y, { align: 'right' });
    y += 5.5;
  };

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('LAPORAN BULANAN SIASATAN', M, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(monthLabel.toUpperCase(), M, 21);
  doc.setFontSize(9);
  doc.text(`Dijana: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - M, 21, { align: 'right' });
  y = 36;

  addLine(user?.user_metadata?.full_name || user?.email || 'Pegawai VeriRec', 11, true);
  y += 1;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Platform: VeriRec Profesional (www.verirec.app)', M, y);
  y += 5;
  rule();

  section('Ringkasan Bulan Ini');
  const withReport   = monthSessions.filter(s => s.report).length;
  const totalDur     = monthSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const avgMin       = monthSessions.length > 0 ? Math.round(totalDur / monthSessions.length / 60) : 0;
  const activeSess   = monthSessions.filter(s => (s.status || 'active') === 'active').length;
  const closedSess   = monthSessions.filter(s => s.status === 'closed').length;
  row('Jumlah Sesi Dijalankan', monthSessions.length);
  row('Laporan AI Dijana', withReport);
  row('Purata Tempoh Sesi', `${avgMin} minit`);
  row('Kes Aktif (Bulan Ini)', activeSess);
  row('Kes Ditutup (Bulan Ini)', closedSess);

  section('Taburan Tahap Risiko');
  const sessWithRisk = monthSessions.filter(s => s.report?.riskLevel);
  if (sessWithRisk.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Tiada data risiko — jana laporan AI untuk sesi tersebut.', M, y);
    y += 6;
  } else {
    const rCounts = { high: 0, medium: 0, low: 0 };
    sessWithRisk.forEach(s => { if (rCounts[s.report.riskLevel] !== undefined) rCounts[s.report.riskLevel]++; });
    row('Tinggi', rCounts.high);
    row('Sederhana', rCounts.medium);
    row('Rendah', rCounts.low);
  }

  if (monthSessions.length > 0) {
    section('Senarai Sesi Bulan Ini');
    const rl = { high: 'Tinggi', medium: 'Sederhana', low: 'Rendah' };
    monthSessions.forEach((s, i) => {
      if (y > 260) { doc.addPage(); y = M; }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(`${i + 1}. ${s.title || 'Tanpa Tajuk'}`, M, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(8);
      const details = [
        `Subjek: ${s.subject_name || '-'}`,
        `Tarikh: ${format(new Date(s.created_at), 'dd/MM/yyyy')}`,
        `Tempoh: ${Math.round((s.duration || 0) / 60)} min`,
        s.report?.riskLevel ? `Risiko: ${rl[s.report.riskLevel] || s.report.riskLevel}` : 'Tiada laporan',
      ].join('   ');
      doc.text(details, M + 4, y);
      y += 5;
    });
  }

  // SHA-256 ringkasan
  const payload = JSON.stringify({ month: reportMonth, sessions: monthSessions.map(s => s.id) });
  const hashBuf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  // Footer
  y = Math.max(y + 10, 262);
  if (y > 278) { doc.addPage(); y = M + 5; }
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, W - M, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 50, 50);
  doc.text('SULIT — UNTUK KEGUNAAN RASMI SAHAJA', M, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text(`Tarikh Jana: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, M, y);
  y += 4;
  doc.text(`SHA-256: ${hashHex.slice(0, 40)}...`, M, y);

  doc.save(`verirec-laporan-bulanan-${reportMonth}.pdf`);
}

const CounselorDashboard = lazy(() => import('./kaunselor/CounselorDashboard.jsx'));

const riskColors = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-green-500' };
const riskLabels = { high: 'Tinggi', medium: 'Sederhana', low: 'Rendah' };

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data, maxVal, colorClass }) {
  if (!data.length) return <p className="text-sm text-gray-400 text-center py-6">Tiada data</p>;
  return (
    <div className="space-y-3">
      {data.map(({ label, count }) => {
        const pct = maxVal > 0 ? Math.round((count / maxVal) * 100) : 0;
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-28 flex-shrink-0 truncate">{label}</span>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${colorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 w-6 text-right flex-shrink-0">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function exportCSV(sessions) {
  const rows = [
    ['Tajuk', 'Profesion', 'Nama Subjek', 'Status', 'Tempoh (min)', 'Tahap Risiko', 'Sentimen', 'Tarikh'],
    ...sessions.map(s => [
      s.title,
      professionLabel(s.profession),
      s.subject_name,
      s.status || 'active',
      Math.round((s.duration || 0) / 60),
      s.report?.riskLevel || '-',
      s.report?.sentiment || '-',
      format(new Date(s.created_at), 'dd/MM/yyyy'),
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `verirec-analitik-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const INVESTIGATE_PROFS = new Set(['police', 'sprm', 'hr', 'court', 'peguam', 'sispa', 'skmm', 'jtk']);
const AUDIT_PROFS       = new Set(['iso', 'halal', 'quality']);

function getUseCase(prof) {
  if (prof === 'counselor' || prof === 'doctor' || prof === 'jkm') return 'kaunseling';
  if (INVESTIGATE_PROFS.has(prof)) return 'soal-siasat';
  if (AUDIT_PROFS.has(prof)) return 'audit';
  return 'generic';
}

export default function AnalyticsPage() {
  if (isCounselorSubdomain()) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}>
        <CounselorDashboard />
      </Suspense>
    );
  }

  const profession = localStorage.getItem('preferred_profession') || '';
  const useCase    = AUDIT_PROFS.has(profession) ? 'audit' : 'soal-siasat';

  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getSessions(user.id)
      .then(setSessions)
      .catch(() => toast.error('Gagal memuatkan data analitik'))
      .finally(() => setLoading(false));
  }, [user]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const withReport = sessions.filter(s => s.report).length;
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgMinutes = total > 0 ? Math.round(totalSeconds / total / 60) : 0;

    const byCounts = {};
    for (const s of sessions) {
      byCounts[s.profession] = (byCounts[s.profession] || 0) + 1;
    }
    const byProfession = Object.entries(byCounts)
      .map(([k, count]) => ({ label: professionLabel(k), count }))
      .sort((a, b) => b.count - a.count);

    const riskCounts = { high: 0, medium: 0, low: 0 };
    for (const s of sessions) {
      const r = s.report?.riskLevel;
      if (r && riskCounts[r] !== undefined) riskCounts[r]++;
    }
    const riskData = Object.entries(riskCounts).map(([k, count]) => ({ key: k, label: riskLabels[k], count }));

    const statusCounts = { active: 0, pending: 0, closed: 0 };
    for (const s of sessions) {
      const st = s.status || 'active';
      if (statusCounts[st] !== undefined) statusCounts[st]++;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = sessions.filter(s => new Date(s.created_at) >= thirtyDaysAgo).length;

    // ── Investigate-specific ──
    const subjectRoles = {};
    for (const s of sessions) {
      const role = s.subject_role || 'Tidak dinyatakan';
      subjectRoles[role] = (subjectRoles[role] || 0) + 1;
    }
    const bySubjectRole = Object.entries(subjectRoles).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

    const highRiskCases = sessions.filter(s => s.report?.riskLevel === 'high').length;
    const closedCases   = sessions.filter(s => s.status === 'closed').length;
    const closureRate   = total > 0 ? Math.round((closedCases / total) * 100) : 0;

    // ── Audit-specific ──
    const totalFlags   = sessions.reduce((sum, s) => sum + ((s.flags || []).length), 0);
    const withFlags    = sessions.filter(s => (s.flags || []).length > 0).length;
    const flagRate     = total > 0 ? Math.round((withFlags / total) * 100) : 0;

    // ── Trend 6 bulan ──
    const now = new Date();
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0);
      return {
        label: format(m, 'MMM'),
        count: sessions.filter(s => { const d = new Date(s.created_at); return d >= m && d <= mEnd; }).length,
      };
    });

    return { total, withReport, avgMinutes, byProfession, riskData, statusCounts, recentSessions, bySubjectRole, highRiskCases, closureRate, totalFlags, flagRate, monthlyTrend };
  }, [sessions]);

  const maxProfessionCount = Math.max(...stats.byProfession.map(d => d.count), 1);
  const maxRiskCount = Math.max(...stats.riskData.map(d => d.count), 1);
  const maxRoleCount = Math.max(...stats.bySubjectRole.map(d => d.count), 1);
  const maxMonthly   = Math.max(...stats.monthlyTrend.map(d => d.count), 1);

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title={useCase === 'soal-siasat' ? 'Analitik Siasatan' : useCase === 'audit' ? 'Analitik Audit' : 'Analitik'}
        action={!loading && sessions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1">
              <input
                type="month"
                value={reportMonth}
                onChange={e => setReportMonth(e.target.value)}
                className="text-xs border-0 bg-transparent focus:outline-none text-gray-700"
              />
              <Button
                variant="secondary"
                size="sm"
                loading={exporting}
                onClick={async () => {
                  setExporting(true);
                  try { await printMonthlyReport(user, sessions, reportMonth); toast.success('Laporan bulanan berjaya dieksport.'); }
                  catch { toast.error('Gagal menjana laporan.'); }
                  finally { setExporting(false); }
                }}
              >
                Laporan Bulanan
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { exportCSV(sessions); toast.success('CSV berjaya dieksport.'); }}>
              Eksport CSV
            </Button>
          </div>
        )}
      />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">

            {/* ── WELCOME STATE (new users) ── */}
            {sessions.length === 0 && (
              <div className="bg-white rounded-2xl border p-8 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Selamat Datang ke VeriRec Profesional</h2>
                <p className="text-sm text-gray-500 mb-6">Platform rakaman &amp; analitik sesi soal siasat yang selamat dan patuh PDPA</p>
                <ol className="text-left space-y-3 mb-7">
                  {[
                    ['Mulakan sesi', 'Pilih profesion dan isi butiran sesi anda'],
                    ['Rakam & jana laporan AI', 'Transkripsi automatik + analisis SHA-256 chain of custody'],
                    ['Urus fail kes & subjek', 'Susun sesi mengikut kes dan subjek untuk rujukan mudah'],
                  ].map(([step, desc], i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{step}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <button
                  onClick={() => navigate('/session/new')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors mb-3"
                >
                  Mulakan Sesi Pertama →
                </button>
                <button
                  onClick={() => navigate('/cases')}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Lihat fail kes
                </button>
              </div>
            )}

            {/* ── INVESTIGATE ANALYTICS ── */}
            {useCase === 'soal-siasat' && sessions.length > 0 && (<>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Jumlah Kes" value={stats.total} sub="sepanjang masa" />
                <StatCard label="Bulan Ini" value={stats.recentSessions} sub="30 hari lepas" />
                <StatCard label="Kes Risiko Tinggi" value={stats.highRiskCases} sub="perlu perhatian" />
                <StatCard label="Kadar Penutupan" value={`${stats.closureRate}%`} sub={`${stats.statusCounts.closed} kes ditutup`} />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Trend Kes (6 Bulan)</h3>
                  <div className="flex items-end gap-2 h-28">
                    {stats.monthlyTrend.map(d => (
                      <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{d.count}</span>
                        <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(d.count / maxMonthly) * 80}px`, minHeight: d.count > 0 ? '4px' : '0' }} />
                        <span className="text-xs text-gray-400">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Jenis Subjek</h3>
                  {stats.bySubjectRole.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-6">Tiada data — isi peranan subjek semasa setup sesi</p>
                    : <BarChart data={stats.bySubjectRole} maxVal={maxRoleCount} colorClass="bg-indigo-500" />}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Status Kes</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { key: 'active',  label: 'Aktif',        bg: 'bg-green-50', text: 'text-green-700' },
                    { key: 'pending', label: 'Ditangguhkan', bg: 'bg-amber-50', text: 'text-amber-700' },
                    { key: 'closed',  label: 'Ditutup',      bg: 'bg-gray-50',  text: 'text-gray-600' },
                  ].map(({ key, label, bg, text }) => (
                    <div key={key} className={`${bg} rounded-xl p-4`}>
                      <p className={`text-2xl font-bold ${text}`}>{stats.statusCounts[key]}</p>
                      <p className="text-xs text-gray-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Taburan Tahap Risiko</h3>
                {stats.withReport === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">Jana laporan AI untuk melihat taburan risiko</p>
                  : <div className="space-y-3">{stats.riskData.map(({ key, label, count }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-28 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${riskColors[key]}`} style={{ width: `${Math.round((count / maxRiskCount) * 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-6 text-right">{count}</span>
                      </div>
                    ))}</div>}
              </div>
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Durasi & Laporan</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50 rounded-xl p-4"><p className="text-2xl font-bold text-blue-700">{stats.avgMinutes} min</p><p className="text-xs text-gray-500 mt-1">Purata Tempoh</p></div>
                  <div className="bg-green-50 rounded-xl p-4"><p className="text-2xl font-bold text-green-700">{stats.withReport}</p><p className="text-xs text-gray-500 mt-1">Laporan Dijana</p></div>
                  <div className="bg-purple-50 rounded-xl p-4"><p className="text-2xl font-bold text-purple-700">{stats.total > 0 ? Math.round((stats.withReport / stats.total) * 100) : 0}%</p><p className="text-xs text-gray-500 mt-1">Kadar Penyiapan</p></div>
                </div>
              </div>
            </>)}

            {/* ── AUDIT ANALYTICS ── */}
            {useCase === 'audit' && sessions.length > 0 && (<>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Jumlah Audit" value={stats.total} sub="sepanjang masa" />
                <StatCard label="Bulan Ini" value={stats.recentSessions} sub="30 hari lepas" />
                <StatCard label="Jumlah Flag/NCR" value={stats.totalFlags} sub="semua sesi" />
                <StatCard label="Kadar Audit + NCR" value={`${stats.flagRate}%`} sub="ada penemuan" />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Trend Audit (6 Bulan)</h3>
                  <div className="flex items-end gap-2 h-28">
                    {stats.monthlyTrend.map(d => (
                      <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{d.count}</span>
                        <div className="w-full bg-amber-500 rounded-t" style={{ height: `${(d.count / maxMonthly) * 80}px`, minHeight: d.count > 0 ? '4px' : '0' }} />
                        <span className="text-xs text-gray-400">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Pematuhan</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Audit dengan penemuan (flag/NCR)</span><span className="font-semibold">{stats.flagRate}%</span></div>
                      <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.flagRate}%` }} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Laporan dijana</span><span className="font-semibold">{stats.total > 0 ? Math.round((stats.withReport / stats.total) * 100) : 0}%</span></div>
                      <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.total > 0 ? Math.round((stats.withReport / stats.total) * 100) : 0}%` }} /></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Taburan Risiko Audit</h3>
                {stats.withReport === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">Jana laporan AI untuk melihat taburan</p>
                  : <div className="space-y-3">{stats.riskData.map(({ key, label, count }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-28 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${riskColors[key]}`} style={{ width: `${Math.round((count / maxRiskCount) * 100)}%` }} /></div>
                        <span className="text-sm font-medium text-gray-700 w-6 text-right">{count}</span>
                      </div>
                    ))}</div>}
              </div>
            </>)}

          </div>
        )}
      </div>
    </div>
  );
}
