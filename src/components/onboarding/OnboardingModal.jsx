import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Welcome to VeriRec',
    desc: 'Platform rakaman dan analisis sesi profesional yang patuh PDPA. Direka khas untuk kaunselor, polis, doktor, peguam, dan lebih ramai.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Rakam Sesi Anda',
    desc: 'Isi butiran sesi, dapatkan persetujuan digital subjek (PDPA), kemudian rakam terus dalam pelayar. Tiada perisian tambahan diperlukan.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI Jana Laporan Automatik',
    desc: 'Selepas sesi tamat, AI kami menganalisis rakaman dan menjana transkripsi, penemuan utama, cadangan tindakan, dan bendera merah secara automatik.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Laporan Selamat & Boleh Dieksport',
    desc: 'Setiap laporan dilindungi dengan hash SHA-256 (chain of custody). Eksport sebagai PDF untuk fail rasmi, audit, atau mahkamah.',
  },
];

export function OnboardingModal({ userId, onDismiss }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const isLast = step === STEPS.length - 1;

  const dismiss = () => {
    localStorage.setItem(`onboarding_done_${userId}`, '1');
    onDismiss();
  };

  const handleStart = () => {
    dismiss();
    navigate('/session/new');
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Icon */}
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            {current.icon}
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold text-gray-900 text-center mb-3">{current.title}</h2>
          <p className="text-gray-500 text-sm text-center leading-relaxed mb-8">{current.desc}</p>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${i === step ? 'w-6 h-2 bg-blue-600' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {isLast ? (
              <button
                onClick={handleStart}
                className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Mulakan Sesi Pertama →
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            )}
            <button
              onClick={dismiss}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Langkau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
