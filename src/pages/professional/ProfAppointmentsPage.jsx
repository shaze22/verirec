import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { getCounselorProfile, getSlots, addSlot, deleteSlot, getAppointments, updateAppointment, DAYS_MS } from '../../api/counselor.js';
import { getProfFromPath } from '../../lib/profConfig.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const STATUS_CONFIG = {
  pending:     { label: 'Menunggu',         color: 'yellow' },
  confirmed:   { label: 'Disahkan',         color: 'green' },
  rescheduled: { label: 'Dijadual Semula',  color: 'blue' },
  cancelled:   { label: 'Dibatalkan',       color: 'gray' },
  completed:   { label: 'Selesai',          color: 'gray' },
};

export default function ProfAppointmentsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const prof = getProfFromPath(pathname);
  const qrRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [incomingReferrals, setIncomingReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [tab, setTab] = useState('appointments');
  const [addSlotForm, setAddSlotForm] = useState({ day_of_week: 1, start_time: '09:00', end_time: '17:00' });
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ confirmed_date: '', confirmed_time: '', counselor_notes: '' });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getCounselorProfile(user.id),
      getSlots(user.id),
      getAppointments(user.id),
      supabase.from('team_referrals').select('*, subjects(name, presenting_issue)').eq('to_email', user.email).order('created_at', { ascending: false }),
    ]).then(([p, s, a, { data: refs }]) => {
      setProfile(p);
      setSlots(s);
      setAppointments(a);
      setIncomingReferrals(refs || []);
      if (p?.booking_code) {
        const url = `${window.location.origin}/book/${p.booking_code}`;
        QRCode.toDataURL(url, { width: 400, margin: 3, color: { dark: '#1e293b', light: '#ffffff' } }).then(setQrDataUrl).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const openConfirm = (appt) => {
    setSelectedAppt(appt);
    setConfirmForm({ confirmed_date: appt.requested_date, confirmed_time: appt.requested_time || '', counselor_notes: '' });
    setConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!confirmForm.confirmed_date) return toast.error('Pilih tarikh pengesahan.');
    try {
      const updated = await updateAppointment(selectedAppt.id, { status: 'confirmed', confirmed_date: confirmForm.confirmed_date, confirmed_time: confirmForm.confirmed_time, counselor_notes: confirmForm.counselor_notes });
      setAppointments(prev => prev.map(a => a.id === selectedAppt.id ? { ...a, ...updated } : a));
      if (updated.subject_id) navigate(`${prof.routePrefix}/clients/${updated.subject_id}`);
      setConfirmModal(false);
      toast.success(`${prof.appointmentLabel} disahkan.`);
      fetch(`/api/user-notifications?type=appointment-confirmed&appointment_id=${selectedAppt.id}`, { method: 'POST' }).catch(() => {});
    } catch { toast.error('Gagal mengesahkan.'); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Tolak permintaan ini?')) return;
    try {
      await updateAppointment(id, { status: 'cancelled' });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
      toast.success('Permintaan ditolak.');
    } catch { toast.error('Gagal menolak.'); }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      const s = await addSlot(user.id, addSlotForm);
      setSlots(prev => [...prev, s].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));
      toast.success('Slot ditambah.');
    } catch { toast.error('Gagal menambah slot.'); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const today = new Date().toISOString().split('T')[0];
  const pending  = appointments.filter(a => a.status === 'pending');
  const upcoming = appointments.filter(a => a.status === 'confirmed' || (a.status === 'rescheduled' && (a.confirmed_date || a.requested_date) >= today));
  const past     = appointments.filter(a => ['cancelled', 'completed'].includes(a.status) || (a.status === 'rescheduled' && (a.confirmed_date || a.requested_date) < today));

  const pendingReferrals = incomingReferrals.filter(r => r.status === 'pending').length;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={prof.appointmentsLabel} />
      <div className="flex-1 overflow-auto">

        <div className="flex bg-white border-b px-4 gap-1 pt-2 overflow-x-auto">
          {[
            { id: 'appointments', label: `Permintaan${pending.length ? ` (${pending.length})` : ''}` },
            { id: 'slots',        label: 'Slot Masa' },
            { id: 'qr',           label: 'QR & Pautan' },
            { id: 'rujukan',      label: `Rujukan Pasukan${pendingReferrals ? ` (${pendingReferrals})` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 max-w-3xl mx-auto">

          {/* APPOINTMENTS TAB */}
          {tab === 'appointments' && (
            <div className="space-y-6">
              {pending.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">Permintaan Baru ({pending.length})</h3>
                  <div className="space-y-3">
                    {pending.map(a => (
                      <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{a.client_name}</p>
                            <p className="text-xs text-gray-500">{a.client_phone} · {a.client_email}</p>
                            {a.presenting_issue && <p className="text-xs text-gray-600 mt-1 italic">"{a.presenting_issue}"</p>}
                            <p className="text-xs text-amber-700 mt-1">Minta: {format(parseISO(a.requested_date), 'dd MMM yyyy')} {a.requested_time?.slice(0,5)}</p>
                          </div>
                          <Badge color="yellow">Baru</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => openConfirm(a)} className="flex-1">✓ Sahkan</Button>
                          <Button size="sm" variant="secondary" onClick={() => handleReject(a.id)}>✗ Tolak</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {upcoming.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Akan Datang ({upcoming.length})</h3>
                  <div className="space-y-2">
                    {upcoming.map(a => (
                      <div key={a.id} className="bg-white border rounded-xl p-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{a.client_name}</p>
                          <p className="text-sm text-gray-500">{format(parseISO(a.confirmed_date || a.requested_date), 'dd MMM yyyy')} · {(a.confirmed_time || a.requested_time)?.slice(0,5)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={STATUS_CONFIG[a.status]?.color || 'gray'}>{STATUS_CONFIG[a.status]?.label || a.status}</Badge>
                          {a.subject_id && <button onClick={() => navigate(`${prof.routePrefix}/clients/${a.subject_id}`)} className="text-xs text-blue-600 hover:underline">Profil</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Lepas</h3>
                  <div className="space-y-2">
                    {past.slice(0, 10).map(a => (
                      <div key={a.id} className="bg-white border rounded-xl p-4 flex items-start justify-between gap-3 opacity-70">
                        <div>
                          <p className="font-medium text-gray-900">{a.client_name}</p>
                          <p className="text-sm text-gray-400">{format(parseISO(a.confirmed_date || a.requested_date), 'dd MMM yyyy')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={STATUS_CONFIG[a.status]?.color || 'gray'}>{STATUS_CONFIG[a.status]?.label || a.status}</Badge>
                          {a.subject_id && <button onClick={() => navigate(`${prof.routePrefix}/clients/${a.subject_id}`)} className="text-xs text-blue-600 hover:underline">Profil</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {appointments.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📅</div>
                  <p>Belum ada {prof.appointmentsLabel.toLowerCase()}.</p>
                  <p className="text-sm mt-1">Kongsi QR anda kepada {prof.clientsLabel.toLowerCase()} untuk mula menerima tempahan.</p>
                </div>
              )}
            </div>
          )}

          {/* SLOTS TAB */}
          {tab === 'slots' && (
            <div className="space-y-4">
              <form onSubmit={handleAddSlot} className="bg-white rounded-xl border p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Tambah Slot Masa</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Hari</label>
                    <select value={addSlotForm.day_of_week} onChange={e => setAddSlotForm(f => ({ ...f, day_of_week: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {DAYS_MS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mula</label>
                    <input type="time" value={addSlotForm.start_time} onChange={e => setAddSlotForm(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tamat</label>
                    <input type="time" value={addSlotForm.end_time} onChange={e => setAddSlotForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <Button type="submit" size="sm">+ Tambah Slot</Button>
              </form>

              {slots.length > 0 && (
                <div className="space-y-2">
                  {slots.map(s => (
                    <div key={s.id} className="bg-white rounded-xl border px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{DAYS_MS[s.day_of_week]}</p>
                        <p className="text-xs text-gray-500">{s.start_time?.slice(0,5)} — {s.end_time?.slice(0,5)}</p>
                      </div>
                      <button onClick={async () => { await deleteSlot(s.id); setSlots(prev => prev.filter(x => x.id !== s.id)); toast.success('Slot dipadam.'); }}
                        className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">Padam</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* QR TAB */}
          {tab === 'qr' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-6 text-center">
                {qrDataUrl ? (
                  <>
                    <img src={qrDataUrl} alt="QR Tempahan" className="w-48 h-48 mx-auto rounded-xl border shadow-sm mb-4" ref={qrRef} />
                    <p className="text-sm font-mono text-gray-600 mb-2">{window.location.origin}/book/{profile?.booking_code}</p>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="secondary" onClick={() => { const a = document.createElement('a'); a.href = qrDataUrl; a.download = `qr-${prof.profession}.png`; a.click(); }}>Muat Turun QR</Button>
                      <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book/${profile?.booking_code}`); toast.success('Pautan disalin!'); }}>Salin Pautan</Button>
                    </div>
                  </>
                ) : <p className="text-gray-400 text-sm">Profil belum disediakan. <button onClick={() => navigate(`${prof.routePrefix}/setup`)} className="text-blue-600 hover:underline">Sediakan profil</button></p>}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">Cara guna QR:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-700 text-xs">
                  <li>Print atau share QR kepada {prof.clientsLabel.toLowerCase()}</li>
                  <li>{prof.clientLabel} scan QR → buka borang tempahan</li>
                  <li>{prof.clientLabel} isi maklumat & pilih tarikh</li>
                  <li>Anda terima notifikasi dan sahkan {prof.appointmentLabel.toLowerCase()}</li>
                </ol>
              </div>
            </div>
          )}

          {/* RUJUKAN PASUKAN TAB */}
          {tab === 'rujukan' && (
            <div className="space-y-3">
              {incomingReferrals.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">👥</div><p className="text-sm">Tiada rujukan pasukan masuk.</p></div>
              ) : incomingReferrals.map(ref => (
                <div key={ref.id} className={`bg-white rounded-xl border p-4 ${ref.status === 'pending' ? 'border-amber-200' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{ref.subjects?.name || prof.clientLabel}</p>
                      {ref.subjects?.presenting_issue && <p className="text-xs text-gray-500 italic mt-0.5">"{ref.subjects.presenting_issue}"</p>}
                      <p className="text-sm text-gray-700 mt-1">{ref.reason}</p>
                      {ref.notes && <p className="text-xs text-gray-500 mt-0.5">{ref.notes}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ref.status === 'accepted' ? 'bg-green-100 text-green-700' : ref.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ref.status === 'accepted' ? 'Diterima' : ref.status === 'declined' ? 'Ditolak' : 'Baharu'}
                    </span>
                  </div>
                  {ref.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={async () => { await supabase.from('team_referrals').update({ status: 'accepted' }).eq('id', ref.id); setIncomingReferrals(prev => prev.map(r => r.id === ref.id ? { ...r, status: 'accepted' } : r)); toast.success('Rujukan diterima.'); }}
                        className="flex-1 text-sm font-medium bg-emerald-600 text-white rounded-lg py-1.5 hover:bg-emerald-700 transition-colors">✓ Terima</button>
                      <button onClick={async () => { await supabase.from('team_referrals').update({ status: 'declined' }).eq('id', ref.id); setIncomingReferrals(prev => prev.map(r => r.id === ref.id ? { ...r, status: 'declined' } : r)); toast('Rujukan ditolak.'); }}
                        className="flex-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg py-1.5 hover:bg-gray-200 transition-colors">✗ Tolak</button>
                      <button onClick={() => navigate(`${prof.routePrefix}/clients/${ref.subject_id}`)} className="flex-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg py-1.5 hover:bg-blue-100 transition-colors">Lihat Profil</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmModal && selectedAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">Sahkan {prof.appointmentLabel}</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium">{selectedAppt.client_name}</p>
              <p className="text-gray-500">{selectedAppt.client_phone} · {selectedAppt.client_email}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Tarikh Disahkan</label>
                <input type="date" value={confirmForm.confirmed_date} onChange={e => setConfirmForm(f => ({ ...f, confirmed_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Masa</label>
                <input type="time" value={confirmForm.confirmed_time} onChange={e => setConfirmForm(f => ({ ...f, confirmed_time: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmModal(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleConfirm}>Sahkan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
