import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getCounselorByCode, getBookedTimes, submitAppointment, DAYS_MS } from '../api/counselor.js';
import { format, addDays, startOfToday, parseISO } from 'date-fns';

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8">
    <rect width="32" height="32" rx="8" fill="#8b5cf6"/>
    <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

function generateSlotTimes(slots, dayOfWeek, duration) {
  const daySlots = slots.filter(s => s.day === dayOfWeek);
  const times = [];
  daySlots.forEach(slot => {
    const [sh, sm] = slot.start.split(':').map(Number);
    const [eh, em] = slot.end.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + duration <= end) {
      const h = Math.floor(cur / 60).toString().padStart(2, '0');
      const m = (cur % 60).toString().padStart(2, '0');
      times.push(`${h}:${m}`);
      cur += duration;
    }
  });
  return times;
}

export default function PublicBookingPage() {
  const { code } = useParams();
  const [counselor, setCounselor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: pick date/time, 2: fill details, 3: consent, 4: done
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedTimes, setBookedTimes] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', ic: '', student_id: '', dobDay: '', dobMonth: '', dobYear: '', gender: '', address: '', issue: '', session_type: 'voluntary', previous_counseling: '', psychiatric_history: '', psychiatric_medication: '' });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [honeypot, setHoneypot] = useState(''); // bot trap — should always be empty
  const pageLoadTime = useState(() => Date.now())[0];

  useEffect(() => {
    getCounselorByCode(code)
      .then(data => {
        if (!data) { setError('Invalid booking link.'); return; }
        if (!data.is_accepting) { setError('This counselor is not accepting appointments at this time.'); return; }
        setCounselor(data);
      })
      .catch(() => setError('Failed to load counselor information.'))
      .finally(() => setLoading(false));
  }, [code]);

  const availableDays = counselor ? [...new Set(counselor.slots.map(s => s.day))] : [];

  const next14Days = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(startOfToday(), i + 1);
    return { date: format(d, 'yyyy-MM-dd'), dayOfWeek: d.getDay(), label: format(d, 'dd MMM'), dayLabel: DAYS_MS[d.getDay()] };
  }).filter(d => availableDays.includes(d.dayOfWeek)).slice(0, 14);

  const handleDateSelect = async (dateStr, dayOfWeek) => {
    setSelectedDate(dateStr);
    setSelectedTime('');
    if (counselor) {
      const booked = await getBookedTimes(counselor.user_id, dateStr).catch(() => []);
      setBookedTimes(booked.map(t => t?.slice(0, 5)));
    }
  };

  const availableTimes = counselor && selectedDate
    ? generateSlotTimes(counselor.slots, next14Days.find(d => d.date === selectedDate)?.dayOfWeek ?? -1, counselor.duration)
        .filter(t => !bookedTimes.includes(t))
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) return;
    // Honeypot check — bots fill hidden fields, humans don't
    if (honeypot) return;
    // Minimum time check — humans take at least 5 seconds to fill a form
    if (Date.now() - pageLoadTime < 5000) return;
    setSubmitting(true);
    try {
      const res = await submitAppointment(code, { ...form, date: selectedDate, time: selectedTime, consent });
      setResult(res);
      // Fire-and-forget email to counselor
      if (res?.appointment_id) {
        fetch(`/api/user-notifications?type=new-appointment&appointment_id=${res.appointment_id}`, {
          method: 'POST',
        }).catch(() => {});
      }
      setStep(4);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('rate_limit_exceeded')) {
        alert('Too many booking requests. Please try again after one hour.');
      } else {
        alert('Failed to submit booking. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-violet-400 text-sm">Loading...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{error}</h2>
        <p className="text-sm text-gray-500">Please contact your counselor directly.</p>
      </div>
    </div>
  );

  if (step === 4) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Submitted!</h2>
        <p className="text-gray-500 text-sm mb-5">Your appointment request has been sent to <strong className="text-gray-800">{counselor?.display_name}</strong>.</p>
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 text-left mb-5 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-violet-500">📅</span>
            <span className="text-gray-700"><strong>{format(parseISO(selectedDate), 'EEEE, dd MMM yyyy')}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-violet-500">🕐</span>
            <span className="text-gray-700"><strong>{selectedTime}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-violet-500">👤</span>
            <span className="text-gray-700">{counselor?.display_name}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">The counselor will confirm your appointment shortly. Check your email for updates.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Dark top header */}
      <div className="bg-gray-950 px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0">
            <rect width="32" height="32" rx="8" fill="#8b5cf6"/>
            <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <div>
            <span className="font-bold text-white text-sm">Kaunselor</span>
            <p className="text-xs text-violet-400 leading-none">Appointment Booking</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12">
        {/* White card area */}
        <div className="bg-white rounded-t-3xl -mt-2 pt-1 min-h-screen">

        {/* Counselor card */}
        <div className="p-4 pt-5 mb-2">
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 mb-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xl flex-shrink-0">
              {counselor?.display_name?.charAt(0) || 'C'}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{counselor?.display_name}</h2>
              {counselor?.klinik_name && <p className="text-sm text-violet-600">{counselor.klinik_name}</p>}
              {counselor?.registration_number && <p className="text-xs text-gray-400">Registration No.: {counselor.registration_number}</p>}
            </div>
          </div>
          {counselor?.credentials?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {counselor.credentials.map(c => (
                <span key={c} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
          )}
          {counselor?.specializations?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {counselor.specializations.map(s => (
                <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}
          {counselor?.bio && <p className="text-sm text-gray-600 mb-2">{counselor.bio}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
            <span>⏱ {counselor?.duration || 60} min/session</span>
            {counselor?.klinik_address && <span>📍 {counselor.klinik_address}</span>}
          </div>
        </div>
        </div>{/* end counselor card wrapper */}

        <div className="px-4">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-5">
          {['Date & Time', 'Details', 'Consent'].map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${step === i + 1 ? 'text-violet-600 font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Date & Time ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Select Date</h3>
              {next14Days.length === 0 ? (
                <p className="text-gray-400 text-sm">No slots available at this time.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {next14Days.map(d => (
                    <button key={d.date} onClick={() => handleDateSelect(d.date, d.dayOfWeek)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${selectedDate === d.date ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-xs text-gray-400">{d.dayLabel}</div>
                      <div className="text-sm font-semibold text-gray-900">{d.label}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedDate && (
              <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Select Time</h3>
                {availableTimes.length === 0 ? (
                  <p className="text-gray-400 text-sm">No slots available on this date.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimes.map(t => (
                      <button key={t} onClick={() => setSelectedTime(t)}
                        className={`py-2 rounded-xl border text-sm font-medium transition-all ${selectedTime === t ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setStep(2)} disabled={!selectedDate || !selectedTime}
              className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors">
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2: Client Details ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Your Information</h3>
              <button onClick={() => setStep(1)} className="text-sm text-violet-600">← Change Date</button>
            </div>
            <div className="bg-violet-50 rounded-xl p-3 text-sm text-violet-800">
              📅 {format(parseISO(selectedDate), 'dd MMM yyyy')} · 🕐 {selectedTime}
            </div>
            {/* Basic info */}
            {[
              { k: 'name',       label: 'Full Name *',                              type: 'text',  placeholder: 'Name as in IC', required: true },
              { k: 'phone',      label: 'Phone Number *',                           type: 'tel',   placeholder: '01X-XXXXXXX', required: true },
              { k: 'email',      label: 'Email',                                    type: 'email', placeholder: 'email@example.com' },
              { k: 'ic',         label: 'IC / Passport Number',                    type: 'text',  placeholder: '000101-10-0000' },
              { k: 'student_id', label: 'Matric / Student ID / Staff ID',           type: 'text',  placeholder: 'e.g. A12345 / EMP0012' },
              { k: 'address',    label: 'Address',                                  type: 'text',  placeholder: 'Your address' },
            ].map(f => (
              <div key={f.k}>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{f.label}</label>
                <input type={f.type} value={form[f.k]} onChange={set(f.k)} placeholder={f.placeholder} required={f.required}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            ))}

            {/* DOB — 3 dropdowns */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date of Birth</label>
              <div className="grid grid-cols-3 gap-2">
                <select value={form.dobDay} onChange={set('dobDay')} className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d).padStart(2,'0')}>{d}</option>)}
                </select>
                <select value={form.dobMonth} onChange={set('dobMonth')} className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                  <option value="">Month</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => (
                    <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>
                  ))}
                </select>
                <select value={form.dobYear} onChange={set('dobYear')} className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                  <option value="">Year</option>
                  {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - 10 - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Session type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Session Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[['voluntary','Voluntary'],['referred','Referred']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, session_type: v }))}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${form.session_type === v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Previous counseling */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Have you received counseling before?</label>
              <div className="grid grid-cols-2 gap-2">
                {[['ya','Yes'],['tidak','No']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, previous_counseling: v }))}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${form.previous_counseling === v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Psychiatric history */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Do you have a psychiatric history?</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[['ya','Yes'],['tidak','No']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, psychiatric_history: v === 'tidak' ? 'tidak' : 'ya' }))}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${(form.psychiatric_history === 'tidak' ? 'tidak' : form.psychiatric_history ? 'ya' : '') === v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {form.psychiatric_history !== 'tidak' && form.psychiatric_history !== '' && (
                <textarea value={form.psychiatric_history === 'ya' ? '' : form.psychiatric_history}
                  onChange={e => setForm(f => ({ ...f, psychiatric_history: e.target.value || 'ya' }))} rows={2}
                  placeholder="State the diagnosis / treatment received..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              )}
            </div>

            {/* Psychiatric medication */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Are you currently taking psychiatric medication?</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[['ya','Yes'],['tidak','No']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, psychiatric_medication: v === 'tidak' ? 'tidak' : 'ya' }))}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${(form.psychiatric_medication === 'tidak' ? 'tidak' : form.psychiatric_medication ? 'ya' : '') === v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {form.psychiatric_medication !== 'tidak' && form.psychiatric_medication !== '' && (
                <textarea value={form.psychiatric_medication === 'ya' ? '' : form.psychiatric_medication}
                  onChange={e => setForm(f => ({ ...f, psychiatric_medication: e.target.value || 'ya' }))} rows={2}
                  placeholder="State the medication name and dosage..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              )}
            </div>

            {/* Presenting issue */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Reason / Presenting Issue</label>
              <textarea value={form.issue} onChange={set('issue')} rows={3}
                placeholder="Briefly state why you would like to see a counselor..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
            </div>
            <button onClick={() => { if (!form.name || !form.phone) { alert('Please fill in your name and phone number.'); return; } setStep(3); }}
              className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors">
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 3: Consent ── */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-5 space-y-4">
            {/* Honeypot — hidden from humans, filled by bots */}
            <input
              type="text" name="website" value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              style={{ display: 'none' }} tabIndex={-1} autoComplete="off"
              aria-hidden="true"
            />
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Client Consent</h3>
              <button type="button" onClick={() => setStep(2)} className="text-sm text-violet-600">← Back</button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3 max-h-64 overflow-auto leading-relaxed">
              <p className="font-bold text-gray-900">INFORMED CONSENT FORM</p>
              <p className="text-xs text-gray-500 italic">This is a legal document. Please read carefully before signing.</p>

              <p><strong>Counseling</strong> is a professional relationship between you and the counselor. The primary goal is to facilitate behavioral change, enhance relationship-building capacity, improve coping effectiveness, encourage decision-making processes, and facilitate personal potential and development.</p>

              <p><strong>Session Duration:</strong> Individual counseling sessions are 45–60 minutes. However, sessions may be longer or shorter depending on your discussion with the counselor.</p>

              <p><strong>Confidentiality:</strong> The counselor is responsible for keeping all information obtained during counseling sessions confidential. All your identification, assessment, and treatment information is kept private, except in the following situations:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                <li>If the counselor has reasonable grounds to believe you will harm others</li>
                <li>If the counselor has reasonable grounds to believe you are abusing or neglecting a child or vulnerable adult</li>
                <li>If the counselor believes you are in immediate danger of harming yourself</li>
                <li>If required by a court for legal proceedings</li>
                <li>For referred cases, a brief report may be provided to the referrer if required</li>
              </ul>

              <p><strong>Psychological Testing:</strong> If psychological testing is used, any psychological test assessment results are not for diagnosis and may not be used for purposes other than this counseling session.</p>

              <p><strong>Client Rights:</strong> You have the right to ask about anything that happens in counseling sessions. You may request the counselor to refer you to another counselor or professional. You are also free to leave the counseling session at any time.</p>

              <p className="text-xs text-gray-500">Sessions may be recorded for documentation and professional report purposes using AI technology. Recordings are stored securely and protected under the Personal Data Protection Act 2010 (PDPA).</p>
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="consent" checked={consent} onChange={e => setConsent(e.target.checked)}
                className="w-5 h-5 text-violet-600 rounded mt-0.5 flex-shrink-0" required />
              <label htmlFor="consent" className="text-sm text-gray-700">
                I have read and <strong>agree</strong> to the terms above. I understand my rights and responsibilities as a client.
              </label>
            </div>
            <div className="bg-violet-50 rounded-xl p-3 text-xs text-violet-700">
              <strong>Booking summary:</strong> {form.name} · {format(parseISO(selectedDate), 'dd MMM yyyy')} at {selectedTime}
            </div>
            <button type="submit" disabled={!consent || submitting}
              className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors">
              {submitting ? 'Submitting...' : '✓ Submit Booking'}
            </button>
          </form>
        )}
        </div>{/* end px-4 wrapper */}
        </div>{/* end white card */}
      </div>{/* end max-w-lg */}
    </div>
  );
}
