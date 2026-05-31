import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { TopBar } from '../../components/layout/TopBar.jsx';

const DAY_LABELS = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];

export default function KaunslorCalendarPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const start = startOfMonth(month).toISOString().slice(0, 10);
    const end = endOfMonth(month).toISOString().slice(0, 10);
    Promise.all([
      supabase.from('sessions').select('id, created_at, subject_name, duration, subject_id')
        .eq('user_id', user.id)
        .gte('created_at', start).lte('created_at', end + 'T23:59:59'),
      supabase.from('appointments').select('id, client_name, confirmed_date, confirmed_time, status, subject_id')
        .eq('counselor_id', user.id)
        .gte('confirmed_date', start).lte('confirmed_date', end)
        .in('status', ['confirmed', 'completed', 'rescheduled']),
    ]).then(([{ data: s }, { data: a }]) => {
      setSessions(s || []);
      setAppointments(a || []);
    }).finally(() => setLoading(false));
  }, [user, month]);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstDayOffset = getDay(startOfMonth(month));

  const eventsOnDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const daySessions = sessions.filter(s => s.created_at.slice(0, 10) === dayStr);
    const dayAppts = appointments.filter(a => a.confirmed_date === dayStr);
    return { sessions: daySessions, appointments: dayAppts };
  };

  const selectedEvents = selected ? eventsOnDay(selected) : null;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Kalendar" />
      <div className="flex-1 overflow-auto p-4 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Month navigation */}
          <div className="flex items-center justify-between bg-white rounded-xl border px-4 py-3">
            <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="font-bold text-gray-900">{format(month, 'MMMM yyyy')}</h2>
            <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Sesi</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />Temujanji</span>
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="grid grid-cols-7 border-b">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
              ))}
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="border-b border-r border-gray-50 min-h-[64px]" />
                ))}
                {days.map(day => {
                  const { sessions: ds, appointments: da } = eventsOnDay(day);
                  const hasEvents = ds.length > 0 || da.length > 0;
                  const isSelected = selected && isSameDay(day, selected);
                  const todayDay = isToday(day);
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelected(isSelected ? null : day)}
                      className={`border-b border-r border-gray-50 min-h-[64px] p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : hasEvents ? 'hover:bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${todayDay ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {ds.slice(0, 1).map(s => (
                          <div key={s.id} className="w-full bg-blue-100 text-blue-700 text-[9px] rounded px-1 truncate">{s.subject_name}</div>
                        ))}
                        {da.slice(0, 1).map(a => (
                          <div key={a.id} className="w-full bg-emerald-100 text-emerald-700 text-[9px] rounded px-1 truncate">{a.client_name}</div>
                        ))}
                        {(ds.length + da.length > 2) && (
                          <div className="text-[9px] text-gray-400">+{ds.length + da.length - 2} lagi</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected day detail */}
          {selected && selectedEvents && (selectedEvents.sessions.length > 0 || selectedEvents.appointments.length > 0) && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">{format(selected, 'dd MMMM yyyy')}</h3>
              {selectedEvents.sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.subject_name}</p>
                      <p className="text-xs text-gray-400">Sesi · {Math.round((s.duration || 0) / 60)} min</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/session/${s.id}`)} className="text-xs text-blue-600 font-medium hover:underline">Buka →</button>
                </div>
              ))}
              {selectedEvents.appointments.map(a => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.client_name}</p>
                      <p className="text-xs text-gray-400">Temujanji · {a.confirmed_time || '—'}</p>
                    </div>
                  </div>
                  {a.subject_id && (
                    <button onClick={() => navigate(`/kaunselor/clients/${a.subject_id}`)} className="text-xs text-emerald-600 font-medium hover:underline">Profil →</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {selected && selectedEvents && selectedEvents.sessions.length === 0 && selectedEvents.appointments.length === 0 && (
            <div className="bg-white rounded-xl border p-4 text-center text-gray-400 text-sm">
              Tiada aktiviti pada {format(selected, 'dd MMM yyyy')}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
