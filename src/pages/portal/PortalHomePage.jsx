import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { format, parseISO, isPast } from 'date-fns';
import toast from 'react-hot-toast';

export default function PortalHomePage() {
  const { user, signOut } = useAuthStore();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [homework, setHomework] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [resources, setResources] = useState([]);
  const [tab, setTab] = useState('overview');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [counselorPaymentUrl, setCounselorPaymentUrl] = useState('');
  const [rescheduleModal, setRescheduleModal] = useState(null); // appointment to reschedule
  const [rescheduleForm, setRescheduleForm] = useState({ preferred_date: '', preferred_time: '', reason: '' });
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [subjectIds, setSubjectIds] = useState([]);
  const [refreshingMessages, setRefreshingMessages] = useState(false);

  useEffect(() => {
    if (!user) return;
    linkAndLoad();
  }, [user]);

  const linkAndLoad = async () => {
    try {
      // Fetch all subjects: already linked OR matching email (unlinked)
      const [{ data: linked }, { data: byEmail }] = await Promise.all([
        supabase.from('subjects').select('*').eq('portal_user_id', user.id),
        supabase.from('subjects').select('*').eq('email', user.email).is('portal_user_id', null),
      ]);

      const allSubs = [...(linked || []), ...(byEmail || [])];

      if (allSubs.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Link portal_user_id on ALL unlinked subjects (handles multi-counselor case)
      if (byEmail?.length) {
        await Promise.all(byEmail.map(s =>
          supabase.from('subjects').update({ portal_user_id: user.id }).eq('id', s.id)
        ));
      }

      // Primary subject for profile display, messages, invoices (most recently updated)
      const primary = [...allSubs].sort((a, b) =>
        new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
      )[0];
      setSubject(primary);

      const ids = allSubs.map(s => s.id);
      setSubjectIds(ids);

      // Fetch all portal data across ALL subjects (client may be with multiple counselors)
      const [{ data: appts }, { data: hw }, { data: asmt }, { data: res }, { data: msgs }] = await Promise.all([
        supabase.from('appointments').select('*').in('subject_id', ids).order('created_at', { ascending: false }).limit(20),
        supabase.from('client_homework').select('*').in('subject_id', ids).order('created_at', { ascending: false }),
        supabase.from('client_assessments').select('*').in('subject_id', ids).order('assigned_at', { ascending: false }),
        supabase.from('client_resource_assignments').select('*, psychoed_resources(*)').in('subject_id', ids).order('assigned_at', { ascending: false }),
        supabase.from('portal_messages').select('*').in('subject_id', ids).order('created_at', { ascending: true }),
      ]);

      setAppointments(appts || []);
      setHomework(hw || []);
      setAssessments(asmt || []);
      setResources(res || []);
      setMessages(msgs || []);

      // Load invoices + counselor payment URL (all subjects)
      const [{ data: invData }, { data: profileData }] = await Promise.all([
        supabase.from('counselor_invoices').select('*').in('subject_id', ids).order('invoice_date', { ascending: false }).limit(20),
        supabase.from('counselor_profiles').select('payment_url').eq('user_id', primary.user_id).maybeSingle(),
      ]);
      setInvoices(invData || []);
      setCounselorPaymentUrl(profileData?.payment_url || '');
    } catch (err) {
      console.error('Portal load error:', err);
      toast.error('Failed to load your data.');
    } finally {
      setLoading(false);
    }
  };

  const refreshMessages = async () => {
    if (!subjectIds.length || refreshingMessages) return;
    setRefreshingMessages(true);
    const { data } = await supabase.from('portal_messages')
      .select('*').in('subject_id', subjectIds).order('created_at', { ascending: true });
    setMessages(data || []);
    setRefreshingMessages(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !subject) return;
    setSendingMessage(true);
    try {
      const { data, error } = await supabase.from('portal_messages').insert({
        subject_id: subject.id,
        user_id: subject.user_id,
        sender_role: 'client',
        message: newMessage.trim(),
      }).select().single();
      if (error) throw error;
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch { toast.error('Failed to send message.'); }
    finally { setSendingMessage(false); }
  };

  const handleRequestReschedule = async () => {
    if (!rescheduleModal || !subject) return;
    setSubmittingReschedule(true);
    try {
      const { error } = await supabase.from('reschedule_requests').insert({
        appointment_id: rescheduleModal.id,
        subject_id: subject.id,
        user_id: subject.user_id,
        preferred_date: rescheduleForm.preferred_date || null,
        preferred_time: rescheduleForm.preferred_time || null,
        reason: rescheduleForm.reason || null,
      });
      if (error) throw error;
      toast.success('Reschedule request sent to your counselor.');
      setRescheduleModal(null);
      setRescheduleForm({ preferred_date: '', preferred_time: '', reason: '' });
    } catch { toast.error('Failed to send request.'); }
    finally { setSubmittingReschedule(false); }
  };

  const markResourceViewed = async (r) => {
    if (r.viewed_at) return;
    await supabase.from('client_resource_assignments').update({ viewed_at: new Date().toISOString() }).eq('id', r.id);
    setResources(prev => prev.map(x => x.id === r.id ? { ...x, viewed_at: new Date().toISOString() } : x));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-violet-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Account Not Found</h2>
      <p className="text-sm text-gray-500 max-w-xs">We couldn't find a client account linked to <strong>{user?.email}</strong>. Please contact your counselor.</p>
      <button onClick={() => signOut()} className="mt-6 text-sm text-violet-600 hover:text-violet-800">Sign Out</button>
    </div>
  );

  const upcomingAppts = appointments.filter(a => a.status === 'confirmed' && !isPast(parseISO(a.confirmed_date || a.created_at)));
  const pendingHw = homework.filter(h => h.status === 'pending');
  const pendingAsmt = assessments.filter(a => a.status === 'pending' && new Date(a.expires_at) > new Date());

  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'draft');

  const TABS = [
    { id: 'overview',     label: 'Overview' },
    { id: 'appointments', label: `Appointments (${appointments.length})` },
    { id: 'homework',     label: `Tasks (${homework.length})` },
    { id: 'assessments',  label: `Assessments (${assessments.length})` },
    { id: 'resources',    label: `Resources (${resources.length})` },
    { id: 'messages',     label: 'Messages' },
    { id: 'invoices',     label: `Invoices${unpaidInvoices.length ? ` (${unpaidInvoices.length})` : ''}` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-7 h-7">
              <rect width="32" height="32" rx="8" fill="#8b5cf6"/>
              <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">{subject?.name}</p>
              <p className="text-xs text-violet-600">Client Portal</p>
            </div>
          </div>
          <button onClick={() => signOut()} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Sign Out</button>
        </div>

        {/* Tab bar */}
        <div className="max-w-2xl mx-auto px-4 pb-0 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Upcoming', upcomingAppts.length, 'violet'],
                ['Tasks Due', pendingHw.length, 'amber'],
                ['Assessments', assessments.length, 'blue'],
              ].map(([label, val, color]) => (
                <div key={label} className={`bg-${color}-50 rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-bold text-${color}-700`}>{val}</p>
                  <p className={`text-xs text-${color}-600 mt-0.5`}>{label}</p>
                </div>
              ))}
            </div>

            {/* Pending tasks */}
            {pendingHw.length > 0 && (
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">Tasks To Do</p>
                <div className="space-y-2">
                  {pendingHw.slice(0, 3).map(h => (
                    <div key={h.id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{h.title}</p>
                        {h.due_date && <p className="text-xs text-gray-400">Due {format(parseISO(h.due_date), 'dd MMM yyyy')}</p>}
                      </div>
                    </div>
                  ))}
                  {pendingHw.length > 3 && <p className="text-xs text-gray-400">+{pendingHw.length - 3} more</p>}
                </div>
              </div>
            )}

            {/* Assessments overview */}
            {assessments.length > 0 && (
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  {pendingAsmt.length > 0 ? 'Assessments Waiting' : 'Assessments'}
                </p>
                <div className="space-y-2">
                  {assessments.slice(0, 3).map(a => {
                    const isPending = a.status === 'pending' && new Date(a.expires_at) > new Date();
                    return isPending ? (
                      <a key={a.id} href={`${window.location.origin}/assess/${a.token}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-violet-50 transition-colors group">
                        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-xs font-bold text-violet-700 flex-shrink-0">
                          {a.test_type?.toUpperCase().slice(0,3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium truncate">{a.test_type?.toUpperCase()}</p>
                          <p className="text-xs text-violet-600 group-hover:underline">Take assessment →</p>
                        </div>
                      </a>
                    ) : (
                      <div key={a.id} className="flex items-center gap-3 p-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-xs font-bold text-green-700 flex-shrink-0">
                          {a.test_type?.toUpperCase().slice(0,3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium truncate">{a.test_type?.toUpperCase()}</p>
                          <p className="text-xs text-green-600">✓ Completed — view in Assessments tab</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Next appointment */}
            {upcomingAppts.length > 0 && (
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">Next Appointment</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {upcomingAppts[0].confirmed_date
                        ? format(parseISO(upcomingAppts[0].confirmed_date), 'EEEE, dd MMM yyyy')
                        : 'Date TBC'}
                    </p>
                    {upcomingAppts[0].confirmed_time && (
                      <p className="text-xs text-gray-500">{upcomingAppts[0].confirmed_time}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Appointments */}
        {tab === 'appointments' && (
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-sm">No appointments yet.</p>
              </div>
            ) : appointments.map(a => (
              <div key={a.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {a.confirmed_date ? format(parseISO(a.confirmed_date), 'EEEE, dd MMM yyyy') : 'Date TBC'}
                    </p>
                    {a.confirmed_time && <p className="text-xs text-gray-500">{a.confirmed_time}</p>}
                    {a.notes && <p className="text-xs text-gray-400 mt-1">{a.notes}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${
                    a.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    a.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                    'bg-amber-100 text-amber-700'
                  }`}>{a.status}</span>
                </div>
                {a.status === 'confirmed' && (
                  <button onClick={() => { setRescheduleModal(a); setRescheduleForm({ preferred_date: '', preferred_time: '', reason: '' }); }}
                    className="mt-3 w-full py-1.5 text-xs text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors">
                    Request Reschedule
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Homework */}
        {tab === 'homework' && (
          <div className="space-y-3">
            {homework.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-sm">No tasks assigned yet.</p>
              </div>
            ) : homework.map(h => (
              <div key={h.id} className={`bg-white rounded-xl border p-4 ${h.status === 'completed' ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${h.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                    {h.status === 'completed' && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${h.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{h.title}</p>
                    {h.description && <p className="text-xs text-gray-500 mt-0.5">{h.description}</p>}
                    {h.due_date && <p className="text-xs text-gray-400 mt-1">Due {format(parseISO(h.due_date), 'dd MMM yyyy')}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    h.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>{h.status === 'completed' ? 'Done' : 'Pending'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assessments */}
        {tab === 'assessments' && (
          <div className="space-y-3">
            {assessments.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-sm">No assessments assigned yet.</p>
              </div>
            ) : assessments.map(a => {
              const expired = new Date(a.expires_at) < new Date();
              const link = `${window.location.origin}/assess/${a.token}`;
              let interp = null;
              try { interp = typeof a.interpretation === 'string' ? JSON.parse(a.interpretation) : a.interpretation; } catch {}
              const scoreColor = {
                green: 'bg-green-50 border-green-200 text-green-800',
                yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                orange: 'bg-orange-50 border-orange-200 text-orange-800',
                red: 'bg-red-50 border-red-200 text-red-800',
              }[interp?.color] || 'bg-gray-50 border-gray-200 text-gray-700';
              return (
                <div key={a.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{a.test_type?.toUpperCase()}</p>
                      <p className="text-xs text-gray-400">Assigned {format(parseISO(a.assigned_at), 'dd MMM yyyy')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      a.status === 'completed' ? 'bg-green-100 text-green-700' :
                      expired ? 'bg-gray-100 text-gray-500' :
                      'bg-amber-100 text-amber-700'
                    }`}>{a.status === 'completed' ? 'Completed' : expired ? 'Expired' : 'Pending'}</span>
                  </div>

                  {/* Completed: show score + interpretation */}
                  {a.status === 'completed' && a.scores && (
                    <div className={`mt-2 rounded-lg border px-4 py-3 ${scoreColor}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Your Result</span>
                        {a.scores.total !== undefined && (
                          <span className="text-lg font-bold">Score: {a.scores.total}</span>
                        )}
                      </div>
                      {interp?.level && <p className="text-sm font-semibold">{interp.level}</p>}
                      {interp?.note && <p className="text-xs mt-0.5 opacity-80">{interp.note}</p>}
                      {a.completed_at && (
                        <p className="text-xs mt-2 opacity-60">Completed {format(parseISO(a.completed_at), 'dd MMM yyyy, h:mm a')}</p>
                      )}
                    </div>
                  )}

                  {a.status === 'pending' && !expired && (
                    <a href={link} target="_blank" rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                      Take Assessment →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Resources */}
        {tab === 'resources' && (
          <div className="space-y-3">
            {resources.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-sm">No resources assigned yet.</p>
              </div>
            ) : resources.map(r => {
              const res = r.psychoed_resources;
              return (
                <div key={r.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full font-medium">{res?.category}</span>
                        {r.viewed_at && <span className="text-xs text-green-600 font-medium">✓ Viewed</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{res?.title}</p>
                      {res?.description && <p className="text-xs text-gray-500 mt-0.5">{res.description}</p>}
                    </div>
                  </div>
                  {res?.url && (
                    <a href={res.url} target="_blank" rel="noopener noreferrer"
                      onClick={() => markResourceViewed(r)}
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-violet-300 text-violet-700 text-sm font-semibold hover:bg-violet-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open Resource
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Messages */}
        {tab === 'messages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Messages with your counselor</p>
              <button onClick={refreshMessages} disabled={refreshingMessages}
                className="text-xs text-violet-600 hover:text-violet-800 font-medium disabled:opacity-40">
                {refreshingMessages ? 'Refreshing…' : '↻ Refresh'}
              </button>
            </div>
            <div className="bg-white rounded-xl border p-4 min-h-48 max-h-96 overflow-y-auto flex flex-col space-y-3">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="text-sm">No messages yet.</p>
                </div>
              ) : messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_role === 'client' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.sender_role === 'client' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    <p className="text-xs font-semibold opacity-60 mb-0.5">{m.sender_role === 'client' ? 'You' : 'Counselor'}</p>
                    <p className="text-sm leading-relaxed">{m.message}</p>
                    <p className="text-[10px] mt-1 opacity-50 text-right">{format(new Date(m.created_at), 'dd MMM, HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                rows={2}
                placeholder="Message your counselor..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
              <button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}
                className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 self-end">
                {sendingMessage ? '...' : 'Send'}
              </button>
            </div>
          </div>
        )}

        {/* Invoices */}
        {tab === 'invoices' && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">🧾</div>
                <p className="text-sm">No invoices yet.</p>
              </div>
            ) : invoices.map(inv => {
              const subtotal = (inv.line_items || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);
              const tax = subtotal * ((Number(inv.tax_rate) || 0) / 100);
              const total = subtotal + tax;
              return (
                <div key={inv.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400">{inv.invoice_date ? format(parseISO(inv.invoice_date), 'dd MMM yyyy') : '—'}</p>
                      {inv.line_items?.map((l, i) => (
                        <p key={i} className="text-xs text-gray-600 mt-1">{l.description} × {l.qty}</p>
                      ))}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">RM {total.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                        inv.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>{inv.status}</span>
                    </div>
                  </div>
                  {(inv.status === 'sent' || inv.status === 'draft') && counselorPaymentUrl && (
                    <a href={counselorPaymentUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                      Pay Now →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Reschedule modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Request Reschedule</h3>
            <p className="text-xs text-gray-500">Let your counselor know your preferred date and time.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preferred Date</label>
                <input type="date" value={rescheduleForm.preferred_date} onChange={e => setRescheduleForm(f => ({ ...f, preferred_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preferred Time</label>
                <input type="time" value={rescheduleForm.preferred_time} onChange={e => setRescheduleForm(f => ({ ...f, preferred_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Reason (optional)</label>
                <textarea value={rescheduleForm.reason} onChange={e => setRescheduleForm(f => ({ ...f, reason: e.target.value }))}
                  rows={2} placeholder="e.g. Work conflict..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleRequestReschedule} disabled={submittingReschedule}
                className="flex-1 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-40">
                {submittingReschedule ? 'Sending...' : 'Send Request'}
              </button>
              <button onClick={() => setRescheduleModal(null)}
                className="flex-1 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
