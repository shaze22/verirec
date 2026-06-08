import { CONFIG } from '../config.js';
import { supabase } from '../lib/supabase.js';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('auth_expired');
  return session.access_token;
}

// Submit full audio blob for Gemini diarization. Returns utterances[] directly (synchronous).
export async function diarizeAudio(blob, { interviewer, subject_name } = {}) {
  const token = await getToken();
  const form = new FormData();
  form.append('audio', blob, 'session.webm');
  form.append('mode', 'diarize');
  if (interviewer) form.append('interviewer', interviewer);
  if (subject_name) form.append('subject_name', subject_name);
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
  return data.utterances || [];
}

// Transcribe an already-uploaded file (Supabase storage path) via Gemini. Returns utterances[].
export async function importFromStoragePath({ storagePath, interviewer, subject_name }) {
  const token = await getToken();
  const res = await fetch(CONFIG.api.transcribe, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'import', storage_path: storagePath, interviewer, subject_name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'import_failed');
  }
  const data = await res.json();
  return data.utterances || [];
}

export function createWhisperClient({ onTranscript, onError, onStatus, lang = 'auto' } = {}) {
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
      form.append('language', lang || 'auto');

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
