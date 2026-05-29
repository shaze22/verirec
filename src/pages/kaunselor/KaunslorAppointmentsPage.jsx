import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { getCounselorProfile, getSlots, addSlot, deleteSlot, getAppointments, updateAppointment, DAYS_MS } from '../../api/counselor.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const STATUS_CONFIG = {
  pending:     { label: 'Menunggu',   color: 'yellow' },
  confirmed:   { label: 'Disahkan',   color: 'green' },
  rescheduled: { label: 'Dijadual semula', color: 'blue' },
  cancelled:   { label: 'Dibatalkan', color: 'gray' },
  completed:   { label: 'Selesai',    color: 'gray' },
};

export default function KaunslorAppointmentsPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [tab, setTab] = useState('appointments');
  const [addSlotForm, setAddSlotForm] = useState({ day_of_week: 1, start_time: '09:00', end_time: '17:00' });
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmForm, setConfirmForm] = useState({ confirmed_date: '', confirmed_time: '', counselor_notes: '' });
  const qrRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getCounselorProfile(user.id),
      getSlots(user.id),
      getAppointments(user.id),
    ]).then(([p, s, a]) => {
      setProfile(p);
      setSlots(s);
      setAppointments(a);
      if (p?.booking_code) {
        const url = `${window.location.origin}/book/${p.booking_code}`;
        QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#1e293b' } })
          .then(setQrDataUrl).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      const s = await addSlot(user.id, addSlotForm);
      setSlots(prev => [...prev, s].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));
      toast.success('Slot ditambah.');
    } catch { toast.error('Gagal menambah slot.'); }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Padam slot ini?')) return;
    try { await deleteSlot(id); setSlots(prev => prev.filter(s => s.id !== id)); }
    catch { toast.error('Gagal memadam.'); }
  };

  const openConfirm = (appt) => {
    setSelectedAppt(appt);
    setConfirmForm({
      confirmed_date: appt.requested_date,
      confirmed_time: appt.requested_time?.slice(0, 5) || '',
      counselor_notes: appt.counselor_notes || '',
    });
    setConfirmModal(true);
  };

  const handleConfirm = async (status) => {
    try {
      const updated = await updateAppointment(selectedAppt.id, {
        status,
        confirmed_date: confirmForm.confirmed_date,
        confirmed_time: confirmForm.confirmed_time,
        counselor_notes: confirmForm.counselor_notes,
      });
      setAppointments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      setConfirmModal(false);
      toast.success(status === 'confirmed' ? 'Temujanji disahkan!' : 'Temujanji dikemaskini.');
    } catch { toast.error('Gagal mengemaskini.'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Batalkan temujanji ini?')) return;
    try {
      const updated = await updateAppointment(id, { status: 'cancelled' });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
      toast.success('Temujanji dibatalkan.');
    } catch { toast.error('Gagal.'); }
  };

  const downloadQR = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `verirec-qr-${profile?.booking_code}.png`;
    a.click();
  };

  const bookingUrl = profile ? `${window.location.origin}/book/${profile.booking_code}` : '';

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const pending = appointments.filter(a => a.status === 'pending');
  const upcoming = appointments.filter(a => a.status === 'confirmed');
  const past = appointments.filter(a => ['cancelled', 'completed', 'rescheduled'].includes(a.status));

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Temujanji" />
      <div className="flex-1 overflow-auto">

        {/* Tabs */}
        <div className="flex bg-white border-b px-4 gap-1 pt-2">
          {[
            { id: 'appointments', label: `Temujanji${pending.length ? ` (${pending.length} baru)` : ''}` },
            { id: 'slots', label: 'Slot Masa' },
            { id: 'qr', label: 'QR & Pautan' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 max-w-3xl mx-auto">

          {/* ── APPOINTMENTS TAB ── */}
          {tab === 'appointments' && (
            <div className="space-y-6">
              {pending.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Menunggu Pengesahan ({pending.length})</h3>
                  <div className="space-y-3">
                    {pending.map(a => (
                      <div key={a.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{a.client_name}</p>
                            <p className="text-sm text-gray-500">{a.client_phone} · {a.client_email}</p>
                            <p className="text-sm text-blue-700 mt-1">
                              📅 {format(parseISO(a.requested_date), 'dd MMM yyyy')} · 🕐 {a.requested_time?.slice(0, 5)}
                            </p>
                            {a.presenting_issue && <p className="text-sm text-gray-600 mt-1 italic">"{a.presenting_issue}"</p>}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button size="sm" onClick={() => openConfirm(a)}>Sahkan</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleCancel(a.id)}>Tolak</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {upcoming.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Akan Datang</h3>
                  <div className="space-y-2">
                    {upcoming.map(a => (
                      <div key={a.id} className="bg-white border rounded-xl p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900">{a.client_name}</p>
                          <p className="text-sm text-gray-500">
                            {format(parseISO(a.confirmed_date || a.requested_date), 'dd MMM yyyy')} · {(a.confirmed_time || a.requested_time)?.slice(0, 5)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color="green">Disahkan</Badge>
                          <button onClick={() => handleCancel(a.id)} className="text-xs text-gray-400 hover:text-red-500">Batal</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pending.length === 0 && upcoming.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="font-medium">Tiada temujanji buat masa ini</p>
                  <p className="text-sm mt-1">Kongsi QR kod anda kepada klien untuk mulakan.</p>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-500 text-sm mb-2">Lepas</h3>
                  <div className="space-y-2">
                    {past.map(a => (
                      <div key={a.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between text-sm">
                        <span className="text-gray-600">{a.client_name} · {format(parseISO(a.requested_date), 'dd MMM')}</span>
                        <Badge color={STATUS_CONFIG[a.status]?.color || 'gray'}>{STATUS_CONFIG[a.status]?.label}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SLOTS TAB ── */}
          {tab === 'slots' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Tambah Slot Masa</h3>
                <form onSubmit={handleAddSlot} className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Hari</label>
                    <select value={addSlotForm.day_of_week}
                      onChange={e => setAddSlotForm(f => ({ ...f, day_of_week: +e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {DAYS_MS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mula</label>
                    <input type="time" value={addSlotForm.start_time}
                      onChange={e => setAddSlotForm(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tamat</label>
                    <input type="time" value={addSlotForm.end_time}
                      onChange={e => setAddSlotForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-3">
                    <Button type="submit" variant="secondary" className="w-full">+ Tambah Slot</Button>
                  </div>
                </form>
              </div>

              {slots.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p>Belum ada slot. Tambah slot masa yang anda tersedia.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {DAYS_MS.map((day, i) => {
                    const daySlots = slots.filter(s => s.day_of_week === i);
                    if (!daySlots.length) return null;
                    return (
                      <div key={i} className="bg-white rounded-xl border p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{day}</p>
                        <div className="flex flex-wrap gap-2">
                          {daySlots.map(s => (
                            <div key={s.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                              <span className="text-xs text-blue-700">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</span>
                              <button onClick={() => handleDeleteSlot(s.id)} className="text-blue-400 hover:text-red-500 text-xs">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── QR TAB ── */}
          {tab === 'qr' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border p-6 text-center">
                {qrDataUrl ? (
                  <>
                    <img src={qrDataUrl} alt="QR Kod Tempahan" className="mx-auto rounded-xl mb-4" style={{ width: 220 }} />
                    <p className="text-sm text-gray-500 mb-1">Pautan Tempahan</p>
                    <p className="font-mono text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-700 break-all">{bookingUrl}</p>
                    <div className="flex gap-3 justify-center mt-4">
                      <Button onClick={downloadQR} variant="secondary">⬇ Muat Turun QR</Button>
                      <Button onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success('Pautan disalin!'); }}>
                        Salin Pautan
                      </Button>
                    </div>
                  </>
                ) : <p className="text-gray-400">QR kod tidak tersedia.</p>}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
                <p className="font-semibold">Cara guna QR kod ini:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Print atau share QR kod kepada klien</li>
                  <li>Klien scan QR → buka borang tempahan</li>
                  <li>Klien isi maklumat, pilih tarikh/masa, sign consent</li>
                  <li>Anda terima notifikasi dan sahkan temujanji</li>
                  <li>Profil klien auto-dibuat dalam sistem</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmModal && selectedAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">Sahkan Temujanji</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium">{selectedAppt.client_name}</p>
              <p className="text-gray-500">{selectedAppt.client_phone} · {selectedAppt.client_email}</p>
              {selectedAppt.presenting_issue && <p className="text-gray-600 mt-1 italic">"{selectedAppt.presenting_issue}"</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tarikh Disahkan</label>
                <input type="date" value={confirmForm.confirmed_date}
                  onChange={e => setConfirmForm(f => ({ ...f, confirmed_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Masa</label>
                <input type="time" value={confirmForm.confirmed_time}
                  onChange={e => setConfirmForm(f => ({ ...f, confirmed_time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nota (pilihan)</label>
              <textarea value={confirmForm.counselor_notes}
                onChange={e => setConfirmForm(f => ({ ...f, counselor_notes: e.target.value }))}
                rows={2} placeholder="Nota untuk rekod..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleConfirm('confirmed')} className="flex-1">✓ Sahkan</Button>
              <Button onClick={() => handleConfirm('rescheduled')} variant="secondary" className="flex-1">Jadual Semula</Button>
              <Button onClick={() => setConfirmModal(false)} variant="secondary">Batal</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
