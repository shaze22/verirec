import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const RISK_CONFIG = {
  low:    { label: 'Rendah',    color: 'green' },
  medium: { label: 'Sederhana', color: 'yellow' },
  high:   { label: 'Tinggi',    color: 'red' },
};

export default function KaunslorClientFilePage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('subjects').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('sessions').select('id, title, created_at, duration, report, profession')
        .eq('subject_id', id).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*')
        .eq('subject_id', id).order('requested_date', { ascending: false }),
    ]).then(([{ data: c }, { data: s }, { data: a }]) => {
      if (!c) { navigate('/kaunselor/clients'); return; }
      setClient(c);
      setEditForm(c);
      setSessions(s || []);
      setAppointments(a || []);
    }).finally(() => setLoading(false));
  }, [id, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('subjects')
        .update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setClient(editForm);
      setEditing(false);
      toast.success('Maklumat klien dikemaskini.');
    } catch { toast.error('Gagal menyimpan.'); }
    finally { setSaving(false); }
  };

  const startNewSession = () => {
    sessionStorage.setItem('session_setup', JSON.stringify({
      profession: 'counselor',
      subject_name: client.name,
      subject_id: client.id,
      interviewer: user?.user_metadata?.full_name || '',
      title: `Sesi ${sessions.length + 1} — ${client.name}`,
    }));
    navigate('/session/consent');
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!client) return null;

  const lastSession = sessions[0];
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={client.name} onBack={() => navigate('/kaunselor/clients')} />
      <div className="flex-1 overflow-auto">
        {/* Client header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                {client.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{client.name}</h2>
                <p className="text-sm text-gray-500">{client.phone} · {client.email}</p>
                <p className="text-xs text-gray-400">{sessions.length} sesi · {Math.round(totalDuration / 60)} minit jumlah</p>
              </div>
            </div>
            <Button onClick={startNewSession} className="flex-shrink-0">+ Sesi Baru</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b px-6">
          <div className="max-w-2xl mx-auto flex gap-1">
            {[
              { id: 'overview', label: 'Maklumat' },
              { id: 'sessions', label: `Sesi (${sessions.length})` },
              { id: 'appointments', label: `Temujanji (${appointments.length})` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 max-w-2xl mx-auto space-y-4">

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{sessions.length}</p>
                  <p className="text-xs text-blue-600">Sesi</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{Math.round(totalDuration / 60)}</p>
                  <p className="text-xs text-green-600">Minit</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {lastSession?.report?.riskLevel ? RISK_CONFIG[lastSession.report.riskLevel]?.label || '-' : '-'}
                  </p>
                  <p className="text-xs text-purple-600">Risiko Terkini</p>
                </div>
              </div>

              {/* Details */}
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Maklumat Peribadi</h3>
                  {editing
                    ? <div className="flex gap-2"><Button size="sm" loading={saving} onClick={handleSave}>Simpan</Button><Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Batal</Button></div>
                    : <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
                  }
                </div>
                {editing ? (
                  <div className="space-y-3">
                    {[
                      { k: 'name', label: 'Nama', type: 'text' },
                      { k: 'phone', label: 'Telefon', type: 'tel' },
                      { k: 'email', label: 'E-mel', type: 'email' },
                      { k: 'ic_number', label: 'No. IC', type: 'text' },
                      { k: 'address', label: 'Alamat', type: 'text' },
                    ].map(f => (
                      <div key={f.k} className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-sm text-gray-500">{f.label}</label>
                        <input type={f.type} value={editForm[f.k] || ''} onChange={e => setEditForm(p => ({ ...p, [f.k]: e.target.value }))}
                          className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-sm text-gray-500">Nota</label>
                      <textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                        className="col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {[
                      ['Nama', client.name],
                      ['Telefon', client.phone],
                      ['E-mel', client.email],
                      ['No. IC', client.ic_number],
                      ['Alamat', client.address],
                      ['Nota', client.notes],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex gap-4">
                        <span className="text-gray-400 w-20 flex-shrink-0">{k}</span>
                        <span className="text-gray-900">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Last session summary */}
              {lastSession?.report && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Sesi Terakhir</h3>
                  <p className="text-xs text-gray-400 mb-2">{format(parseISO(lastSession.created_at), 'dd MMM yyyy')}</p>
                  {lastSession.report.summary && <p className="text-sm text-gray-700 mb-3">{lastSession.report.summary}</p>}
                  {lastSession.report.riskLevel && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Tahap Risiko:</span>
                      <Badge color={RISK_CONFIG[lastSession.report.riskLevel]?.color || 'gray'}>
                        {RISK_CONFIG[lastSession.report.riskLevel]?.label}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SESSIONS TAB ── */}
          {tab === 'sessions' && (
            <div className="space-y-3">
              <Button onClick={startNewSession} className="w-full">+ Mulakan Sesi Baru</Button>
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">🎙️</div>
                  <p>Belum ada sesi untuk klien ini.</p>
                </div>
              ) : sessions.map((s, i) => (
                <button key={s.id} onClick={() => navigate(`/session/${s.id}`)}
                  className="w-full bg-white rounded-xl border p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Sesi {sessions.length - i}</span>
                        {s.report?.riskLevel && <Badge color={RISK_CONFIG[s.report.riskLevel]?.color || 'gray'} size="sm">{RISK_CONFIG[s.report.riskLevel]?.label}</Badge>}
                      </div>
                      <p className="font-medium text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(s.created_at), 'dd MMM yyyy')} · {Math.round((s.duration || 0) / 60)} minit</p>
                      {s.report?.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.report.summary}</p>}
                    </div>
                    <span className="text-gray-400 text-sm">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── APPOINTMENTS TAB ── */}
          {tab === 'appointments' && (
            <div className="space-y-2">
              {appointments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📅</div>
                  <p>Tiada rekod temujanji.</p>
                </div>
              ) : appointments.map(a => (
                <div key={a.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{format(parseISO(a.requested_date), 'dd MMM yyyy')} · {a.requested_time?.slice(0, 5)}</p>
                      {a.presenting_issue && <p className="text-sm text-gray-500 italic mt-0.5">"{a.presenting_issue}"</p>}
                      {a.counselor_notes && <p className="text-xs text-gray-400 mt-1">Nota: {a.counselor_notes}</p>}
                    </div>
                    <Badge color={a.status === 'confirmed' ? 'green' : a.status === 'cancelled' ? 'gray' : 'yellow'}>
                      {a.status === 'confirmed' ? 'Disahkan' : a.status === 'cancelled' ? 'Dibatalkan' : a.status === 'completed' ? 'Selesai' : 'Menunggu'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
