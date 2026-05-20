import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useWhisper } from '../hooks/useWhisper.js';
import { useTimer } from '../hooks/useTimer.js';
import { useWindowSize } from '../hooks/useWindowSize.js';
import { getProfession } from '../data/professions.js';
import { updateSession } from '../api/sessions.js';
import { generateReport } from '../api/claude.js';
import { put } from '../lib/idb.js';
import { Waveform } from '../components/session/Waveform.jsx';
import { TranscriptPanel } from '../components/session/TranscriptPanel.jsx';
import { QuestionPanel } from '../components/session/QuestionPanel.jsx';
import { AISuggestions } from '../components/session/AISuggestions.jsx';
import { NoteBar } from '../components/session/NoteBar.jsx';
import { FlagsPanel } from '../components/session/FlagsPanel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import toast from 'react-hot-toast';

export default function SessionPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();

  const setup = JSON.parse(sessionStorage.getItem('session_setup') || '{}');
  const sessionId = sessionStorage.getItem('active_session_id');
  const profession = getProfession(setup.profession);

  const [currentPhase, setCurrentPhase] = useState(profession?.phases?.[0] || '');
  const [entries, setEntries] = useState([]);
  const [flags, setFlags] = useState([]);
  const [lastAsked, setLastAsked] = useState('');
  const [activeTab, setActiveTab] = useState('transcript');
  const [endModal, setEndModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [started, setStarted] = useState(false);

  const { start, pause, resume, stop, level, isRecording, isPaused, error: micError } = useAudioRecorder();
  const { transcript, addChunk, flush } = useWhisper();
  const timer = useTimer();

  const autoSaveRef = useRef(null);

  useEffect(() => {
    if (!sessionId) { navigate('/session/new'); return; }
    const unload = (e) => {
      if (isRecording) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [sessionId, isRecording]);

  useEffect(() => {
    if (transcript.length > 0) {
      setEntries(prev => {
        const ids = new Set(prev.map(e => e.id));
        const newOnes = transcript.filter(e => !ids.has(e.id));
        const combined = [...prev, ...newOnes];
        // Cap at 500 entries — warn user if limit approaching
        if (combined.length >= 490 && prev.length < 490) {
          toast('Transkrip menghampiri had 500 entri.', { icon: '⚠️' });
        }
        return combined.length > 500 ? combined.slice(combined.length - 500) : combined;
      });
    }
  }, [transcript]);

  useEffect(() => {
    if (!started) return;
    autoSaveRef.current = setInterval(() => {
      if (sessionId) {
        put('sessions', { id: sessionId, transcript: entries, flags, updated_at: new Date().toISOString() });
      }
    }, 60000);
    return () => clearInterval(autoSaveRef.current);
  }, [started, sessionId, entries, flags]);

  useEffect(() => {
    if (micError) {
      const msgs = { no_mic: 'Tiada mikrofon dijumpai.', permission_denied: 'Kebenaran mikrofon ditolak.', not_supported: 'Perakam audio tidak disokong.' };
      toast.error(msgs[micError] || 'Ralat mikrofon.');
    }
  }, [micError]);

  const handleStart = async () => {
    await start({ onChunk: addChunk });
    timer.start();
    setStarted(true);
    addEntry({ type: 'SYSTEM', text: `Sesi dimulakan — ${new Date().toLocaleTimeString('ms-MY')}` });
  };

  const handlePause = () => { pause(); timer.pause(); };
  const handleResume = () => { resume(); timer.resume(); };

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

  const handleNote = (text) => addEntry({ type: 'NOTE', text });
  const handleFlag = (text) => {
    const flag = { id: crypto.randomUUID(), text, timestamp: new Date().toISOString() };
    setFlags(prev => [...prev, flag]);
    addEntry({ type: 'FLAG', text });
  };
  const removeFlag = (i) => setFlags(prev => prev.filter((_, idx) => idx !== i));

  const handleEnd = async () => {
    flush();
    stop();
    timer.stop();
    clearInterval(autoSaveRef.current);
    setGenerating(true);

    try {
      await updateSession(sessionId, {
        transcript: entries,
        flags,
        duration: timer.elapsed,
        synced: true,
      });

      const { report, hash } = await generateReport({
        session_id: sessionId,
        transcript: entries,
        flags,
        session_info: { ...setup, duration: timer.elapsed },
      });

      toast.success('Laporan berjaya dijana!');
      sessionStorage.removeItem('session_setup');
      sessionStorage.removeItem('active_session_id');
      navigate(`/session/${sessionId}`);
    } catch (err) {
      toast.error('Gagal menjana laporan. Data sesi telah disimpan.');
      navigate('/dashboard');
    } finally {
      setGenerating(false);
    }
  };

  const recentTranscript = entries.filter(e => e.type === 'TRANSCRIPT').slice(-5).map(e => e.text);

  const tabs = ['transcript', 'questions', 'ai', 'flags'];
  const tabLabels = { transcript: 'Transkrip', questions: 'Soalan', ai: 'AI', flags: `Bendera (${flags.length})` };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Controls */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Waveform level={level} isRecording={isRecording} isPaused={isPaused} />
          <span className="text-xl font-mono font-semibold text-gray-900">{timer.formatted}</span>
        </div>

        <div className="flex gap-2 ml-auto">
          {!started ? (
            <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700">Mula Rakaman</Button>
          ) : isPaused ? (
            <Button onClick={handleResume} variant="secondary">Sambung</Button>
          ) : (
            <Button onClick={handlePause} variant="secondary">Jeda</Button>
          )}
          {started && (
            <Button onClick={() => setEndModal(true)} variant="danger">Tamat Sesi</Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {isMobile ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex border-b bg-white">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {activeTab === 'transcript' && <TranscriptPanel entries={entries} />}
            {activeTab === 'questions' && (
              <QuestionPanel
                questions={profession?.questions} phases={profession?.phases}
                currentPhase={currentPhase} onPhaseChange={setCurrentPhase} onAsk={handleAsk}
              />
            )}
            {activeTab === 'ai' && (
              <AISuggestions
                profession={setup.profession} phase={currentPhase}
                lastQuestion={lastAsked} recentTranscript={recentTranscript} onSuggest={handleAsk}
              />
            )}
            {activeTab === 'flags' && <FlagsPanel flags={flags} onRemove={removeFlag} />}
          </div>
          {started && <NoteBar onNote={handleNote} onFlag={handleFlag} />}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col border-r">
            <div className="flex-1 overflow-hidden"><TranscriptPanel entries={entries} /></div>
            {started && <NoteBar onNote={handleNote} onFlag={handleFlag} />}
          </div>
          <div className="w-72 flex flex-col border-r overflow-hidden">
            <QuestionPanel
              questions={profession?.questions} phases={profession?.phases}
              currentPhase={currentPhase} onPhaseChange={setCurrentPhase} onAsk={handleAsk}
            />
          </div>
          <div className="w-72 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <AISuggestions
                profession={setup.profession} phase={currentPhase}
                lastQuestion={lastAsked} recentTranscript={recentTranscript} onSuggest={handleAsk}
              />
            </div>
            <div className="border-t"><FlagsPanel flags={flags} onRemove={removeFlag} /></div>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      <Modal
        open={endModal}
        onClose={() => setEndModal(false)}
        title="Tamat Sesi"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEndModal(false)}>Batal</Button>
            <Button variant="danger" loading={generating} onClick={handleEnd}>
              Ya, Tamat & Jana Laporan
            </Button>
          </div>
        }
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Tamat Sesi Rakaman?</h3>
          <p className="text-gray-600 text-sm">
            Rakaman akan dihenti dan laporan AI akan dijana secara automatik.
            Tempoh: <strong>{timer.formatted}</strong> • Entri: <strong>{entries.length}</strong>
          </p>
        </div>
      </Modal>
    </div>
  );
}
