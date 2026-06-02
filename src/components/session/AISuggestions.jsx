import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { suggestQuestions, analyzeSession } from '../../api/claude.js';
import { useBillingStore } from '../../store/billingStore.js';
import { Button } from '../ui/Button.jsx';

const DISCLAIMER_KEY = 'ai_disclaimer_accepted';
const AUTO_TRIGGER_EVERY = 1;   // trigger after every new entry
const MIN_INTERVAL_MS = 15000;  // minimum gap between analyses (ms)

// Per-profession display config
const PROFESSION_CONFIG = {
  counselor: {
    disclaimer: true,
    disclaimerText: 'This AI analysis is a clinical support tool only and not an official diagnosis. Clinical decisions must be made by a qualified counselor based on a comprehensive assessment.',
    penemuanLabel: 'Possible Symptoms Present',
    tindakanLabel: 'Recommended Techniques',
    risikoLabel: true,
    penemuanColor: 'purple',
  },
  police: {
    disclaimer: false,
    disclaimerText: 'AI analysis is a support guide for investigation only. Final decisions are the responsibility of the investigating officer.',
    penemuanLabel: 'Inconsistencies Detected',
    tindakanLabel: 'Follow-up Steps',
    risikoLabel: true,
    penemuanColor: 'orange',
  },
  sprm: {
    disclaimer: false,
    disclaimerText: 'AI analysis is an investigation guide only. Any legal action must be based on verified evidence.',
    penemuanLabel: 'Signs of Misconduct',
    tindakanLabel: 'Investigation Actions',
    risikoLabel: true,
    penemuanColor: 'red',
  },
  doctor: {
    disclaimer: true,
    disclaimerText: 'AI analysis is a clinical support guide only and not an official diagnosis. Diagnosis must be made by a registered medical practitioner through a comprehensive clinical assessment.',
    penemuanLabel: 'Symptoms Detected',
    tindakanLabel: 'Possible Diagnosis',
    risikoLabel: true,
    penemuanColor: 'red',
  },
  iso: {
    disclaimer: false,
    disclaimerText: 'AI analysis is an audit support guide only. Official findings must be verified through objective evidence review.',
    penemuanLabel: 'Potential Non-Compliance',
    tindakanLabel: 'Clause / Audit Actions',
    risikoLabel: true,
    penemuanColor: 'amber',
  },
  hr: {
    disclaimer: false,
    disclaimerText: 'AI analysis is a procedural support guide only. Disciplinary decisions must be made in accordance with valid domestic inquiry procedures.',
    penemuanLabel: 'Facts to be Verified',
    tindakanLabel: 'Recommended HR Actions',
    risikoLabel: true,
    penemuanColor: 'indigo',
  },
  court: {
    disclaimer: false,
    disclaimerText: 'AI analysis is a legal support guide only and not official legal advice. Final legal strategy is the responsibility of the lawyer or judge handling the case.',
    penemuanLabel: 'Evidence Weaknesses',
    tindakanLabel: 'Examination Strategy / Argument',
    risikoLabel: true,
    penemuanColor: 'blue',
  },
  peguam: {
    disclaimer: false,
    disclaimerText: 'AI analysis is a legal support guide only and not official legal advice. Final advice and strategy is the responsibility of the lawyer handling the case.',
    penemuanLabel: 'Case Gap / Legal Risk',
    tindakanLabel: 'Legal Strategy & Actions',
    risikoLabel: true,
    penemuanColor: 'teal',
  },
  jkm: {
    disclaimer: true,
    disclaimerText: 'AI analysis is an assessment support guide only. Placement, intake, or legal action decisions must be made by a qualified welfare officer through a comprehensive assessment.',
    penemuanLabel: 'Risk Indicators Detected',
    tindakanLabel: 'Recommended Welfare Actions',
    risikoLabel: true,
    penemuanColor: 'green',
  },
};

const PENEMUAN_COLORS = {
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  amber:  'bg-amber-50 text-amber-700 border-amber-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  teal:   'bg-teal-50 text-teal-700 border-teal-200',
  green:  'bg-green-50 text-green-700 border-green-200',
};

function DisclaimerModal({ text, onAccept }) {
  return (
    <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-5 rounded-lg">
      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-2 text-center">Important Notice</h3>
      <p className="text-xs text-gray-600 mb-4 text-center leading-relaxed">{text}</p>
      <button
        onClick={onAccept}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        I Understand — Proceed
      </button>
    </div>
  );
}

function DisclaimerBanner({ text }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border-b border-amber-100">
      <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-xs text-amber-700 leading-tight">{text}</p>
    </div>
  );
}

function RiskBadge({ level }) {
  const styles = {
    'Rendah':    'bg-green-100 text-green-700 border-green-200',
    'Sederhana': 'bg-amber-100 text-amber-700 border-amber-200',
    'Tinggi':    'bg-red-100 text-red-700 border-red-200',
    'Low':       'bg-green-100 text-green-700 border-green-200',
    'Moderate':  'bg-amber-100 text-amber-700 border-amber-200',
    'High':      'bg-red-100 text-red-700 border-red-200',
  };
  const displayLabels = { 'Rendah': 'Low', 'Sederhana': 'Moderate', 'Tinggi': 'High' };
  const displayLevel = displayLabels[level] || level;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[level] || styles['Rendah']}`}>
      {(level === 'Tinggi' || level === 'High') && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
      Risk: {displayLevel}
    </span>
  );
}

function LockedOverlay({ profession }) {
  const navigate = useNavigate();
  const isCounselor = profession === 'counselor' || localStorage.getItem('preferred_profession') === 'counselor';
  const pricingUrl = isCounselor ? '/pricing?tab=kaunselor' : '/pricing';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-10 p-4 text-center">
      <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <p className="text-sm font-semibold text-gray-900 mb-1">AI Analysis</p>
      <p className="text-xs text-gray-500 mb-3">
        {isCounselor
          ? 'Available on the Counselor plan ($25/month)'
          : 'Available on the Professional plan and above'}
      </p>
      <Button size="sm" onClick={() => navigate(pricingUrl)}>
        {isCounselor ? 'Upgrade to Counselor' : 'Upgrade Plan'}
      </Button>
    </div>
  );
}

function AutoAnalysis({ profession, phase, entries, isActive, hasAI, onSuggest }) {
  const cfg = PROFESSION_CONFIG[profession] || PROFESSION_CONFIG.police;
  const disclaimerKey = `${DISCLAIMER_KEY}_${profession}`;

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(
    () => !cfg.disclaimer || !!sessionStorage.getItem(disclaimerKey)
  );

  const lastAnalyzedCountRef = useRef(0);
  const lastAnalyzedAtRef = useRef(0);
  const debounceRef = useRef(null);

  const relevantEntries = entries.filter(e => e.type === 'TRANSCRIPT' || e.type === 'INTERVIEWER');
  const transcriptTexts = relevantEntries.map(e => {
    if (e.type === 'INTERVIEWER') return `Interviewer: ${e.text}`;
    if (e.speaker === 'subject') return `Subject: ${e.text}`;
    if (e.speaker === 'interviewer') return `Interviewer: ${e.text}`;
    return e.text;
  });
  const recentTexts = transcriptTexts.slice(-5);

  const analyze = useCallback(async () => {
    if (!hasAI || transcriptTexts.length === 0) return;
    const now = Date.now();
    if (now - lastAnalyzedAtRef.current < MIN_INTERVAL_MS) return;

    setLoading(true);
    setError(null);
    lastAnalyzedCountRef.current = relevantEntries.length;
    lastAnalyzedAtRef.current = now;

    try {
      const data = await analyzeSession({
        profession,
        phase,
        recent_transcript: recentTexts,
        transcript: transcriptTexts,
      });
      setResult(data);
      setLastUpdated(new Date());
    } catch {
      setError('Failed to get analysis. Try again.');
    } finally {
      setLoading(false);
    }
  }, [hasAI, profession, phase, transcriptTexts, recentTexts, relevantEntries.length]);

  useEffect(() => {
    if (!isActive || !hasAI || !disclaimerAccepted) return;
    const newCount = relevantEntries.length - lastAnalyzedCountRef.current;
    if (newCount < AUTO_TRIGGER_EVERY) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { analyze(); }, 2500);
    return () => clearTimeout(debounceRef.current);
  }, [relevantEntries.length, isActive, hasAI, disclaimerAccepted, analyze]);

  const acceptDisclaimer = () => {
    sessionStorage.setItem(disclaimerKey, '1');
    setDisclaimerAccepted(true);
  };

  const penemuanColorClass = PENEMUAN_COLORS[cfg.penemuanColor] || PENEMUAN_COLORS.purple;

  if (!hasAI) {
    return (
      <div className="p-3 relative min-h-[200px]">
        <div className="blur-sm select-none pointer-events-none space-y-3" aria-hidden="true">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
        <LockedOverlay profession={profession} />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col">
      {cfg.disclaimer && !disclaimerAccepted && (
        <DisclaimerModal text={cfg.disclaimerText} onAccept={acceptDisclaimer} />
      )}
      <DisclaimerBanner text={cfg.disclaimerText} />

      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Realtime Analysis</span>
            {loading && <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          </div>
          <button
            onClick={analyze}
            disabled={loading || transcriptTexts.length === 0}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 font-medium transition-colors"
          >
            Re-analyze
          </button>
        </div>

        {/* Idle state */}
        {!result && !loading && !error && (
          <div className="py-6 text-center">
            <p className="text-xs text-gray-400">
              {!isActive
                ? 'Start recording to activate realtime analysis.'
                : transcriptTexts.length < AUTO_TRIGGER_EVERY
                  ? `Analysis starts after ${AUTO_TRIGGER_EVERY} sentence is transcribed...`
                  : 'Gathering conversation data...'}
            </p>
          </div>
        )}

        {error && (
          <div className="p-2 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {result && (
          <>
            {/* Risk level */}
            {cfg.risikoLabel && (
              <div className="flex items-center justify-between">
                <RiskBadge level={result.tahapRisiko} />
                {lastUpdated && (
                  <span className="text-xs text-gray-400">
                    {lastUpdated.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}

            {result.justifikasiRisiko && (
              <p className="text-xs text-gray-500 italic">{result.justifikasiRisiko}</p>
            )}

            {/* Red flag */}
            {result.redFlag && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-700">🚩 Warning</p>
                <p className="text-xs text-red-600 mt-0.5">{result.redFlagNote}</p>
              </div>
            )}

            {/* Penemuan (profession-specific) */}
            {result.penemuan?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {cfg.penemuanLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.penemuan.map((item, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-xs border ${penemuanColorClass}`}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Observation */}
            {result.pemerhatian && (
              <div className="p-2 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-700 mb-0.5">Observation</p>
                <p className="text-xs text-blue-600 leading-relaxed">{result.pemerhatian}</p>
              </div>
            )}

            {/* Tindakan (profession-specific) */}
            {result.tindakan?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {cfg.tindakanLabel}
                </p>
                <div className="space-y-1">
                  {result.tindakan.map((t, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up questions */}
            {result.sualanSusulan?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Follow-up Questions
                </p>
                <div className="space-y-1.5">
                  {result.sualanSusulan.map((q, i) => (
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
          </>
        )}
      </div>
    </div>
  );
}

function GenericSuggestions({ profession, phase, lastQuestion, recentTranscript, onSuggest, hasAI }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mockSuggestions = [
    'Can you explain in more detail?',
    'What happened before that incident?',
    'Who else was involved in this situation?',
  ];

  const fetch = async () => {
    if (!lastQuestion || !hasAI) return;
    setLoading(true);
    setError(null);
    try {
      const data = await suggestQuestions({ profession, phase, question: lastQuestion, recent_transcript: recentTranscript });
      setSuggestions(data);
    } catch {
      setError('Failed to get AI suggestions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 space-y-3 relative">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Suggestions</p>
        <Button size="sm" variant="outline" onClick={hasAI ? fetch : undefined} loading={loading} disabled={!hasAI || !lastQuestion}>
          Get Suggestions
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!hasAI && (
        <div className="relative rounded-lg overflow-hidden">
          <div className="space-y-1.5 blur-sm select-none pointer-events-none" aria-hidden="true">
            {mockSuggestions.map((q, i) => (
              <div key={i} className="w-full p-2 rounded-lg text-xs bg-gray-50 text-gray-700">{q}</div>
            ))}
          </div>
          <LockedOverlay profession={profession} />
        </div>
      )}
      {hasAI && suggestions && (
        <div className="space-y-3">
          {suggestions.redFlag && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700">🚩 Concern Indicator</p>
              <p className="text-xs text-red-600 mt-0.5">{suggestions.redFlagNote}</p>
            </div>
          )}
          {suggestions.observation && (
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-700">Observation</p>
              <p className="text-xs text-blue-600 mt-0.5">{suggestions.observation}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Follow-up Questions</p>
            {(suggestions.followUp || []).map((q, i) => (
              <button key={i} onClick={() => onSuggest?.(q)}
                className="w-full text-left p-2 rounded-lg text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-gray-700">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      {hasAI && !suggestions && !loading && !error && (
        <p className="text-xs text-gray-400 text-center py-4">
          {lastQuestion ? 'Press the button to get question suggestions.' : 'Ask a question first to activate AI suggestions.'}
        </p>
      )}
    </div>
  );
}

// Professions that use auto-analysis mode
const AUTO_ANALYSIS_PROFESSIONS = new Set(['counselor', 'police', 'sprm', 'doctor', 'iso', 'hr', 'court', 'peguam', 'jkm']);

export function AISuggestions({ profession, phase, lastQuestion, recentTranscript = [], entries = [], isActive = false, onSuggest }) {
  const { hasFeature } = useBillingStore();
  const hasAI = hasFeature('starter');

  if (AUTO_ANALYSIS_PROFESSIONS.has(profession)) {
    return (
      <AutoAnalysis
        profession={profession}
        phase={phase}
        entries={entries}
        isActive={isActive}
        hasAI={hasAI}
        onSuggest={onSuggest}
      />
    );
  }

  return (
    <GenericSuggestions
      profession={profession}
      phase={phase}
      lastQuestion={lastQuestion}
      recentTranscript={recentTranscript}
      onSuggest={onSuggest}
      hasAI={hasAI}
    />
  );
}
