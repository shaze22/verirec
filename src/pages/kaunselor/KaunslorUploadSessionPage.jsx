import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { useBillingStore } from '../../store/billingStore.js';
import { supabase } from '../../lib/supabase.js';
import { importFromStoragePath, pollDiarization } from '../../api/whisper.js';
import { generateReport } from '../../api/claude.js';
import { updateSession } from '../../api/sessions.js';
import { TopBar } from '../../components/layout/TopBar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const AUDIO_ACCEPT = '.mp3,.m4a,.mp4,.wav,.ogg,.webm,.flac,.aac,.mov,.wma';
const MAX_BYTES = 500 * 1024 * 1024;

function StepRow({ label, status }) {
  return (
    <div className="flex items-center gap-3">
      {status === 'done' && (
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {status === 'active' && (
        <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin flex-shrink-0" />
      )}
      {status === 'pending' && (
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
      )}
      <span className={`text-sm ${
        status === 'active' ? 'text-violet-700 font-semibold'
        : status === 'done' ? 'text-green-700'
        : 'text-gray-400'
      }`}>{label}</span>
    </div>
  );
}

function parseTxtTranscript(text) {
  const speakerPattern = /^([A-Za-z][A-Za-z\s]{0,25}):\s+(.+)/;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  let currentSpeaker = null;
  let currentText = [];

  for (const line of lines) {
    const match = line.match(speakerPattern);
    if (match) {
      if (currentText.length > 0) {
        entries.push({ speaker: currentSpeaker, text: currentText.join(' ') });
        currentText = [];
      }
      currentSpeaker = match[1].trim();
      currentText = [match[2].trim()];
    } else {
      currentText.push(line);
    }
  }
  if (currentText.length > 0) {
    entries.push({ speaker: currentSpeaker || 'Speaker', text: currentText.join(' ') });
  }

  return entries.map(e => ({
    id: crypto.randomUUID(),
    type: 'TRANSCRIPT',
    text: e.text,
    speaker: e.speaker,
    timestamp: new Date().toISOString(),
  }));
}

export default function KaunslorUploadSessionPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { canStartSession, incrementUsage } = useBillingStore();
  const navigate = useNavigate();
  const audioFileRef = useRef(null);
  const txtFileRef = useRef(null);

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('audio');
  const [audioFile, setAudioFile] = useState(null);
  const [txtContent, setTxtContent] = useState('');
  const [dragging, setDragging] = useState(false);
  const [counselorName, setCounselorName] = useState('');
  const [contextNotes, setContextNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [stepDetail, setStepDetail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user || !id) return;
    supabase.from('subjects').select('*').eq('id', id).eq('user_id', user.id).single()
      .then(({ data }) => {
        if (!data) { navigate('/kaunselor/clients'); return; }
        setClient(data);
        setContextNotes(data.presenting_issue || '');
        setCounselorName(user?.user_metadata?.full_name || '');
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  const formatBytes = (b) =>
    b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  const stepStatus = (step) => {
    const order = ['uploading', 'transcribing', 'generating', 'done'];
    const cur = order.indexOf(currentStep);
    const tgt = order.indexOf(step);
    if (cur > tgt) return 'done';
    if (cur === tgt) return 'active';
    return 'pending';
  };

  const handleAudioFile = (f) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { toast.error('File exceeds 500MB limit.'); return; }
    setAudioFile(f);
    setErrorMsg('');
  };

  const handleTxtFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => setTxtContent(e.target.result || '');
    reader.readAsText(f);
    setErrorMsg('');
  };

  const handleProcess = async () => {
    if (mode === 'audio' && !audioFile) { toast.error('Please select an audio file.'); return; }
    if (mode === 'txt' && !txtContent.trim()) { toast.error('Please provide a transcript.'); return; }
    if (!canStartSession()) {
      toast.error('Session limit reached. Please upgrade or purchase more sessions.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');
    let sessionId = null;

    try {
      const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('subject_id', id);
      const sessionNumber = (count || 0) + 1;
      const title = `Counseling Session ${sessionNumber} — ${client.name}`;

      const { data: session, error: sessionErr } = await supabase.from('sessions').insert({
        user_id: user.id,
        title,
        profession: 'counselor',
        interviewer: counselorName.trim() || user?.email || '',
        subject_name: client.name,
        subject_id: id,
        consent_signed: true,
        consent_data: {
          items: ['Counselor confirms client consent was obtained prior to this session recording'],
          subject_name: client.name,
          import_mode: true,
        },
        recording_status: 'in_progress',
        ...(contextNotes.trim() ? { context_notes: contextNotes.trim() } : {}),
      }).select().single();
      if (sessionErr) throw sessionErr;
      sessionId = session.id;

      const usageResult = await incrementUsage();
      if (usageResult?.error) throw new Error(
        usageResult.error === 'limit_reached'
          ? 'Session limit reached. Please upgrade or purchase more sessions.'
          : 'Failed to update session count.'
      );

      let transcript = [];
      let totalDuration = 0;

      if (mode === 'txt') {
        setCurrentStep('transcribing');
        setStepDetail('Parsing transcript...');
        transcript = parseTxtTranscript(txtContent);

      } else {
        // Upload audio to Supabase storage
        setCurrentStep('uploading');
        const ext = audioFile.name.split('.').pop()?.toLowerCase() || 'mp3';
        const storagePath = `${user.id}/clients/${id}/${Date.now()}_session.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('recordings')
          .upload(storagePath, audioFile, { contentType: audioFile.type || 'audio/mpeg', upsert: false });
        if (uploadErr) throw uploadErr;

        await supabase.from('audio_library').insert({
          user_id: user.id,
          subject_id: id,
          session_id: sessionId,
          storage_path: storagePath,
          file_name: audioFile.name,
          file_size: audioFile.size,
          mime_type: audioFile.type || 'audio/mpeg',
          title,
        }).catch(() => {});

        // Transcribe with AssemblyAI
        setCurrentStep('transcribing');
        setStepDetail('Submitting to AssemblyAI...');
        const jobId = await importFromStoragePath({
          storagePath,
          interviewer: counselorName.trim(),
          subject_name: client.name,
        });

        setStepDetail('Processing audio — this may take a few minutes for long recordings...');
        const utterances = await pollDiarization(jobId, {
          interviewer: counselorName.trim(),
          subject_name: client.name,
          onProgress: (status) => setStepDetail(`AssemblyAI: ${status}`),
          maxWaitMs: 600_000,
        });

        const speakers = [...new Set(utterances.map(u => u.speaker))].sort();
        const speakerMap = {};
        speakers.forEach((sp, i) => {
          speakerMap[sp] = i === 0 ? (counselorName.trim() || 'Counselor') : client.name;
        });

        transcript = utterances.map(u => ({
          id: crypto.randomUUID(),
          type: 'TRANSCRIPT',
          text: u.text,
          speaker: speakerMap[u.speaker],
          identified_name: u.identified_name || null,
          timestamp: new Date(Date.now() - ((utterances.at(-1)?.end ?? 0) - u.start)).toISOString(),
        }));

        totalDuration = utterances.length > 0
          ? Math.round((utterances.at(-1)?.end ?? 0) / 1000)
          : 0;
      }

      await updateSession(sessionId, {
        transcript,
        duration: totalDuration,
        recording_status: 'completed',
        synced: true,
      });

      setCurrentStep('generating');
      setStepDetail('');
      await generateReport({
        session_id: sessionId,
        transcript,
        flags: [],
        session_info: {
          profession: 'counselor',
          title,
          subject_name: client.name,
          subject_role: '',
          context_notes: contextNotes.trim(),
          duration: totalDuration,
          interviewer: counselorName.trim(),
        },
      });

      // Mark today's confirmed appointment as completed
      const today = new Date().toISOString().split('T')[0];
      supabase.from('appointments').update({ status: 'completed' })
        .eq('subject_id', id).eq('status', 'confirmed').lte('confirmed_date', today)
        .then(() => {}).catch(() => {});

      setCurrentStep('done');
      toast.success('Session processed and report generated!');
      navigate(`/session/${sessionId}`);

    } catch (err) {
      console.error('Upload session error:', err);
      const msg = err.message || 'Processing failed. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
      if (sessionId) {
        await updateSession(sessionId, { recording_status: 'completed' }).catch(() => {});
      }
    } finally {
      if (currentStep !== 'done') setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col h-screen">
      <div className="h-14 bg-white border-b" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TopBar title={`New Session — ${client?.name}`} onBack={() => navigate(`/kaunselor/clients/${id}`)} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Mode toggle */}
          <div className="bg-white rounded-2xl border p-1 flex gap-1">
            <button
              onClick={() => setMode('audio')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                mode === 'audio' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Upload Audio Recording
            </button>
            <button
              onClick={() => setMode('txt')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                mode === 'txt' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Import Transcript (.txt)
            </button>
          </div>

          {/* ── Audio mode ── */}
          {mode === 'audio' && (
            <>
              <div className="flex flex-wrap gap-2">
                {['PLAUD Note', 'Phone Recorder', 'Zoom / Teams', 'Voice Recorder', 'Any Audio File'].map(src => (
                  <span key={src} className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2.5 py-1 rounded-full font-medium">
                    {src}
                  </span>
                ))}
              </div>
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                  dragging ? 'border-violet-400 bg-violet-50'
                  : audioFile ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 hover:border-violet-300 bg-white'
                }`}
                onClick={() => audioFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleAudioFile(f);
                }}
              >
                <input ref={audioFileRef} type="file" accept={AUDIO_ACCEPT} className="hidden"
                  onChange={(e) => handleAudioFile(e.target.files?.[0])} />
                {audioFile ? (
                  <div>
                    <div className="text-3xl mb-2">🎙️</div>
                    <p className="font-semibold text-green-800">{audioFile.name}</p>
                    <p className="text-sm text-green-600 mt-1">{formatBytes(audioFile.size)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAudioFile(null); }}
                      className="mt-2 text-xs text-gray-400 hover:text-red-500 underline"
                    >Remove</button>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-3">📁</div>
                    <p className="font-semibold text-gray-700">Drop recording here or click to browse</p>
                    <p className="text-sm text-gray-400 mt-1">MP3, M4A, MP4, WAV, OGG, WEBM, FLAC, MOV — max 500MB</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── TXT transcript mode ── */}
          {mode === 'txt' && (
            <div className="space-y-3">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                <p className="text-sm font-medium text-violet-800 mb-1">Import transcript from PLAUD Note or any transcription tool</p>
                <p className="text-xs text-violet-600">Paste your transcript below, or upload a .txt file. Speaker labels like "Counselor:" or "Client:" will be auto-detected.</p>
              </div>
              <button
                onClick={() => txtFileRef.current?.click()}
                className="flex items-center gap-2 text-sm text-violet-600 border border-violet-200 rounded-lg px-3 py-2 hover:bg-violet-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload .txt file
              </button>
              <input ref={txtFileRef} type="file" accept=".txt" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTxtFile(f); }} />
              <textarea
                value={txtContent}
                onChange={(e) => setTxtContent(e.target.value)}
                rows={10}
                placeholder={"Paste transcript here...\n\nContoh format:\nCounselor: Bagaimana perasaan awak hari ini?\nClient: Saya rasa lebih baik dari minggu lepas..."}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono"
              />
            </div>
          )}

          {/* Session details */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Counselor Name</label>
              <input
                value={counselorName}
                onChange={(e) => setCounselorName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Context (optional)</label>
              <textarea
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                rows={2}
                placeholder="Presenting issue, session objectives, counseling approach used..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
          </div>

          {/* Processing progress */}
          {processing && (
            <div className="bg-white border border-violet-100 rounded-2xl p-6 space-y-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Processing Session</p>
              <div className="space-y-3">
                {mode === 'audio' && (
                  <StepRow label="Uploading recording to secure storage" status={stepStatus('uploading')} />
                )}
                <StepRow
                  label={mode === 'txt' ? 'Parsing transcript' : 'Transcribing with AI speaker diarization'}
                  status={stepStatus('transcribing')}
                />
                <StepRow label="Generating session report" status={stepStatus('generating')} />
                <StepRow label="Complete — redirecting to report" status={stepStatus('done')} />
              </div>
              {stepDetail && <p className="text-xs text-gray-400 mt-2">{stepDetail}</p>}
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-700 font-medium">Processing failed</p>
              <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
            </div>
          )}

          {!processing && (
            <Button
              onClick={handleProcess}
              className="w-full py-3.5 text-base font-bold bg-violet-600 hover:bg-violet-700"
              disabled={mode === 'audio' ? !audioFile : !txtContent.trim()}
            >
              {mode === 'audio' ? '🚀 Upload & Generate Report' : '📄 Process Transcript & Generate Report'}
            </Button>
          )}

          <p className="text-xs text-center text-gray-400 pb-6">
            {mode === 'audio'
              ? 'Audio is transcribed by AssemblyAI with speaker diarization. Long recordings (1+ hour) may take several minutes.'
              : 'Transcript will be processed directly — no transcription wait time.'}
          </p>
        </div>
      </div>
    </div>
  );
}
