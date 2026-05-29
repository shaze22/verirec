import { CONFIG } from '../config.js';
import { supabase } from '../lib/supabase.js';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('auth_expired');
  return session.access_token;
}

// Submit full audio blob for AssemblyAI diarization. Returns job_id.
export async function diarizeAudio(blob) {
  const token = await getToken();
  const form = new FormData();
  form.append('audio', blob, 'session.webm');
  form.append('mode', 'diarize');
  const res = await fetch(CONFIG.api.transcribe, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'diarize_failed');
  }
  const data = await res.json();
  return data.job_id;
}

// Poll AssemblyAI job until completed or timeout. Returns utterances[].
// utterances: [{ speaker: 'A'|'B'|..., text, start, end }]
export async function pollDiarization(jobId, { onProgress, maxWaitMs = 180_000 } = {}) {
  const token = await getToken();
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${CONFIG.api.transcribe}?job_id=${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('poll_failed');
    const data = await res.json();
    onProgress?.(data.status);
    if (data.status === 'completed') return data.utterances || [];
    if (data.status === 'error') throw new Error(data.error || 'diarize_error');
  }
  throw new Error('diarize_timeout');
}

export function createWhisperClient({ onTranscript, onError, onStatus } = {}) {
  let inFlight = 0;
  const MAX_CONCURRENT = 3;

  async function sendChunk(blob) {
    if (inFlight >= MAX_CONCURRENT) return;
    inFlight++;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('auth_expired');

      onStatus?.('Menghantar audio...');

      const form = new FormData();
      form.append('audio', blob, 'chunk.webm');

      const res = await fetch(CONFIG.api.transcribe, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });

      if (res.status === 402) {
        const data = await res.json();
        throw Object.assign(new Error('limit_reached'), data);
      }
      if (!res.ok) throw new Error('transcription_failed');

      const data = await res.json();
      if (data.text?.trim()) onTranscript?.(data.text.trim());
      onStatus?.('Bersedia');
    } catch (err) {
      onError?.(err);
      onStatus?.('Ralat pentranskripan');
    } finally {
      inFlight--;
    }
  }

  return {
    enqueue(blob) {
      sendChunk(blob);
    },
  };
}
