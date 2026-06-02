import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

function scoreMbti(responses, questions) {
  const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  questions.forEach(q => {
    const ans = responses[q.id];
    if (ans) counts[ans] = (counts[ans] || 0) + 1;
  });
  const type = [
    counts.E >= counts.I ? 'E' : 'I',
    counts.S >= counts.N ? 'S' : 'N',
    counts.T >= counts.F ? 'T' : 'F',
    counts.J >= counts.P ? 'J' : 'P',
  ].join('');
  return { type, counts };
}

function scoreRiasec(responses, questions) {
  const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  questions.forEach(q => {
    if (responses[q.id] === 'yes') scores[q.type] = (scores[q.type] || 0) + 1;
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const code = sorted.slice(0, 3).map(([t]) => t).join('');
  return { code, scores, sorted };
}

export function AssessmentPanel({ sessionId, subjectId, userId, onComplete }) {
  const [sets, setSets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('assessment_sets')
      .select('id, name, type, description, questions, scoring')
      .or('is_default.eq.true,user_id.eq.' + (userId || '00000000-0000-0000-0000-000000000000'))
      .then(({ data }) => { setSets(data || []); setLoading(false); });
  }, [userId]);

  const questions = selected?.questions || [];
  const answered = Object.keys(responses).length;
  const total = questions.length;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  const computeResult = () => {
    if (!selected) return null;
    if (selected.type === 'mbti') return scoreMbti(responses, questions);
    if (selected.type === 'riasec') return scoreRiasec(responses, questions);
    return null;
  };

  const handleSave = async () => {
    if (!selected || answered < total) return;
    setSaving(true);
    const computed = computeResult();
    setResult(computed);
    try {
      await supabase.from('session_assessments').insert({
        session_id: sessionId,
        subject_id: subjectId,
        assessment_id: selected.id,
        user_id: userId,
        responses,
        result: computed,
        completed_at: new Date().toISOString(),
      });
      setSaved(true);
      onComplete?.({ assessment: selected.name, type: selected.type, result: computed });
    } catch { /* non-fatal */ }
    finally { setSaving(false); }
  };

  const reset = () => { setSelected(null); setResponses({}); setResult(null); setSaved(false); };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (!selected) return (
    <div className="p-3 space-y-2">
      <p className="text-xs font-medium text-gray-500 mb-3">ASSESSMENT / TEST</p>
      {sets.map(s => (
        <button key={s.id} onClick={() => { setSelected(s); setResponses({}); setResult(null); setSaved(false); }}
          className="w-full text-left p-3 rounded-xl border bg-white hover:border-blue-300 hover:bg-blue-50 transition-all">
          <p className="text-sm font-medium text-gray-800">{s.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
          <p className="text-xs text-blue-500 mt-1">{s.questions?.length} questions</p>
        </button>
      ))}
      {sets.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No assessments available</p>}
    </div>
  );

  if (result && saved) return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{selected.name}</p>
        <button onClick={reset} className="text-xs text-blue-600">← Back</button>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        {selected.type === 'mbti' && (
          <>
            <p className="text-3xl font-bold text-blue-700 mb-1">{result.type}</p>
            <p className="text-sm text-blue-600">{selected.scoring?.types?.[result.type] || ''}</p>
            <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
              {[['E','I'],['S','N'],['T','F'],['J','P']].map(([a,b]) => (
                <div key={a} className="bg-white rounded-lg p-2 text-center">
                  <p className={`font-bold ${result.counts[a] >= result.counts[b] ? 'text-blue-700' : 'text-gray-400'}`}>{a}: {result.counts[a]}</p>
                  <p className={`font-bold ${result.counts[b] > result.counts[a] ? 'text-blue-700' : 'text-gray-400'}`}>{b}: {result.counts[b]}</p>
                </div>
              ))}
            </div>
          </>
        )}
        {selected.type === 'riasec' && (
          <>
            <p className="text-3xl font-bold text-blue-700 mb-1">{result.code}</p>
            <div className="space-y-2 mt-3">
              {result.sorted.map(([type, score]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-xs font-bold w-4 text-blue-700">{type}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(score / 4) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-4">{score}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">{selected.scoring?.types?.[result.code[0]] || ''}</p>
          </>
        )}
      </div>
      <p className="text-xs text-green-600 text-center">✓ Results saved in this session</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-800">{selected.name}</p>
          <p className="text-xs text-gray-400">{answered}/{total} answered ({pct}%)</p>
        </div>
        <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">← Change</button>
      </div>
      <div className="w-full bg-gray-100 h-1">
        <div className="bg-blue-500 h-1 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selected.type === 'mbti' && questions.map((q, i) => (
          <div key={q.id} className={`p-3 rounded-xl border ${responses[q.id] ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <p className="text-xs text-gray-400 mb-1">{i + 1}. [{q.dimension}]</p>
            <p className="text-sm text-gray-800 mb-2">{q.text}</p>
            <div className="grid grid-cols-1 gap-1.5">
              {q.options.map(opt => (
                <button key={opt.value} onClick={() => setResponses(r => ({ ...r, [q.id]: opt.value }))}
                  className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${responses[q.id] === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {selected.type === 'riasec' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-2">Mark activities you <strong>enjoy</strong> doing:</p>
            {['R','I','A','S','E','C'].map(type => {
              const typeQuestions = questions.filter(q => q.type === type);
              const typeInfo = { R:'Realistik',I:'Investigatif',A:'Artistik',S:'Sosial',E:'Enterprising',C:'Konvensional' };
              return (
                <div key={type} className="bg-white rounded-xl border p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{type} — {typeInfo[type]}</p>
                  {typeQuestions.map(q => (
                    <button key={q.id} onClick={() => setResponses(r => ({ ...r, [q.id]: r[q.id] === 'yes' ? 'no' : 'yes' }))}
                      className={`w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-colors mb-1 ${responses[q.id] === 'yes' ? 'bg-blue-50 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${responses[q.id] === 'yes' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                        {responses[q.id] === 'yes' ? '✓' : ''}
                      </span>
                      {q.text}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="p-3 border-t">
        <button onClick={handleSave} disabled={answered < total || saving || saved}
          className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors">
          {saving ? 'Saving...' : saved ? '✓ Saved' : `Done & Save (${answered}/${total})`}
        </button>
      </div>
    </div>
  );
}
