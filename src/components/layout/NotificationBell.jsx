import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { getSessions } from '../../api/sessions.js';
import { supabase } from '../../lib/supabase.js';
import { isCounselorSubdomain } from '../../lib/subdomain.js';
import { format } from 'date-fns';

const TYPE_CONFIG = {
  overdue:     { icon: '⚠️', bg: 'bg-red-50',    dot: 'bg-red-500',    label: 'Overdue' },
  soon:        { icon: '⏰', bg: 'bg-amber-50',   dot: 'bg-amber-400',  label: 'Due Soon' },
  appointment: { icon: '📅', bg: 'bg-blue-50',    dot: 'bg-blue-500',   label: 'Appointment' },
};

export function NotificationBell() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const build = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const notifs = [];
    const today = new Date().toISOString().split('T')[0];
    const in2days = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

    try {
      const sessions = await getSessions(user.id);
      for (const s of sessions) {
        if (!s.report?.followUpItems?.length) continue;
        const checked = (() => { try { return JSON.parse(localStorage.getItem(`followup_${s.id}`) || '{}'); } catch { return {}; } })();
        const deadlines = (() => { try { return JSON.parse(localStorage.getItem(`followup_deadlines_${s.id}`) || '{}'); } catch { return {}; } })();
        s.report.followUpItems.forEach((item, i) => {
          if (checked[i] || !deadlines[i]) return;
          const isOverdue = deadlines[i] < today;
          const isSoon = !isOverdue && deadlines[i] <= in2days;
          if (isOverdue || isSoon) {
            notifs.push({
              id: `followup_${s.id}_${i}`,
              type: isOverdue ? 'overdue' : 'soon',
              title: isOverdue ? 'Overdue Follow-up' : 'Follow-up Due Soon',
              body: item,
              sub: s.title || 'Session',
              date: deadlines[i],
              link: `/session/${s.id}/report`,
            });
          }
        });
      }
    } catch { /* silent */ }

    if (isCounselorSubdomain()) {
      try {
        const { data } = await supabase
          .from('appointments')
          .select('id, client_name, requested_date, requested_time')
          .eq('counselor_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);
        for (const a of (data || [])) {
          notifs.push({
            id: `appt_${a.id}`,
            type: 'appointment',
            title: 'New Appointment Request',
            body: a.client_name,
            sub: a.requested_date ? `${a.requested_date} · ${a.requested_time || ''}` : 'Date TBD',
            link: '/kaunselor/appointments',
          });
        }
      } catch { /* silent */ }
    }

    notifs.sort((a, b) => {
      const order = { overdue: 0, appointment: 1, soon: 2 };
      return (order[a.type] ?? 3) - (order[b.type] ?? 3);
    });

    setNotifications(notifs);
    setLoading(false);
  }, [user]);

  useEffect(() => { build(); }, [build]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const count = notifications.length;

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) build(); }}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {count > 0 && (
              <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">{count} new</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : count === 0 ? (
              <div className="py-8 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm text-gray-400">All caught up!</p>
                <p className="text-xs text-gray-300 mt-1">No pending notifications</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.soon;
                return (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); navigate(n.link); }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${cfg.bg}`}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{cfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      </div>
                      <p className="text-xs text-gray-600 truncate">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {n.sub}{n.date ? ` · ${format(new Date(n.date + 'T00:00:00'), 'dd MMM')}` : ''}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {count > 0 && (
            <div className="px-4 py-2 border-t bg-gray-50">
              <p className="text-xs text-gray-400 text-center">Click a notification to go to the relevant page</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
