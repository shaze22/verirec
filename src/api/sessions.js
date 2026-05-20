import { supabase } from '../lib/supabase.js';
import { put } from '../lib/idb.js';

export async function createSession(data) {
  const { data: session, error } = await supabase
    .from('sessions')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  await put('sessions', { ...session, synced: true });
  return session;
}

export async function updateSession(id, updates) {
  const { data: session, error } = await supabase
    .from('sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await put('sessions', { ...session, synced: true });
  return session;
}

export async function getSessions(userId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, profession, subject_name, duration, created_at, report, hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSessionById(id) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id) {
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw error;
}
