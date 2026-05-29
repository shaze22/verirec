import { CONFIG } from '../config.js';
import { supabase } from '../lib/supabase.js';

async function authFetch(url, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('auth_expired');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) throw new Error('auth_expired');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'request_failed');
  }
  return res.json();
}

export function geminiGenerate({ prompt, model, maxTokens }) {
  return authFetch('/api/gemini', { prompt, model, maxTokens });
}
