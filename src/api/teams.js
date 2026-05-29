import { supabase } from '../lib/supabase.js';

export async function getMyTeam(userId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTeam(userId, name) {
  const { data, error } = await supabase
    .from('teams')
    .insert({ owner_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTeamMembers(teamId) {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function inviteMember(teamId, invitedBy, email, role) {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, invited_by: invitedBy, email, role, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMemberRole(memberId, role) {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeMember(memberId) {
  const { error } = await supabase.from('team_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function getTeamSessions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc('get_team_sessions', { uid: user.id });
  if (error) throw error;
  return data || [];
}

export async function updateTeamName(teamId, name) {
  const { data, error } = await supabase
    .from('teams')
    .update({ name })
    .eq('id', teamId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
