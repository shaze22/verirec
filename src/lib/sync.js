import { supabase } from './supabase.js';
import { getAll, remove } from './idb.js';

const listeners = {};
let syncLock = false; // mutex — prevents concurrent sync runs

// Auto-sync on reconnect and startup
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => syncQueue(), 1500); // slight delay after reconnect
  });
  // Startup sync — defer to avoid blocking first render
  if (navigator.onLine) {
    setTimeout(() => syncQueue(), 3000);
  }
}

function emit(event, data) {
  (listeners[event] || []).forEach(fn => fn(data));
}

export function on(event, fn) {
  listeners[event] = listeners[event] || [];
  listeners[event].push(fn);
  return () => { listeners[event] = listeners[event].filter(f => f !== fn); };
}

async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}

export async function syncQueue() {
  if (!navigator.onLine) return;
  if (syncLock) return; // already running
  syncLock = true;
  emit('sync:start', {});

  try {
    const queue = await getAll('queue');
    if (!queue.length) { emit('sync:success', { count: 0 }); return; }

    let synced = 0;
    for (const item of queue) {
      try {
        await retryWithBackoff(async () => {
          const sessionData = { ...item };

          if (sessionData.audioBlob) {
            const { data: audioData } = await supabase.storage
              .from('recordings')
              .upload(`${item.user_id}/${item.id}.webm`, sessionData.audioBlob, { upsert: true });
            sessionData.audio_url = audioData?.path;
            delete sessionData.audioBlob;
          }

          const { error } = await supabase
            .from('sessions')
            .upsert({ ...sessionData, synced: true, updated_at: new Date().toISOString() });

          if (error) throw error;
        });

        await remove('queue', item.id);
        synced++;
      } catch (err) {
        console.error('sync item failed:', item.id, err);
      }
    }

    emit('sync:success', { count: synced });
  } catch (err) {
    emit('sync:error', err);
    console.error('syncQueue error:', err);
  } finally {
    syncLock = false;
  }
}
