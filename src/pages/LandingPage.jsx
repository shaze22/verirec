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

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Profession groups — elaborated for each segment
const PROFESSION_GROUPS = [
  {
    id: 'penguatkuasa',
    icon: '👮',
    color: 'blue',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    titleColor: 'text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-700',
    title: 'Penguatkuasa & Penyiasat',
    subtitle: 'Polis · SPRM/MACC · SISPA · SKMM · JTK · Peguam',
    desc: 'Soal siasat yang lemah boleh merosakkan kes di mahkamah. VeriRec memastikan setiap sesi dijalankan mengikut SOP, rakaman selamat, dan laporan sedia untuk pendakwaan.',
    painPoints: [
      'Keterangan subjek tidak dirakam dengan betul — risiko kes gugur di mahkamah',
      'Tiada panduan struktur soal siasat — penyoal bergantung pada ingatan sahaja',
      'Laporan siasatan ditulis tangan — lambat, tidak konsisten, mudah dicabar',
      'Chain of custody bukti digital lemah — peguam bela boleh persoalkan kesahihan',
    ],
    features: [
      'Panduan PEACE Model — 5 fasa dengan senarai semak per peringkat',
      'SHA-256 chain of custody — laporan tidak boleh diubah selepas jana',
      'Diarisasi speaker automatik — kenalpasti pegawai vs subjek dalam transkrip',
      'Laporan siasatan rasmi PDF — sedia untuk fail mahkamah dan pendakwaan',
      'Bendera merah realtime — kesan percanggahan keterangan semasa sesi',
    ],
    professions: [
      { icon: '👮', label: 'Polis', sub: 'PEACE Model, Cognitive Interview' },
      { icon: '⚖️', label: 'SPRM / MACC', sub: 'SKIM/FIAU Guidelines, UNCAC' },
      { icon: '🔒', label: 'SISPA', sub: 'Siasatan perisikan & keselamatan' },
      { icon: '📡', label: 'SKMM', sub: 'Siasatan komunikasi & media' },
      { icon: '⚖️', label: 'Peguam', sub: 'Nota kes, perundingan undang-undang' },
      { icon: '🏭', label: 'Pegawai JTK', sub: 'Siasatan perburuhan & keselamatan' },
    ],
  },
  {
    id: 'hr',
    icon: '🏢',
    color: 'indigo',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    titleColor: 'text-indigo-700',
    badgeBg: 'bg-indigo-100 text-indigo-700',
    title: 'HR & Siasatan Disiplin Korporat',
    subtitle: 'Penyiasat HR · Panel Tatatertib · Pengurus Compliance',
    desc: 'Siasatan disiplin pekerja memerlukan rekod yang telus dan tidak berat sebelah. VeriRec membantu HR mendokumentasikan setiap sesi dengan adil, konsisten, dan boleh diaudit.',
    painPoints: [
      'Minit mesyuarat tatatertib tidak lengkap — pekerja boleh pertikaikan keputusan',
      'Tiada rekod audio — pihak pekerja dakwa kata-kata dipesongkan',
      'Laporan panel disiplin tidak seragam antara pengurus berbeza',
      'Fail kes berselerak — sukar semak semula sejarah kes pekerja',
    ],
    features: [
      'Rakaman audio + transkrip automatik setiap sesi tatatertib',
      'Laporan panel disiplin SOP — format seragam untuk semua pengurus',
      'SHA-256 hash — buktikan transkrip tidak diubah selepas sesi',
      'Fail kes pekerja terpusat — semak semula rekod terdahulu dalam satu tempat',
      'Persetujuan maklum digital — PDPA-compliant audit trail',
    ],
    professions: [
      { icon: '👔', label: 'Penyiasat HR', sub: 'Siasatan tatatertib pekerja' },
      { icon: '🏛️', label: 'Panel Tatatertib', sub: 'Pendengaran formal OA/DI' },
      { icon: '📋', label: 'Pegawai Compliance', sub: 'Audit dalaman, laporan risiko' },
    ],
  },
  {
    id: 'audit',
    icon: '📋',
    color: 'amber',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    titleColor: 'text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-700',
    title: 'Audit & Pematuhan',
    subtitle: 'Juruaudit ISO · Pegawai Halal JAKIM · Pegawai Kualiti',
    desc: 'Audit yang berkesan bermula dengan temu bual auditee yang berstruktur. VeriRec membantu juruaudit mendokumentasikan penemuan dengan tepat, jana NCR/CAR automatik, dan simpan rekod pematuhan yang tidak boleh dicabar.',
    painPoints: [
      'Nota temu bual auditee ditulis tangan — kehilangan butiran penting',
      'NCR tidak didokumentasikan dengan cukup bukti — auditee pertikaikan penemuan',
      'Laporan audit tidak konsisten antara juruaudit berbeza dalam satu pasukan',
      'Tiada rekod audio — syarikat boleh nafikan apa yang dipersetujui semasa audit',
    ],
    features: [
      'Soalan panduan mengikut standard — ISO 9001, ISO 19011, JAKIM halal guidelines',
      'Jana NCR/CAR automatik dari transkrip audit dengan AI',
      'Laporan audit PDF dengan SHA-256 — bukti kukuh untuk badan pensijilan',
      'Trend pematuhan — pantau kadar NCR dari masa ke masa',
      'Mod luar talian — rakam audit di kawasan kilang tanpa internet',
    ],
    professions: [
      { icon: '🔍', label: 'Juruaudit ISO', sub: 'ISO 9001, ISO 19011, PDCA' },
      { icon: '🌙', label: 'Pegawai Halal JAKIM', sub: 'Audit premis & rantaian bekalan' },
      { icon: '✅', label: 'Pegawai Kualiti', sub: 'QA audit, siasatan NCR' },
    ],
  },
  {
    id: 'klinikal',
    icon: '🏥',
    color: 'rose',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    titleColor: 'text-rose-700',
    badgeBg: 'bg-rose-100 text-rose-700',
    title: 'Klinikal & Kebajikan Sosial',
    subtitle: 'Doktor · Pegawai JKM · Pekerja Sosial',
    desc: 'Temubual klinikal dan kes kebajikan melibatkan maklumat sensitif yang memerlukan dokumentasi tepat dan perlindungan data. VeriRec membantu profesion klinikal merekod, menganalisa, dan melaporkan dengan mematuhi PDPA.',
    painPoints: [
      'Nota SOAP ditulis selepas pesakit keluar — bergantung pada ingatan',
      'Kes kebajikan kanak-kanak memerlukan rekod yang tidak boleh dicabar di mahkamah',
      'Tiada sistem konsisten untuk dokumen temubual klinikal',
      'Fail kes JKM berselerak — susah semak semula sejarah kes keluarga',
    ],
    features: [
      'Laporan SOAP automatik (Subjective, Objective, Assessment, Plan)',
      'Fail kes klien terpusat — sesi, nota, rujukan dalam satu platform',
      'Persetujuan maklum PDPA digital — borang ditandatangani sebelum sesi',
      'Transkripsi realtime — doktor fokus pada pesakit, bukan tulis nota',
      'Rujukan kes — hantar nota ke doktor pakar atau agensi lain',
    ],
    professions: [
      { icon: '👨‍⚕️', label: 'Doktor', sub: 'SOAP notes, Calgary-Cambridge' },
      { icon: '🤝', label: 'Pegawai JKM', sub: 'Kes kebajikan, home visit log' },
      { icon: '💙', label: 'Pekerja Sosial', sub: 'Penilaian risiko keluarga' },
    ],
  },
];

const CORE_FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: 'Panduan PEACE Model',
    desc: 'Panel senarai semak PEACE (Perancangan, Hubung & Terang, Keterangan, Penutup, Penilaian) dalam sesi — pastikan setiap peringkat soal siasat diikuti dengan betul.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'SHA-256 Chain of Custody',
    desc: 'Setiap laporan dihaskan dengan SHA-256. Buktikan rekod tidak diubah suai — sah untuk mahkamah, siasatan rasmi, dan audit pematuhan.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    title: 'Transkripsi & Diarisasi Speaker',
    desc: 'Whisper AI transkripsi secara realtime. AssemblyAI kenalpasti suara berbeza — tahu mana penemuduga dan mana subjek. Sokong Bahasa Malaysia dan Inggeris.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI Analisis & Bendera Merah',
    desc: 'Claude AI cadangkan soalan susulan dan kesan percanggahan dalam keterangan secara realtime. Bendera merah automatik untuk kenyataan berisiko tinggi.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Laporan SOP Automatik',
    desc: 'Laporan dijana mengikut SOP profesion — laporan siasatan rasmi, NCR/CAR audit ISO, laporan SOAP perubatan, kes HR. Eksport PDF sedia untuk fail mahkamah.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    title: 'Mod Luar Talian',
    desc: 'Rakam walaupun tiada internet — penting untuk lokasi kawasan terpencil, kilang, atau mahkamah. Data disegerakkan automatik apabila sambungan dipulihkan.',
  },
];

const colorMap = {
  blue:   { section: 'bg-blue-600',   hover: 'hover:bg-blue-700' },
  indigo: { section: 'bg-indigo-600', hover: 'hover:bg-indigo-700' },
  amber:  { section: 'bg-amber-500',  hover: 'hover:bg-amber-600' },
  rose:   { section: 'bg-rose-600',   hover: 'hover:bg-rose-700' },
};

export default function LandingPage() {
  const navigate = useNavigate();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VeriRec',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Platform soal siasat dan audit profesional Malaysia — panduan PEACE Model, SHA-256 chain of custody, AI realtime, laporan SOP untuk polis, MACC, HR, ISO, Halal JAKIM dan lebih lagi.',
    url: 'https://www.verirec.app',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'MYR' },
  };

  return (
    <>
    <Helmet>
      <title>VeriRec — Platform Soal Siasat & Audit Profesional Malaysia</title>
      <meta name="description" content="Platform rakaman soal siasat dan audit profesional Malaysia. Panduan PEACE Model, SHA-256 chain of custody, AI realtime untuk Polis, MACC, HR, ISO, Halal JAKIM, Peguam dan lebih lagi." />
      <link rel="canonical" href="https://www.verirec.app/" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://www.verirec.app/" />
      <meta property="og:title" content="VeriRec — Platform Soal Siasat & Audit Profesional Malaysia" />
      <meta property="og:description" content="Soal siasat dengan tepat. Dok. Buktikan. Tak boleh dicabar. SHA-256 chain of custody, panduan PEACE Model, AI realtime." />
      <meta property="og:locale" content="ms_MY" />
      <meta name="twitter:card" content="summary_large_image" />
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
            <a href="#profesion" className="hover:text-blue-600 transition-colors">Untuk Siapa</a>
            <a href="#ciri" className="hover:text-blue-600 transition-colors">Ciri-ciri</a>
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
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
            PEACE Model · SHA-256 Chain of Custody · AI Realtime · PDPA-Compliant
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Soal Siasat dengan Tepat.<br />
            <span className="text-blue-600">Dok. Buktikan. Tak Boleh Dicabar.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Platform rakaman soal siasat dan audit profesional Malaysia — direka untuk penyiasat, juruaudit, doktor, dan pegawai yang rekodnya perlu sah di sisi undang-undang.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth?mode=register')} className="text-base px-8">
              Cuba Percuma — 2 Sesi
            </Button>
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Log Masuk →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">Tanpa kad kredit · Batalkan bila-bila masa</p>
        </div>

        {/* Trust badges */}
        <div className="max-w-3xl mx-auto mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'PEACE Model', sub: 'Panduan soal siasat berstruktur' },
            { label: 'SHA-256', sub: 'Chain of custody kekal' },
            { label: 'AI Realtime', sub: 'Cadangan soalan + bendera merah' },
            { label: '11 Profesion', sub: 'Laporan SOP khusus setiap satu' },
          ].map(b => (
            <div key={b.label} className="bg-white rounded-xl border p-4 text-center shadow-sm">
              <p className="font-bold text-gray-900 text-sm">{b.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Untuk Siapa */}
      <section id="profesion" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Untuk Profesion Anda</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              VeriRec dibina khusus untuk profesional yang rekodnya perlu tepat, kukuh, dan sah — bukan sekadar alat rakaman biasa.
            </p>
          </div>

          <div className="space-y-8">
            {PROFESSION_GROUPS.map((g) => {
              const cm = colorMap[g.color];
              return (
                <div key={g.id} className={`bg-white rounded-2xl border-2 ${g.border} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="grid lg:grid-cols-2 gap-0">

                    {/* Left — identity + pain points */}
                    <div className={`p-8 ${g.bg}`}>
                      <div className="flex items-center gap-4 mb-5">
                        <div className={`w-14 h-14 ${g.iconBg} rounded-2xl flex items-center justify-center text-3xl flex-shrink-0`}>
                          {g.icon}
                        </div>
                        <div>
                          <h3 className={`text-xl font-bold ${g.titleColor}`}>{g.title}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{g.subtitle}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed mb-5">{g.desc}</p>

                      {/* Pain points */}
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Masalah yang diselesaikan</p>
                        {g.painPoints.map((pt, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <span className="text-red-400 text-sm flex-shrink-0 mt-0.5">✗</span>
                            <span className="text-sm text-gray-600">{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right — features + professions */}
                    <div className="p-8 flex flex-col justify-between">
                      {/* Features */}
                      <div className="mb-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Apa yang anda dapat</p>
                        <ul className="space-y-2">
                          {g.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <CheckIcon />
                              <span className="text-sm text-gray-700">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Profession chips + CTA */}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Profesion dalam kumpulan ini</p>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {g.professions.map(p => (
                            <div key={p.label} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${g.badgeBg}`}>
                              <span>{p.icon}</span>
                              <span>{p.label}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => navigate('/auth?mode=register')}
                          className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors ${cm.section} ${cm.hover}`}
                        >
                          Cuba Percuma — 2 Sesi Tanpa Kad Kredit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="ciri" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Direka untuk Penyiasat & Auditor</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Setiap ciri dibina untuk keperluan soal siasat dan audit — bukan sekadar alat rakaman biasa.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CORE_FEATURES.map(f => (
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Harga yang Jelas, Tanpa Kejutan</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">Satu plan profesional. Top-up bila perlu. Tanpa kontrak jangka panjang.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free plan */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-7 flex flex-col">
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">Percuma</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900">RM0</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Untuk dicuba, selama-lamanya</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {['2 sesi sebulan', 'Transkripsi AI realtime', 'Laporan asas PDF', 'SHA-256 chain of custody', '1 pengguna'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/auth?mode=register')} className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Mulakan Percuma
              </button>
            </div>

            {/* Professional plan */}
            <div className="bg-white rounded-2xl border-2 border-blue-500 p-7 flex flex-col relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">PALING POPULAR</span>
              </div>
              <div className="mb-5">
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-1">Profesional</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900">RM100</span>
                  <span className="text-gray-400 mb-1">/bulan</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">20 sesi termasuk setiap bulan</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {[
                  '20 sesi rakaman / bulan',
                  'AI analisis + bendera merah realtime',
                  'Panduan PEACE Model dalam sesi',
                  'Laporan SOP PDF (mengikut profesion)',
                  'SHA-256 chain of custody',
                  'Diarisasi speaker automatik',
                  'Fail subjek & kes terpusat',
                  'Top-up sesi bila perlu',
                  'Sokongan e-mel keutamaan',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/auth?mode=register')} className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                Cuba 14 Hari Percuma →
              </button>
              <p className="text-xs text-center text-gray-400 mt-2">Tiada kad kredit diperlukan semasa trial</p>
            </div>
          </div>

          {/* Top-up table */}
          <div className="mt-10 max-w-md mx-auto bg-white rounded-2xl border p-6">
            <p className="text-sm font-bold text-gray-700 mb-4 text-center">Top-up Sesi Tambahan</p>
            <div className="space-y-3">
              {[
                { qty: '1 sesi', price: 'RM13', per: 'RM13/sesi' },
                { qty: '5 sesi', price: 'RM60', per: 'RM12/sesi' },
                { qty: '10 sesi', price: 'RM100', per: 'RM10/sesi — jimat 23%' },
              ].map(t => (
                <div key={t.qty} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{t.qty}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">{t.per}</span>
                    <span className="font-bold text-gray-900">{t.price}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">Top-up tidak luput · Tidak reset bulanan</p>
          </div>

          {/* Enterprise note */}
          <p className="text-center text-sm text-gray-500 mt-8">
            Perlukan lebih 20 sesi sebulan atau akaun untuk pasukan besar?{' '}
            <a href="mailto:hello@verirec.app" className="text-blue-600 hover:underline font-medium">Hubungi kami</a>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Mula Rakam Sesi Pertama Anda</h2>
          <p className="text-blue-100 mb-8 text-lg">2 sesi percuma. Tanpa kad kredit. Tanpa komitmen.</p>
          <button
            onClick={() => navigate('/auth?mode=register')}
            className="px-10 py-4 bg-white text-blue-600 font-bold text-base rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            Cuba VeriRec Percuma →
          </button>
          <p className="text-blue-200 text-xs mt-4">Lebih 11 profesion · SHA-256 · PDPA-Compliant · Made in Malaysia</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-bold text-white">VeriRec</span>
              <span className="text-xs text-gray-500 ml-2">Platform Soal Siasat & Audit Profesional Malaysia</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <button onClick={() => navigate('/faq')} className="hover:text-white transition-colors">FAQ</button>
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
