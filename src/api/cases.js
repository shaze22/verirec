import { supabase } from '../lib/supabase.js';

export async function getCases() {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCase(id) {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getCaseSessions(caseId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, profession, subject_name, status, duration, report, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getUnassignedSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, profession, subject_name, created_at')
    .is('case_id', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCase(userId, payload) {
  const { data, error } = await supabase
    .from('cases')
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCase(id, payload) {
  const { data, error } = await supabase
    .from('cases')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCase(id) {
  await supabase.from('sessions').update({ case_id: null }).eq('case_id', id);
  const { error } = await supabase.from('cases').delete().eq('id', id);
  if (error) throw error;
}

export async function assignSessionToCase(sessionId, caseId) {
  const { error } = await supabase
    .from('sessions')
    .update({ case_id: caseId })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function removeSessionFromCase(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .update({ case_id: null })
    .eq('id', sessionId);
  if (error) throw error;
}
