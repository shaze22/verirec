import { CONFIG } from '../config.js';
import { supabase } from '../lib/supabase.js';

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
