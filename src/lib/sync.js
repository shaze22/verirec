import { supabase } from './supabase.js';
import { getAll, remove, getById } from './idb.js';

const listeners = {};

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
  emit('sync:start', {});

  try {
    const queue = await getAll('queue');
    if (!queue.length) { emit('sync:success', { count: 0 }); return; }

    let synced = 0;
    for (const item of queue) {
      try {
        await retryWithBackoff(async () => {
          if (item.audioBlob) {
            const { data: audioData } = await supabase.storage
              .from('audio')
              .upload(`${item.user_id}/${item.id}.webm`, item.audioBlob, { upsert: true });
            item.audio_url = audioData?.path;
            delete item.audioBlob;
          }

          const { created_at, updated_at, ...sessionData } = item;
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
  }
}
