import { CONFIG } from '../config.js';
import { supabase } from '../lib/supabase.js';

const SESSION_CACHE_TTL = 10 * 60 * 1000;

function cacheKey(prefix, data) {
  return `${prefix}:${JSON.stringify(data)}`;
}

function getCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > SESSION_CACHE_TTL) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function setCache(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

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
  if (res.status === 402) {
    const data = await res.json();
    throw Object.assign(new Error(data.error || 'plan_required'), data);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'request_failed');
  }
  return res.json();
}

let suggestTimer = null;

export function suggestQuestions(params) {
  return new Promise((resolve, reject) => {
    if (suggestTimer) clearTimeout(suggestTimer);
    suggestTimer = setTimeout(async () => {
      const key = cacheKey('suggest', params);
      const cached = getCache(key);
      if (cached) { resolve(cached); return; }
      try {
        const data = await authFetch(CONFIG.api.suggest, params);
        setCache(key, data);
        resolve(data);
      } catch (err) { reject(err); }
    }, 300);
  });
}

export async function generateReport(params) {
  return authFetch(CONFIG.api.report, params);
}
