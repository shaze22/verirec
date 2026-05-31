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
  const [form, setForm] = useState({ name: '', email: '', phone: '', ic: '', student_id: '', dobDay: '', dobMonth: '', dobYear: '', gender: '', address: '', issue: '', session_type: 'voluntary', previous_counseling: '', psychiatric_history: '', psychiatric_medication: '' });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [honeypot, setHoneypot] = useState(''); // bot trap — should always be empty
  const pageLoadTime = useState(() => Date.now())[0];

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
        alert('Terlalu banyak tempahan dihantar. Sila cuba lagi selepas sejam.');
      } else {
        alert('Gagal menghantar tempahan. Sila cuba lagi.');
      }
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
            {/* Basic info */}
            {[
              { k: 'name',       label: 'Nama Penuh *',                              type: 'text',  placeholder: 'Nama seperti dalam IC', required: true },
              { k: 'phone',      label: 'No. Telefon *',                             type: 'tel',   placeholder: '01X-XXXXXXX', required: true },
              { k: 'email',      label: 'E-mel',                                     type: 'email', placeholder: 'email@contoh.com' },
              { k: 'ic',         label: 'No. Kad Pengenalan',                        type: 'text',  placeholder: '000101-10-0000' },
              { k: 'student_id', label: 'No. Matrik / ID Pelajar / ID Kakitangan',   type: 'text',  placeholder: 'cth. A12345 / EMP0012' },
              { k: 'address',    label: 'Alamat',                                    type: 'text',  placeholder: 'Alamat anda' },
            ].map(f => (
              <div key={f.k}>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{f.label}</label>
                <input type={f.type} value={form[f.k]} onChange={set(f.k)} placeholder={f.placeholder} required={f.required}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}

            {/* DOB — 3 dropdowns */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tarikh Lahir</label>
              <div className="grid grid-cols-3 gap-2">
                <select value={form.dobDay} onChange={set('dobDay')} className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Hari</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d).padStart(2,'0')}>{d}</option>)}
                </select>
                <select value={form.dobMonth} onChange={set('dobMonth')} className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Bulan</option>
                  {['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis'].map((m,i) => (
                    <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>
                  ))}
                </select>
                <select value={form.dobYear} onChange={set('dobYear')} className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Tahun</option>
                  {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - 10 - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Jenis sesi */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Jenis Sesi</label>
              <div className="grid grid-cols-2 gap-2">
                {[['voluntary','Sukarela'],['referred','Dirujuk']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, session_type: v }))}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${form.session_type === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Kaunseling sebelum */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Pernahkah anda mendapat kaunseling sebelum ini?</label>
              <div className="grid grid-cols-2 gap-2">
                {[['ya','Ya'],['tidak','Tidak']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, previous_counseling: v }))}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${form.previous_counseling === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Sejarah psikiatri */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Adakah anda mempunyai sejarah psikiatri?</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[['ya','Ya'],['tidak','Tidak']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, psychiatric_history: v === 'tidak' ? 'Tiada' : '' }))}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${(form.psychiatric_history === 'Tiada' ? 'tidak' : form.psychiatric_history ? 'ya' : '') === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {form.psychiatric_history !== 'Tiada' && form.psychiatric_history !== '' && (
                <textarea value={form.psychiatric_history} onChange={set('psychiatric_history')} rows={2}
                  placeholder="Nyatakan diagnosis / rawatan yang pernah diterima..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              )}
            </div>

            {/* Ubat psikiatri */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Adakah anda sedang mengambil ubat psikiatri?</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[['ya','Ya'],['tidak','Tidak']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, psychiatric_medication: v === 'tidak' ? 'Tiada' : '' }))}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${(form.psychiatric_medication === 'Tiada' ? 'tidak' : form.psychiatric_medication ? 'ya' : '') === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {form.psychiatric_medication !== 'Tiada' && form.psychiatric_medication !== '' && (
                <textarea value={form.psychiatric_medication} onChange={set('psychiatric_medication')} rows={2}
                  placeholder="Nyatakan nama ubat dan dos..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              )}
            </div>

            {/* Isu utama */}
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
            {/* Honeypot — hidden from humans, filled by bots */}
            <input
              type="text" name="website" value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              style={{ display: 'none' }} tabIndex={-1} autoComplete="off"
              aria-hidden="true"
            />
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Persetujuan Klien</h3>
              <button type="button" onClick={() => setStep(2)} className="text-sm text-blue-600">← Kembali</button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3 max-h-64 overflow-auto leading-relaxed">
              <p className="font-bold text-gray-900">BORANG PERSETUJUAN MAKLUMAN (Informed Consent Form)</p>
              <p className="text-xs text-gray-500 italic">Ini adalah dokumen undang-undang. Sila baca dengan teliti sebelum menandatangani.</p>

              <p><strong>Kaunseling</strong> adalah hubungan profesional antara anda dan kaunselor. Matlamat utama adalah untuk memudahkan perubahan tingkah laku, meningkatkan keupayaan membina hubungan, meningkatkan keberkesanan daya tindak, menggalakkan proses membuat keputusan, dan memudahkan potensi serta perkembangan peribadi.</p>

              <p><strong>Tempoh Sesi:</strong> Tempoh sesi kaunseling individu adalah 45–60 minit. Walau bagaimanapun, sesi boleh dijalankan lebih atau kurang bergantung kepada perbincangan anda dengan kaunselor.</p>

              <p><strong>Kerahsiaan:</strong> Kaunselor bertanggungjawab menjaga maklumat yang diperoleh semasa sesi kaunseling. Semua maklumat pengenalan penilaian dan rawatan anda dirahsiakan, kecuali dalam situasi berikut:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                <li>Jika kaunselor mempunyai sebab yang kukuh untuk mempercayai anda akan menyakiti orang lain</li>
                <li>Jika kaunselor mempunyai sebab yang kukuh untuk mempercayai anda menganiaya atau mengabaikan kanak-kanak atau orang dewasa yang lemah</li>
                <li>Jika kaunselor percaya anda berada dalam bahaya segera untuk menyakiti diri sendiri</li>
                <li>Jika dikehendaki oleh mahkamah untuk prosiding undang-undang</li>
                <li>Untuk kes rujukan, laporan ringkas akan dikemukakan kepada perujuk jika diperlukan</li>
              </ul>

              <p><strong>Ujian Psikologi:</strong> Jika ujian psikologi digunakan, sebarang keputusan penilaian ujian psikologi bukan untuk diagnosis dan tidak boleh digunakan untuk tujuan selain sesi kaunseling ini.</p>

              <p><strong>Hak Klien:</strong> Anda berhak bertanya tentang apa sahaja yang berlaku dalam sesi kaunseling. Anda boleh meminta kaunselor merujuk anda kepada kaunselor atau profesional lain. Anda juga bebas meninggalkan sesi kaunseling pada bila-bila masa.</p>

              <p className="text-xs text-gray-500">Sesi mungkin dirakam untuk tujuan dokumentasi dan laporan profesional dengan teknologi AI. Rakaman disimpan dengan selamat dan dilindungi berdasarkan Akta Perlindungan Data Peribadi 2010 (PDPA).</p>
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
