import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getCounselorByCode, getBookedTimes, submitAppointment, DAYS_MS } from '../api/counselor.js';
import { format, addDays, startOfToday, parseISO } from 'date-fns';

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8">
    <rect width="32" height="32" rx="8" fill="#2563eb"/>
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
  const [form, setForm] = useState({ name: '', email: '', phone: '', ic: '', dob: '', address: '', issue: '' });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getCounselorByCode(code)
      .then(data => {
        if (!data) { setError('Pautan tempahan tidak sah.'); return; }
        if (!data.is_accepting) { setError('Kaunselor ini tidak menerima temujanji buat masa ini.'); return; }
        setCounselor(data);
      })
      .catch(() => setError('Gagal memuatkan maklumat kaunselor.'))
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
    setSubmitting(true);
    try {
      const res = await submitAppointment(code, { ...form, date: selectedDate, time: selectedTime, consent });
      setResult(res);
      setStep(4);
    } catch (err) {
      alert('Gagal menghantar tempahan. Sila cuba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-semibold text-gray-900">{error}</h2>
        <p className="text-sm text-gray-500 mt-2">Sila hubungi kaunselor anda secara terus.</p>
      </div>
    </div>
  );

  if (step === 4) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tempahan Dihantar!</h2>
        <p className="text-gray-600 text-sm mb-4">
          Tempahan anda dengan <strong>{counselor?.display_name}</strong> pada <strong>{format(parseISO(selectedDate), 'dd MMM yyyy')}</strong> pukul <strong>{selectedTime}</strong> telah dihantar.
        </p>
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
          Kaunselor akan mengesahkan temujanji anda dalam masa terdekat. Anda akan menerima notifikasi melalui e-mel.
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-4 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 py-5">
          <Logo />
          <div>
            <p className="text-xs text-gray-400">VeriRec</p>
            <h1 className="font-bold text-gray-900">Tempahan Temujanji</h1>
          </div>
        </div>

        {/* Counselor card */}
        <div className="bg-white rounded-2xl border p-5 mb-4">
          <h2 className="font-bold text-gray-900 text-lg">{counselor?.display_name}</h2>
          {counselor?.klinik_name && <p className="text-sm text-blue-600">{counselor.klinik_name}</p>}
          {counselor?.credentials?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {counselor.credentials.map(c => (
                <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
          )}
          {counselor?.bio && <p className="text-sm text-gray-500 mt-2">{counselor.bio}</p>}
          <p className="text-xs text-gray-400 mt-2">⏱ Tempoh sesi: {counselor?.duration} minit</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-5">
          {['Tarikh & Masa', 'Maklumat', 'Persetujuan'].map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${step === i + 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Date & Time ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Pilih Tarikh</h3>
              {next14Days.length === 0 ? (
                <p className="text-gray-400 text-sm">Tiada slot tersedia buat masa ini.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {next14Days.map(d => (
                    <button key={d.date} onClick={() => handleDateSelect(d.date, d.dayOfWeek)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${selectedDate === d.date ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-xs text-gray-400">{d.dayLabel}</div>
                      <div className="text-sm font-semibold text-gray-900">{d.label}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedDate && (
              <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Pilih Masa</h3>
                {availableTimes.length === 0 ? (
                  <p className="text-gray-400 text-sm">Tiada slot tersedia pada tarikh ini.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimes.map(t => (
                      <button key={t} onClick={() => setSelectedTime(t)}
                        className={`py-2 rounded-xl border text-sm font-medium transition-all ${selectedTime === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setStep(2)} disabled={!selectedDate || !selectedTime}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors">
              Teruskan →
            </button>
          </div>
        )}

        {/* ── STEP 2: Client Details ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Maklumat Anda</h3>
              <button onClick={() => setStep(1)} className="text-sm text-blue-600">← Ubah Tarikh</button>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
              📅 {format(parseISO(selectedDate), 'dd MMM yyyy')} · 🕐 {selectedTime}
            </div>
            {[
              { k: 'name', label: 'Nama Penuh *', type: 'text', placeholder: 'Nama seperti dalam IC', required: true },
              { k: 'phone', label: 'No. Telefon *', type: 'tel', placeholder: '01X-XXXXXXX', required: true },
              { k: 'email', label: 'E-mel', type: 'email', placeholder: 'email@contoh.com' },
              { k: 'ic', label: 'No. Kad Pengenalan', type: 'text', placeholder: '000101-10-0000' },
              { k: 'dob', label: 'Tarikh Lahir', type: 'date' },
              { k: 'address', label: 'Alamat', type: 'text', placeholder: 'Alamat anda' },
            ].map(f => (
              <div key={f.k}>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{f.label}</label>
                <input type={f.type} value={form[f.k]} onChange={set(f.k)} placeholder={f.placeholder} required={f.required}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sebab / Isu Utama</label>
              <textarea value={form.issue} onChange={set('issue')} rows={3}
                placeholder="Nyatakan secara ringkas sebab anda ingin berjumpa kaunselor..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <button onClick={() => { if (!form.name || !form.phone) { alert('Sila isi nama dan telefon.'); return; } setStep(3); }}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Teruskan →
            </button>
          </div>
        )}

        {/* ── STEP 3: Consent ── */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Persetujuan Klien</h3>
              <button type="button" onClick={() => setStep(2)} className="text-sm text-blue-600">← Kembali</button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2 max-h-48 overflow-auto leading-relaxed">
              <p className="font-semibold">Borang Persetujuan Makluman (Informed Consent)</p>
              <p>Saya memahami bahawa sesi kaunseling ini adalah sulit dan maklumat yang dikongsi tidak akan didedahkan kepada pihak lain tanpa kebenaran saya, kecuali dalam situasi berikut:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Jika saya atau orang lain berada dalam bahaya</li>
                <li>Jika diperintahkan oleh mahkamah</li>
                <li>Jika diperlukan untuk perlindungan kanak-kanak</li>
              </ul>
              <p>Sesi mungkin dirakam untuk tujuan dokumentasi dan laporan profesional. Rakaman disimpan dengan selamat dan dilindungi daripada akses tanpa kebenaran.</p>
              <p>Saya berhak untuk menarik diri daripada sesi pada bila-bila masa.</p>
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="consent" checked={consent} onChange={e => setConsent(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded mt-0.5 flex-shrink-0" required />
              <label htmlFor="consent" className="text-sm text-gray-700">
                Saya telah membaca dan <strong>bersetuju</strong> dengan terma di atas. Saya memahami hak dan tanggungjawab saya sebagai klien.
              </label>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <strong>Ringkasan tempahan:</strong> {form.name} · {format(parseISO(selectedDate), 'dd MMM yyyy')} pukul {selectedTime}
            </div>
            <button type="submit" disabled={!consent || submitting}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors">
              {submitting ? 'Menghantar...' : '✓ Hantar Tempahan'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
