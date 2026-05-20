import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';

export const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) throw new Error('auth_required');
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
