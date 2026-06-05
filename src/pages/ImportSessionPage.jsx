import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { PROFESSIONS, getProfession } from '../data/professions.js';
import { supabase } from '../lib/supabase.js';
import { importFromStoragePath, pollDiarization } from '../api/whisper.js';
import { generateReport } from '../api/claude.js';
import { updateSession } from '../api/sessions.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const ACCEPTED = '.mp3,.m4a,.mp4,.wav,.ogg,.webm,.flac,.aac,.mov,.wma';
const MAX_BYTES = 500 * 1024 * 1024;

const CASE_FIELDS = {
  police:    { caseLabel: 'Police Report Number',       casePlaceholder: 'e.g. P/TLNG/000123/2026' },
  sprm:      { caseLabel: 'MACC Case Number',            casePlaceholder: 'e.g. MACC/2026/000123' },
  hr:        { caseLabel: 'Disciplinary Case Number',    casePlaceholder: 'e.g. HR/ID/2026/001' },
  iso:       { caseLabel: 'Audit Number',                casePlaceholder: 'e.g. AUDIT/ISO/2026-Q2' },
  doctor:    { caseLabel: 'Patient Registration Number', casePlaceholder: 'e.g. P-2026-001234' },
  counselor: { caseLabel: 'Counseling Case Number',      casePlaceholder: 'e.g. KSL/2026/001' },
  court:     { caseLabel: 'Court Case Number',           casePlaceholder: 'e.g. MA-22NCC-XXX-2026' },
  peguam:    { caseLabel: 'Case File Number',            casePlaceholder: 'e.g. PG/2026/001234' },
  jkm:       { caseLabel: 'Welfare Case Number',         casePlaceholder: 'e.g. JKM/2026/KK/001234' },
  sispa:     { caseLabel: 'Investigation Case Number',   casePlaceholder: 'e.g. SISPA/2026/001234' },
  skmm:      { caseLabel: 'Investigation Case Number',   casePlaceholder: 'e.g. SKMM/2026/001234' },
  jtk:       { caseLabel: 'Case Reference Number',       casePlaceholder: 'e.g. JTK/2026/001234' },
};

function formatBytes(b) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

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
        <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
      )}
      {status === 'pending' && (
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
      )}
      <span className={`text-sm ${status === 'active' ? 'text-blue-700 font-semibold' : status === 'done' ? 'text-green-700' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

export default function ImportSessionPage() {
  const { user } = useAuthStore();
  const { canStartSession, incrementUsage } = useBillingStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillCaseId = searchParams.get('case_id') || '';
  const fileInputRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [professionId, setProfessionId] = useState('police');
  const [form, setForm] = useState({
    title: '',
    subject_name: '',
    interviewer: user?.user_metadata?.full_name || '',
    subject_role: '',
    case_number: '',
    context_notes: '',
    consentConfirmed: false,
  });
  const [activeCases, setActiveCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(prefillCaseId);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(''); // uploading | transcribing | generating | done
  const [stepDetail, setStepDetail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('cases').select('id,title,case_number,profession')
      .eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false })
      .then(({ data }) => {
        setActiveCases(data || []);
        if (prefillCaseId && data?.length) {
          const c = data.find(x => x.id === prefillCaseId);
          if (c) {
            if (c.profession) setProfessionId(c.profession);
            if (c.case_number) setForm(prev => ({ ...prev, case_number: prev.case_number || c.case_number }));
          }
        }
      }).catch(() => {});
  }, [user]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const caseFields = CASE_FIELDS[professionId] || {};
  const profession = getProfession(professionId);
  const availableProfessions = PROFESSIONS.filter(p => p.id !== 'counselor');

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { toast.error('File exceeds 500MB limit.'); return; }
    setFile(f);
    setErrorMsg('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const stepStatus = (step) => {
    const order = ['uploading', 'transcribing', 'generating', 'done'];
    const current = order.indexOf(currentStep);
    const target = order.indexOf(step);
    if (current > target) return 'done';
    if (current === target) return 'active';
    return 'pending';
  };

  const handleProcess = async () => {
    if (!file) { toast.error('Please select a recording file.'); return; }
    if (!form.subject_name.trim()) { toast.error('Subject name is required.'); return; }
    if (!form.consentConfirmed) { toast.error('Please confirm subject consent was obtained.'); return; }
    if (!canStartSession()) {
      toast.error('Session limit reached. Please upgrade or purchase more sessions.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');
    let sessionId = null;

    try {
      // 1. Create session record
      const title = form.title.trim() || `${profession?.label || professionId} — ${form.subject_name.trim()}`;
      const { data: session, error: sessionErr } = await supabase.from('sessions').insert({
        user_id: user.id,
        title,
        profession: professionId,
        interviewer: form.interviewer.trim() || user?.email || '',
        subject_name: form.subject_name.trim(),
        subject_role: form.subject_role.trim() || null,
        case_number: form.case_number.trim() || null,
        context_notes: form.context_notes.trim() || null,
        consent_signed: true,
        consent_data: {
          items: ['Subject consent confirmed by officer prior to import'],
          subject_name: form.subject_name.trim(),
          import_mode: true,
        },
        recording_status: 'in_progress',
        ...(selectedCaseId ? { case_id: selectedCaseId } : {}),
      }).select().single();
      if (sessionErr) throw sessionErr;
      sessionId = session.id;
      const usageResult = await incrementUsage();
      if (usageResult?.error) throw new Error(
        usageResult.error === 'limit_reached'
          ? 'Session limit reached. Please upgrade or purchase more sessions.'
          : 'Failed to update session count.'
      );

      // 2. Upload file to Supabase storage (directly from browser — no Vercel size limit)
      setCurrentStep('uploading');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const storagePath = `${user.id}/${Date.now()}_import.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('recordings')
        .upload(storagePath, file, { contentType: file.type || 'audio/mpeg', upsert: false });
      if (uploadErr) throw uploadErr;

      // Save to audio_library for playback later
      await supabase.from('audio_library').insert({
        user_id: user.id,
        session_id: sessionId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'audio/mpeg',
        title,
      }).catch(() => {});

      // 3. Submit to AssemblyAI via API (signed URL approach)
      setCurrentStep('transcribing');
      setStepDetail('Submitting to AssemblyAI...');
      const jobId = await importFromStoragePath({
        storagePath,
        interviewer: form.interviewer.trim(),
        subject_name: form.subject_name.trim(),
      });

      setStepDetail('Processing audio — this may take a few minutes for long recordings...');
      const utterances = await pollDiarization(jobId, {
        interviewer: form.interviewer.trim(),
        subject_name: form.subject_name.trim(),
        onProgress: (status) => setStepDetail(`AssemblyAI: ${status}`),
        maxWaitMs: 600_000,
      });

      // Build transcript from diarized utterances
      const speakers = [...new Set(utterances.map(u => u.speaker))].sort();
      const speakerMap = {};
      speakers.forEach((sp, i) => {
        speakerMap[sp] = i === 0
          ? (form.interviewer.trim() || 'Officer')
          : form.subject_name.trim();
      });

      const transcript = utterances.map(u => ({
        id: crypto.randomUUID(),
        type: 'TRANSCRIPT',
        text: u.text,
        speaker: speakerMap[u.speaker],
        identified_name: u.identified_name || null,
        timestamp: new Date(Date.now() - ((utterances.at(-1)?.end ?? 0) - u.start)).toISOString(),
      }));

      const totalDuration = utterances.length > 0
        ? Math.round((utterances.at(-1)?.end ?? 0) / 1000)
        : 0;

      await updateSession(sessionId, {
        transcript,
        duration: totalDuration,
        recording_status: 'completed',
        synced: true,
      });

      // 4. Generate AI report
      setCurrentStep('generating');
      setStepDetail('');
      await generateReport({
        session_id: sessionId,
        transcript,
        flags: [],
        session_info: {
          profession: professionId,
          title,
          subject_name: form.subject_name.trim(),
          subject_role: form.subject_role.trim() || '',
          context_notes: form.context_notes.trim() || '',
          duration: totalDuration,
          interviewer: form.interviewer.trim(),
        },
      });

      setCurrentStep('done');
      toast.success('Recording imported and report generated!');
      navigate(`/session/${sessionId}`);

    } catch (err) {
      console.error('Import error:', err);
      const msg = err.message || 'Import failed. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
      if (sessionId) {
        await updateSession(sessionId, { recording_status: 'completed' }).catch(() => {});
      }
    } finally {
      if (currentStep !== 'done') setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TopBar
        title="Import Recording"
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>← Back</Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Source badge */}
          <div className="flex flex-wrap gap-2">
            {['PLAUD Note', 'Zoom / Teams', 'Phone Recorder', 'Body Camera', 'Video Recording', 'Any Audio File'].map(src => (
              <span key={src} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                {src}
              </span>
            ))}
          </div>

          {/* File dropzone */}
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-400 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-300 bg-white'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {file ? (
              <div>
                <div className="text-3xl mb-2">🎙️</div>
                <p className="font-semibold text-green-800">{file.name}</p>
                <p className="text-sm text-green-600 mt-1">{formatBytes(file.size)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-2 text-xs text-gray-400 hover:text-red-500 underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📁</div>
                <p className="font-semibold text-gray-700">Drop recording here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">MP3, M4A, MP4, WAV, OGG, WEBM, FLAC, MOV — max 500MB</p>
              </div>
            )}
          </div>

          {/* Profession */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableProfessions.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfessionId(p.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    professionId === p.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                <input
                  value={form.subject_name}
                  onChange={set('subject_name')}
                  placeholder="Name of subject / witness"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recording Officer</label>
                <input
                  value={form.interviewer}
                  onChange={set('interviewer')}
                  placeholder="Officer name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {caseFields.caseLabel || 'Case Number'}
                </label>
                <input
                  value={form.case_number}
                  onChange={set('case_number')}
                  placeholder={caseFields.casePlaceholder || 'e.g. CASE/2026/001'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Title (optional)</label>
                <input
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Auto-generated if left blank"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {prefillCaseId ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-blue-700 font-medium">
                  {activeCases.find(c => c.id === prefillCaseId)?.title || 'Case File'} — session will be linked automatically
                </span>
              </div>
            ) : activeCases.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Case File (optional)</label>
                <select
                  value={selectedCaseId}
                  onChange={e => setSelectedCaseId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No case (standalone)</option>
                  {activeCases.map(c => (
                    <option key={c.id} value={c.id}>{c.title}{c.case_number ? ` — ${c.case_number}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Context Notes (optional)</label>
              <textarea
                value={form.context_notes}
                onChange={set('context_notes')}
                rows={2}
                placeholder="Background information to help AI generate a more accurate report..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Consent confirmation */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.consentConfirmed}
                onChange={e => setForm(prev => ({ ...prev, consentConfirmed: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded mt-0.5 flex-shrink-0"
              />
              <span className="text-sm text-gray-700">
                I confirm that subject consent was obtained prior to this recording. The recording is being imported for official documentation purposes under PDPA 2010.
              </span>
            </label>
          </div>

          {/* Processing progress */}
          {processing && (
            <div className="bg-white border border-blue-100 rounded-2xl p-6 space-y-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">Processing Recording</p>
              <div className="space-y-3">
                <StepRow label="Uploading file to secure storage" status={stepStatus('uploading')} />
                <StepRow label="Transcribing with AI speaker diarization" status={stepStatus('transcribing')} />
                <StepRow label="Generating session report" status={stepStatus('generating')} />
                <StepRow label="Complete — redirecting to report" status={stepStatus('done')} />
              </div>
              {stepDetail && (
                <p className="text-xs text-gray-400 mt-2">{stepDetail}</p>
              )}
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-700 font-medium">Import failed</p>
              <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
            </div>
          )}

          {/* Submit */}
          {!processing && (
            <Button
              onClick={handleProcess}
              className="w-full py-3.5 text-base font-bold"
              disabled={!file || !form.subject_name.trim() || !form.consentConfirmed}
            >
              🚀 Process & Generate Report
            </Button>
          )}

          <p className="text-xs text-center text-gray-400 pb-6">
            Audio is transcribed and diarized by AssemblyAI — speaker labels automatically assigned.
            Long recordings (1+ hour) may take several minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
