import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, getYear } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { getCounselorProfile } from '../../api/counselor.js';
import toast from 'react-hot-toast';

const DURATION_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour',     value: 60 },
  { label: '1.5 hours',  value: 90 },
  { label: '2 hours',    value: 120 },
  { label: '2.5 hours',  value: 150 },
  { label: '3 hours',    value: 180 },
];

const TYPE_LABELS = {
  individual: 'Individual',
  group:      'Group',
  peer:       'Peer Consultation',
};

function fmtDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export default function KaunslorSupervisionPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [profile, setProfile]       = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    supervisor_name: '',
    supervisor_reg_no: '',
    duration_minutes: 60,
    session_type: 'individual',
    topics_discussed: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('supervision_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
      getCounselorProfile(user.id),
    ]).then(([{ data }, prof]) => {
      setSessions(data || []);
      setProfile(prof);
    }).finally(() => setLoading(false));
  }, [user]);

  const years = useMemo(() => {
    const yrs = new Set(sessions.map(s => getYear(parseISO(s.date))));
    yrs.add(new Date().getFullYear());
    return [...yrs].sort((a, b) => b - a);
  }, [sessions]);

  const filtered = useMemo(() =>
    sessions.filter(s => getYear(parseISO(s.date)) === filterYear),
  [sessions, filterYear]);

  const totalMinsFiltered = filtered.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalMinsLifetime = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.supervisor_name.trim() || !form.date) {
      toast.error('Supervisor name and date are required.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('supervision_sessions').insert({
        user_id: user.id,
        date: form.date,
        supervisor_name: form.supervisor_name.trim(),
        supervisor_reg_no: form.supervisor_reg_no.trim() || null,
        duration_minutes: form.duration_minutes,
        session_type: form.session_type,
        topics_discussed: form.topics_discussed.trim() || null,
        notes: form.notes.trim() || null,
      }).select().single();
      if (error) throw error;
      setSessions(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setShowAdd(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        supervisor_name: '',
        supervisor_reg_no: '',
        duration_minutes: 60,
        session_type: 'individual',
        topics_discussed: '',
        notes: '',
      });
      toast.success('Supervision session logged.');
    } catch {
      toast.error('Failed to save session.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await supabase.from('supervision_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success('Session removed.');
  };

  const handlePrintLog = () => {
    const counselorName  = profile?.display_name || user?.user_metadata?.full_name || '_______________';
    const counselorReg   = profile?.registration_number || '_______________';
    const printYear      = filterYear;
    const rows = filtered
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${format(parseISO(s.date), 'dd/MM/yyyy')}</td>
          <td>${s.supervisor_name}</td>
          <td>${s.supervisor_reg_no || '—'}</td>
          <td>${fmtDuration(s.duration_minutes)}</td>
          <td>${TYPE_LABELS[s.session_type] || s.session_type}</td>
          <td>${s.topics_discussed || '—'}</td>
        </tr>`).join('');
    const totalH = (totalMinsFiltered / 60).toFixed(1);
    const win = window.open('', '_blank', 'width=1000,height=800');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Supervision Log ${printYear} — ${counselorName}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:11px;padding:30px;color:#111;line-height:1.4}
        h1{font-size:14px;text-transform:uppercase;text-align:center;margin:0 0 2px}
        h2{font-size:11px;text-align:center;color:#444;margin:0 0 20px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;border:1px solid #ddd;padding:10px;border-radius:4px}
        .info-row{display:flex;gap:6px;font-size:10px}.info-label{color:#666;min-width:120px;flex-shrink:0}
        table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10px}
        th{background:#333;color:#fff;padding:5px 8px;text-align:left;font-weight:bold;font-size:9px;text-transform:uppercase}
        td{padding:5px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top}
        tr:nth-child(even){background:#f9fafb}
        .total{text-align:right;font-weight:bold;font-size:11px;border-top:2px solid #333;padding:6px 8px;margin-top:4px}
        .sig-block{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}
        .sig-line{border-top:1px solid #333;padding-top:4px;margin-top:50px;font-size:10px}
        .footer{margin-top:20px;font-size:8px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:6px}
        @media print{body{padding:15px}}
      </style></head><body>
      <h1>Clinical Supervision Log</h1>
      <h2>Year: ${printYear}</h2>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Counselor Name</span><strong>${counselorName}</strong></div>
        <div class="info-row"><span class="info-label">LPK / PPM Reg. No.</span><strong>${counselorReg}</strong></div>
        <div class="info-row"><span class="info-label">Total Sessions (${printYear})</span><strong>${filtered.length}</strong></div>
        <div class="info-row"><span class="info-label">Total Hours (${printYear})</span><strong>${totalH} hours</strong></div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Date</th><th>Supervisor</th><th>Supervisor Reg.</th>
          <th>Duration</th><th>Type</th><th>Topics Discussed</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Total: ${filtered.length} session(s) · ${totalH} hours</div>
      <div class="sig-block">
        <div><div class="sig-line"><strong>${counselorName}</strong><br/>Counselor Signature<br/>Date: _______________</div></div>
        <div><div class="sig-line">Supervisor / Verifying Officer<br/>Signature: _______________<br/>Date: _______________</div></div>
      </div>
      <div class="footer">Generated by kaunselor.app · CONFIDENTIAL · For LPK / PPM Submission</div>
      <script>window.onload=function(){window.print()}</script>
    </body></html>`);
    win.document.close();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Supervision Log" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Sessions (Year)" value={filtered.length} color="text-violet-700" bg="bg-violet-50" />
          <StatCard label="Hours (Year)"    value={(totalMinsFiltered / 60).toFixed(1)} sub="hrs" color="text-blue-700" bg="bg-blue-50" />
          <StatCard label="Hours (Total)"   value={(totalMinsLifetime / 60).toFixed(1)} sub="hrs" color="text-gray-700" bg="bg-white" />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white ring-1 ring-gray-100 shadow-sm rounded-xl px-2 py-1">
            {years.map(y => (
              <button
                key={y}
                onClick={() => setFilterYear(y)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterYear === y ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-200' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={handlePrintLog} disabled={filtered.length === 0}>
              🖨 Print Log
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Session</Button>
          </div>
        </div>

        {/* LPK guidance note */}
        {totalMinsLifetime === 0 && (
          <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-violet-900 mb-1">LPK Supervision Requirement</p>
            <p className="text-xs text-violet-700">LPK requires registered counselors to complete a minimum of supervision hours per year. Log each supervision session here to track compliance and generate your annual supervision report.</p>
          </div>
        )}

        {/* Session list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 text-3xl mb-4">📋</div>
            <p className="text-sm text-gray-500">No supervision sessions logged for {filterYear}.</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Tap "+ Add Session" to record a session.</p>
            <Button size="sm" onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-200 hover:-translate-y-0.5 hover:shadow-xl transition-all">+ Add Session</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => (
              <div key={s.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 flex-shrink-0">
                    <span className="text-xs font-bold text-violet-700">{fmtDuration(s.duration_minutes)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{s.supervisor_name}</p>
                      {s.supervisor_reg_no && (
                        <span className="text-xs text-gray-400 font-mono">{s.supervisor_reg_no}</span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        s.session_type === 'individual' ? 'bg-violet-100 text-violet-700' :
                        s.session_type === 'group'      ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {TYPE_LABELS[s.session_type]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{format(parseISO(s.date), 'dd MMMM yyyy')}</p>
                    {s.topics_discussed && (
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{s.topics_discussed}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 px-1"
                  >Delete</button>
                </div>
              </div>
            ))}
            <p className="text-center text-xs text-gray-400 py-1">
              {filtered.length} session(s) · {(totalMinsFiltered / 60).toFixed(1)} hours in {filterYear}
            </p>
          </div>
        )}
      </div>

      {/* Add Session Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 pt-5 pb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Log Supervision Session</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wide">Date *</label>
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wide">Duration *</label>
                  <select value={form.duration_minutes} onChange={e => set('duration_minutes', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                    {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wide">Supervisor Name *</label>
                <input type="text" value={form.supervisor_name} onChange={e => set('supervisor_name', e.target.value)}
                  placeholder="e.g. Pn. Halimah binti Ahmad"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wide">Supervisor LPK / PPM Reg. No.</label>
                <input type="text" value={form.supervisor_reg_no} onChange={e => set('supervisor_reg_no', e.target.value)}
                  placeholder="e.g. LPK-XXXX / PPM-XXXX"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wide">Session Type</label>
                <div className="flex gap-2">
                  {Object.entries(TYPE_LABELS).map(([k, label]) => (
                    <button key={k} onClick={() => set('session_type', k)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-all ${form.session_type === k ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-violet-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wide">Topics Discussed</label>
                <textarea value={form.topics_discussed} onChange={e => set('topics_discussed', e.target.value)}
                  rows={3} placeholder="e.g. Case conceptualization for anxious client, transference issues, self-care..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wide">Personal Notes (optional)</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={2} placeholder="Your reflections, insights, follow-up actions..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button className="flex-1 bg-violet-600 hover:bg-violet-700" loading={saving} onClick={handleAdd}>
                  Save Session
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, bg }) {
  return (
    <div className={`${bg} rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 text-center`}>
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm font-normal text-gray-400 ml-0.5">{sub}</span></p>
    </div>
  );
}
