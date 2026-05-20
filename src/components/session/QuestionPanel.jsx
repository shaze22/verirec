import { useState } from 'react';

export function QuestionPanel({ questions = {}, phases = [], currentPhase, onPhaseChange, onAsk }) {
  const [selected, setSelected] = useState(null);

  const phaseQuestions = questions[currentPhase] || [];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <p className="text-xs font-medium text-gray-500 mb-2">FASA TEMUDUGA</p>
        <div className="flex flex-wrap gap-1.5">
          {phases.map(phase => (
            <button
              key={phase}
              onClick={() => onPhaseChange?.(phase)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                phase === currentPhase
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="text-xs font-medium text-gray-500">SOALAN PANDUAN</p>
        {phaseQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => { setSelected(i); onAsk?.(q); }}
            className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors ${
              selected === i
                ? 'bg-blue-50 border border-blue-200 text-blue-800'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
            }`}
          >
            {q}
          </button>
        ))}
        {phaseQuestions.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">Tiada soalan untuk fasa ini</p>
        )}
      </div>
    </div>
  );
}
