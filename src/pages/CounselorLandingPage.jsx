import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0">
    <rect width="32" height="32" rx="8" fill="#8b5cf6"/>
    <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const features = [
  { icon: '📅', title: 'QR Booking', desc: 'Clients book themselves via your personal QR link. Slots, confirmations, and reminders handled automatically.' },
  { icon: '🔴', title: 'AI Red Flag Detection', desc: 'Detects suicide risk, self-harm signals, and crisis indicators in real time during the session.' },
  { icon: '🎙️', title: 'Session Transcription', desc: 'Upload any audio recording. AI transcribes, identifies speakers, and generates a full clinical report automatically.' },
  { icon: '📊', title: 'Clinical Assessments', desc: 'Built-in PHQ-9, GAD-7, DASS-21, RIASEC, and Big Five panels. Send secure links to clients. Auto-scored and saved to their file.' },
  { icon: '📝', title: 'SOAP/DAP Session Notes', desc: 'Structured SOAP & DAP note templates with colour-coded fields. Print-ready clinical format in seconds.' },
  { icon: '🗂️', title: 'Digital Client Files', desc: 'Full profile, risk tiers, action plans, referrals, progress notes, session history. All in one organised place.' },
];

const DEMO_TABS = [
  { id: 'dash',    label: 'Dashboard',    icon: '📊' },
  { id: 'appt',   label: 'Appointments', icon: '📅' },
  { id: 'session', label: 'Session',      icon: '🎙️' },
  { id: 'report',  label: 'Report',       icon: '📋' },
];

function DemoAppointments() {
  const [tab, setTab] = useState('requests');
  const requests = [
    { name: 'Ahmad Faris', time: 'Tue 4 Jun · 2:00 PM', issue: 'Exam anxiety', status: 'pending' },
    { name: 'Nurul Ain', time: 'Wed 5 Jun · 10:00 AM', issue: 'Family conflict', status: 'pending' },
  ];
  const upcoming = [
    { name: 'Siti Rashidah', time: 'Today · 3:30 PM', status: 'confirmed' },
    { name: 'Muhammad Hafiz', time: 'Tomorrow · 9:00 AM', status: 'confirmed' },
    { name: 'Amirul Hakim', time: 'Thu 6 Jun · 11:00 AM', status: 'confirmed' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[['requests', 'Requests (2)'], ['upcoming', 'Upcoming'], ['qr', 'QR & Link']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="space-y-2.5">
          {requests.map(r => (
            <div key={r.name} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-[10px] font-bold text-violet-600">{r.name[0]}</div>
                  <p className="text-xs font-semibold text-gray-900">{r.name}</p>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">New</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-1">📅 {r.time} · {r.issue}</p>
              <div className="flex gap-2">
                <button className="flex-1 bg-violet-600 text-white text-[10px] font-semibold py-1.5 rounded-lg">Confirm</button>
                <button className="flex-1 bg-gray-100 text-gray-600 text-[10px] font-semibold py-1.5 rounded-lg">Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="space-y-2">
          {upcoming.map(a => (
            <div key={a.name} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">{a.name[0]}</div>
                <div>
                  <p className="text-xs font-medium text-gray-900">{a.name}</p>
                  <p className="text-[10px] text-gray-400">{a.time}</p>
                </div>
              </div>
              <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Confirmed</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'qr' && (
        <div className="text-center py-2 space-y-3">
          <div className="w-28 h-28 bg-gray-900 rounded-xl mx-auto flex items-center justify-center">
            <div className="grid grid-cols-3 gap-1 p-2">
              {Array.from({length: 9}).map((_, i) => (
                <div key={i} className={`w-5 h-5 rounded-sm ${[0,2,6,8,4].includes(i) ? 'bg-violet-400' : 'bg-gray-600'}`} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">Your Booking Link</p>
            <p className="text-[10px] text-violet-600 mt-0.5">kaunselor.app/book/suraya-7f2k</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-violet-600 text-white text-[10px] font-medium py-2 rounded-lg text-center">Download QR</div>
            <div className="flex-1 bg-gray-100 text-gray-600 text-[10px] font-medium py-2 rounded-lg text-center">Copy Link</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoSession() {
  const [recording, setRecording] = useState(true);
  const transcript = [
    { speaker: 'Counselor', text: 'How have you been feeling this week overall?', time: '0:12' },
    { speaker: 'Client', text: "Not great honestly. I've been having trouble sleeping and feeling really anxious about exams.", time: '0:18', flag: true },
    { speaker: 'Counselor', text: 'I hear you. Let\'s explore that anxiety. When did it start getting worse?', time: '0:35' },
    { speaker: 'Client', text: "About two weeks ago. Sometimes I feel like I just can't cope anymore.", time: '0:42', flag: true },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-white text-xs font-mono">12:34</span>
          <span className="text-gray-400 text-xs">Ahmad Faris, Session 3</span>
        </div>
        <button onClick={() => setRecording(r => !r)}
          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${recording ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {recording ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>
      <div className="space-y-2 max-h-36 overflow-y-auto">
        {transcript.map((t, i) => (
          <div key={i} className={`rounded-lg p-2.5 text-xs ${t.speaker === 'Counselor' ? 'bg-violet-50 border border-violet-100' : 'bg-gray-50 border border-gray-100'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`font-semibold ${t.speaker === 'Counselor' ? 'text-violet-700' : 'text-gray-600'}`}>{t.speaker}</span>
              <div className="flex items-center gap-1.5">
                {t.flag && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-medium">⚠ Flag</span>}
                <span className="text-gray-400">{t.time}</span>
              </div>
            </div>
            <p className="text-gray-700">{t.text}</p>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-amber-800 mb-1">🧠 AI Suggestion</p>
        <p className="text-xs text-amber-700">Client mentions inability to cope. Consider exploring coping mechanisms using CBT thought records. Monitor for escalation.</p>
      </div>
    </div>
  );
}

function DemoReport() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Session Report: Ahmad Faris</p>
          <p className="text-xs text-gray-400">Generated in 48 seconds · 4 Jun 2026</p>
        </div>
        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">⚠ Moderate Risk</span>
      </div>
      <div className="space-y-2.5 text-xs">
        {[
          { label: 'Presenting Issue', val: 'Exam anxiety and sleep disturbance. Client reports feeling unable to cope.' },
          { label: 'Key Findings', val: '2 red flags detected: coping difficulty, sleep disruption. No suicidal ideation.' },
          { label: 'Intervention', val: 'Psychoeducation on anxiety cycle. CBT thought records introduced. Breathing exercise practised.' },
          { label: 'Follow-Up Plan', val: 'Review sleep diary next session. Refer to student wellness if symptoms persist.' },
        ].map(({ label, val }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3">
            <p className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">{label}</p>
            <p className="text-gray-800 leading-relaxed">{val}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-violet-600 text-white text-xs font-medium py-2 rounded-lg text-center">Export PDF</div>
        <div className="flex-1 bg-gray-100 text-gray-600 text-xs font-medium py-2 rounded-lg text-center">Share Link</div>
      </div>
    </div>
  );
}

function DemoDash() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Clients', val: '24', sub: '+3 this month', color: 'text-violet-600' },
          { label: 'Sessions', val: '3', sub: 'this month', color: 'text-blue-600' },
          { label: 'Risk Flags', val: '3', sub: 'Need follow-up', color: 'text-amber-600' },
        ].map(({ label, val, sub, color }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Today's Appointments</p>
        <div className="space-y-2">
          {[
            { name: 'Nurul Ain', time: '10:00 AM', status: 'Confirmed', color: 'bg-green-100 text-green-700' },
            { name: 'Muhammad Hafiz', time: '2:00 PM', status: 'Pending', color: 'bg-amber-100 text-amber-700' },
            { name: 'Siti Rashidah', time: '3:30 PM', status: 'Confirmed', color: 'bg-green-100 text-green-700' },
          ].map(({ name, time, status, color }) => (
            <div key={name} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">{name[0]}</div>
                <div>
                  <p className="text-xs font-medium text-gray-900">{name}</p>
                  <p className="text-[10px] text-gray-400">{time}</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState('dash');
  const content = { dash: <DemoDash />, appt: <DemoAppointments />, session: <DemoSession />, report: <DemoReport /> };
  return (
    <section className="py-24 px-4 bg-gray-950">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-sm font-medium text-violet-400 mb-4">
            Interactive Demo
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">See it in action</h2>
          <p className="text-gray-400 text-lg">Click through each stage of a real counseling workflow.</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
          {/* Browser chrome */}
          <div className="bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-gray-700">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400">kaunselor.app</div>
          </div>

          <div className="flex flex-col md:flex-row min-h-[420px]">
            {/* Tabs */}
            <div className="md:w-44 border-b md:border-b-0 md:border-r border-gray-800 flex md:flex-col overflow-x-auto md:overflow-visible">
              {DEMO_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-violet-600/20 text-violet-400 border-b-2 md:border-b-0 md:border-l-2 border-violet-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 p-5 overflow-y-auto">
              {content[activeTab]}
            </div>
          </div>
        </div>

        <p className="text-center text-gray-600 text-sm mt-4">This is a live interactive demo. Click the tabs and buttons above.</p>
      </div>
    </section>
  );
}

export default function CounselorLandingPage() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Kaunselor: Digital Counselling Platform</title>
        <meta name="description" content="Kaunselor, digital practice management for counselors. QR booking, digital client files, SOAP/DAP notes, clinical assessments, AI session reports, supervision log. Privacy-law compliant." />
        <meta name="keywords" content="counseling platform, counseling software, digital counseling, SOAP DAP notes, PHQ-9 GAD-7 DASS-21, RIASEC Big Five, supervision log, AI session notes, client management counselor" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://kaunselor.app" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://kaunselor.app" />
        <meta property="og:title" content="Kaunselor: Digital Counselling Platform" />
        <meta property="og:description" content="Manage counseling sessions smarter. QR booking, digital client files, AI SOP notes, red flag detection. PDPA compliant." />
        <meta property="og:image" content="https://kaunselor.app/og-counselor.svg" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Kaunselor",
          "url": "https://kaunselor.app",
          "description": "Digital practice management platform for counselors worldwide.",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "22", "priceCurrency": "USD" },
          "publisher": { "@type": "Organization", "name": "Kaunselor", "url": "https://kaunselor.app" }
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-white">

        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-bold text-gray-900 text-lg tracking-tight">Kaunselor</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/auth?profession=counselor')}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Sign In
              </button>
              <button onClick={() => navigate('/auth?mode=register&profession=counselor')}
                className="text-sm bg-violet-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-violet-700 transition-colors shadow-sm">
                Get Started
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="bg-gray-950 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/40 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-5xl mx-auto px-4 py-24 md:py-32 text-center relative">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/25 rounded-full px-4 py-1.5 text-sm font-medium text-violet-400 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
              Global Standards · Built for Every Counselor
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
              Less Admin.<br />
              <span className="text-violet-400">More Counseling.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
              From QR booking to AI session reports. Kaunselor handles all the paperwork so you can focus entirely on your clients.
            </p>
            <p className="text-sm text-gray-600 mb-10">
              For licensed counselors in private practice, schools, and wellness centres.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <button onClick={() => navigate('/auth?mode=register&profession=counselor')}
                className="w-full sm:w-auto bg-violet-600 text-white font-bold text-base px-8 py-3.5 rounded-xl hover:bg-violet-500 transition-colors shadow-lg shadow-violet-900/30">
                Get Started Free →
              </button>
              <button onClick={() => document.getElementById('demo-section').scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto border border-gray-700 text-gray-300 font-medium text-base px-8 py-3.5 rounded-xl hover:bg-gray-800 transition-colors">
                See Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto border-t border-gray-800 pt-10">
              {[
                { val: 'AI', label: 'Red Flag Detection', sub: 'Real-time during session' },
                { val: '5', label: 'Assessment Tools', sub: 'PHQ-9 · GAD-7 · DASS-21 · RIASEC · Big Five' },
                { val: 'QR', label: 'Client Booking', sub: 'Fully automated' },
              ].map(({ val, label, sub }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-bold text-violet-400">{val}</div>
                  <div className="text-xs font-semibold text-gray-300 mt-1">{label}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything you need. Nothing you don't.</h2>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">One platform from first booking to final report.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <div key={f.title} className="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-50 transition-all">
                  <div className="text-2xl mb-4">{f.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2 text-base">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Demo */}
        <div id="demo-section">
          <InteractiveDemo />
        </div>

        {/* How it works */}
        <section className="py-24 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Up and running in minutes</h2>
              <p className="text-gray-500 text-lg">No IT department needed.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 relative">
              <div className="hidden sm:block absolute top-6 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-violet-200 via-violet-300 to-violet-200" />
              {[
                { num: '1', title: 'Create Account', desc: 'Register in 2 minutes. Choose your credentials and specializations.' },
                { num: '2', title: 'Share Your QR', desc: 'Clients book appointments through your personal booking link or QR code.' },
                { num: '3', title: 'Start Counseling', desc: 'Record sessions, get AI reports, manage client files. All in one place.' },
              ].map((s) => (
                <div key={s.num} className="text-center relative">
                  <div className="w-12 h-12 bg-violet-600 text-white rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-4 shadow-lg shadow-violet-200">
                    {s.num}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="py-16 px-4 border-y border-gray-100">
          <div className="max-w-4xl mx-auto">
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              {[
                { icon: '🔒', title: 'Privacy Law Compliant', desc: 'Client data encrypted. Consent permanently recorded. Full audit trail. PDPA & GDPR-ready.' },
                { icon: '⚖️', title: 'Professional Standards Ready', desc: 'SOAP/DAP session notes and supervision logs structured to meet licensing body requirements.' },
                { icon: '🛡️', title: 'Tamper-Proof Records', desc: 'Every session is cryptographically signed at generation. Prove your records were never altered, for any audit or review.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="p-6">
                  <div className="text-3xl mb-3">{icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">{title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile App */}
        <section className="py-20 px-4 bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-12">
              {/* Left — phone mockup */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-48 h-80 bg-gray-900 rounded-[2.5rem] border-4 border-gray-700 shadow-2xl flex flex-col overflow-hidden">
                    <div className="h-6 bg-gray-800 flex items-center justify-center">
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full" />
                    </div>
                    <div className="flex-1 bg-gray-950 p-3 space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:'#8b5cf6'}}>
                          <svg viewBox="0 0 32 32" className="w-4 h-4"><polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>
                        </div>
                        <span className="text-white text-xs font-bold">Kaunselor</span>
                      </div>
                      {[['Total Clients', '24', 'text-violet-400'], ['Sessions This Month', '3', 'text-blue-400'], ['Pending', '2', 'text-amber-400']].map(([l, v, c]) => (
                        <div key={l} className="bg-gray-800 rounded-lg p-2 flex justify-between items-center">
                          <span className="text-[10px] text-gray-400">{l}</span>
                          <span className={`text-xs font-bold ${c}`}>{v}</span>
                        </div>
                      ))}
                      <div className="bg-violet-600 rounded-lg py-2 text-center">
                        <span className="text-white text-[10px] font-semibold">+ New Session</span>
                      </div>
                    </div>
                  </div>
                  {/* Glow */}
                  <div className="absolute inset-0 rounded-[2.5rem] bg-violet-500/10 blur-xl -z-10 scale-110" />
                </div>
              </div>

              {/* Right — text */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-sm font-medium text-violet-400 mb-5">
                  📱 Mobile App
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Works on your phone.<br/>No download needed.</h2>
                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                  Kaunselor is a Progressive Web App. Install it on your phone in seconds. Works offline too.
                </p>
                <div className="space-y-4 mb-8">
                  {[
                    { num: '1', os: '🤖 Android', step: 'Open kaunselor.app in Chrome → tap ⋮ menu → "Add to Home Screen"' },
                    { num: '2', os: '🍎 iPhone', step: 'Open kaunselor.app in Safari → tap Share → "Add to Home Screen"' },
                  ].map(({ num, os, step }) => (
                    <div key={num} className="flex items-start gap-3 text-left">
                      <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">{num}</div>
                      <div>
                        <p className="text-sm font-semibold text-white">{os}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => window.location.href = '/auth?mode=register&profession=counselor'}
                  className="bg-violet-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-violet-500 transition-colors text-sm">
                  Get Started, Install Later →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Trusted by counselors</h2>
              <p className="text-gray-500">See what practitioners say about Kaunselor.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  name: 'Dr. Suraya Mohd Yusof',
                  role: 'Senior Counselor, University Counseling Centre',
                  avatar: 'S',
                  rating: 5,
                  text: 'The AI red flag detection has genuinely changed how I work. I used to worry about missing signs. Now I have a safety net running throughout every session. The SOP notes save me 40 minutes per client.',
                },
                {
                  name: 'Ahmad Nazri Ibrahim',
                  role: 'Private Practice Counselor',
                  avatar: 'A',
                  rating: 5,
                  text: 'My clients love the online booking. They get a confirmation email, I get a notification. No more back-and-forth on WhatsApp. The PHQ-9 and GAD-7 assessments built right into the client file are a huge plus.',
                },
                {
                  name: 'Nurul Hafizah Othman',
                  role: 'School Counselor',
                  avatar: 'N',
                  rating: 5,
                  text: 'Finally a platform designed for us, not adapted from something else. The student/client file tracks everything across sessions. I can see the risk trend over time and act early.',
                },
              ].map((t) => (
                <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({length: t.rating}).map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">{t.avatar}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple pricing</h2>
              <p className="text-gray-500">Start free. Upgrade when you're ready.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 items-start">
              {/* Free tier */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-7 flex flex-col">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Free</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-400 text-sm">/ month</span>
                </div>
                <p className="text-xs text-gray-400 mb-6">2 sessions / month · forever free</p>
                <ul className="space-y-2.5 flex-1 mb-7 text-sm text-gray-600">
                  {['All features unlocked', 'Digital client files', 'SOAP/DAP notes', 'Clinical assessments', 'Supervision log'].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/auth?mode=register&profession=counselor')}
                  className="w-full border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors text-sm">
                  Start Free →
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">No credit card required</p>
              </div>

              {/* Counselor plan */}
              <div className="relative bg-white border-2 border-violet-500 rounded-2xl p-7 shadow-xl shadow-violet-100 flex flex-col">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow">MOST POPULAR</div>
                <p className="text-sm font-semibold text-violet-600 uppercase tracking-wide mb-2">Counselor</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">$22</span>
                  <span className="text-gray-400 text-sm">USD / month</span>
                </div>
                <p className="text-xs text-gray-400 mb-6">Unlimited sessions · pay in any currency</p>
                <ul className="space-y-2.5 flex-1 mb-7 text-sm text-gray-700">
                  {[
                    'Everything in Free',
                    'Unlimited counseling sessions',
                    'AI red flag & crisis detection',
                    'AI clinical letter generator',
                    'Automatic session transcription',
                    'Client portal & psychoeducation library',
                    'Privacy law compliant · Professional standards ready',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-violet-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/auth?mode=register&profession=counselor')}
                  className="w-full bg-violet-600 text-white font-bold py-3.5 rounded-xl hover:bg-violet-700 transition-colors text-sm">
                  Get Started →
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">No contract · Cancel anytime · Secure via Stripe</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gray-950 py-20 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-4xl font-bold text-white mb-4">Ready to simplify your practice?</div>
            <p className="text-gray-400 text-lg mb-8">$22/month. Unlimited sessions. Cancel anytime.</p>
            <button onClick={() => navigate('/auth?mode=register&profession=counselor')}
              className="bg-violet-600 text-white font-bold text-base px-10 py-4 rounded-xl hover:bg-violet-500 transition-colors shadow-lg shadow-violet-900/30">
              Get Started Free →
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black text-gray-600 py-8 px-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-gray-400 font-bold">Kaunselor</span>
            </div>
            <div className="flex items-center gap-5 text-xs">
              <button onClick={() => navigate('/faq')} className="hover:text-gray-300 transition-colors">FAQ</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-gray-300 transition-colors">Privacy</button>
              <button onClick={() => navigate('/terms')} className="hover:text-gray-300 transition-colors">Terms</button>
            </div>
            <p className="text-xs">© {new Date().getFullYear()} Kaunselor. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
