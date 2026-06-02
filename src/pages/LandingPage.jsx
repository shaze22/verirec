import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0">
    <rect width="32" height="32" rx="8" fill="#2563eb"/>
    <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

function Check({ className = 'w-4 h-4 text-green-500' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AppMockup() {
  return (
    <div className="bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden shadow-2xl text-xs font-sans">
      <div className="bg-gray-200 px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 ml-2">
          www.verirec.app — Active Session
        </div>
      </div>
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-xs">Ahmad bin Rosli · SPRM Case #2026-0042</span>
        <span className="flex items-center gap-1.5 text-red-600 font-semibold text-[11px]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
          Recording — 14:32
        </span>
      </div>
      <div className="grid grid-cols-5 bg-white">
        <div className="col-span-3 border-r border-gray-100 p-4 space-y-2.5">
          <p className="text-[11px] font-semibold text-gray-400 mb-2">Live Transcript</p>
          {[
            { sp: 'Officer', text: 'Describe your role in the procurement process.', cls: 'bg-blue-50 text-blue-800 border-blue-100' },
            { sp: 'Subject', text: 'I approved vendor selections above RM50,000.', cls: 'bg-gray-50 text-gray-700 border-gray-100' },
            { sp: 'Subject', text: 'The vendor was selected before the tender officially closed.', cls: 'bg-red-50 text-red-700 border-red-200' },
          ].map((t, i) => (
            <div key={i} className={`rounded-lg border px-3 py-2 ${t.cls}`}>
              <div className="text-[9px] font-bold uppercase tracking-wide opacity-60 mb-0.5">{t.sp}</div>
              <div className="text-[11px] leading-snug">{t.text}</div>
            </div>
          ))}
          <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
            Listening...
          </div>
        </div>
        <div className="col-span-2 p-4 space-y-2.5 bg-gray-50">
          <p className="text-[11px] font-semibold text-gray-400 mb-1">AI Analysis</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
            <div className="text-[10px] font-bold text-red-700">⚠ Red Flag Detected</div>
            <div className="text-[10px] text-red-600 mt-1 leading-snug">Tender timeline inconsistency. Follow up on vendor selection date vs close date.</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-2.5">
            <div className="text-[10px] font-semibold text-gray-600 mb-1.5">Suggested Follow-ups</div>
            {['Who approved the early selection?', 'Request vendor minutes document', 'Confirm tender close date'].map(q => (
              <div key={q} className="flex items-start gap-1.5 text-[10px] text-gray-600 mb-1 leading-snug">
                <span className="text-blue-500 mt-0.5 shrink-0">→</span><span>{q}</span>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-2.5">
            <div className="text-[10px] font-semibold text-gray-600 mb-1.5">PEACE Phase</div>
            <div className="flex gap-1.5">
              {['P','E','A','C','E'].map((ph, i) => (
                <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${i === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{ph}</div>
              ))}
            </div>
            <div className="text-[9px] text-gray-400 mt-1">Account — gathering testimony</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PROFESSIONS = [
  '👮 Police', '⚖️ SPRM / MACC', '🔒 SISPA', '📡 MCMC', '⚖️ Lawyers', '🏭 JTK',
  '👔 HR Investigator', '🏛️ Disciplinary Panel', '📋 Compliance Officer',
  '🔍 ISO Auditor', '🌙 JAKIM Halal', '✅ Quality Officer',
  '👨‍⚕️ Doctor', '🤝 JKM Officer', '💙 Social Worker',
];

const FEATURES = [
  { icon: '⚖️', title: 'PEACE Model Guide', desc: '5-phase checklist panel in every session — Planning, Engage, Account, Closure, Evaluation. Never miss a step.' },
  { icon: '🔐', title: 'SHA-256 Chain of Custody', desc: 'Every report is cryptographically hashed on generation. Prove it was never altered — court and audit ready.' },
  { icon: '🎙️', title: 'Speaker Diarization', desc: 'Automatic identification of who said what. Real-time transcript with officer and subject clearly labeled.' },
  { icon: '🤖', title: 'AI Red Flags & Suggestions', desc: 'Claude AI detects testimony contradictions and suggests follow-up questions in real-time during the session.' },
  { icon: '📄', title: 'SOP Reports by Profession', desc: 'Auto-generated in the exact format required — investigation, NCR/CAR, SOAP, disciplinary. Export as signed PDF.' },
  { icon: '📡', title: 'Offline Mode', desc: 'Record in any location — factory floors, remote areas, courts. Data syncs automatically when back online.' },
];

const WHO_FOR = [
  {
    icon: '👮',
    title: 'Enforcement & Investigators',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    chip: 'bg-blue-100 text-blue-700',
    professions: ['Police', 'SPRM/MACC', 'SISPA', 'MCMC', 'Lawyers', 'JTK'],
    value: 'Court-ready investigation reports with PEACE Model and SHA-256.',
  },
  {
    icon: '🏢',
    title: 'HR & Corporate',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    chip: 'bg-indigo-100 text-indigo-700',
    professions: ['HR Investigator', 'Disciplinary Panel', 'Compliance Manager'],
    value: 'Uniform disciplinary records that cannot be contested by employees.',
  },
  {
    icon: '📋',
    title: 'Audit & Compliance',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    chip: 'bg-amber-100 text-amber-700',
    professions: ['ISO Auditor', 'JAKIM Halal', 'Quality Officer'],
    value: 'Auto-generate NCR/CAR from audit transcripts with backed evidence.',
  },
  {
    icon: '🏥',
    title: 'Clinical & Social Welfare',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    chip: 'bg-rose-100 text-rose-700',
    professions: ['Doctor', 'JKM Officer', 'Social Worker'],
    value: 'SOAP notes auto-generated. PDPA-compliant case files and referrals.',
  },
];

const COMPARE = [
  { feature: 'Works without manual note-taking',   verirec: true,  paper: false, recorder: false },
  { feature: 'Auto-generates official reports',     verirec: true,  paper: false, recorder: false },
  { feature: 'SHA-256 chain of custody',            verirec: true,  paper: false, recorder: false },
  { feature: 'Real-time AI suggestions',            verirec: true,  paper: false, recorder: false },
  { feature: 'Identifies who said what',            verirec: true,  paper: false, recorder: false },
  { feature: 'Court & audit ready output',          verirec: true,  paper: false, recorder: false },
  { feature: 'Works offline',                       verirec: true,  paper: true,  recorder: true  },
  { feature: 'PDPA 2010 compliant',                 verirec: true,  paper: false, recorder: false },
];

function Tick({ yes }) {
  return yes
    ? <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-white" /></span>
    : <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 text-red-400 text-xs font-bold">✕</span>;
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <>
    <Helmet>
      <title>VeriRec — Professional Interview & Audit Platform</title>
      <meta name="description" content="AI transcription, SHA-256 chain of custody, and SOP reports for Police, MACC, HR, ISO, Halal JAKIM, Lawyers and more. Make every record unchallengeable." />
      <link rel="canonical" href="https://www.verirec.app/" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://www.verirec.app/" />
      <meta property="og:title" content="VeriRec — Make Every Interview Record Unchallengeable" />
      <meta property="og:description" content="AI transcription, SHA-256 chain of custody, and SOP reports for investigators, auditors, and officers." />
      <meta property="og:locale" content="en_MY" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <div className="min-h-screen bg-white">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-gray-900 text-lg">VeriRec</span>
          </div>
          <div className="hidden sm:flex items-center gap-7 text-sm text-gray-500">
            <a href="#profesion" className="hover:text-gray-900 transition-colors">Who It's For</a>
            <a href="#ciri"      className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#harga"     className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="/faq"       className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth')} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign In</button>
            <button onClick={() => navigate('/auth?mode=register')} className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-blue-700 transition-colors">
              Try Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-500 text-xs font-medium px-4 py-2 rounded-full mb-8">
            SHA-256 · PDPA 2010 · 11+ Professions · Made in Malaysia
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 leading-[1.05] tracking-tight mb-7">
            Make every interview<br />record unchallengeable.
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI transcription, SHA-256 chain of custody, and profession-specific SOP reports — built for investigators, auditors, and officers whose records must hold up in court.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/auth?mode=register')}
              className="px-8 py-4 bg-blue-600 text-white font-bold text-base rounded-full hover:bg-blue-700 transition-colors shadow-md"
            >
              Try Free — 2 Sessions
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-4 text-gray-700 font-medium text-base rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Sign In →
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-4">No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── Professions strip ── */}
      <section className="py-8 bg-gray-50">
        <p className="text-center text-sm text-gray-400 font-medium mb-5">Trusted by professionals across disciplines</p>
        <div className="flex gap-2.5 flex-wrap justify-center px-6 max-w-5xl mx-auto">
          {PROFESSIONS.map(p => (
            <span key={p} className="bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-full">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* ── Narrative ── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-5">
            Handwritten notes get challenged.
          </p>
          <p className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-200 leading-tight mb-5">
            Basic recorders have no custody trail.
          </p>
          <p className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-200 leading-tight mb-16">
            Spreadsheet reports get disputed in court.
          </p>
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-white" />
            </div>
            <p className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900">VeriRec fixes that.</p>
          </div>
        </div>
      </section>

      {/* ── App mockup ── */}
      <section className="pb-20 px-6 bg-gray-50 pt-16">
        <div className="max-w-5xl mx-auto">
          <AppMockup />
          <p className="text-center text-sm text-gray-400 mt-6">
            Real-time transcription · AI red flags & suggestions · SHA-256 signed on every report
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 text-center mb-20">
            3 steps to a court-ready record
          </h2>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                num: '01',
                title: 'Set up the session',
                desc: 'Select your profession, enter subject details, and link to a case file. VeriRec loads the right SOP template automatically.',
              },
              {
                num: '02',
                title: 'Record with AI assistance',
                desc: 'Real-time transcription identifies each speaker. The AI panel flags contradictions and suggests follow-up questions live.',
              },
              {
                num: '03',
                title: 'Export the signed report',
                desc: 'A SHA-256 hashed PDF is generated the moment the session ends — ready for court files, audit submissions, or official records.',
              },
            ].map(s => (
              <div key={s.num}>
                <div className="text-8xl font-black text-gray-100 leading-none mb-5 select-none">{s.num}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="ciri" className="py-28 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">
              Everything built for<br />documentation that matters
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-5">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section id="profesion" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">Who it's for</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {WHO_FOR.map(w => (
              <div key={w.title} className={`rounded-2xl p-8 ${w.bg}`}>
                <div className="text-4xl mb-4">{w.icon}</div>
                <h3 className={`text-xl font-black ${w.color} mb-2`}>{w.title}</h3>
                <p className="text-sm text-gray-600 mb-5 leading-relaxed">{w.value}</p>
                <div className="flex flex-wrap gap-2">
                  {w.professions.map(p => (
                    <span key={p} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${w.chip}`}>{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/auth?mode=register')}
              className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold px-8 py-4 rounded-full hover:bg-gray-800 transition-colors"
            >
              Try Free — 2 Sessions, No Credit Card →
            </button>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="py-28 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">VeriRec vs the alternatives</h2>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
            {/* Header row */}
            <div className="grid grid-cols-4 border-b border-gray-100 bg-gray-50">
              <div className="p-5" />
              <div className="p-5 text-center border-l border-gray-100">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Logo />
                </div>
                <div className="font-bold text-gray-900 text-sm">VeriRec</div>
              </div>
              <div className="p-5 text-center border-l border-gray-100">
                <div className="text-2xl mb-1">📝</div>
                <div className="font-medium text-gray-400 text-sm">Paper Notes</div>
              </div>
              <div className="p-5 text-center border-l border-gray-100">
                <div className="text-2xl mb-1">🎙️</div>
                <div className="font-medium text-gray-400 text-sm">Basic Recorder</div>
              </div>
            </div>
            {/* Data rows */}
            {COMPARE.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-4 ${i < COMPARE.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="p-4 text-sm text-gray-700 font-medium flex items-center">{row.feature}</div>
                <div className="p-4 flex justify-center items-center border-l border-gray-50 bg-blue-50/20">
                  <Tick yes={row.verirec} />
                </div>
                <div className="p-4 flex justify-center items-center border-l border-gray-50">
                  <Tick yes={row.paper} />
                </div>
                <div className="p-4 flex justify-center items-center border-l border-gray-50">
                  <Tick yes={row.recorder} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="harga" className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">Simple pricing</h2>
            <p className="text-xl text-gray-500 mt-4">One professional plan. Top-up when needed. No contracts.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <div className="bg-gray-50 rounded-2xl p-8 flex flex-col">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">Free</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-gray-900">$0</span>
              </div>
              <p className="text-gray-400 text-sm mb-8">Forever free</p>
              <ul className="space-y-3 flex-1 mb-8">
                {['2 sessions per month', 'AI real-time transcription', 'Basic PDF report', 'SHA-256 chain of custody'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth?mode=register')}
                className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-white transition-colors"
              >
                Start Free
              </button>
            </div>

            {/* Professional */}
            <div className="bg-blue-600 rounded-2xl p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-gray-900 text-white text-xs font-black px-3 py-1 rounded-full tracking-wide">MOST POPULAR</span>
              </div>
              <p className="text-xs font-black text-blue-300 uppercase tracking-widest mb-5">Professional</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">$25</span>
                <span className="text-blue-300 mb-2 text-sm">/month</span>
              </div>
              <p className="text-blue-300 text-sm mb-8">10 sessions per month</p>
              <ul className="space-y-3 flex-1 mb-8">
                {[
                  '10 recording sessions / month',
                  'AI analysis + real-time red flags',
                  'PEACE Model guide',
                  'SOP PDF report by profession',
                  'SHA-256 chain of custody',
                  'Automatic speaker diarization',
                  'Case files & subjects',
                  'Top-up sessions available',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-white">
                    <Check className="w-4 h-4 text-blue-200 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth?mode=register')}
                className="w-full py-3.5 rounded-xl bg-white text-blue-600 font-black text-sm hover:bg-blue-50 transition-colors"
              >
                Get Started →
              </button>
              <p className="text-xs text-center text-blue-300 mt-3">No long-term contract · Cancel anytime</p>
            </div>
          </div>

          {/* Top-up table */}
          <div className="mt-10 max-w-md mx-auto bg-gray-50 rounded-2xl p-6">
            <p className="text-sm font-bold text-gray-700 mb-5 text-center">Additional Session Top-Up</p>
            <div className="space-y-3">
              {[
                { qty: '1 session',   price: '$3',  per: '$3.00 / session' },
                { qty: '5 sessions',  price: '$12', per: '$2.40 / session' },
                { qty: '10 sessions', price: '$22', per: '$2.20 / session — save 27%' },
              ].map(t => (
                <div key={t.qty} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">{t.qty}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">{t.per}</span>
                    <span className="font-black text-gray-900">{t.price}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-5">Top-ups never expire · No monthly reset</p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Need more than 10 sessions or a large team?{' '}
            <a href="mailto:hello@verirec.app" className="text-blue-600 hover:underline font-semibold">Contact us</a>
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-5">
            Start recording your<br />first session today
          </h2>
          <p className="text-xl text-gray-500 mb-10">2 sessions free. No credit card. No commitment.</p>
          <button
            onClick={() => navigate('/auth?mode=register')}
            className="px-10 py-4 bg-blue-600 text-white font-black text-base rounded-full hover:bg-blue-700 transition-colors shadow-lg"
          >
            Try VeriRec Free →
          </button>
          <p className="text-sm text-gray-400 mt-5">SHA-256 · PDPA 2010 · Made in Malaysia</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-bold text-white">VeriRec</span>
              <span className="text-xs text-gray-600 ml-1">Professional Interview & Audit Platform</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <button onClick={() => navigate('/faq')}     className="hover:text-white transition-colors">FAQ</button>
              <button onClick={() => navigate('/terms')}   className="hover:text-white transition-colors">Terms</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy</button>
              <a href="mailto:hello@verirec.app"           className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} VeriRec. Built in Malaysia. PDPA 2010 Compliant.
          </div>
        </div>
      </footer>

    </div>
    </>
  );
}
