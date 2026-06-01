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
    title: 'Enforcement & Investigators',
    subtitle: 'Police · SPRM/MACC · SISPA · MCMC · JTK · Lawyers',
    desc: 'Weak interviews can damage cases in court. VeriRec ensures every session is conducted according to SOP, with secure recordings and reports ready for prosecution.',
    painPoints: [
      'Subject testimony not properly recorded — risk of case collapse in court',
      'No structured interview guide — interviewers rely on memory alone',
      'Investigation reports written by hand — slow, inconsistent, easily challenged',
      'Weak digital evidence chain of custody — defense lawyers can question validity',
    ],
    features: [
      'PEACE Model guide — 5 phases with a checklist per stage',
      'SHA-256 chain of custody — reports cannot be altered after generation',
      'Automatic speaker diarization — identify officer vs subject in transcript',
      'Official investigation report PDF — ready for court files and prosecution',
      'Real-time red flags — detect testimony contradictions during the session',
    ],
    professions: [
      { icon: '👮', label: 'Police', sub: 'PEACE Model, Cognitive Interview' },
      { icon: '⚖️', label: 'SPRM / MACC', sub: 'SKIM/FIAU Guidelines, UNCAC' },
      { icon: '🔒', label: 'SISPA', sub: 'Intelligence & security investigation' },
      { icon: '📡', label: 'MCMC', sub: 'Communications & media investigation' },
      { icon: '⚖️', label: 'Lawyer', sub: 'Case notes, legal consultation' },
      { icon: '🏭', label: 'JTK Officer', sub: 'Labour & safety investigation' },
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
    title: 'HR & Corporate Disciplinary Investigation',
    subtitle: 'HR Investigators · Disciplinary Panel · Compliance Managers',
    desc: 'Employee disciplinary investigations require transparent and unbiased records. VeriRec helps HR document every session fairly, consistently, and in an auditable manner.',
    painPoints: [
      'Incomplete disciplinary meeting minutes — employees can challenge decisions',
      'No audio records — employees claim their words were distorted',
      'Disciplinary panel reports inconsistent across different managers',
      'Scattered case files — difficult to review employee case history',
    ],
    features: [
      'Audio recording + automatic transcript for every disciplinary session',
      'SOP disciplinary panel report — uniform format for all managers',
      'SHA-256 hash — prove transcript was not altered after session',
      'Centralized employee case files — review previous records in one place',
      'Digital informed consent — PDPA-compliant audit trail',
    ],
    professions: [
      { icon: '👔', label: 'HR Investigator', sub: 'Employee disciplinary investigation' },
      { icon: '🏛️', label: 'Disciplinary Panel', sub: 'Formal OA/DI hearings' },
      { icon: '📋', label: 'Compliance Officer', sub: 'Internal audit, risk reports' },
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
    title: 'Audit & Compliance',
    subtitle: 'ISO Auditors · JAKIM Halal Officers · Quality Officers',
    desc: 'Effective auditing starts with structured auditee interviews. VeriRec helps auditors document findings accurately, generate NCR/CAR automatically, and store compliance records that cannot be challenged.',
    painPoints: [
      'Auditee interview notes written by hand — loss of important details',
      'NCR not documented with sufficient evidence — auditee challenges findings',
      'Audit reports inconsistent across different auditors in one team',
      'No audio records — company can deny what was agreed during audit',
    ],
    features: [
      'Standard-based guide questions — ISO 9001, ISO 19011, JAKIM halal guidelines',
      'Automatically generate NCR/CAR from audit transcript with AI',
      'Audit PDF report with SHA-256 — strong evidence for certification bodies',
      'Compliance trend — monitor NCR rate over time',
      'Offline mode — record audits in factory areas without internet',
    ],
    professions: [
      { icon: '🔍', label: 'ISO Auditor', sub: 'ISO 9001, ISO 19011, PDCA' },
      { icon: '🌙', label: 'JAKIM Halal Officer', sub: 'Premises & supply chain audit' },
      { icon: '✅', label: 'Quality Officer', sub: 'QA audit, NCR investigation' },
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
    title: 'Clinical & Social Welfare',
    subtitle: 'Doctors · JKM Officers · Social Workers',
    desc: 'Clinical interviews and welfare cases involve sensitive information requiring precise documentation and data protection. VeriRec helps clinical professionals record, analyze, and report in PDPA compliance.',
    painPoints: [
      'SOAP notes written after patient leaves — relying on memory',
      'Child welfare cases require records that cannot be challenged in court',
      'No consistent system for clinical interview documentation',
      'JKM case files scattered — difficult to review family case history',
    ],
    features: [
      'Automatic SOAP report (Subjective, Objective, Assessment, Plan)',
      'Centralized client case files — sessions, notes, referrals in one platform',
      'Digital PDPA-compliant informed consent — form signed before session',
      'Real-time transcription — doctors focus on patients, not note-taking',
      'Case referral — send notes to specialist doctors or other agencies',
    ],
    professions: [
      { icon: '👨‍⚕️', label: 'Doctor', sub: 'SOAP notes, Calgary-Cambridge' },
      { icon: '🤝', label: 'JKM Officer', sub: 'Welfare cases, home visit log' },
      { icon: '💙', label: 'Social Worker', sub: 'Family risk assessment' },
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
    title: 'PEACE Model Guide',
    desc: 'PEACE checklist panel (Planning, Engage & Explain, Account, Closure, Evaluation) within the session — ensure every interview stage is followed correctly.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'SHA-256 Chain of Custody',
    desc: 'Every report is hashed with SHA-256. Prove records have not been tampered with — valid for courts, official investigations, and compliance audits.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    title: 'Transcription & Speaker Diarization',
    desc: 'Whisper AI transcribes in real-time. AssemblyAI identifies different voices — know which is the interviewer and which is the subject. Supports Malay and English.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI Analysis & Red Flags',
    desc: 'Claude AI suggests follow-up questions and detects testimony contradictions in real-time. Automatic red flags for high-risk statements.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Automatic SOP Reports',
    desc: 'Reports generated according to profession SOP — official investigation reports, ISO audit NCR/CAR, medical SOAP reports, HR cases. Export PDF ready for court files.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    title: 'Offline Mode',
    desc: 'Record even without internet — essential for remote locations, factories, or courts. Data syncs automatically when connection is restored.',
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
    description: 'Professional interview and audit platform — PEACE Model guide, SHA-256 chain of custody, AI real-time, SOP reports for police, MACC, HR, ISO, Halal JAKIM and more.',
    url: 'https://www.verirec.app',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'MYR' },
  };

  return (
    <>
    <Helmet>
      <title>VeriRec — Professional Interview & Audit Platform</title>
      <meta name="description" content="Professional interview and audit recording platform. PEACE Model guide, SHA-256 chain of custody, AI real-time for Police, MACC, HR, ISO, Halal JAKIM, Lawyers and more." />
      <link rel="canonical" href="https://www.verirec.app/" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://www.verirec.app/" />
      <meta property="og:title" content="VeriRec — Professional Interview & Audit Platform" />
      <meta property="og:description" content="Interview accurately. Document. Prove. Cannot be challenged. SHA-256 chain of custody, PEACE Model guide, AI real-time." />
      <meta property="og:locale" content="en_MY" />
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
            <a href="#profesion" className="hover:text-blue-600 transition-colors">Who It's For</a>
            <a href="#ciri" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#harga" className="hover:text-blue-600 transition-colors">Pricing</a>
            <a href="/faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth')} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Sign In</button>
            <Button size="sm" onClick={() => navigate('/auth?mode=register')}>Try Free</Button>
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
            Interview Accurately.<br />
            <span className="text-blue-600">Document. Prove. Cannot Be Challenged.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Professional interview and audit recording platform — designed for investigators, auditors, doctors, and officers whose records must be legally valid.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth?mode=register')} className="text-base px-8">
              Try Free — 2 Sessions
            </Button>
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign In →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">No credit card · Cancel anytime</p>
        </div>

        {/* Trust badges */}
        <div className="max-w-3xl mx-auto mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'PEACE Model', sub: 'Structured interview guide' },
            { label: 'SHA-256', sub: 'Permanent chain of custody' },
            { label: 'AI Real-time', sub: 'Question suggestions + red flags' },
            { label: '11 Professions', sub: 'Custom SOP reports for each' },
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
            <h2 className="text-3xl font-bold text-gray-900">For Your Profession</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              VeriRec is built specifically for professionals whose records need to be accurate, robust, and legally valid — not just an ordinary recording tool.
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
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Problems solved</p>
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
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">What you get</p>
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
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Professions in this group</p>
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
                          Try Free — 2 Sessions, No Credit Card
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
            <h2 className="text-3xl font-bold text-gray-900">Built for Investigators &amp; Auditors</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Every feature built for interview and audit needs — not just an ordinary recording tool.</p>
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
            <h2 className="text-3xl font-bold text-gray-900">Clear Pricing, No Surprises</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">One professional plan. Top-up when needed. No long-term contract.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free plan */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-7 flex flex-col">
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900">RM0</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Try forever, free</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {['2 sessions per month', 'AI real-time transcription', 'Basic PDF report', 'SHA-256 chain of custody', '1 user'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/auth?mode=register')} className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Start Free
              </button>
            </div>

            {/* Professional plan */}
            <div className="bg-white rounded-2xl border-2 border-blue-500 p-7 flex flex-col relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
              </div>
              <div className="mb-5">
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-1">Professional</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900">RM100</span>
                  <span className="text-gray-400 mb-1">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">10 sessions included per month</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {[
                  '10 recording sessions / month',
                  'AI analysis + real-time red flags',
                  'PEACE Model guide in session',
                  'SOP PDF report (by profession)',
                  'SHA-256 chain of custody',
                  'Automatic speaker diarization',
                  'Centralized subject & case files',
                  'Top-up sessions when needed',
                  'Priority email support',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/auth?mode=register')} className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                Get Started Now →
              </button>
              <p className="text-xs text-center text-gray-400 mt-2">No long-term contract · Cancel anytime</p>
            </div>
          </div>

          {/* Top-up table */}
          <div className="mt-10 max-w-md mx-auto bg-white rounded-2xl border p-6">
            <p className="text-sm font-bold text-gray-700 mb-4 text-center">Additional Session Top-Up</p>
            <div className="space-y-3">
              {[
                { qty: '1 session', price: 'RM13', per: 'RM13/session' },
                { qty: '5 sessions', price: 'RM60', per: 'RM12/session' },
                { qty: '10 sessions', price: 'RM100', per: 'RM10/session — save 23%' },
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
            <p className="text-xs text-gray-400 text-center mt-4">Top-ups never expire · No monthly reset</p>
          </div>

          {/* Enterprise note */}
          <p className="text-center text-sm text-gray-500 mt-8">
            Need more than 10 sessions per month or accounts for a large team?{' '}
            <a href="mailto:hello@verirec.app" className="text-blue-600 hover:underline font-medium">Contact us</a>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start Recording Your First Session</h2>
          <p className="text-blue-100 mb-8 text-lg">2 sessions free. No credit card. No commitment.</p>
          <button
            onClick={() => navigate('/auth?mode=register')}
            className="px-10 py-4 bg-white text-blue-600 font-bold text-base rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            Try VeriRec Free →
          </button>
          <p className="text-blue-200 text-xs mt-4">11+ Professions · SHA-256 · PDPA-Compliant · Made in Malaysia</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-bold text-white">VeriRec</span>
              <span className="text-xs text-gray-500 ml-2">Professional Interview &amp; Audit Platform</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <button onClick={() => navigate('/faq')} className="hover:text-white transition-colors">FAQ</button>
              <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy</button>
              <a href="mailto:hello@verirec.app" className="hover:text-white transition-colors">Contact Us</a>
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
