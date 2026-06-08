import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isCounselorSubdomain } from '../../lib/subdomain.js';

const COUNSELOR_STEPS = [
  {
    icon: '👋',
    title: 'Welcome to Kaunselor',
    desc: 'Your all-in-one digital counseling platform. AI session notes, QR booking, client files. All in one place.',
    action: null,
  },
  {
    icon: '🪪',
    title: 'Set Up Your Profile',
    desc: 'Add your credentials, specializations, and clinic info. This appears on your public booking page for clients.',
    action: { label: 'Set Up Profile', path: '/kaunselor/setup' },
  },
  {
    icon: '📅',
    title: 'Add Your Time Slots',
    desc: 'Define when you\'re available. Clients will only see slots you set. No overbooking, no hassle.',
    action: { label: 'Add Slots', path: '/kaunselor/appointments' },
  },
  {
    icon: '🎙️',
    title: 'Start Your First Session',
    desc: 'Record sessions directly in the browser. AI transcribes, detects risk flags, and generates SOP notes automatically.',
    action: { label: 'Start Session', path: '/session/setup/counselor' },
  },
];

const PROFESSIONAL_STEPS = [
  {
    icon: '👋',
    title: 'Welcome to VeriRec',
    desc: 'A PDPA-compliant recording and analytics platform for professionals. Record, transcribe, and generate AI reports.',
    action: null,
  },
  {
    icon: '🎙️',
    title: 'Record Your First Session',
    desc: 'Choose your profession, fill in session details, get digital consent, then record directly in the browser.',
    action: null,
  },
  {
    icon: '🤖',
    title: 'AI Generates Your Report',
    desc: 'After the session, AI analyses the recording and generates transcription, key findings, risk level, and recommendations.',
    action: null,
  },
  {
    icon: '📄',
    title: 'Secure & Exportable',
    desc: 'Every report is protected with SHA-256 chain of custody. Export as PDF for official files, audits, or court use.',
    action: null,
  },
];

export function OnboardingModal({ userId, onDismiss }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const isCounselor = isCounselorSubdomain();
  const STEPS = isCounselor ? COUNSELOR_STEPS : PROFESSIONAL_STEPS;
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const dismiss = () => {
    localStorage.setItem(`onboarding_done_${userId}`, '1');
    onDismiss();
  };

  const handleAction = () => {
    if (current.action) {
      dismiss();
      navigate(current.action.path);
    } else if (isLast) {
      dismiss();
      navigate(isCounselor ? '/session/setup/counselor' : '/session/new');
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-violet-600 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="p-8">
          {/* Step counter */}
          <p className="text-xs text-gray-400 text-center mb-5">Step {step + 1} of {STEPS.length}</p>

          {/* Icon */}
          <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl">
            {current.icon}
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold text-gray-900 text-center mb-3">{current.title}</h2>
          <p className="text-gray-500 text-sm text-center leading-relaxed mb-8">{current.desc}</p>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`rounded-full transition-all ${i === step ? 'w-6 h-2 bg-violet-600' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'}`} />
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button onClick={handleAction}
              className="w-full py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
              {current.action ? current.action.label + ' →' : isLast ? 'Get Started →' : 'Next →'}
            </button>
            {current.action && !isLast && (
              <button onClick={() => setStep(s => s + 1)}
                className="w-full py-2 text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors">
                Skip for now
              </button>
            )}
            <button onClick={dismiss}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              {isLast ? 'Maybe later' : 'Skip all'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
