import { useNavigate } from 'react-router-dom';
import { PROFESSIONS } from '../data/professions.js';
import { TopBar } from '../components/layout/TopBar.jsx';

export default function ProfessionSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Pilih Profesion" />
      <div className="flex-1 overflow-auto p-6">
        <p className="text-gray-500 mb-6">Pilih kategori profesion untuk mendapatkan soalan dan rangka kerja yang sesuai.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROFESSIONS.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/session/setup/${p.id}`)}
              className="bg-white rounded-xl border-2 border-gray-200 p-6 text-left hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className="text-4xl mb-3">{p.icon}</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">{p.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{p.frameworks.join(', ')}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.phases.slice(0, 3).map(phase => (
                  <span key={phase} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{phase}</span>
                ))}
                {p.phases.length > 3 && (
                  <span className="text-xs text-gray-400">+{p.phases.length - 3} lagi</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
