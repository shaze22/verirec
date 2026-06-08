import { CONFIG } from '../config.js';
import { supabase } from '../lib/supabase.js';

const SESSION_CACHE_TTL = 10 * 60 * 1000;
const suggestTimers = {}; // keyed per request — avoids global debounce cross-caller interference

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

export function suggestQuestions(params) {
  // Cache key uses only stable params — recentTranscript changes every utterance and would prevent cache hits
  const key = cacheKey('suggest', {
    profession: params.profession,
    phase: params.phase,
    lastQuestion: params.lastQuestion,
  });

  return new Promise((resolve, reject) => {
    if (suggestTimers[key]) clearTimeout(suggestTimers[key]);
    suggestTimers[key] = setTimeout(async () => {
      delete suggestTimers[key];
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

// Auto-analysis for all professions — not cached, always fresh
export function analyzeSession(params) {
  return authFetch(CONFIG.api.suggest, { mode: 'auto_analysis', ...params });
}

export async function generateReport(params) {
  return authFetch(CONFIG.api.report, params);
}

export function generateDocument(params) {
  return authFetch(CONFIG.api.suggest, { mode: 'doc_letter', ...params });
}

export function analyseContradictions(params) {
  return authFetch(CONFIG.api.suggest, { mode: 'contradiction', ...params });
}
