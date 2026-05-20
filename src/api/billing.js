import { supabase } from '../lib/supabase.js';
import { CONFIG } from '../config.js';

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'payment_failed');
  }
  return res.json();
}

export async function createStripeCheckout(plan, annual = false) {
  return authFetch(CONFIG.api.stripeCheckout, { plan, annual });
}

export async function createBillplzBill(plan, annual = false) {
  return authFetch(CONFIG.api.billplzCreate, { plan, annual });
}

export async function getSubscription(userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}
