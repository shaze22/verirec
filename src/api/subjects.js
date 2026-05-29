import { supabase } from '../lib/supabase.js';

export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function searchSubjects(query) {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, ic_number, phone')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(8);
  if (error) throw error;
  return data;
}

export async function createSubject(userId, payload) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubject(id, payload) {
  const { data, error } = await supabase
    .from('subjects')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(id) {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
