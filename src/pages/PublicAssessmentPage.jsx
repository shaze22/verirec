import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { ASSESSMENTS } from '../data/assessments.js';

// Anon client — no auth required
const supabaseAnon = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const LEVEL_COLOR = {
  green:  'bg-green-50 border-green-200 text-green-800',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  orange: 'bg-orange-50 border-orange-200 text-orange-800',
  red:    'bg-red-50 border-red-200 text-red-800',
};

export default function PublicAssessmentPage() {
  const { token } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | expired | invalid | submitting | done | error
  const [answers, setAnswers] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState(null);
  const [result, setResult] = useState(null);

  const test = assignment ? ASSESSMENTS[assignment.test_type] : null;

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    supabaseAnon
      .from('client_assessments')
      .select('id, test_type, subject_name, status, expires_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('invalid'); return; }
        if (data.status === 'completed') { setStatus('done'); return; }
        if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return; }
        if (!ASSESSMENTS[data.test_type]) { setStatus('invalid'); return; }
        setAssignment(data);
        setAnswers(new Array(ASSESSMENTS[data.test_type].questions.length).fill(null));
        setStatus('ready');
      });
  }, [token]);

  const handleAnswer = (qIdx, value) => {
    setAnswers(prev => {
      const next = [...prev];
      next[qIdx] = value;
      return next;
    });
  };

  const handleNext = () => {
    if (currentQ < test.questions.length - 1) {
      setCurrentQ(q => q + 1);
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ(q => q - 1);
  };

  const canSubmit = answers.every(a => a !== null);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('submitting');
    try {
      const computedScores = test.score(answers);
      const interpretation = test.interpret(computedScores);
      const { error } = await supabaseAnon
        .from('client_assessments')
        .update({
          status: 'completed',
          answers,
          scores: computedScores,
          interpretation: JSON.stringify(interpretation),
          completed_at: new Date().toISOString(),
        })
        .eq('token', token);
      if (error) throw error;
      setScores(computedScores);
      setResult(interpretation);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (status === 'invalid') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Not Found</h2>
        <p className="text-gray-500 text-sm">This link is invalid or has already been used. Please contact your counselor.</p>
      </div>
    </div>
  );

  if (status === 'expired') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⏰</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h2>
        <p className="text-gray-500 text-sm">This assessment link has expired. Please ask your counselor to send a new link.</p>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Submission Failed</h2>
        <p className="text-gray-500 text-sm mb-4">Could not save your answers. Please try again.</p>
        <button onClick={() => setStatus('ready')} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
          Try Again
        </button>
      </div>
    </div>
  );

  if (status === 'done' && result) return <ResultView test={test} scores={scores} result={result} subjectName={assignment?.subject_name} />;

  if (status === 'done' && !result) return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50 p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Completed</h2>
        <p className="text-gray-500 text-sm">Your counselor will review your results. You may close this page.</p>
      </div>
    </div>
  );

  if (status === 'submitting') return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-violet-700 font-medium">Submitting your answers...</p>
      </div>
    </div>
  );

  // ── Main test UI ──
  const progress = answers.filter(a => a !== null).length;
  const pct = Math.round((progress / test.questions.length) * 100);
  const q = test.questions[currentQ];
  const answered = answers[currentQ] !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
              {test.name}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">For: <strong className="text-gray-700">{assignment.subject_name}</strong></p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400">{progress}/{test.questions.length}</p>
          <p className="text-xs font-bold text-violet-600">{pct}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-violet-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Instructions (first question only) */}
        {currentQ === 0 && (
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
            <p className="text-sm text-violet-800 font-medium mb-1">{test.fullName}</p>
            <p className="text-sm text-violet-600">{test.instructions}</p>
          </div>
        )}

        {/* Question card */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-2">Question {currentQ + 1} of {test.questions.length}</p>
          <p className="text-base font-medium text-gray-900 leading-relaxed mb-6">{q}</p>

          {/* Answer options */}
          <div className="space-y-2">
            {test.scale.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleAnswer(currentQ, opt.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  answers[currentQ] === opt.value
                    ? 'border-violet-500 bg-violet-50 text-violet-800'
                    : 'border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-gray-50'
                }`}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full mr-3 text-xs flex-shrink-0 ${
                  answers[currentQ] === opt.value ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{opt.value}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={currentQ === 0}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>

          {currentQ < test.questions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!answered}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {canSubmit ? 'Submit ✓' : `${test.questions.length - progress} questions remaining`}
            </button>
          )}
        </div>

        {/* All-questions overview dots */}
        <div className="flex flex-wrap gap-1.5 justify-center pt-2">
          {test.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                i === currentQ
                  ? 'bg-violet-600 text-white ring-2 ring-violet-300'
                  : answers[i] !== null
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          kaunselor.app — Your answers are confidential and will be reviewed by your counselor only.
        </p>
      </div>
    </div>
  );
}

function ResultView({ test, scores, result, subjectName }) {
  if (!test || !scores || !result) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{test.name} Complete</h2>
          <p className="text-sm text-gray-500 mt-1">Thank you, {subjectName}. Your counselor will review these results.</p>
        </div>

        {/* Result cards */}
        {test.id === 'phq9' && (
          <ScoreCard
            label="Depression Score"
            score={scores.total}
            maxScore={27}
            level={result.level}
            color={result.color}
            note={result.note}
          />
        )}

        {test.id === 'gad7' && (
          <ScoreCard
            label="Anxiety Score"
            score={scores.total}
            maxScore={21}
            level={result.level}
            color={result.color}
            note={result.note}
          />
        )}

        {test.id === 'dass21' && (
          <div className="space-y-3">
            {[
              { key: 'depression', label: 'Depression', max: 42 },
              { key: 'anxiety',    label: 'Anxiety',    max: 42 },
              { key: 'stress',     label: 'Stress',     max: 42 },
            ].map(({ key, label, max }) => (
              <div key={key} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <span className="text-sm font-bold text-gray-900">{result[key].score} / {max}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${(result[key].score / max) * 100}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-500">{result[key].level}</span>
              </div>
            ))}
          </div>
        )}

        {test.id === 'riasec' && (
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Your Holland Code</p>
              <p className="text-4xl font-black text-violet-600 tracking-widest">{result.topCode}</p>
              <p className="text-xs text-gray-500 mt-1">{result.sorted.slice(0, 3).map(([k]) => result.desc[k].split(' — ')[0]).join(' · ')}</p>
            </div>
            <div className="space-y-2">
              {result.sorted.map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-violet-600">{k}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${(v / 30) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 pt-2 border-t">
              {result.sorted.slice(0, 3).map(([k]) => (
                <p key={k} className="text-xs text-gray-600"><strong className="text-violet-700">{k}:</strong> {result.desc[k]}</p>
              ))}
            </div>
          </div>
        )}

        {test.id === 'tipi' && (
          <div className="bg-white rounded-xl border p-5 space-y-3">
            {Object.entries(result).map(([key, val]) => {
              const labels = {
                extraversion: 'Extraversion', agreeableness: 'Agreeableness',
                conscientiousness: 'Conscientiousness', emotionalStability: 'Emotional Stability', openness: 'Openness',
              };
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{labels[key]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      val.level === 'High' ? 'bg-violet-100 text-violet-700' :
                      val.level === 'Moderate' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>{val.level}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                    <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${((val.score - 1) / 6) * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{val.desc}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-gray-50 rounded-xl border p-4 text-center">
          <p className="text-sm text-gray-600">Your counselor will discuss these results with you in your next session.</p>
          <p className="text-xs text-gray-400 mt-2">You may now close this page.</p>
        </div>

        <p className="text-center text-xs text-gray-300 pb-6">
          Powered by kaunselor.app
        </p>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, maxScore, level, color, note }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-2xl font-black text-gray-900">{score}<span className="text-sm font-normal text-gray-400">/{maxScore}</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
        <div className="bg-violet-500 h-3 rounded-full transition-all" style={{ width: `${(score / maxScore) * 100}%` }} />
      </div>
      <div className={`rounded-lg border px-3 py-2 ${LEVEL_COLOR[color] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
        <p className="text-sm font-semibold">{level}</p>
        <p className="text-xs mt-0.5">{note}</p>
      </div>
    </div>
  );
}
