import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday, parseISO } from 'date-fns';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { getProfFromPath } from '../../lib/profConfig.js';
import { TopBar } from '../../components/layout/TopBar.jsx';

export default function ProfCalendarPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const prof = getProfFromPath(pathname);

  const [month, setMonth] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const start = startOfMonth(month).toISOString().slice(0, 10);
    const end   = endOfMonth(month).toISOString().slice(0, 10);
    Promise.all([
      supabase.from('sessions').select('id, subject_name, created_at, subject_id').eq('user_id', user.id).gte('created_at', start).lte('created_at', end + 'T23:59:59'),
      supabase.from('appointments').select('id, client_name, confirmed_date, confirmed_time, status, subject_id').eq('counselor_id', user.id).gte('confirmed_date', start).lte('confirmed_date', end).in('status', ['confirmed', 'completed', 'rescheduled']),
    ]).then(([{ data: s }, { data: a }]) => {
      setSessions(s || []);
      setAppointments(a || []);
    }).finally(() => setLoading(false));
  }, [user, month]);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = getDay(startOfMonth(month));

  const sessionsOnDay = (day) => sessions.filter(s => isSameDay(parseISO(s.created_at), day));
  const apptsOnDay    = (day) => appointments.filter(a => a.confirmed_date && isSameDay(parseISO(a.confirmed_date), day));

  const selectedSessions = selected ? sessionsOnDay(selected) : [];
  const selectedAppts    = selected ? apptsOnDay(selected) : [];

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Kalendar" />
      <div className="flex-1 overflow-auto p-4 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Month nav */}
          <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
            <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="font-semibold text-gray-900">{format(month, 'MMMM yyyy')}</h2>
            <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Sesi</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />{prof.appointmentLabel}</span>
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-50 border-b">
              {['Ahd','Isn','Sel','Rab','Kha','Jum','Sab'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} className="h-16 border-b border-r" />)}
              {days.map(day => {
                const s = sessionsOnDay(day);
                const a = apptsOnDay(day);
                const isSelected = selected && isSameDay(day, selected);
                return (
                  <button key={day.toISOString()} onClick={() => setSelected(isSelected ? null : day)}
                    className={`h-16 border-b border-r p-1 text-left hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${isToday(day) ? 'font-bold' : ''}`}>
                    <span className={`text-xs block mb-1 ${isToday(day) ? 'text-blue-600' : 'text-gray-700'}`}>{format(day, 'd')}</span>
                    <div className="flex flex-wrap gap-0.5">
                      {s.length > 0 && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      {a.length > 0 && <span className="w-2 h-2 rounded-full bg-green-500" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day details */}
          {selected && (selectedSessions.length > 0 || selectedAppts.length > 0) && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">{format(selected, 'dd MMMM yyyy')}</h3>
              {selectedSessions.map(s => (
                <button key={s.id} onClick={() => navigate(`/session/${s.id}`)}
                  className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-left hover:bg-blue-100 transition-colors">
                  <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                  <div><p className="text-sm font-medium text-blue-900">{s.subject_name || 'Tanpa nama'}</p><p className="text-xs text-blue-600">Sesi · Lihat laporan →</p></div>
                </button>
              ))}
              {selectedAppts.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">{a.client_name}</p>
                    <p className="text-xs text-green-600">{prof.appointmentLabel} · {a.confirmed_time?.slice(0,5) || ''}</p>
                  </div>
                  {a.subject_id && <button onClick={() => navigate(`${prof.routePrefix}/clients/${a.subject_id}`)} className="ml-auto text-xs text-green-700 hover:underline">Profil</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
