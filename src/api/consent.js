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

// Counselor letterhead/branding for document headers (consent PDF, letters)
export async function getCounselorLetterhead(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('counselor_profiles')
    .select('display_name, credentials, registration_number, specializations, klinik_name, klinik_address, phone, website, official_email, org_registration_no, logo_data, signature_data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('letterhead load:', error.message); return null; }
  return data || null;
}

// Full active consent record (incl. signature + clauses) for the counselor view / PDF
export async function getConsentDetail(subjectId) {
  const { data, error } = await supabase
    .from('client_consents')
    .select('id, version, language, full_name, ic_number, is_guardian, guardian_name, guardian_relationship, clauses, signature_data, signed_at, hash, status, withdrawn_at, created_at, signed_via')
    .eq('subject_id', subjectId)
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { count } = await supabase
    .from('consent_reaffirmations')
    .select('id', { count: 'exact', head: true })
    .eq('consent_id', data.id);
  return { ...data, reaffirmation_count: count || 0 };
}

// Withdraw an active consent (counselor RLS owns the row)
export async function withdrawConsent(consentId) {
  const { error } = await supabase
    .from('client_consents')
    .update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
    .eq('id', consentId)
    .eq('status', 'active');
  if (error) throw error;
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
