import { useState } from 'react';

const PEACE_PHASES = [
  {
    key: 'P',
    name: 'Planning',
    full: 'Planning',
    color: 'blue',
    icon: '📋',
    desc: 'Gather background information. Set interview objectives. Identify key issues.',
    checklist: [
      'Review subject background records',
      'Set 3 main session objectives',
      'Prepare open-ended questions per issue',
      'Identify other witnesses if any',
      'Ensure recording and documentation are ready',
    ],
    tips: "Don't enter the session without knowing the basic facts. Clear objectives help focus your questions.",
  },
  {
    key: 'E',
    name: 'Engage & Explain',
    full: 'Engage & Explain',
    color: 'emerald',
    icon: '🤝',
    desc: "Build rapport. Explain the purpose, procedure and subject's rights. Obtain recording consent.",
    checklist: [
      'Introduce yourself and your role',
      'Explain the purpose of the interview',
      "Inform subject of their rights (lawyer, right to silence)",
      'Obtain consent to be recorded',
      'Ask neutral rapport-building questions',
    ],
    tips: 'Tone friendly but professional. A comfortable subject provides a more complete statement.',
  },
  {
    key: 'A',
    name: 'Account',
    full: 'Account',
    color: 'violet',
    icon: '🗣️',
    desc: 'Obtain full account. Free narrative first — let the subject speak without interruption.',
    checklist: [
      'Request free narrative: "Tell me from the beginning"',
      'Listen without interruption — just record',
      'Use open-ended questions (What, Who, Where, When, How)',
      'Follow up with probing: "Explain further..."',
      'Identify and mark key statements',
    ],
    tips: "Avoid leading questions. Let the subject fill the gaps themselves — this reveals the true information.",
  },
  {
    key: 'C',
    name: 'Closure',
    full: 'Closure',
    color: 'amber',
    icon: '✅',
    desc: 'Summarise the account. Give the subject a chance to add or correct. Clarify next steps.',
    checklist: [
      "Re-read a summary of the subject's account",
      'Ask: "Are there any errors or additions?"',
      'Ask questions that remain unanswered',
      'Inform the subject of the next process',
      'Thank the subject for their cooperation',
    ],
    tips: 'A good closure closes information gaps and gives the subject a fair chance to correct misunderstandings.',
  },
  {
    key: 'E2',
    name: 'Evaluate',
    full: 'Evaluate',
    color: 'rose',
    icon: '🔍',
    desc: 'After the session: assess account consistency. Compare with evidence. Identify next actions.',
    checklist: [
      'Compare the account with existing facts',
      'Identify contradictions or gaps',
      'Assess credibility of the account',
      'List follow-up actions required',
      'Generate AI report for in-depth analysis',
    ],
    tips: 'Objective evaluation after a session is more accurate than during the pressure of the interview.',
  },
];

const colorMap = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',  text: 'text-blue-700',   ring: 'ring-blue-400',  dot: 'bg-blue-500'   },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-400', dot: 'bg-emerald-500' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-700',  ring: 'ring-violet-400',  dot: 'bg-violet-500'  },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200', text: 'text-amber-700',   ring: 'ring-amber-400',   dot: 'bg-amber-500'   },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',  text: 'text-rose-700',    ring: 'ring-rose-400',    dot: 'bg-rose-500'    },
};

export function PeaceModelPanel({ currentPhase, onPhaseChange }) {
  const [expanded, setExpanded] = useState(null);
  const [checked, setChecked] = useState({});

  const activeIdx = PEACE_PHASES.findIndex(p =>
    currentPhase && (currentPhase.toLowerCase().includes(p.full.toLowerCase().split(' ')[0].toLowerCase())
      || currentPhase === p.name)
  );

  const toggleCheck = (phaseKey, idx) => {
    const k = `${phaseKey}_${idx}`;
    setChecked(prev => ({ ...prev, [k]: !prev[k] }));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">PEACE Model</p>
            <p className="text-xs text-gray-400 mt-0.5">Structured Interview Guide</p>
          </div>
          <div className="flex items-center gap-0.5">
            {PEACE_PHASES.map((p, i) => {
              const c = colorMap[p.color];
              const isActive = i === activeIdx;
              return (
                <div
                  key={p.key}
                  title={p.name}
                  className={`w-2 h-2 rounded-full transition-all ${isActive ? `${c.dot} ring-2 ring-offset-1 ${c.ring} scale-125` : 'bg-gray-300'}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Phase list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {PEACE_PHASES.map((phase, idx) => {
          const c = colorMap[phase.color];
          const isActive = idx === activeIdx;
          const isExpanded = expanded === phase.key;
          const doneCount = phase.checklist.filter((_, i) => checked[`${phase.key}_${i}`]).length;

          return (
            <div key={phase.key} className={`transition-colors ${isActive ? c.bg : 'bg-white'}`}>
              {/* Phase header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : phase.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base ${isActive ? `${c.bg} border ${c.border}` : 'bg-gray-100'}`}>
                  {phase.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isActive ? c.text : 'text-gray-700'}`}>{phase.name}</span>
                    {isActive && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border} font-medium`}>Active</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{phase.full}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doneCount > 0 && (
                    <span className="text-xs text-gray-400">{doneCount}/{phase.checklist.length}</span>
                  )}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Description */}
                  <p className="text-xs text-gray-600 leading-relaxed">{phase.desc}</p>

                  {/* Checklist */}
                  <div className={`rounded-lg border ${c.border} ${c.bg} p-3 space-y-2`}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Checklist</p>
                    {phase.checklist.map((item, i) => {
                      const k = `${phase.key}_${i}`;
                      return (
                        <label key={i} className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!checked[k]}
                            onChange={() => toggleCheck(phase.key, i)}
                            className="mt-0.5 flex-shrink-0 accent-blue-600"
                          />
                          <span className={`text-xs leading-relaxed ${checked[k] ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Tip */}
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <span className="text-sm flex-shrink-0">💡</span>
                    <p className="text-xs text-amber-800 leading-relaxed">{phase.tips}</p>
                  </div>

                  {/* Set as current phase */}
                  {onPhaseChange && (
                    <button
                      onClick={() => onPhaseChange(phase.name)}
                      className={`w-full py-2 rounded-lg text-xs font-semibold border transition-colors ${isActive ? `${c.bg} ${c.text} ${c.border}` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {isActive ? '✓ Current Phase' : `Set as Current Phase`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="px-4 py-2.5 border-t bg-gray-50 flex-shrink-0">
        <p className="text-xs text-gray-400 text-center">
          PEACE Model — Deputy Inspector-General of Police Guidelines
        </p>
      </div>
    </div>
  );
}
