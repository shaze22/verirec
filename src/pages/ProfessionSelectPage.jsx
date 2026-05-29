import { useNavigate } from 'react-router-dom';
import { PROFESSIONS } from '../data/professions.js';
import { TopBar } from '../components/layout/TopBar.jsx';

export default function ProfessionSelectPage() {
  const navigate = useNavigate();
  const preferred = localStorage.getItem('preferred_profession');

  const sorted = preferred
    ? [
        ...PROFESSIONS.filter(p => p.id === preferred),
        ...PROFESSIONS.filter(p => p.id !== preferred),
      ]
    : PROFESSIONS;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Pilih Profesion" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        {preferred && (
          <p className="text-sm text-blue-600 font-medium mb-4 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Profesion pilihan anda ditunjukkan dahulu
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(p => {
            const isPreferred = p.id === preferred;
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/session/setup/${p.id}`)}
                className={`rounded-xl border-2 p-6 text-left transition-all group ${
                  isPreferred
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{p.icon}</span>
                  {isPreferred && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      Pilihan Anda
                    </span>
                  )}
                </div>
                <h3 className={`font-semibold mb-1 ${isPreferred ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-700'}`}>
                  {p.label}
                </h3>
                <p className="text-sm text-gray-500 mb-3">{p.frameworks.join(', ')}</p>
                <div className="flex flex-wrap gap-1">
                  {p.phases.slice(0, 3).map(phase => (
                    <span key={phase} className={`text-xs px-2 py-0.5 rounded-full ${isPreferred ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {phase}
                    </span>
                  ))}
                  {p.phases.length > 3 && (
                    <span className="text-xs text-gray-400">+{p.phases.length - 3} lagi</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {preferred && (
          <button
            onClick={() => { localStorage.removeItem('preferred_profession'); window.location.reload(); }}
            className="mt-6 text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Buang profesion pilihan
          </button>
        )}
      </div>
    </div>
  );
}
