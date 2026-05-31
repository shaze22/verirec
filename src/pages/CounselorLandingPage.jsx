import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import DemoWalkthrough from '../components/DemoWalkthrough';

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0">
    <rect width="32" height="32" rx="8" fill="#10b981"/>
    <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const features = [
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Tempahan QR Automatik',
    desc: 'Kongsikan kod QR peribadi — klien buat temujanji sendiri. Slot masa, tarikh, dan pengesahan e-mel semua diuruskan secara automatik.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Fail Klien Digital',
    desc: 'Rekod lengkap setiap klien — profil, tahap risiko (3 tier), plan tindakan, rujukan klinikal, dan sejarah sesi dalam satu tempat.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Pengesan Red Flag',
    desc: 'AI mengesan petanda risiko bunuh diri, mencederakan diri, dan masalah mental semasa sesi — amaran segera supaya anda tidak terlepas sebarang isyarat.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Nota Sesi Format SOP',
    desc: 'Jana Case Session Note bergaya SOP Unit Kaunseling — termasuk isu disampaikan, matlamat bersama, intervensi, dan pelan susulan. PDF sedia cetak.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Cadangan Teknik CBT / DBT',
    desc: 'Claude AI mencadangkan teknik terapi sesuai berdasarkan konteks perbualan — CBT, DBT, motivational interviewing — tanpa perlu klik.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Alat Penilaian MBTI & RIASEC',
    desc: 'Panel penilaian terus dalam sesi — MBTI 16 soalan (BM) dan Holland Code RIASEC. Auto-skor, hasil disimpan dalam fail klien.',
  },
];

const steps = [
  { num: '1', label: 'Daftar', desc: 'Buat akaun kaunselor dalam 2 minit.' },
  { num: '2', label: 'Sediakan Profil', desc: 'Isi maklumat profesional dan tetapkan slot masa.' },
  { num: '3', label: 'Kongsi QR', desc: 'Klien buat tempahan sendiri melalui borang online.' },
  { num: '4', label: 'Mulakan Sesi', desc: 'Rakam, transkrip, dan laporan AI — semua automatik.' },
];

export default function CounselorLandingPage() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>VeriRec Kaunselor — Platform Digital Sesi Kaunseling Malaysia</title>
        <meta name="description" content="Platform pengurusan sesi kaunseling digital untuk kaunselor Malaysia — tempahan QR, fail klien, nota SOP automatik, pengesan red flag AI, MBTI & RIASEC. RM100/bulan, 10 sesi." />
        <meta name="keywords" content="platform kaunseling, software kaunselor, pengurusan sesi kaunseling, nota sesi SOP, kaunselor Malaysia, rekod klien digital, tempahan kaunseling QR, laporan AI kaunseling" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="VeriRec" />
        <link rel="canonical" href="https://counselor.verirec.app" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://counselor.verirec.app" />
        <meta property="og:site_name" content="VeriRec untuk Kaunselor" />
        <meta property="og:locale" content="ms_MY" />
        <meta property="og:title" content="VeriRec Kaunselor — Platform Digital Sesi Kaunseling Malaysia" />
        <meta property="og:description" content="Uruskan sesi kaunseling lebih bijak — tempahan QR, fail klien digital, nota SOP AI, pengesan red flag, MBTI & RIASEC. Patuh Akta Kaunselor 1998 & PDPA. RM100/bulan." />
        <meta property="og:image" content="https://counselor.verirec.app/og-counselor.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="VeriRec Kaunselor — Platform Digital Sesi Kaunseling" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VeriRec Kaunselor — Platform Digital Sesi Kaunseling Malaysia" />
        <meta name="twitter:description" content="Uruskan sesi kaunseling lebih bijak — tempahan QR, fail klien digital, nota SOP AI, pengesan red flag. RM100/bulan, 10 sesi." />
        <meta name="twitter:image" content="https://counselor.verirec.app/og-counselor.svg" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "VeriRec Kaunselor",
          "url": "https://counselor.verirec.app",
          "description": "Platform pengurusan sesi kaunseling digital untuk kaunselor Malaysia — tempahan QR, fail klien, nota SOP automatik, pengesan red flag AI, MBTI & RIASEC.",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "inLanguage": "ms-MY",
          "offers": {
            "@type": "Offer",
            "price": "100",
            "priceCurrency": "MYR",
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": "100",
              "priceCurrency": "MYR",
              "unitText": "bulan"
            }
          },
          "publisher": {
            "@type": "Organization",
            "name": "VeriRec",
            "url": "https://www.verirec.app"
          },
          "featureList": [
            "Tempahan QR automatik",
            "Fail klien digital",
            "Nota sesi format SOP",
            "Pengesan red flag AI",
            "Penilaian MBTI dan RIASEC",
            "Laporan AI selepas sesi",
            "Patuh Akta Kaunselor 1998 dan PDPA"
          ]
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
              <div>
                <span className="font-bold text-gray-900 text-sm leading-none block">VeriRec</span>
                <span className="text-xs text-emerald-600 font-medium leading-none">untuk Kaunselor</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/auth?profession=counselor')}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2"
              >
                Log Masuk
              </button>
              <button
                onClick={() => navigate('/auth?mode=register&profession=counselor')}
                className="text-sm bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Daftar Percuma
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white">
          <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-700/50 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-200 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
              Direka khas untuk Kaunselor Malaysia
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Uruskan Sesi Kaunseling<br />
              <span className="text-emerald-300">Lebih Bijak, Lebih Selamat</span>
            </h1>
            <p className="text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto mb-10 leading-relaxed">
              Dari tempahan QR hingga laporan AI — VeriRec menguruskan kerja pentadbiran supaya anda fokus sepenuhnya kepada klien.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/auth?mode=register&profession=counselor')}
                className="w-full sm:w-auto bg-white text-emerald-800 font-bold text-base px-8 py-3.5 rounded-xl hover:bg-emerald-50 transition-colors shadow-lg"
              >
                Mulakan Percuma →
              </button>
              <button
                onClick={() => navigate('/auth?profession=counselor')}
                className="w-full sm:w-auto border border-emerald-400/50 text-white font-medium text-base px-8 py-3.5 rounded-xl hover:bg-emerald-700/30 transition-colors"
              >
                Log Masuk
              </button>
            </div>
            <p className="text-emerald-300 text-sm mt-4">Tanpa kontrak • Batal bila-bila masa</p>
          </div>
        </section>

        {/* Stats bar */}
        <div className="bg-emerald-50 border-y border-emerald-100">
          <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-700">100%</div>
              <div className="text-xs text-gray-500 mt-0.5">Patuh PDPA</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">AI</div>
              <div className="text-xs text-gray-500 mt-0.5">Red Flag Detection</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">QR</div>
              <div className="text-xs text-gray-500 mt-0.5">Booking Automatik</div>
            </div>
          </div>
        </div>

        {/* Features */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Semua yang Kaunselor Perlukan
              </h2>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                Satu platform lengkap — dari borang kebenaran hingga nota sesi SOP.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-6 hover:bg-emerald-50 hover:border-emerald-100 border border-transparent transition-colors">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo Walkthrough */}
        <DemoWalkthrough />

        {/* How it works */}
        <section className="bg-gray-50 py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Mula dalam 4 Langkah</h2>
              <p className="text-gray-500">Persediaan awal bawah 10 minit.</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {steps.map((s) => (
                <div key={s.num} className="text-center">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {s.num}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{s.label}</h3>
                  <p className="text-gray-500 text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-4">
          <div className="max-w-lg mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Harga Jelas, Tiada Kejutan</h2>
            <p className="text-gray-500 mb-10">Satu plan untuk kaunselor. Top-up bila perlu.</p>

            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-8 shadow-xl">
              <div className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
                PLAN KAUNSELOR
              </div>
              <div className="text-5xl font-bold text-gray-900 mb-1">
                RM100<span className="text-xl font-normal text-gray-400">/bulan</span>
              </div>
              <p className="text-gray-500 text-sm mb-5">10 sesi termasuk setiap bulan</p>
              <ul className="space-y-3 text-left mb-8">
                {[
                  '10 sesi rakaman / bulan',
                  'Fail klien digital',
                  'Tempahan QR automatik',
                  'Nota sesi format SOP (PDF)',
                  'Pengesan red flag AI',
                  'Laporan AI selepas sesi',
                  'Alat penilaian MBTI + RIASEC',
                  'Top-up sesi bila perlu',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600">
                <div className="font-semibold text-gray-800 mb-2">Top-Up Sesi (jika habis)</div>
                <div className="flex justify-between"><span>1 sesi</span><span className="font-medium">RM13</span></div>
                <div className="flex justify-between"><span>5 sesi</span><span className="font-medium">RM60</span></div>
                <div className="flex justify-between"><span>10 sesi</span><span className="font-medium">RM100</span></div>
              </div>
              <button
                onClick={() => navigate('/auth?mode=register&profession=counselor')}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors text-base"
              >
                Mulakan Percuma →
              </button>
              <p className="text-xs text-gray-400 mt-3">Tanpa kontrak jangka panjang. Batal bila-bila masa.</p>
            </div>
          </div>
        </section>

        {/* Compliance note */}
        <section className="bg-emerald-50 border-t border-emerald-100 py-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Patuh Akta Kaunselor 1998 & PDPA</h3>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Borang kebenaran digital mengandungi teks pematuhan penuh Akta Kaunselor 1998. Data klien dienkripsi dan disimpan selamat. Rekod sesi tidak boleh dipadam — audit trail kekal.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-emerald-700 py-16 px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-3">Sedia untuk memulakan?</h2>
          <p className="text-emerald-200 mb-8 text-lg">RM100/bulan. 10 sesi. Tanpa kontrak.</p>
          <button
            onClick={() => navigate('/auth?mode=register&profession=counselor')}
            className="bg-white text-emerald-700 font-bold text-base px-10 py-3.5 rounded-xl hover:bg-emerald-50 transition-colors shadow-lg"
          >
            Daftar Sekarang →
          </button>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-8 px-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-gray-300 font-medium">VeriRec untuk Kaunselor</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => window.open('https://www.verirec.app', '_blank')} className="hover:text-white transition-colors">
                verirec.app
              </button>
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privasi</button>
              <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terma</button>
            </div>
            <p>© {new Date().getFullYear()} VeriRec. Hak cipta terpelihara.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
