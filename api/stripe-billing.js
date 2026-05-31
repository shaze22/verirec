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
      if (!customerId) return res.status(200).json({ invoices: [], charges: [] });

      // Fetch specific session receipt (for success page)
      const sessionId = req.query?.session_id || new URL(`https://x.com${req.url}`).searchParams.get('session_id');
      if (sessionId) {
        try {
          const session = await stripeGet(`/checkout/sessions/${sessionId}`);
          let receiptUrl = session.hosted_invoice_url || null;
          // For one-time payment, get charge receipt
          if (!receiptUrl && session.payment_intent) {
            const pi = await stripeGet(`/payment_intents/${session.payment_intent}`);
            if (pi.latest_charge) {
              const charge = await stripeGet(`/charges/${pi.latest_charge}`);
              receiptUrl = charge.receipt_url;
            }
          }
          return res.status(200).json({
            receipt_url: receiptUrl,
            amount: session.amount_total,
            currency: session.currency,
            created: session.created,
          });
        } catch { /* fall through to charges list */ }
      }

      // Payment history — charges covers both topup (one-time) + subscription
      const data = await stripeGet(`/charges?customer=${customerId}&limit=10`);
      const charges = (data.data || [])
        .filter(c => c.paid && c.status === 'succeeded')
        .map(c => ({
          id: c.id,
          amount: c.amount,
          currency: c.currency,
          created: c.created,
          description: c.description || c.billing_details?.name || '',
          receipt_url: c.receipt_url,
        }));

      return res.status(200).json({ charges, invoices: [] });
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
