import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useWhisper } from '../hooks/useWhisper.js';
import { useRealtimeTranscript, isSpeechRecognitionSupported } from '../hooks/useRealtimeTranscript.js';
import { useTimer } from '../hooks/useTimer.js';
import { useWindowSize } from '../hooks/useWindowSize.js';
import { getProfession } from '../data/professions.js';
import { updateSession } from '../api/sessions.js';
import { generateReport } from '../api/claude.js';
import { put } from '../lib/idb.js';
import { uploadAudio } from '../api/audioLibrary.js';
import { diarizeAudio, pollDiarization } from '../api/whisper.js';
import { getSessionById } from '../api/sessions.js';
import { Waveform } from '../components/session/Waveform.jsx';
import { TranscriptPanel } from '../components/session/TranscriptPanel.jsx';
import { QuestionPanel } from '../components/session/QuestionPanel.jsx';
import { AISuggestions } from '../components/session/AISuggestions.jsx';
import { NoteBar } from '../components/session/NoteBar.jsx';
import { FlagsPanel } from '../components/session/FlagsPanel.jsx';
import { AssessmentPanel } from '../components/session/AssessmentPanel.jsx';
import { PeaceModelPanel } from '../components/session/PeaceModelPanel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import toast from 'react-hot-toast';

const CRISIS_RESOURCES = [
  { name: 'Talian Kasih', number: '15999', desc: 'Sokongan krisis 24 jam' },
  { name: 'MIASA', number: '03-2780 6803', desc: 'Mental Illness Awareness & Support Association' },
  { name: 'Befrienders KL', number: '03-7627 2929', desc: 'Pencegahan bunuh diri' },
];

export default function SessionPage() {
  const { user } = useAuthStore();
  const { subscription } = useBillingStore();
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();

  const setupRef = useRef(JSON.parse(sessionStorage.getItem('session_setup') || '{}'));
  const setup = setupRef.current;
  const sessionId = sessionStorage.getItem('active_session_id');
  const profession = getProfession(setup.profession);
  const isInvestigationProf = ['police', 'sprm', 'sispa', 'skmm', 'hr', 'jtk', 'peguam'].includes(setup.profession);

  const [currentPhase, setCurrentPhase] = useState(profession?.phases?.[0] || '');
  const [entries, setEntries] = useState([]);
  const [flags, setFlags] = useState([]);
  const [lastAsked, setLastAsked] = useState('');
  const [activeTab, setActiveTab] = useState('transcript');
  const [mobileAiTab, setMobileAiTab] = useState('ai');
  const [endModal, setEndModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState('');
  const [started, setStarted] = useState(false);
  const [crisisAlert, setCrisisAlert] = useState(null);
  const [transcriptLang, setTranscriptLang] = useState('auto');
  const [endError, setEndError] = useState(false);
  const autoPhaseRef = useRef(new Set()); // track which phases already auto-suggested

  const isResuming = sessionStorage.getItem('resuming') === 'true';

  const { start, pause, resume, stop, audioBlob, level, isRecording, isPaused, error: micError } = useAudioRecorder();
  const { transcript, addChunk, flush } = useWhisper({ lang: transcriptLang });
  const timer = useTimer();


  const autoSaveRef = useRef(null);
  const detectedFlagsRef = useRef(new Set());
  const durationAtStopRef = useRef(0);
  const fullAudioChunksRef = useRef([]);

  // PEACE Model auto-phase — advance phase based on elapsed time (investigation professions only)
  const PEACE_THRESHOLDS_SEC = [0, 3 * 60, 8 * 60, 25 * 60, 45 * 60];
  useEffect(() => {
    if (!isInvestigationProf || !started || isPaused || !profession?.phases?.length) return;
    const elapsed = timer.elapsed;
    profession.phases.forEach((phase, idx) => {
      if (idx === 0) return; // skip first phase (already active at start)
      const threshold = PEACE_THRESHOLDS_SEC[idx] ?? (idx * 10 * 60);
      if (elapsed >= threshold && !autoPhaseRef.current.has(idx)) {
        autoPhaseRef.current.add(idx);
        setCurrentPhase(phase);
        toast(`📍 Phase: ${phase}`, { icon: '🔄', duration: 3000 });
      }
    });
  }, [timer.elapsed, started, isPaused, isInvestigationProf]);

  useEffect(() => {
    if (!sessionId) { navigate('/session/new'); return; }
    const unload = (e) => {
      if (isRecording) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [sessionId, isRecording]);

  // On resume: load existing transcript + flags saved from previous recording
  useEffect(() => {
    if (!isResuming || !sessionId) return;
    sessionStorage.removeItem('resuming');
    getSessionById(sessionId).then(s => {
      if (Array.isArray(s.transcript) && s.transcript.length > 0) setEntries(s.transcript);
      if (Array.isArray(s.flags) && s.flags.length > 0) setFlags(s.flags);
      if (s.duration > 0) timer.restore(s.duration);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (transcript.length > 0) {
      setEntries(prev => {
        const ids = new Set(prev.map(e => e.id));
        const newOnes = transcript.filter(e => !ids.has(e.id));
        const combined = [...prev, ...newOnes];
        if (combined.length >= 490 && prev.length < 490) {
          toast('Transcript menghampiri had 500 entri.', { icon: '⚠️' });
        }
        return combined.length > 500 ? combined.slice(combined.length - 500) : combined;
      });
    }
  }, [transcript]);

  // Red flag detection — scans new transcript entries against profession keywords
  useEffect(() => {
    if (!profession?.redFlagKeywords?.length || !started) return;
    const newEntries = entries.filter(e => e.type === 'TRANSCRIPT' && !detectedFlagsRef.current.has(e.id));
    for (const entry of newEntries) {
      detectedFlagsRef.current.add(entry.id);
      const lower = entry.text?.toLowerCase() || '';
      const matched = profession.redFlagKeywords.find(kw => lower.includes(kw.toLowerCase()));
      if (matched) {
        const isCrisis = setup.profession === 'counselor' || setup.profession === 'doctor';
        if (isCrisis) {
          setCrisisAlert(matched);
          toast.error(`Pengesan Risiko: "${matched}" dikesan dalam transkrip.`, { duration: 8000, id: 'crisis' });
        } else {
          toast(`Kata kunci bendera: "${matched}" dikesan.`, { icon: '🚩', duration: 6000, id: `flag-${matched}` });
        }
        setFlags(prev => {
          const alreadyFlagged = prev.some(f => f.text.includes(matched));
          if (alreadyFlagged) return prev;
          return [...prev, { id: crypto.randomUUID(), text: `[AUTO] Kata kunci risiko dikesan: "${matched}"`, timestamp: new Date().toISOString() }];
        });
      }
    }
  }, [entries, profession, started, setup.profession]);

  useEffect(() => {
    if (!started) return;
    autoSaveRef.current = setInterval(() => {
      if (!sessionId) return;
      // Local backup (works offline)
      put('sessions', { id: sessionId, transcript: entries, flags, updated_at: new Date().toISOString() });
      // Cloud save so session is resumable from any device
      updateSession(sessionId, { transcript: entries, flags, duration: timer.elapsed }).catch(() => {});
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [started, sessionId, entries, flags, timer.elapsed]);

  useEffect(() => {
    if (micError) {
      const msgs = { no_mic: 'Tiada mikrofon dijumpai.', permission_denied: 'Kebenaran mikrofon declined.', not_supported: 'Perakam audio tidak disokong.' };
      toast.error(msgs[micError] || 'Ralat mikrofon.');
    }
  }, [micError]);

  // Background upload: runs after recording stops and blob is ready
  useEffect(() => {
    if (!audioBlob || !sessionId || !user) return;
    uploadAudio({
      blob: audioBlob,
      userId: user.id,
      sessionId,
      title: setup.title,
      duration: durationAtStopRef.current,
      plan: subscription?.plan || 'free',
    }).catch((err) => {
      if (err?.message?.includes('Had storan')) toast.error(err.message);
    });
  }, [audioBlob]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async () => {
    fullAudioChunksRef.current = [];
    await start({
      onChunk: (chunk) => {
        fullAudioChunksRef.current.push(chunk); // always collect for diarization
        if (!isSpeechRecognitionSupported) addChunk(chunk); // also feed Whisper
      },
    });
    if (isSpeechRecognitionSupported) startRealtime();
    timer.start();
    setStarted(true);
    addEntry({ type: 'SYSTEM', text: `Sesi dimulakan — ${new Date().toLocaleTimeString('ms-MY')}` });
    if (sessionId) updateSession(sessionId, { recording_status: 'in_progress' }).catch(() => {});
  };

  const handlePause = () => {
    pause();
    if (isSpeechRecognitionSupported) stopRealtime();
    timer.pause();
  };

  const handleResume = () => {
    resume();
    if (isSpeechRecognitionSupported) startRealtime();
    timer.resume();
  };

  const handleAsk = (question) => {
    setLastAsked(question);
    addEntry({ type: 'INTERVIEWER', speaker: setup.interviewer, text: question });
  };

  const addEntry = useCallback((data) => {
    setEntries(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...data,
    }]);
  }, []);

  const { interim, start: startRealtime, stop: stopRealtime } = useRealtimeTranscript({
    onFinalResult: useCallback((text) => addEntry({ type: 'TRANSCRIPT', text }), [addEntry]),
    lang: transcriptLang,
  });

  const handleNote = (text) => addEntry({ type: 'NOTE', text });
  const handleFlag = (text) => {
    const flag = { id: crypto.randomUUID(), text, timestamp: new Date().toISOString() };
    setFlags(prev => [...prev, flag]);
    addEntry({ type: 'FLAG', text });
  };
  const removeFlag = (i) => setFlags(prev => prev.filter((_, idx) => idx !== i));

  const handleEnd = async () => {
    const lockKey = `report_generating_${sessionId}`;
    if (localStorage.getItem(lockKey)) {
      toast('Laporan sedang dijana di tab lain.');
      setEndModal(false);
      return;
    }
    localStorage.setItem(lockKey, '1');

    if (isSpeechRecognitionSupported) stopRealtime();
    flush();
    durationAtStopRef.current = timer.elapsed;
    stop();
    timer.stop();
    clearInterval(autoSaveRef.current);
    setGenerating(true);
    setEndError(false);
    setGenerateStep('Menyimpan data sesi...');

    // Capture full audio blob synchronously before state updates
    const fullAudioBlob = fullAudioChunksRef.current.length > 0
      ? new Blob(fullAudioChunksRef.current, { type: 'audio/webm' })
      : null;

    try {
      // 1. Diarize full audio with AssemblyAI (if audio captured)
      let diarizedEntries = entries;
      if (fullAudioBlob && fullAudioBlob.size > 10_000) {
        try {
          setGenerateStep('Menghantar audio untuk diarization speaker...');
          const jobId = await diarizeAudio(fullAudioBlob);
          setGenerateStep('Memproses diarization speaker (ini mengambil masa ~30 saat)...');
          const utterances = await pollDiarization(jobId, {
            onProgress: (status) => {
              if (status === 'processing') setGenerateStep('Memproses diarization & pengenalan speaker...');
            },
            interviewer: setup.interviewer,
            subject_name: setup.subject_name,
          });
          if (utterances.length > 0) {
            // Build speaker map — use Speaker Identification if available, else heuristic
            const speakerMap = {};
            const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))];
            const hasIdentified = utterances.some(u => u.identified_name);

            if (hasIdentified) {
              // Speaker ID succeeded — map each label by matching identified name to role
              const interviewerFirstWord = (setup.interviewer || '').toLowerCase().split(' ')[0];
              uniqueSpeakers.forEach(s => {
                const sample = utterances.find(u => u.speaker === s && u.identified_name);
                const name = (sample?.identified_name || '').toLowerCase();
                const isInterviewer = interviewerFirstWord && name.includes(interviewerFirstWord);
                speakerMap[s] = isInterviewer ? 'interviewer' : 'subject';
              });
              setGenerateStep('Pengenalan speaker berjaya ✓');
            } else {
              // Fallback heuristic: first speaker = interviewer
              uniqueSpeakers.forEach((s, i) => {
                if (i === 0) speakerMap[s] = 'interviewer';
                else if (i === 1) speakerMap[s] = 'subject';
                else speakerMap[s] = `speaker_${s.toLowerCase()}`;
              });
            }
            // Keep SYSTEM/NOTE/FLAG entries, replace TRANSCRIPT with diarized
            const nonTranscript = entries.filter(e => e.type !== 'TRANSCRIPT');
            const diarized = utterances.map(u => ({
              id: crypto.randomUUID(),
              type: 'TRANSCRIPT',
              text: u.text,
              speaker: speakerMap[u.speaker],
              identified_name: u.identified_name || null,
              timestamp: new Date(Date.now() - (utterances[utterances.length - 1].end - u.start)).toISOString(),
            }));
            diarizedEntries = [...nonTranscript, ...diarized].sort((a, b) =>
              new Date(a.timestamp) - new Date(b.timestamp)
            );
          }
        } catch (diarizeErr) {
          console.warn('Diarization failed, continuing with original transcript:', diarizeErr.message);
          // Non-fatal — continue with existing transcript
        }
      }

      setGenerateStep('Menyimpan data sesi...');
      await updateSession(sessionId, {
        transcript: diarizedEntries,
        flags,
        duration: timer.elapsed,
        recording_status: 'completed',
        synced: true,
      });

      setGenerateStep('Menganalisis transkrip dengan AI...');
      // Fetch subject info for counselor sessions
      let subject_info = null;
      if (setup.subject_id) {
        const { supabase } = await import('../lib/supabase.js');
        const { data } = await supabase.from('subjects').select(
          'name, gender, marital_status, occupation, presenting_issue, session_type, psychiatric_history, psychiatric_medication, problem_types'
        ).eq('id', setup.subject_id).single().catch(() => ({ data: null }));
        subject_info = data;
      }
      await generateReport({
        session_id: sessionId,
        transcript: diarizedEntries,
        flags,
        session_info: { ...setup, duration: timer.elapsed },
        subject_info,
      });

      setGenerateStep('Laporan siap!');
      // Mark the most recent confirmed appointment as completed (only past/today, not future)
      if (setup.subject_id) {
        const { supabase: _sb } = await import('../lib/supabase.js');
        const today = new Date().toISOString().split('T')[0];
        _sb.from('appointments').update({ status: 'completed' })
          .eq('subject_id', setup.subject_id)
          .eq('status', 'confirmed')
          .lte('confirmed_date', today)
          .then(() => {}).catch(() => {});
      }
      sessionStorage.removeItem('session_setup');
      sessionStorage.removeItem('active_session_id');
      toast.success('Laporan berjaya dijana!');
      navigate(`/session/${sessionId}`);
    } catch {
      setEndError(true);
    } finally {
      localStorage.removeItem(lockKey);
      setGenerating(false);
      setGenerateStep('');
    }
  };

  const handleRetryReport = async () => {
    setEndError(false);
    setGenerating(true);
    setGenerateStep('Menganalisis transkrip dengan AI...');
    try {
      await generateReport({
        session_id: sessionId,
        transcript: entries,
        flags,
        session_info: { ...setup, duration: timer.elapsed },
      });
      setGenerateStep('Laporan siap!');
      if (setup.subject_id) {
        const { supabase: _sb } = await import('../lib/supabase.js');
        const today = new Date().toISOString().split('T')[0];
        _sb.from('appointments').update({ status: 'completed' })
          .eq('subject_id', setup.subject_id)
          .eq('status', 'confirmed')
          .lte('confirmed_date', today)
          .then(() => {}).catch(() => {});
      }
      sessionStorage.removeItem('session_setup');
      sessionStorage.removeItem('active_session_id');
      toast.success('Laporan berjaya dijana!');
      navigate(`/session/${sessionId}`);
    } catch {
      setEndError(true);
    } finally {
      setGenerating(false);
      setGenerateStep('');
    }
  };

  const recentTranscript = entries.filter(e => e.type === 'TRANSCRIPT').slice(-5).map(e => e.text);
  const tabs = ['transcript', 'questions', 'assessment', 'ai', 'flags'];
  const tabLabels = { transcript: 'Transcript', questions: 'Soalan', assessment: 'Assessment', ai: 'AI Suggestions', flags: `Bendera${flags.length ? ` (${flags.length})` : ''}` };
  const mobileTabs = [
    { key: 'transcript', icon: '📝', label: 'Transcript' },
    { key: 'questions',  icon: '❓', label: 'Soalan' },
    { key: 'ai',        icon: '🤖', label: 'AI' },
    { key: 'flags',     icon: '🚩', label: 'Bendera' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Crisis Alert Banner */}
      {crisisAlert && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-start justify-between gap-4 z-40">
          <div className="flex-1">
            <p className="font-semibold text-sm">Amaran Risiko: Kata kunci "{crisisAlert}" dikesan</p>
            <p className="text-xs text-red-100 mt-0.5">
              Sumber kecemasan — {CRISIS_RESOURCES.map(r => `${r.name}: ${r.number}`).join(' | ')}
            </p>
          </div>
          <button onClick={() => setCrisisAlert(null)} className="text-red-200 hover:text-white flex-shrink-0 text-lg leading-none">×</button>
        </div>
      )}

      {/* Top Controls */}
      <div className="bg-white border-b">
        <div className="px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Waveform level={level} isRecording={isRecording} isPaused={isPaused} />
            <span className="text-xl font-mono font-semibold text-gray-900">{timer.formatted}</span>
            {!started && (
              <span className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                Sedia untuk dirakam
              </span>
            )}
            {isRecording && !isPaused && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Merakam
              </span>
            )}
            {isPaused && (
              <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">Dijeda</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!started ? (
              <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700 shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {isMobile ? 'Mula' : 'Mula Rakaman'}
              </Button>
            ) : isPaused ? (
              <Button onClick={handleResume} variant="secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                {isMobile ? 'Sambung' : 'Sambung'}
              </Button>
            ) : (
              <Button onClick={handlePause} variant="secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
                </svg>
                {isMobile ? 'Pause' : 'Pause'}
              </Button>
            )}
            {started && (
              <Button onClick={() => setEndModal(true)} variant="danger" className={isMobile ? '' : 'ml-4'}>
                {isMobile ? 'Tamat' : 'Tamat Sesi'}
              </Button>
            )}
          </div>
        </div>

        {/* Session context bar */}
        {isMobile ? (
          <div className="px-4 py-1.5 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500 min-w-0">
            <span className="font-medium text-gray-700 truncate">{setup.subject_name || setup.title || 'Sesi'}</span>
            {isSpeechRecognitionSupported && (
              <select
                value={transcriptLang}
                onChange={e => setTranscriptLang(e.target.value)}
                disabled={started}
                className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ml-2 flex-shrink-0"
              >
                <option value="auto">Auto BM+EN</option>
                <option value="ms-MY">BM</option>
                <option value="en-MY">EN (MY)</option>
                <option value="en-US">EN (US)</option>
              </select>
            )}
          </div>
        ) : (
          <div className="px-4 py-1.5 bg-gray-50 border-t flex items-center gap-4 text-xs text-gray-500 overflow-x-auto">
            <span className="font-medium text-gray-700 truncate max-w-[200px]">{setup.title || 'Sesi tanpa tajuk'}</span>
            <span className="text-gray-300">|</span>
            <span>{profession?.sessionType || 'Sesi'}</span>
            <span className="text-gray-300">|</span>
            <span>Subjek: <strong className="text-gray-700">{setup.subject_name || '—'}</strong></span>
            {setup.case_number && (
              <>
                <span className="text-gray-300">|</span>
                <span>No. Kes: <strong className="text-gray-700">{setup.case_number}</strong></span>
              </>
            )}
            {isSpeechRecognitionSupported && (
              <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                <span className="text-gray-400">Language:</span>
                <select
                  value={transcriptLang}
                  onChange={e => setTranscriptLang(e.target.value)}
                  disabled={started}
                  className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="auto">Auto BM+EN (Campuran)</option>
                  <option value="ms-MY">Language Malaysia</option>
                  <option value="en-MY">English (MY)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      {/* Pre-recording guidance */}
      {!started && (
        <div className="bg-green-50 border-b border-green-100 px-4 py-2.5 flex items-center gap-3">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-800">
            Tekan <strong>Mula Rakaman</strong> di atas untuk memulakan transkripsi automatik. Pastikan mikrofon dibenarkan oleh pelayar.
          </p>
        </div>
      )}

      {isMobile ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Mobile tab bar — 4 tabs with icons */}
          <div className="flex border-b bg-white px-1 flex-shrink-0">
            {mobileTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors min-h-[52px] ${
                  activeTab === t.key ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <span className="text-[18px] leading-none">{t.icon}</span>
                <span className="text-[10px] font-medium leading-none">{t.label}</span>
                {t.key === 'flags' && flags.length > 0 && (
                  <span className="absolute top-2 right-[20%] min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {flags.length}
                  </span>
                )}
                {activeTab === t.key && (
                  <span className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'transcript' && <TranscriptPanel entries={entries} interim={interim} />}
            {activeTab === 'questions' && (
              <QuestionPanel
                questions={profession?.questions} phases={profession?.phases}
                currentPhase={currentPhase} onPhaseChange={setCurrentPhase} onAsk={handleAsk}
              />
            )}
            {activeTab === 'ai' && (
              <div className="flex flex-col h-full">
                {/* AI sub-toggle */}
                <div className="flex bg-gray-50 border-b text-xs flex-shrink-0">
                  <button
                    onClick={() => setMobileAiTab('ai')}
                    className={`flex-1 py-2.5 font-semibold transition-colors ${mobileAiTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500'}`}
                  >
                    🤖 AI Suggestions
                  </button>
                  <button
                    onClick={() => setMobileAiTab('assessment')}
                    className={`flex-1 py-2.5 font-semibold transition-colors ${mobileAiTab === 'assessment' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500'}`}
                  >
                    {isInvestigationProf ? '🔍 PEACE' : '📊 Assessment'}
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {mobileAiTab === 'ai' ? (
                    <AISuggestions
                      profession={setup.profession} phase={currentPhase}
                      lastQuestion={lastAsked} recentTranscript={recentTranscript}
                      entries={entries} isActive={started && !isPaused}
                      onSuggest={handleAsk}
                    />
                  ) : isInvestigationProf ? (
                    <PeaceModelPanel currentPhase={currentPhase} onPhaseChange={setCurrentPhase} />
                  ) : (
                    <AssessmentPanel sessionId={sessionId} subjectId={setup.subject_id} userId={user?.id} />
                  )}
                </div>
              </div>
            )}
            {activeTab === 'flags' && <FlagsPanel flags={flags} onRemove={removeFlag} />}
          </div>

          {started && <NoteBar onNote={handleNote} onFlag={handleFlag} />}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col border-r">
            <div className="flex-1 overflow-hidden"><TranscriptPanel entries={entries} interim={interim} /></div>
            {started && <NoteBar onNote={handleNote} onFlag={handleFlag} />}
          </div>
          <div className="w-72 flex flex-col border-r overflow-hidden">
            <QuestionPanel
              questions={profession?.questions} phases={profession?.phases}
              currentPhase={currentPhase} onPhaseChange={setCurrentPhase} onAsk={handleAsk}
            />
          </div>
          {/* AI Suggestions — always visible on desktop, toggle on md */}
          <div className="w-72 flex flex-col overflow-hidden">
            <div className="flex border-b bg-white text-xs xl:hidden">
              <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 font-medium ${activeTab !== 'assessment' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>AI Suggestions</button>
              <button onClick={() => setActiveTab('assessment')} className={`flex-1 py-2 font-medium ${activeTab === 'assessment' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
                {isInvestigationProf ? 'PEACE Model' : 'Assessment'}
              </button>
            </div>
            <div className="hidden xl:flex items-center px-3 py-2 border-b bg-white">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Suggestions</span>
            </div>
            <div className="flex-1 overflow-auto">
              {activeTab === 'assessment' ? (
                <div className="xl:hidden h-full">
                  {isInvestigationProf
                    ? <PeaceModelPanel currentPhase={currentPhase} onPhaseChange={setCurrentPhase} />
                    : <AssessmentPanel sessionId={sessionId} subjectId={setup.subject_id} userId={user?.id} />}
                </div>
              ) : null}
              <div className={activeTab !== 'assessment' ? 'h-full' : 'hidden xl:block h-full'}>
                <AISuggestions
                  profession={setup.profession} phase={currentPhase}
                  lastQuestion={lastAsked} recentTranscript={recentTranscript}
                  entries={entries} isActive={started && !isPaused}
                  onSuggest={handleAsk}
                />
              </div>
            </div>
            <div className="border-t"><FlagsPanel flags={flags} onRemove={removeFlag} /></div>
          </div>

          {/* 4th column on xl+ — PEACE Model for investigation, Assessment for others */}
          <div className="hidden xl:flex w-64 flex-col border-l overflow-hidden">
            <div className="flex items-center px-3 py-2 border-b bg-white">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isInvestigationProf ? 'PEACE Model' : 'Assessment'}
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              {isInvestigationProf
                ? <PeaceModelPanel currentPhase={currentPhase} onPhaseChange={setCurrentPhase} />
                : <AssessmentPanel sessionId={sessionId} subjectId={setup.subject_id} userId={user?.id} />}
            </div>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      <Modal
        open={endModal}
        onClose={() => !generating && setEndModal(false)}
        title="Tamat Sesi"
        footer={
          !generating && !endError && (
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setEndModal(false)}>Batal</Button>
              <Button variant="danger" onClick={handleEnd}>
                Ya, Tamat &amp; Generate Report
              </Button>
            </div>
          )
        }
      >
        <div className="text-center py-4">
          {generating ? (
            <>
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sedang Memproses...</h3>
              <p className="text-blue-600 text-sm font-medium">{generateStep}</p>
              <p className="text-gray-400 text-xs mt-2">Ini mungkin mengambil masa 30–60 saat</p>
            </>
          ) : endError ? (
            <>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Analisis AI Gagal</h3>
              <p className="text-gray-600 text-sm mb-1">Data sesi telah berjaya saved.</p>
              <p className="text-gray-500 text-xs mb-5">Laporan boleh dijana semula dari halaman laporan sesi.</p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleRetryReport} className="w-full">
                  Cuba Semula Generate Report
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => {
                  sessionStorage.removeItem('session_setup');
                  sessionStorage.removeItem('active_session_id');
                  navigate(`/session/${sessionId}`);
                }}>
                  Buka Halaman Laporan
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Tamat Sesi Rakaman?</h3>
              <p className="text-gray-600 text-sm">
                Rakaman akan dihenti dan laporan AI akan dijana secara automatik.
              </p>
              <div className="flex justify-center gap-6 mt-3 text-sm">
                <span className="text-gray-500">Tempoh: <strong className="text-gray-800">{timer.formatted}</strong></span>
                <span className="text-gray-500">Entri: <strong className="text-gray-800">{entries.length}</strong></span>
              </div>
              {flags.some(f => f.text.startsWith('[AUTO]')) && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg text-left">
                  <p className="text-xs font-semibold text-red-700 mb-1">Amaran: Kata kunci risiko dikesan dalam sesi ini</p>
                  <p className="text-xs text-red-600">Sila semak bendera merah dalam laporan.</p>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
