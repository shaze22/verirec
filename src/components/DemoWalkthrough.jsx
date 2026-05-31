import { useState } from 'react';

const steps = [
  {
    num: 1,
    label: 'Dashboard Klien',
    short: 'Semua klien dalam satu pandangan',
    desc: 'Lihat senarai klien, temujanji akan datang, dan tahap risiko setiap klien — sekilas pandang dari dashboard utama.',
    screen: <DashboardMockup />,
  },
  {
    num: 2,
    label: 'Booking QR',
    short: 'Klien buat temujanji sendiri',
    desc: 'Kongsikan kod QR atau pautan unik anda. Klien isi borang intake, tandatangani kebenaran digital, dan pilih tarikh — semua tanpa campur tangan anda.',
    screen: <BookingMockup />,
  },
  {
    num: 3,
    label: 'Sesi Aktif',
    short: 'Rakaman + AI masa nyata',
    desc: 'Rakam sesi dengan satu klik. AI transkrip perbualan secara masa nyata, kenal pasti speaker, dan cadangkan teknik CBT/DBT. Red flag dikesan automatik.',
    screen: <SessionMockup />,
  },
  {
    num: 4,
    label: 'Laporan AI',
    short: 'Case Session Note auto-jana',
    desc: 'Selepas sesi tamat, AI jana Case Session Note format SOP — isu dikemukakan, matlamat bersama, intervensi, pelan susulan, dan dapatan MBTI/RIASEC. PDF sedia cetak.',
    screen: <ReportMockup />,
  },
];

function DashboardMockup() {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden text-xs font-sans">
      {/* top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <span className="font-semibold text-gray-800 text-xs">VeriRec</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-[10px]">K</div>
          <span className="text-gray-600">Kaunselor</span>
        </div>
      </div>
      <div className="flex">
        {/* sidebar */}
        <div className="w-28 bg-white border-r border-gray-100 p-3 space-y-1 shrink-0">
          {[
            { icon: '👥', label: 'Klien', active: true },
            { icon: '📅', label: 'Temujanji', active: false },
            { icon: '⚙️', label: 'Tetapan', active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium ${
                item.active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        {/* main */}
        <div className="flex-1 p-3 space-y-2.5 min-w-0">
          {/* stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Klien Aktif', val: '12', color: 'text-emerald-600' },
              { label: 'Sesi Bulan Ini', val: '8', color: 'text-blue-600' },
              { label: 'Temujanji', val: '3', color: 'text-amber-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-lg p-2 border border-gray-100">
                <div className={`text-base font-bold ${s.color}`}>{s.val}</div>
                <div className="text-gray-400 text-[10px] leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
          {/* client list */}
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-50 font-semibold text-gray-700 text-[11px]">Senarai Klien</div>
            {[
              { name: 'Ahmad Faris', issue: 'Tekanan Akademik', risk: 'mental_health', sesi: 3 },
              { name: 'Nurul Ain', issue: 'Kecemasan Sosial', risk: 'self_harm', sesi: 2 },
              { name: 'Muhammad Hafiz', issue: 'Bimbingan Kerjaya', risk: 'none', sesi: 1 },
            ].map((c) => (
              <div key={c.name} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 text-[11px] truncate">{c.name}</div>
                    <div className="text-gray-400 text-[10px] truncate">{c.issue}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    c.risk === 'none' ? 'bg-gray-100 text-gray-500' :
                    c.risk === 'mental_health' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {c.risk === 'none' ? 'Rendah' : c.risk === 'mental_health' ? 'Sederhana' : 'Tinggi'}
                  </span>
                  <span className="text-gray-400 text-[10px]">{c.sesi} sesi</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingMockup() {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden text-xs font-sans">
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-emerald-500" />
        <span className="font-semibold text-gray-800 text-xs">Temujanji — QR & Pautan</span>
      </div>
      <div className="p-3 grid grid-cols-2 gap-3">
        {/* QR card */}
        <div className="bg-white rounded-xl border border-emerald-200 p-3 flex flex-col items-center gap-2">
          <div className="text-[11px] font-semibold text-gray-700">Kod QR Anda</div>
          {/* QR placeholder */}
          <div className="w-20 h-20 border-2 border-gray-200 rounded-lg relative overflow-hidden bg-white p-1">
            <svg viewBox="0 0 21 21" className="w-full h-full">
              <rect x="0" y="0" width="9" height="9" rx="1" fill="#111" />
              <rect x="1" y="1" width="7" height="7" rx="0.5" fill="white" />
              <rect x="2" y="2" width="5" height="5" rx="0.5" fill="#111" />
              <rect x="12" y="0" width="9" height="9" rx="1" fill="#111" />
              <rect x="13" y="1" width="7" height="7" rx="0.5" fill="white" />
              <rect x="14" y="2" width="5" height="5" rx="0.5" fill="#111" />
              <rect x="0" y="12" width="9" height="9" rx="1" fill="#111" />
              <rect x="1" y="13" width="7" height="7" rx="0.5" fill="white" />
              <rect x="2" y="14" width="5" height="5" rx="0.5" fill="#111" />
              <rect x="11" y="11" width="2" height="2" fill="#111" />
              <rect x="14" y="11" width="2" height="2" fill="#111" />
              <rect x="17" y="11" width="2" height="2" fill="#111" />
              <rect x="11" y="14" width="2" height="2" fill="#111" />
              <rect x="14" y="14" width="4" height="2" fill="#111" />
              <rect x="11" y="17" width="2" height="2" fill="#111" />
              <rect x="15" y="17" width="4" height="2" fill="#111" />
            </svg>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 text-[10px] text-emerald-700 text-center">
            verirec.app/book/<br /><span className="font-bold">fmw7y2qc</span>
          </div>
          <button className="w-full bg-emerald-600 text-white text-[10px] font-semibold py-1.5 rounded-lg">
            🖨 Cetak QR
          </button>
        </div>
        {/* requests */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-gray-700 mb-1">Permintaan Baru</div>
          {[
            { name: 'Siti Hajar', time: '10:00', date: 'Isnin, 2 Jun', status: 'pending' },
            { name: 'Hazwan Fikri', time: '14:00', date: 'Selasa, 3 Jun', status: 'pending' },
          ].map((r) => (
            <div key={r.name} className="bg-white border border-amber-100 rounded-lg p-2">
              <div className="font-medium text-gray-800 text-[11px]">{r.name}</div>
              <div className="text-gray-400 text-[10px]">{r.date} • {r.time}</div>
              <div className="flex gap-1 mt-1.5">
                <button className="flex-1 bg-emerald-600 text-white text-[9px] font-semibold py-1 rounded-md">✓ Sahkan</button>
                <button className="flex-1 bg-gray-100 text-gray-500 text-[9px] font-semibold py-1 rounded-md">✗ Tolak</button>
              </div>
            </div>
          ))}
          <div className="bg-white border border-gray-100 rounded-lg p-2 text-center">
            <div className="text-[10px] text-emerald-600 font-medium">✅ Sahid Arslan</div>
            <div className="text-[10px] text-gray-400">Jumaat, 30 Mei • 09:00</div>
            <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Disahkan</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionMockup() {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden text-xs font-sans">
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-xs">Sesi Aktif — Ahmad Faris</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block"></span>
          <span className="text-red-500 font-semibold text-[11px]">02:34</span>
        </div>
      </div>
      <div className="p-3 grid grid-cols-5 gap-3">
        {/* transcript */}
        <div className="col-span-3 space-y-2">
          <div className="text-[11px] font-semibold text-gray-700">Transkrip Masa Nyata</div>
          <div className="space-y-1.5">
            {[
              { speaker: 'Kaunselor', text: 'Boleh ceritakan lebih lanjut tentang perasaan tekanan itu?', color: 'bg-blue-50 text-blue-800 border-blue-100' },
              { speaker: 'Klien', text: 'Saya rasa macam tak mampu nak cope dengan semua tugasan ni...', color: 'bg-gray-50 text-gray-700 border-gray-100' },
              { speaker: 'Klien', text: 'Kadang-kadang saya fikir nak berhenti je semua ni.', color: 'bg-red-50 text-red-700 border-red-200' },
            ].map((t, i) => (
              <div key={i} className={`rounded-lg border px-2 py-1.5 ${t.color}`}>
                <div className="text-[9px] font-bold uppercase tracking-wide opacity-60 mb-0.5">{t.speaker}</div>
                <div className="text-[11px] leading-snug">{t.text}</div>
              </div>
            ))}
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
              Mendengar...
            </div>
          </div>
        </div>
        {/* AI panel */}
        <div className="col-span-2 space-y-2">
          <div className="text-[11px] font-semibold text-gray-700">Cadangan AI</div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <div className="text-[10px] font-bold text-red-700 flex items-center gap-1">⚠️ Red Flag</div>
            <div className="text-[10px] text-red-600 mt-0.5">Kemungkinan tekanan tinggi. Semak risiko bunuh diri.</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-2 space-y-1">
            <div className="text-[10px] font-semibold text-gray-600">Teknik Dicadangkan:</div>
            {['CBT — Cognitive Restructuring', 'Validation teknik DBT', 'Behavioral Activation'].map((t) => (
              <div key={t} className="flex items-start gap-1 text-[10px] text-gray-600">
                <span className="text-emerald-500 mt-0.5 shrink-0">→</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <button className="w-full bg-emerald-600 text-white text-[10px] font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-300 inline-block"></span>
            Rakam Aktif
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportMockup() {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden text-xs font-sans">
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-xs">Laporan AI — Ahmad Faris</span>
        <button className="bg-emerald-600 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">
          ↓ Eksport PDF
        </button>
      </div>
      <div className="p-3 space-y-2">
        {/* case session note */}
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100">
            <div className="font-bold text-emerald-800 text-[11px]">CASE SESSION NOTE — SOP UNIT KAUNSELING</div>
            <div className="text-[10px] text-emerald-600">Sesi ke-3 • 31 Mei 2026 • 45 minit</div>
          </div>
          <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {[
              { label: 'Isu Dikemukakan', val: 'Tekanan akademik, perasaan tidak berkemampuan, sukar menumpukan perhatian.' },
              { label: 'Isu Dikenal Pasti', val: 'Simptom kecemasan situasi berkaitan prestasi akademik. Tiada gangguan klinikal.' },
              { label: 'Matlamat Bersama', val: 'Klien akan mengamalkan teknik relaksasi 10 minit setiap malam.' },
              { label: 'Intervensi', val: 'CBT Cognitive Restructuring — kenal pasti pemikiran negatif automatik.' },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{item.label}</div>
                <div className="text-[10px] text-gray-700 leading-snug">{item.val}</div>
              </div>
            ))}
          </div>
        </div>
        {/* assessment */}
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-gray-700 mb-1.5">Dapatan Penilaian</div>
          <div className="flex gap-3">
            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
              <div className="text-[10px] text-blue-500 font-medium">MBTI</div>
              <div className="text-base font-bold text-blue-700">INTJ</div>
              <div className="text-[9px] text-blue-500">Perancang Strategik</div>
            </div>
            <div className="flex-1 bg-purple-50 border border-purple-100 rounded-lg p-2 text-center">
              <div className="text-[10px] text-purple-500 font-medium">RIASEC</div>
              <div className="text-base font-bold text-purple-700">ISA</div>
              <div className="text-[9px] text-purple-500">Holland Code</div>
            </div>
            <div className="flex-1 bg-amber-50 border border-amber-100 rounded-lg p-2 text-center">
              <div className="text-[10px] text-amber-500 font-medium">Risiko</div>
              <div className="text-sm font-bold text-amber-700">Sederhana</div>
              <div className="text-[9px] text-amber-500">Perlu susulan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemoWalkthrough() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-700 mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Demo Interaktif
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Lihat VeriRec Beraksi
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Dari tempahan hingga laporan — inilah aliran kerja sebenar kaunselor menggunakan VeriRec.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* step tabs */}
          <div className="lg:col-span-2 space-y-2">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-full text-left rounded-2xl p-4 transition-all border ${
                  active === i
                    ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
                    active === i ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {s.num}
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${active === i ? 'text-emerald-800' : 'text-gray-700'}`}>
                      {s.label}
                    </div>
                    <div className={`text-sm mt-0.5 ${active === i ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {s.short}
                    </div>
                    {active === i && (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{s.desc}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* mockup */}
          <div className="lg:col-span-3">
            <div className="sticky top-24">
              <div className="relative">
                {/* browser chrome */}
                <div className="bg-gray-200 rounded-t-2xl px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 ml-2">
                    counselor.verirec.app
                  </div>
                </div>
                <div className="rounded-b-2xl overflow-hidden shadow-2xl border border-gray-200 border-t-0">
                  <div
                    key={active}
                    className="animate-fade-in"
                    style={{ animation: 'fadeSlideIn 0.25s ease-out' }}
                  >
                    {steps[active].screen}
                  </div>
                </div>
              </div>
              {/* step indicator */}
              <div className="flex justify-center gap-2 mt-4">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      active === i ? 'w-6 bg-emerald-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* bottom CTA */}
        <div className="mt-14 text-center">
          <p className="text-gray-500 text-sm mb-4">Mahu lihat sendiri? Cuba akaun demo kami secara percuma.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/auth?mode=register&profession=counselor"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-md"
            >
              Cuba 14 Hari Percuma →
            </a>
            <a
              href="/auth?profession=counselor"
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 font-medium text-sm px-6 py-3 rounded-xl hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            >
              Log masuk dengan akaun demo
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Akaun demo: test.kaunselor@verirec.app / Test1234!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
