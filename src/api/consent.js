import { supabase } from '../lib/supabase.js';
import { CONSENT_VERSION } from '../data/consentDocument.js';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

// Latest active episode-level consent for a client (null if none)
export async function getActiveConsent(subjectId) {
  const { data, error } = await supabase
    .from('client_consents')
    .select('id, version, language, full_name, signed_at, hash, status, is_guardian, guardian_name')
    .eq('subject_id', subjectId)
    .eq('status', 'active')
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Seal a freshly signed consent (server computes the SHA-256 + inserts the row)
export async function sealConsent(payload) {
  const res = await fetch('/api/report?mode=seal-consent', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ ...payload, version: CONSENT_VERSION }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to record consent.');
  return json.consent;
}

// Re-affirm an existing active consent at the start of a follow-up session
export async function reaffirmConsent({ consentId, subjectId, sessionId }) {
  const res = await fetch('/api/report?mode=reaffirm-consent', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ consent_id: consentId, subject_id: subjectId, session_id: sessionId || null }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to re-affirm consent.');
  return json.reaffirmation;
}
