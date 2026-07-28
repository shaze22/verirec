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

  try {
    const queue = await getAll('queue');
    // Nothing queued — stay silent. Emitting here would flash the sync banners
    // on every page load even when the user was never offline.
    if (!queue.length) return;

    emit('sync:start', {});

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

    // Only claim success when something actually reached the server
    if (synced > 0) emit('sync:success', { count: synced });
    else emit('sync:error', new Error('All queued sessions failed to sync'));
  } catch (err) {
    emit('sync:error', err);
    console.error('syncQueue error:', err);
  } finally {
    syncLock = false;
  }
}
