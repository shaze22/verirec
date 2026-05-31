import { createClient } from '@supabase/supabase-js';

const clean = (v) => (v || '').replace(/^﻿/, '').trim();
const stripeKey = () => clean(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeKey()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Stripe error');
  return data;
}

async function stripePost(path, params) {
  const body = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Stripe error');
  return data;
}

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

async function getCustomerId(userId) {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();
  return data?.stripe_customer_id ? clean(data.stripe_customer_id) : null;
}

// GET  → list invoices (receipts)
// POST → create billing portal session
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const customerId = await getCustomerId(user.id);
      if (!customerId) return res.status(200).json({ invoices: [] });

      const data = await stripeGet(`/invoices?customer=${customerId}&limit=10&status=paid`);
      return res.status(200).json({
        invoices: (data.data || []).map(inv => ({
          id: inv.id,
          number: inv.number,
          amount_paid: inv.amount_paid,
          currency: inv.currency,
          created: inv.created,
          invoice_pdf: inv.invoice_pdf,
          hosted_invoice_url: inv.hosted_invoice_url,
          description: inv.lines?.data?.[0]?.description || '',
        })),
      });
    }

    if (req.method === 'POST') {
      const customerId = await getCustomerId(user.id);
      if (!customerId) return res.status(400).json({ error: 'no_stripe_customer' });

      const origin = req.headers.origin || process.env.VITE_APP_URL || 'https://www.verirec.app';
      const session = await stripePost('/billing_portal/sessions', {
        customer: customerId,
        return_url: `${origin}/settings`,
      });
      return res.status(200).json({ url: session.url });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('stripe-billing error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
