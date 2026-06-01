import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { getCounselorProfile, getSlots, addSlot, deleteSlot, getAppointments, updateAppointment, DAYS_MS } from '../../api/counselor.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',      color: 'yellow' },
  confirmed:   { label: 'Confirmed',    color: 'green' },
  rescheduled: { label: 'Rescheduled',  color: 'blue' },
  cancelled:   { label: 'Cancelled',    color: 'gray' },
  completed:   { label: 'Completed',    color: 'gray' },
};

export default function KaunslorAppointmentsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [tab, setTab] = useState('appointments');
  const [addSlotForm, setAddSlotForm] = useState({ day_of_week: 1, start_time: '09:00', end_time: '17:00' });
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [incomingReferrals, setIncomingReferrals] = useState([]);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ title: '', subject_name: '', scheduled_at: '', notes: '' });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmForm, setConfirmForm] = useState({ confirmed_date: '', confirmed_time: '', counselor_notes: '' });
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ new_date: '', new_time: '', reason: '' });
  const [rescheduling, setRescheduling] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getCounselorProfile(user.id),
      getSlots(user.id),
      getAppointments(user.id),
      supabase.from('scheduled_sessions').select('*').eq('user_id', user.id).order('scheduled_at'),
      supabase.from('team_referrals').select('*, subjects(name, presenting_issue, risk_level)').eq('to_email', user.email).order('created_at', { ascending: false }),
    ]).then(([p, s, a, { data: sched }, { data: refs }]) => {
      setProfile(p);
      setSlots(s);
      setAppointments(a);
      setScheduledSessions(sched || []);
      setIncomingReferrals(refs || []);
      if (p?.booking_code) {
        const url = `${window.location.origin}/book/${p.booking_code}`;
        QRCode.toDataURL(url, { width: 400, margin: 3, color: { dark: '#1e293b', light: '#ffffff' } })
          .then(setQrDataUrl).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      const s = await addSlot(user.id, addSlotForm);
      setSlots(prev => [...prev, s].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));
      toast.success('Slot added.');
    } catch { toast.error('Failed to add slot.'); }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Delete this slot?')) return;
    try { await deleteSlot(id); setSlots(prev => prev.filter(s => s.id !== id)); }
    catch { toast.error('Failed to delete.'); }
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
      const { data: { session } } = await supabase.auth.getSession();
      const updated = await updateAppointment(selectedAppt.id, {
        status,
        confirmed_date: confirmForm.confirmed_date,
        confirmed_time: confirmForm.confirmed_time,
        counselor_notes: confirmForm.counselor_notes,
      });
      setAppointments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      setConfirmModal(false);
      if (status === 'confirmed') {
        toast.success('Appointment confirmed!', { duration: 5000 });
        // Navigate to subject profile
        const subjectId = updated.subject_id || updated.subjects?.id;
        if (subjectId) {
          setTimeout(() => navigate(`/kaunselor/clients/${subjectId}`), 800);
        }
      } else {
        toast.success('Appointment updated.');
      }
      // Send confirmation email to client
      if (status === 'confirmed' && session?.access_token) {
        fetch(`/api/user-notifications?type=appointment-confirmed&appointment_id=${selectedAppt.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => {});
      }
    } catch { toast.error('Failed to update.'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      const updated = await updateAppointment(id, { status: 'cancelled' });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
      toast.success('Appointment cancelled.');
    } catch { toast.error('Failed.'); }
  };

  const openReschedule = (appt) => {
    setRescheduleAppt(appt);
    setRescheduleForm({
      new_date: appt.confirmed_date || appt.requested_date || '',
      new_time: (appt.confirmed_time || appt.requested_time)?.slice(0, 5) || '',
      reason: '',
    });
    setRescheduleModal(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleForm.new_date || !rescheduleForm.new_time) {
      toast.error('Please select a new date and time.');
      return;
    }
    setRescheduling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const updated = await updateAppointment(rescheduleAppt.id, {
        status: 'rescheduled',
        confirmed_date: rescheduleForm.new_date,
        confirmed_time: rescheduleForm.new_time,
        counselor_notes: rescheduleForm.reason
          ? `[Rescheduled] ${rescheduleForm.reason}`
          : rescheduleAppt.counselor_notes,
      });
      setAppointments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      setRescheduleModal(false);
      toast.success('Appointment rescheduled.');
      // Email client
      if (session?.access_token) {
        fetch(`/api/user-notifications?type=appointment-confirmed&appointment_id=${rescheduleAppt.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => {});
      }
    } catch { toast.error('Failed to reschedule.'); }
    finally { setRescheduling(false); }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.title || !scheduleForm.scheduled_at) return;
    setSavingSchedule(true);
    try {
      const { data, error } = await supabase.from('scheduled_sessions').insert({
        user_id: user.id,
        title: scheduleForm.title,
        profession: 'counselor',
        subject_name: scheduleForm.subject_name || null,
        scheduled_at: scheduleForm.scheduled_at,
        notes: scheduleForm.notes || null,
        status: 'upcoming',
      }).select().single();
      if (error) throw error;
      setScheduledSessions(prev => [...prev, data].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
      setShowAddSchedule(false);
      setScheduleForm({ title: '', subject_name: '', scheduled_at: '', notes: '' });
      toast.success('Schedule added.');
    } catch { toast.error('Failed to save schedule.'); }
    finally { setSavingSchedule(false); }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this schedule?')) return;
    await supabase.from('scheduled_sessions').delete().eq('id', id).catch(() => {});
    setScheduledSessions(prev => prev.filter(s => s.id !== id));
    toast.success('Schedule deleted.');
  };

  const handleMarkDone = async (id) => {
    await supabase.from('scheduled_sessions').update({ status: 'completed' }).eq('id', id).catch(() => {});
    setScheduledSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' } : s));
  };


  const bookingUrl = profile ? `${window.location.origin}/book/${profile.booking_code}` : '';

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const today = new Date().toISOString().split('T')[0];
  const pending = appointments.filter(a => a.status === 'pending');
  const upcoming = appointments.filter(a =>
    a.status === 'confirmed' ||
    (a.status === 'rescheduled' && (a.confirmed_date || a.requested_date) >= today)
  );
  const past = appointments.filter(a =>
    ['cancelled', 'completed'].includes(a.status) ||
    (a.status === 'rescheduled' && (a.confirmed_date || a.requested_date) < today)
  );

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Appointments" />
      <div className="flex-1 overflow-auto">

        {/* Tabs */}
        <div className="flex bg-white border-b px-4 gap-1 pt-2 overflow-x-auto">
          {[
            { id: 'appointments', label: `Requests${pending.length ? ` (${pending.length})` : ''}` },
            { id: 'jadual', label: `Schedule (${scheduledSessions.filter(s => s.status === 'upcoming').length})` },
            { id: 'slots', label: 'Time Slots' },
            { id: 'qr', label: 'QR & Link' },
            { id: 'rujukan', label: `Team Referrals${incomingReferrals.filter(r => r.status === 'pending').length ? ` (${incomingReferrals.filter(r => r.status === 'pending').length})` : ''}` },
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
                  <h3 className="font-semibold text-gray-900 mb-3">Pending Confirmation ({pending.length})</h3>
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
                            <Button size="sm" onClick={() => openConfirm(a)}>Confirm</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleCancel(a.id)}>Reject</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {upcoming.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Upcoming</h3>
                  <div className="space-y-2">
                    {upcoming.map(a => {
                      const isRescheduled = a.status === 'rescheduled';
                      const rescheduleReason = isRescheduled && a.counselor_notes
                        ? a.counselor_notes.replace('[Jadual Semula] ', '')
                        : null;
                      return (
                        <div key={a.id} className={`border rounded-xl p-4 ${isRescheduled ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-medium text-gray-900">{a.client_name}</p>
                                {isRescheduled && <Badge color="blue">Rescheduled</Badge>}
                                {!isRescheduled && <Badge color="green">Confirmed</Badge>}
                              </div>
                              <p className="text-sm text-gray-500">
                                📅 {format(parseISO(a.confirmed_date || a.requested_date), 'dd MMM yyyy')} · 🕐 {(a.confirmed_time || a.requested_time)?.slice(0, 5)}
                              </p>
                              {a.presenting_issue && (
                                <p className="text-xs text-gray-400 mt-0.5 italic">"{a.presenting_issue}"</p>
                              )}
                              {rescheduleReason && (
                                <p className="text-xs text-blue-700 mt-1 bg-blue-100 px-2 py-1 rounded-lg">
                                  📝 Reschedule reason: {rescheduleReason}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                              {a.subject_id && (
                                <Button size="sm" onClick={() => navigate(`/kaunselor/clients/${a.subject_id}`)}>
                                  Open Profile
                                </Button>
                              )}
                              <button onClick={() => openReschedule(a)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Reschedule</button>
                              <button onClick={() => handleCancel(a.id)} className="text-xs text-gray-400 hover:text-red-500">Cancel</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pending.length === 0 && upcoming.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="font-medium">No appointments at the moment</p>
                  <p className="text-sm mt-1">Share your QR code with clients to get started.</p>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-500 text-sm mb-2">Past</h3>
                  <div className="space-y-2">
                    {past.map(a => (
                      <div key={a.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <span className="text-gray-700 font-medium">{a.client_name}</span>
                          <span className="text-gray-400"> · {format(parseISO(a.confirmed_date || a.requested_date), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {a.status === 'completed' && a.subject_id && (
                            <Button size="sm" variant="secondary" onClick={() => navigate(`/kaunselor/clients/${a.subject_id}`)}>
                              Profile
                            </Button>
                          )}
                          <Badge color={STATUS_CONFIG[a.status]?.color || 'gray'}>{STATUS_CONFIG[a.status]?.label}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── JADUAL TAB ── */}
          {tab === 'jadual' && (
            <div className="space-y-4">
              <Button onClick={() => setShowAddSchedule(true)} className="w-full">+ Add Session Schedule</Button>

              {/* Upcoming */}
              {scheduledSessions.filter(s => s.status === 'upcoming').length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="font-medium">No sessions scheduled</p>
                  <p className="text-sm mt-1">Add a session schedule for your clients.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Upcoming</p>
                  {scheduledSessions.filter(s => s.status === 'upcoming').map(s => {
                    const dt = new Date(s.scheduled_at);
                    const isToday = dt.toDateString() === new Date().toDateString();
                    return (
                      <div key={s.id} className={`rounded-xl border p-4 ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            {isToday && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium mb-1 inline-block">Today</span>}
                            <p className="font-medium text-gray-900">{s.title}</p>
                            {s.subject_name && <p className="text-sm text-gray-500">Client: {s.subject_name}</p>}
                            <p className="text-sm text-blue-700 mt-0.5">
                              {format(dt, 'dd MMM yyyy')} · {format(dt, 'HH:mm')}
                            </p>
                            {s.notes && <p className="text-xs text-gray-400 mt-1 italic">{s.notes}</p>}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => handleMarkDone(s.id)} className="text-xs text-green-600 hover:text-green-800 font-medium">✓ Done</button>
                            <button onClick={() => handleDeleteSchedule(s.id)} className="text-xs text-gray-400 hover:text-red-500">Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Past */}
              {scheduledSessions.filter(s => s.status !== 'upcoming').length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Past</p>
                  {scheduledSessions.filter(s => s.status !== 'upcoming').slice(0, 5).map(s => (
                    <div key={s.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-600">{s.title}{s.subject_name ? ` — ${s.subject_name}` : ''}</p>
                        <p className="text-xs text-gray-400">{format(new Date(s.scheduled_at), 'dd MMM yyyy · HH:mm')}</p>
                      </div>
                      <span className="text-xs text-gray-400">{s.status === 'completed' ? 'Completed' : 'Cancelled'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add schedule modal */}
              {showAddSchedule && (
                <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                    <h3 className="font-semibold text-lg">Add Session Schedule</h3>
                    <form onSubmit={handleAddSchedule} className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Session Title *</label>
                        <input type="text" value={scheduleForm.title} onChange={e => setScheduleForm(f => ({ ...f, title: e.target.value }))} required
                          placeholder="e.g. Counseling Session - Ahmad"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Client Name</label>
                        <input type="text" value={scheduleForm.subject_name} onChange={e => setScheduleForm(f => ({ ...f, subject_name: e.target.value }))}
                          placeholder="Client name (optional)"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Date & Time *</label>
                        <input type="datetime-local" value={scheduleForm.scheduled_at} onChange={e => setScheduleForm(f => ({ ...f, scheduled_at: e.target.value }))} required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                        <textarea value={scheduleForm.notes} onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                          placeholder="Notes for this session..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button type="submit" loading={savingSchedule} className="flex-1">Save</Button>
                        <Button type="button" variant="secondary" onClick={() => setShowAddSchedule(false)}>Cancel</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SLOTS TAB ── */}
          {tab === 'slots' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Add Time Slot</h3>
                <form onSubmit={handleAddSlot} className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Day</label>
                    <select value={addSlotForm.day_of_week}
                      onChange={e => setAddSlotForm(f => ({ ...f, day_of_week: +e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {DAYS_MS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Start</label>
                    <input type="time" value={addSlotForm.start_time}
                      onChange={e => setAddSlotForm(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">End</label>
                    <input type="time" value={addSlotForm.end_time}
                      onChange={e => setAddSlotForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-3">
                    <Button type="submit" variant="secondary" className="w-full">+ Add Slot</Button>
                  </div>
                </form>
              </div>

              {slots.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p>No slots yet. Add your available time slots.</p>
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
                    <img src={qrDataUrl} alt="Booking QR Code" className="mx-auto rounded-xl mb-4" style={{ width: 220 }} />
                    <p className="text-sm text-gray-500 mb-1">Booking Link</p>
                    <p className="font-mono text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-700 break-all">{bookingUrl}</p>
                    <div className="flex gap-3 justify-center mt-4">
                      <Button variant="secondary" onClick={() => {
                        const win = window.open('', '_blank', 'width=480,height=600');
                        win.document.write(`<!DOCTYPE html><html><head><title>Booking QR - VeriRec</title>
                          <style>
                            @page{size:A4;margin:1.5cm}
                            *{box-sizing:border-box}
                            html,body{margin:0;padding:0;height:100%;overflow:hidden}
                            body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;page-break-after:avoid}
                            img{width:260px;height:260px;display:block}
                            h2{font-size:17px;font-weight:700;margin:0 0 4px;color:#1e293b}
                            p{font-size:11px;color:#64748b;margin:3px 0;text-align:center;max-width:280px;word-break:break-all}
                            .url{font-family:monospace;background:#f1f5f9;padding:5px 10px;border-radius:6px;font-size:10px;margin:6px 0}
                          </style>
                        </head><body>
                          <h2>VeriRec — Booking QR</h2>
                          <p>Scan this QR code to make an appointment</p>
                          <img src="${qrDataUrl}" alt="QR"/>
                          <p class="url">${bookingUrl}</p>
                          <script>window.onload=()=>window.print();<\/script>
                        </body></html>`);
                        win.document.close();
                      }}>
                        🖨 Print / Save PDF
                      </Button>
                      <Button onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success('Link copied!'); }}>
                        Copy Link
                      </Button>
                    </div>
                  </>
                ) : <p className="text-gray-400">QR code not available.</p>}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
                <p className="font-semibold">How to use this QR code:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Print or share the QR code with clients</li>
                  <li>Client scans QR → opens booking form</li>
                  <li>Client fills in details, selects date/time, signs consent</li>
                  <li>You receive notification and confirm the appointment</li>
                  <li>Client profile is automatically created in the system</li>
                </ol>
              </div>
            </div>
          )}
          {/* ── RUJUKAN PASUKAN TAB ── */}
          {tab === 'rujukan' && (
            <div className="space-y-3 p-4">
              {incomingReferrals.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-sm">No incoming team referrals.</p>
                </div>
              ) : incomingReferrals.map(ref => (
                <div key={ref.id} className={`bg-white rounded-xl border p-4 ${ref.status === 'pending' ? 'border-amber-200' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{ref.subjects?.name || 'Client'}</p>
                      {ref.subjects?.presenting_issue && (
                        <p className="text-xs text-gray-500 italic mt-0.5">"{ref.subjects.presenting_issue}"</p>
                      )}
                      <p className="text-sm text-gray-700 mt-1">{ref.reason}</p>
                      {ref.notes && <p className="text-xs text-gray-500 mt-0.5">{ref.notes}</p>}
                      <p className="text-xs text-gray-400 mt-1">{format(parseISO(ref.created_at), 'dd MMM yyyy')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      ref.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      ref.status === 'declined' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'}`}>
                      {ref.status === 'accepted' ? 'Accepted' : ref.status === 'declined' ? 'Declined' : 'New'}
                    </span>
                  </div>
                  {ref.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={async () => {
                          try {
                            await supabase.from('team_referrals').update({ status: 'accepted' }).eq('id', ref.id);
                            setIncomingReferrals(prev => prev.map(r => r.id === ref.id ? { ...r, status: 'accepted' } : r));
                            toast.success('Referral accepted.');
                          } catch { toast.error('Failed to update.'); }
                        }}
                        className="flex-1 text-sm font-medium bg-violet-600 text-white rounded-lg py-1.5 hover:bg-violet-700 transition-colors"
                      >✓ Accept</button>
                      <button
                        onClick={async () => {
                          try {
                            await supabase.from('team_referrals').update({ status: 'declined' }).eq('id', ref.id);
                            setIncomingReferrals(prev => prev.map(r => r.id === ref.id ? { ...r, status: 'declined' } : r));
                            toast('Referral declined.');
                          } catch { toast.error('Failed to update.'); }
                        }}
                        className="flex-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg py-1.5 hover:bg-gray-200 transition-colors"
                      >✗ Decline</button>
                      <button
                        onClick={() => navigate(`/kaunselor/clients/${ref.subject_id}`)}
                        className="flex-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg py-1.5 hover:bg-blue-100 transition-colors"
                      >View Profile</button>
                    </div>
                  )}
                  {ref.status !== 'pending' && (
                    <button
                      onClick={() => navigate(`/kaunselor/clients/${ref.subject_id}`)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >View Client Profile →</button>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Reschedule modal */}
      {rescheduleModal && rescheduleAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">Reschedule Appointment</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium">{rescheduleAppt.client_name}</p>
              <p className="text-gray-500">{rescheduleAppt.client_phone} · {rescheduleAppt.client_email}</p>
              <p className="text-gray-500 mt-1">
                Original: {format(parseISO(rescheduleAppt.confirmed_date || rescheduleAppt.requested_date), 'dd MMM yyyy')} · {(rescheduleAppt.confirmed_time || rescheduleAppt.requested_time)?.slice(0,5)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">New Date</label>
                <input type="date" value={rescheduleForm.new_date}
                  onChange={e => setRescheduleForm(f => ({ ...f, new_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">New Time</label>
                <input type="time" value={rescheduleForm.new_time}
                  onChange={e => setRescheduleForm(f => ({ ...f, new_time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Reason / Notes (optional)</label>
              <textarea value={rescheduleForm.reason}
                onChange={e => setRescheduleForm(f => ({ ...f, reason: e.target.value }))}
                rows={2} placeholder="e.g. Counselor has urgent matters..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              Email notification with the new date will be sent to the client automatically.
            </div>
            <div className="flex gap-3">
              <Button onClick={handleReschedule} loading={rescheduling} className="flex-1">✓ Confirm New Schedule</Button>
              <Button variant="secondary" onClick={() => setRescheduleModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && selectedAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">Confirm Appointment</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium">{selectedAppt.client_name}</p>
              <p className="text-gray-500">{selectedAppt.client_phone} · {selectedAppt.client_email}</p>
              {selectedAppt.presenting_issue && <p className="text-gray-600 mt-1 italic">"{selectedAppt.presenting_issue}"</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Confirmed Date</label>
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
              <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
              <textarea value={confirmForm.counselor_notes}
                onChange={e => setConfirmForm(f => ({ ...f, counselor_notes: e.target.value }))}
                rows={2} placeholder="Notes for records..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleConfirm('confirmed')} className="flex-1">✓ Confirm</Button>
              <Button onClick={() => handleConfirm('rescheduled')} variant="secondary" className="flex-1">Reschedule</Button>
              <Button onClick={() => setConfirmModal(false)} variant="secondary">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
