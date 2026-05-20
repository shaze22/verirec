import { useState } from 'react';
import { suggestQuestions } from '../../api/claude.js';
import { Button } from '../ui/Button.jsx';

export function AISuggestions({ profession, phase, lastQuestion, recentTranscript = [], onSuggest }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = async () => {
    if (!lastQuestion) return;
    setLoading(true);
    setError(null);
    try {
      const data = await suggestQuestions({
        profession,
        phase,
        question: lastQuestion,
        recent_transcript: recentTranscript,
      });
      setSuggestions(data);
    } catch (err) {
      if (err.message === 'plan_required') {
        setError('Ciri ini memerlukan pelan Starter atau lebih tinggi.');
      } else {
        setError('Gagal mendapatkan cadangan AI.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">CADANGAN AI</p>
        <Button size="sm" variant="outline" onClick={fetch} loading={loading} disabled={!lastQuestion}>
          Dapatkan Cadangan
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {suggestions && (
        <div className="space-y-3">
          {suggestions.redFlag && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700">🚩 Petanda Kebimbangan</p>
              <p className="text-xs text-red-600 mt-0.5">{suggestions.redFlagNote}</p>
            </div>
          )}

          {suggestions.observation && (
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-700">Pemerhatian</p>
              <p className="text-xs text-blue-600 mt-0.5">{suggestions.observation}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500">SOALAN SUSULAN</p>
            {(suggestions.followUp || []).map((q, i) => (
              <button
                key={i}
                onClick={() => onSuggest?.(q)}
                className="w-full text-left p-2 rounded-lg text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-gray-700"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {!suggestions && !loading && !error && (
        <p className="text-xs text-gray-400 text-center py-4">
          Tekan butang untuk mendapatkan cadangan soalan berasaskan konteks semasa.
        </p>
      )}
    </div>
  );
}
