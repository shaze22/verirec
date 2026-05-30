import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '../components/ui/Button.jsx';

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0">
    <rect width="32" height="32" rx="8" fill="#2563eb"/>
    <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const professions = [
  { icon: '⚖️', label: 'SPRM / MACC', path: '/sprm',      desc: 'Siasat dan dokumen kes rasuah dengan chain of custody yang sah di sisi undang-undang.' },
  { icon: '👮', label: 'Polis',        path: '/polis',     desc: 'Rakam soal siasat saksi dan suspek mengikut prosedur PEACE Model dan Cognitive Interview.' },
  { icon: '💬', label: 'Kaunselor',    path: '/kaunselor', desc: 'Transkripsi automatik sesi kaunseling, pengesanan red flag bunuh diri, dan cadangan teknik CBT/DBT realtime.' },
  { icon: '🏥', label: 'Doktor',       path: '/doktor',    desc: 'Sejarah penyakit pesakit direkod dan diformat mengikut Calgary-Cambridge Guide.' },
  { icon: '📋', label: 'Juruaudit ISO',path: '/iso',       desc: 'Rakaman sesi audit ISO 9001 dengan laporan NC dan tindakan pembetulan automatik.' },
  { icon: '👔', label: 'Penyiasat HR',  path: '/hr',       desc: 'Siasat aduan pekerja mengikut Akta Kerja 1955 dengan rekod yang tidak boleh diubah.' },
  { icon: '🏛️', label: 'Mahkamah',    path: '/mahkamah',  desc: 'Analisa keterangan saksi, kesan percanggahan, dan cadangan soalan pemeriksaan balas secara realtime.' },
  { icon: '📜', label: 'Peguam',      path: '/peguam',    desc: 'Dokumentasi perundingan klien, analisa jurang kes, dan cadangan strategi guaman dengan AI secara realtime.' },
  { icon: '🤝', label: 'Pegawai JKM', path: '/jkm',       desc: 'Penilaian risiko kanak-kanak dan keluarga, pengesanan petanda bahaya, dan dokumentasi kes kebajikan yang kukuh.' },
];

const features = [
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Analisa AI Masa Nyata',
    desc: 'Claude AI menganalisa perbualan setiap beberapa ayat — mengesan simptom, kelemahan keterangan, atau ketidakpatuhan, dan mencadangkan soalan susulan tanpa perlu klik.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Chain of Custody SHA-256',
    desc: 'Setiap laporan disapu dengan hash SHA-256 yang boleh disahkan semula. Buktikan laporan tidak diubah suai — penting untuk mahkamah dan siasatan rasmi.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    title: 'Transkripsi Whisper OpenAI',
    desc: 'Tukar audio kepada teks secara automatik menggunakan Whisper AI. Sokong Bahasa Malaysia dan pelbagai loghat. Tiada lagi tulis nota secara manual.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Laporan AI Automatik',
    desc: 'Sebaik sesi tamat, laporan eksekutif dijana dalam masa seminit — termasuk ringkasan, penemuan utama, tahap risiko, sentimen, dan cadangan tindakan.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Rekod Cepat',
    desc: 'Tekan satu butang — terus rakam. Tiada borang, tiada langkah tambahan. Sesuai untuk keadaan mendesak. Butiran sesi boleh dilengkapkan selepas sesi tamat.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Perpustakaan Audio',
    desc: 'Setiap sesi disimpan sebagai fail audio dalam perpustakaan peribadi anda. Main balik, namakan semula, atau kaitkan rakaman dengan sesi atau subjek tertentu.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Pematuhan PDPA 2010',
    desc: 'Borang persetujuan maklum digital untuk setiap sesi. Rekod persetujuan disimpan kekal sebagai audit trail PDPA yang tidak boleh dipadam.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: 'Sambung Sesi Bila-bila Masa',
    desc: 'Sesi yang terganggu boleh disambung semula dari mana-mana peranti. Transkripsi dan bendera dikekalkan — tanpa kehilangan data.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    title: 'Mod Luar Talian',
    desc: 'Rekod dan transkripsi walaupun tiada internet. Data disimpan secara tempatan dan disegerakkan automatik apabila sambungan dipulihkan.',
  },
];

const plans = [
  {
    key: 'free',
    label: 'Percuma',
    price: 0,
    sessions: 2,
    popular: false,
    features: ['2 sesi/bulan', '1 pengguna', 'Transkripsi automatik', 'Laporan asas'],
    notIncluded: ['Analisa AI Realtime', 'Laporan PDF', 'Sokongan keutamaan'],
    cta: 'Cuba Percuma',
    ctaAction: 'register',
  },
  {
    key: 'starter',
    label: 'Starter',
    price: 249,
    sessions: 20,
    popular: false,
    features: ['20 sesi/bulan', '2 pengguna', 'Analisa AI Realtime', 'Laporan PDF', 'Eksport laporan'],
    notIncluded: ['Pengguna tidak terhad', 'SLA 99.9%'],
    cta: 'Langgan Sekarang',
    ctaAction: 'register',
  },
  {
    key: 'pro',
    label: 'Pro',
    price: 999,
    sessions: 100,
    popular: true,
    features: ['100 sesi/bulan', '10 pengguna', 'Semua ciri Starter', 'Analisa AI 7 Profesion', 'Keutamaan sokongan', 'Akses API'],
    notIncluded: ['200+ sesi/bulan'],
    cta: 'Langgan Sekarang',
    ctaAction: 'register',
  },
  {
    key: 'biz',
    label: 'Perniagaan',
    price: 2499,
    sessions: 200,
    popular: false,
    features: ['200 sesi/bulan', 'Pengguna tidak terhad', 'Semua ciri Pro', 'Akaun terurus', 'SLA 99.9%', 'Onboarding khusus'],
    notIncluded: [],
    cta: 'Hubungi Kami',
    ctaAction: 'biz',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://verirec.vercel.app/#organization',
        name: 'VeriRec',
        url: 'https://verirec.vercel.app',
        logo: 'https://verirec.vercel.app/pwa-512.svg',
        contactPoint: { '@type': 'ContactPoint', email: 'hello@verirec.app', contactType: 'customer support' },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://verirec.vercel.app/#website',
        url: 'https://verirec.vercel.app',
        name: 'VeriRec',
        publisher: { '@id': 'https://verirec.vercel.app/#organization' },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'VeriRec',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'MYR',
          description: 'Pelan percuma — 2 sesi sebulan',
        },
        description: 'Platform rakaman dan analisa temu bual profesional untuk Kaunselor, Polis, SPRM, Doktor, Juruaudit ISO, HR, Mahkamah, Peguam, dan JKM di Malaysia.',
        url: 'https://verirec.vercel.app',
      },
    ],
  };

  return (
    <>
    <Helmet>
      <title>VeriRec — Platform Rakaman Temu Bual Profesional Malaysia</title>
      <meta name="description" content="Rakam, transkripsi, dan jana laporan temu bual profesional secara automatik. Pematuhan PDPA, hash SHA-256, dan AI realtime untuk Kaunselor, Polis, SPRM, Doktor, HR, Peguam dan lebih lagi." />
      <link rel="canonical" href="https://verirec.vercel.app/" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://verirec.vercel.app/" />
      <meta property="og:title" content="VeriRec — Platform Rakaman Temu Bual Profesional Malaysia" />
      <meta property="og:description" content="Rakam, transkripsi, dan jana laporan temu bual profesional secara automatik. Pematuhan PDPA, hash SHA-256, dan AI realtime." />
      <meta property="og:image" content="https://verirec.vercel.app/pwa-512.svg" />
      <meta property="og:locale" content="ms_MY" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="VeriRec — Platform Rakaman Temu Bual Profesional Malaysia" />
      <meta name="twitter:description" content="Rakam, transkripsi, dan jana laporan temu bual profesional secara automatik." />
      <meta name="twitter:image" content="https://verirec.vercel.app/pwa-512.svg" />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-gray-900 text-lg">VeriRec</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <a href="#ciri" className="hover:text-blue-600 transition-colors">Ciri-ciri</a>
            <a href="#profesion" className="hover:text-blue-600 transition-colors">Profesion</a>
            <a href="#harga" className="hover:text-blue-600 transition-colors">Harga</a>
            <a href="/faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth')} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Log Masuk</button>
            <Button size="sm" onClick={() => navigate('/auth?mode=register')}>Cuba Percuma</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
            PDPA-Compliant · SHA-256 Chain of Custody · Perpustakaan Audio · Made in Malaysia
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Rakaman Sesi<br />
            <span className="text-blue-600">Profesional dengan AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Platform pertama Malaysia untuk rakaman, transkripsi, dan analisis sesi profesional.
            AI menganalisa perbualan <strong>secara realtime</strong> — mengesan simptom, kelemahan keterangan, atau risiko.
            Laporan dijana automatik. Audio disimpan selamat. Setiap dokumen disahkan SHA-256.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth?mode=register')} className="text-base px-8">
              Cuba Percuma — 2 Sesi
            </Button>
            <button
              onClick={() => navigate('/faq')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Ketahui Lebih Lanjut
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">Tanpa kad kredit · Batalkan bila-bila masa</p>
        </div>

        {/* Trust badges */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'PDPA 2010', sub: 'Consent audit trail' },
            { label: 'SHA-256', sub: 'Chain of custody' },
            { label: 'Rekod Cepat', sub: 'Satu klik, terus rakam' },
            { label: 'Audio Library', sub: 'Simpan & urus rakaman' },
          ].map(b => (
            <div key={b.label} className="bg-white rounded-xl border p-4 text-center shadow-sm">
              <p className="font-bold text-gray-900 text-sm">{b.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Professions */}
      <section id="profesion" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Direka untuk Profesional Bertauliah Malaysia</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">9 profesion. Setiap satu dengan rangka kerja soalan, fasa sesi, analisa AI khusus, dan pengesanan red flag tersendiri.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {professions.map(p => (
              <button
                key={p.label}
                onClick={() => navigate(p.path)}
                className="bg-white rounded-2xl border p-6 hover:shadow-md hover:border-blue-300 transition-all text-left group"
              >
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">{p.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{p.desc}</p>
                <span className="text-xs font-medium text-blue-600 group-hover:underline">Lihat halaman khusus →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ciri" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Semua yang anda perlukan dalam satu platform</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Dari rakaman hingga laporan — semuanya automatik, selamat, dan boleh diaudit.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border bg-white hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Harga yang Jelas & Adil</h2>
            <p className="text-gray-500 mt-3">Mulakan percuma. Naik taraf apabila anda bersedia.</p>

            {/* Annual toggle */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <span className={`text-sm font-medium ${!annual ? 'text-blue-600' : 'text-gray-500'}`}>Bulanan</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-6' : ''}`} />
              </button>
              <span className={`text-sm font-medium ${annual ? 'text-blue-600' : 'text-gray-500'}`}>
                Tahunan <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">Jimat 17%</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map(p => {
              const monthlyPrice = p.price === 0 ? null : annual ? Math.round(p.price * 0.83) : p.price;
              return (
                <div key={p.key} className={`relative rounded-2xl border-2 p-6 flex flex-col bg-white ${
                  p.popular ? 'border-blue-600 shadow-xl' : 'border-gray-200'
                }`}>
                  {p.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow">
                      Paling Popular
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{p.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 mb-4">{p.sessions} sesi/bulan</p>

                  <div className="mb-5">
                    {p.price === 0 ? (
                      <p className="text-3xl font-bold text-gray-900">Percuma</p>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-gray-900">RM{monthlyPrice}</span>
                          <span className="text-gray-500 text-sm">/bulan</span>
                        </div>
                        {annual && (
                          <p className="text-xs text-gray-400 mt-0.5">Dibil RM{Math.round(p.price * 10 * 0.83)}/tahun</p>
                        )}
                      </>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                    {p.notIncluded.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={p.popular ? 'primary' : 'outline'}
                    className="w-full"
                    onClick={() => {
                      if (p.ctaAction === 'biz') {
                        window.location.href = 'mailto:hello@verirec.app?subject=Pertanyaan Pelan Perniagaan VeriRec';
                      } else {
                        navigate('/auth?mode=register');
                      }
                    }}
                  >
                    {p.cta}
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Bayar dengan kad kredit atau debit — auto-renewal setiap bulan/tahun.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Dipercayai Profesional Malaysia</h2>
            <p className="text-gray-500 mt-3">Dari kaunselor hingga pegawai polis — VeriRec mengubah cara mereka bekerja.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { quote: 'Dulu ambil 45 minit tulis nota selepas setiap sesi. Sekarang laporan SOAP siap dalam masa seminit. Saya boleh fokus sepenuhnya pada klien.', name: 'Pn. Suraya Ahmad', role: 'Kaunselor Berdaftar LKM', org: 'Pusat Kaunseling Cahaya, KL' },
              { quote: 'Laporan soal siasat kami kini ada hash SHA-256. Peguam pembela tidak dapat persoalkan integriti rakaman — ini ubah cara kami dokumentasi kes.', name: 'Insp. Hairul Nizam', role: 'Pegawai Penyiasat D9', org: 'Balai Polis Damansara' },
              { quote: 'NCR dan CAR yang dijana VeriRec menepati standard ISO 19011. Kadar penutupan NCR kami naik dari 60% ke 94% dalam masa 3 bulan.', name: 'En. Farouk Ibrahim', role: 'Juruaudit Utama MS ISO 9001', org: 'Firma Perundingan Kualiti' },
              { quote: 'Kes pemecatan yang kami kendalikan berjaya dipertahankan di Mahkamah Perusahaan. Dokumentasi VeriRec tidak boleh dicabar oleh mana-mana pihak.', name: 'Pn. Melissa Tan', role: 'HR Business Partner', org: 'Syarikat Tersenarai Bursa Malaysia' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl border p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-5">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                  <p className="text-xs text-gray-400">{t.org}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Mulakan Hari Ini — Percuma</h2>
          <p className="text-blue-100 mb-8">2 sesi percuma. Rakam, jana laporan AI, simpan audio. Tiada kad kredit diperlukan.</p>
          <button
            onClick={() => navigate('/auth?mode=register')}
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 hover:bg-blue-50 font-semibold rounded-lg px-10 py-3.5 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
          >
            Buat Akaun Percuma
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-bold text-white">VeriRec</span>
              <span className="text-xs text-gray-500 ml-2">Platform Rakaman Sesi Profesional</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <button onClick={() => navigate('/faq')} className="hover:text-white transition-colors">FAQ</button>
              <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">Harga</button>
              <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terma</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privasi</button>
              <a href="mailto:hello@verirec.app" className="hover:text-white transition-colors">Hubungi Kami</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} VeriRec. Dibina di Malaysia. Mematuhi PDPA 2010.
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
