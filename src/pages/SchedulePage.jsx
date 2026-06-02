import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { supabase } from '../lib/supabase.js';
import { PROFESSIONS, professionLabel } from '../data/professions.js';
import { isCounselorSubdomain } from '../lib/subdomain.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  upcoming:  { label: 'Upcoming',   color: 'blue' },
  completed: { label: 'Done',       color: 'green' },
  cancelled: { label: 'Cancelled',  color: 'gray' },
};

function dateLabel(dt) {
  const d = new Date(dt);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'dd MMM yyyy');
}

async function fetchScheduled(userId) {
  const { data, error } = await supabase
    .from('scheduled_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at');
  if (error) throw error;
  return data || [];
}

const BLANK = { id: null, title: '', profession: 'counselor', subject_name: '', scheduled_at: '', notes: '' };

export default function SchedulePage() {
  const { user } = useAuthStore();
  const { canStartSession } = useBillingStore();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('upcoming'); // upcoming | past

  useEffect(() => {
    if (!user) return;
    fetchScheduled(user.id)
      .then(setItems)
      .catch(() => toast.error('Failed to load schedule'))
      .finally(() => setLoading(false));
  }, [user]);

  const upcoming = useMemo(() => items.filter(i => i.status === 'upcoming' && !isPast(new Date(i.scheduled_at))), [items]);
  const overdue  = useMemo(() => items.filter(i => i.status === 'upcoming' && isPast(new Date(i.scheduled_at))), [items]);
  const past     = useMemo(() => items.filter(i => i.status !== 'upcoming'), [items]);

  const openNew = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30));
    const pad = n => String(n).padStart(2, '0');
    const dt = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setForm({ ...BLANK, scheduled_at: dt });
    setModal(true);
  };

  const openEdit = (item) => {
    const dt = item.scheduled_at.slice(0, 16);
    setForm({ id: item.id, title: item.title, profession: item.profession, subject_name: item.subject_name || '', scheduled_at: dt, notes: item.notes || '' });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    if (!form.scheduled_at)  { toast.error('Date & time required.'); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        profession: form.profession,
        subject_name: form.subject_name.trim() || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        notes: form.notes.trim() || null,
        status: 'upcoming',
      };

      if (form.id) {
        const { data, error } = await supabase
          .from('scheduled_sessions')
          .update(payload)
          .eq('id', form.id)
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        setItems(prev => prev.map(i => i.id === form.id ? data : i));
        toast.success('Schedule updated.');
      } else {
        const { data, error } = await supabase
          .from('scheduled_sessions')
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        setItems(prev => [...prev, data]);
        toast.success('Session scheduled.');
      }
      setModal(false);
    } catch {
      toast.error('Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this scheduled session?')) return;
    try {
      await supabase.from('scheduled_sessions').update({ status: 'cancelled' }).eq('id', id).eq('user_id', user.id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' } : i));
      toast.success('Session cancelled.');
    } catch {
      toast.error('Failed to cancel session.');
    }
  };

  const pricingTarget = isCounselorSubdomain() ? '/pricing?tab=kaunselor' : '/pricing';

  const handleStart = (item) => {
    if (!canStartSession()) { navigate(pricingTarget); return; }
    // Write prefill to sessionStorage — SessionSetupPage reads 'session_setup' on init
    sessionStorage.setItem('session_setup', JSON.stringify({
      title: item.title,
      subject_name: item.subject_name || '',
      profession: item.profession,
      scheduled_id: item.id,
    }));
    navigate('/session/setup');
  };

  function ScheduleCard({ item, showStart = false }) {
    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.upcoming;
    const isOverdueItem = item.status === 'upcoming' && isPast(new Date(item.scheduled_at));
    return (
      <div className={`bg-white rounded-xl border p-4 ${isOverdueItem ? 'border-amber-300 bg-amber-50/40' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
              <Badge color="blue" className="text-xs">{professionLabel(item.profession)}</Badge>
              {item.status !== 'upcoming' && <Badge color={sc.color} className="text-xs">{sc.label}</Badge>}
              {isOverdueItem && <Badge color="yellow" className="text-xs">Overdue</Badge>}
            </div>
            {item.subject_name && <p className="text-sm text-gray-500">{item.subject_name}</p>}
            <div className="flex items-center gap-1.5 mt-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-500">
                {dateLabel(item.scheduled_at)} · {format(new Date(item.scheduled_at), 'HH:mm')}
              </span>
              {item.status === 'upcoming' && (
                <span className="text-xs text-gray-400">
                  ({formatDistanceToNow(new Date(item.scheduled_at), { addSuffix: true })})
                </span>
              )}
            </div>
            {item.notes && <p className="text-xs text-gray-400 mt-1 truncate">{item.notes}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {showStart && item.status === 'upcoming' && (
              <Button size="sm" onClick={() => handleStart(item)}>
                Start
              </Button>
            )}
            {item.status === 'upcoming' && (
              <>
                <button
                  onClick={() => openEdit(item)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleCancel(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title="Session Schedule"
        actions={
          <Button onClick={openNew}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Schedule Session</span>
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {[{ id: 'upcoming', label: `Upcoming (${upcoming.length + overdue.length})` }, { id: 'past', label: `Done / Cancel (${past.length})` }].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : tab === 'upcoming' ? (
            upcoming.length === 0 && overdue.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scheduled Sessions</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">Schedule upcoming sessions so you never miss an appointment.</p>
                <Button onClick={openNew}>Schedule First Session</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {overdue.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Overdue — Not Started</h3>
                    <div className="space-y-3">
                      {overdue.map(i => <ScheduleCard key={i.id} item={i} showStart />)}
                    </div>
                  </div>
                )}
                {upcoming.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h3>
                    <div className="space-y-3">
                      {upcoming.map(i => <ScheduleCard key={i.id} item={i} showStart />)}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            past.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-16">No completed or cancelled sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {past.map(i => <ScheduleCard key={i.id} item={i} />)}
              </div>
            )
          )}
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form.id ? 'Edit Schedule' : 'Schedule New Session'}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Counseling Session — Ahmad"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
            <select
              value={form.profession}
              onChange={e => setForm(p => ({ ...p, profession: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
            <input
              type="text"
              value={form.subject_name}
              onChange={e => setForm(p => ({ ...p, subject_name: e.target.value }))}
              placeholder="e.g. Ahmad bin Ali"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
